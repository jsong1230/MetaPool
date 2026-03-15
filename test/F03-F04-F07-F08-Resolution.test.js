import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// 공통 Fixture
// ============================================================

async function deployFixture() {
  const [owner, user1, user2, user3, user4] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200; // 2%

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  return { metaPool, owner, user1, user2, user3, user4, minBet, maxBet, feeRate };
}

/**
 * 마켓 생성 + 베팅 마감 이후 상태로 시간 이동 fixture
 * PRD 시나리오 비율 유지 (Yes:No = 2:3)
 * - user1: Yes 1,000 META
 * - user2: No  1,500 META
 *
 * Yes 승리 시:
 *   수수료 = 1,500 * 2% = 30 META
 *   distributable = 1,500 - 30 = 1,470 META
 *   user1 보상 = 1,000 + 1,470 * 1,000/1,000 = 1,000 + 1,470 = 2,470 META
 *
 * No 승리 시:
 *   수수료 = 1,000 * 2% = 20 META
 *   distributable = 1,000 - 20 = 980 META
 *   user2 보상 = 1,500 + 980 * 1,500/1,500 = 1,500 + 980 = 2,480 META
 */
async function resolvedMarketFixture() {
  const { metaPool, owner, user1, user2, user3, user4 } = await deployFixture();

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 3600;       // +1시간
  const resolutionDeadline = now + 86400;   // +1일

  await metaPool.createMarket(
    "Will BTC exceed $100K?",
    "BTC 10만불 돌파?",
    "BTC破10万？",
    "BTC10万ドル？",
    0, // Crypto
    bettingDeadline,
    resolutionDeadline
  );

  const marketId = 1;

  // Yes 베팅: user1 1,000 META
  await metaPool.connect(user1).placeBet(marketId, true, {
    value: ethers.parseEther("1000"),
  });

  // No 베팅: user2 1,500 META
  await metaPool.connect(user2).placeBet(marketId, false, {
    value: ethers.parseEther("1500"),
  });

  // 베팅 마감 시간 이후로 이동
  await networkHelpers.time.increaseTo(bettingDeadline + 1);

  return {
    metaPool,
    owner,
    user1,
    user2,
    user3,
    user4,
    marketId,
    bettingDeadline,
    resolutionDeadline,
    yesAmount: ethers.parseEther("1000"),
    noAmount: ethers.parseEther("1500"),
    // Yes 승리 시
    yesFee: ethers.parseEther("30"),
    yesDistributable: ethers.parseEther("1470"),
    user1Reward: ethers.parseEther("2470"),
    // No 승리 시
    noFee: ethers.parseEther("20"),
    noDistributable: ethers.parseEther("980"),
    user2Reward: ethers.parseEther("2480"),
  };
}

// ============================================================
// 테스트 스위트
// ============================================================

describe("MetaPool - F-03/F-04/F-07/F-08 결과 확정 및 클레임", function () {

  // ----------------------------------------------------------
  // F-03: resolveMarket
  // ----------------------------------------------------------
  describe("F-03: resolveMarket", function () {

    it("TC-01: Yes로 결과 확정 성공 -- status Resolved, outcome Yes", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes=1

      const market = await metaPool.getMarket(marketId);
      expect(market.status).to.equal(2); // Resolved=2
      expect(market.outcome).to.equal(1); // Yes=1
    });

    it("TC-02: No로 결과 확정 성공 -- status Resolved, outcome No", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 2); // No=2

      const market = await metaPool.getMarket(marketId);
      expect(market.status).to.equal(2); // Resolved=2
      expect(market.outcome).to.equal(2); // No=2
    });

    it("TC-03: Void로 결과 확정 시 status Voided로 전환", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3); // Void=3

      const market = await metaPool.getMarket(marketId);
      expect(market.status).to.equal(3); // Voided=3
      expect(market.outcome).to.equal(3); // Void=3
    });

    it("TC-04: Yes 확정 시 수수료 계산 -- noPool(1500) * 2% = 30 META", async function () {
      const { metaPool, owner, marketId, yesFee } = await networkHelpers.loadFixture(resolvedMarketFixture);

      const beforeFees = await metaPool.accumulatedFees();
      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes=1

      const afterFees = await metaPool.accumulatedFees();
      expect(afterFees - beforeFees).to.equal(yesFee); // 30 META
    });

    it("TC-05: No 확정 시 수수료 계산 -- yesPool(1000) * 2% = 20 META", async function () {
      const { metaPool, owner, marketId, noFee } = await networkHelpers.loadFixture(resolvedMarketFixture);

      const beforeFees = await metaPool.accumulatedFees();
      await metaPool.connect(owner).resolveMarket(marketId, 2); // No=2

      const afterFees = await metaPool.accumulatedFees();
      expect(afterFees - beforeFees).to.equal(noFee); // 20 META
    });

    it("TC-06: Void 확정 시 수수료 없음 -- accumulatedFees 변화 없음", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      const beforeFees = await metaPool.accumulatedFees();
      await metaPool.connect(owner).resolveMarket(marketId, 3); // Void=3

      const afterFees = await metaPool.accumulatedFees();
      expect(afterFees).to.equal(beforeFees);
    });

    it("TC-07: MarketResolved 이벤트 emit 검증 (Yes 확정)", async function () {
      const { metaPool, owner, marketId, yesFee } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(metaPool.connect(owner).resolveMarket(marketId, 1))
        .to.emit(metaPool, "MarketResolved")
        .withArgs(marketId, 1, yesFee); // Yes=1, fee=30 META
    });

    it("TC-08: MarketResolved 이벤트 emit 검증 (Void 확정)", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(metaPool.connect(owner).resolveMarket(marketId, 3))
        .to.emit(metaPool, "MarketResolved")
        .withArgs(marketId, 3, 0n); // Void=3, fee=0
    });

    it("TC-09: 비관리자 호출 시 OwnableUnauthorizedAccount revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(user1).resolveMarket(marketId, 1)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("TC-10: 존재하지 않는 마켓 확정 시 MarketNotFound revert", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(owner).resolveMarket(999, 1)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotFound")
        .withArgs(999);
    });

    it("TC-11: 베팅 마감 전 확정 시 BettingNotClosed revert", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 86400;
      await metaPool.createMarket(
        "Test?", "", "", "", 0, bettingDeadline, now + 172800
      );

      await expect(
        metaPool.connect(owner).resolveMarket(1, 1)
      ).to.be.revertedWithCustomError(metaPool, "BettingNotClosed")
        .withArgs(1, bettingDeadline);
    });

    it("TC-12: Undecided(0)으로 확정 시 InvalidOutcome revert", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(owner).resolveMarket(marketId, 0) // Undecided=0
      ).to.be.revertedWithCustomError(metaPool, "InvalidOutcome");
    });

    it("TC-13: 이미 Resolved 상태의 마켓 재확정 시 MarketNotResolvable revert", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);

      await expect(
        metaPool.connect(owner).resolveMarket(marketId, 2)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotResolvable")
        .withArgs(marketId, 2); // currentStatus=Resolved=2
    });

    it("TC-14: Voided 상태의 마켓 재확정 시 MarketNotResolvable revert", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3); // Void

      await expect(
        metaPool.connect(owner).resolveMarket(marketId, 1)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotResolvable")
        .withArgs(marketId, 3); // currentStatus=Voided=3
    });

    it("TC-15: resolvedAt이 현재 블록 시간으로 설정된다", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);

      const market = await metaPool.getMarket(marketId);
      const now = await networkHelpers.time.latest();
      expect(market.resolvedAt).to.be.closeTo(BigInt(now), 2n);
    });
  });

  // ----------------------------------------------------------
  // F-07: claimWinnings
  // ----------------------------------------------------------
  describe("F-07: claimWinnings", function () {

    it("TC-16: Yes 승리 -- user1 보상 정확성 검증 (PRD 시나리오 비율)", async function () {
      /**
       * Yes풀 = 1,000 META, No풀 = 1,500 META, 수수료 2%
       * 수수료 = 1,500 * 2% = 30 META
       * distributable = 1,500 - 30 = 1,470 META
       * user1 보상 = 1,000 + 1,470 * 1,000/1,000 = 1,000 + 1,470 = 2,470 META
       */
      const { metaPool, owner, user1, marketId, user1Reward } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await metaPool.connect(user1).claimWinnings(marketId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      const actualReward = balanceAfter - balanceBefore + gasUsed;
      expect(actualReward).to.equal(user1Reward); // 2,470 META
    });

    it("TC-17: calculateWinnings view 함수가 올바른 보상을 반환한다", async function () {
      const { metaPool, owner, user1, marketId, user1Reward } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes

      const winnings = await metaPool.calculateWinnings(marketId, user1.address);
      expect(winnings).to.equal(user1Reward); // 2,470 META
    });

    it("TC-18: No 승리 -- user2 보상 정확성 검증", async function () {
      /**
       * Yes풀 = 1,000 META, No풀 = 1,500 META, 수수료 2%
       * 수수료 = 1,000 * 2% = 20 META
       * distributable = 1,000 - 20 = 980 META
       * user2 보상 = 1,500 + 980 * 1,500/1,500 = 1,500 + 980 = 2,480 META
       */
      const { metaPool, owner, user2, marketId, user2Reward } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 2); // No
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);

      const balanceBefore = await ethers.provider.getBalance(user2.address);
      const tx = await metaPool.connect(user2).claimWinnings(marketId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user2.address);

      const actualReward = balanceAfter - balanceBefore + gasUsed;
      expect(actualReward).to.equal(user2Reward); // 2,480 META
    });

    it("TC-19: WinningsClaimed 이벤트 emit 검증", async function () {
      const { metaPool, owner, user1, marketId, user1Reward } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);

      await expect(metaPool.connect(user1).claimWinnings(marketId))
        .to.emit(metaPool, "WinningsClaimed")
        .withArgs(marketId, user1.address, user1Reward);
    });

    it("TC-20: Resolved 상태 아닌 마켓에서 클레임 시 MarketNotResolved revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);
      // resolveMarket 호출 없이 클레임 시도 (Active=0 상태)

      await expect(
        metaPool.connect(user1).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotResolved")
        .withArgs(marketId, 0); // Active=0
    });

    it("TC-21: 패배자 클레임 시 NotWinner revert", async function () {
      const { metaPool, owner, user2, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes 승리 → user2(No)는 패배
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);

      await expect(
        metaPool.connect(user2).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(metaPool, "NotWinner")
        .withArgs(marketId, user2.address);
    });

    it("TC-22: 이중 클레임 시 AlreadyClaimed revert", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);
      await metaPool.connect(user1).claimWinnings(marketId); // 첫 클레임

      await expect(
        metaPool.connect(user1).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(metaPool, "AlreadyClaimed")
        .withArgs(marketId, user1.address);
    });

    it("TC-23: 베팅 기록 없는 사용자 클레임 시 NoBetFound revert", async function () {
      const { metaPool, owner, user3, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);

      await expect(
        metaPool.connect(user3).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(metaPool, "NoBetFound")
        .withArgs(marketId, user3.address);
    });

    it("TC-24: CEI 패턴 검증 -- 클레임 후 bet.claimed == true", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);
      await metaPool.connect(user1).claimWinnings(marketId);

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.claimed).to.equal(true);
    });

    it("TC-25: calculateWinnings -- Resolved 아닌 마켓은 0 반환", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      const winnings = await metaPool.calculateWinnings(marketId, user1.address);
      expect(winnings).to.equal(0);
    });

    it("TC-26: calculateWinnings -- 이미 클레임한 경우 0 반환", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);
      await metaPool.connect(user1).claimWinnings(marketId);

      const winnings = await metaPool.calculateWinnings(marketId, user1.address);
      expect(winnings).to.equal(0);
    });

    it("TC-27: calculateWinnings -- 패배자는 0 반환", async function () {
      const { metaPool, owner, user2, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes 승리 → user2 패배

      const winnings = await metaPool.calculateWinnings(marketId, user2.address);
      expect(winnings).to.equal(0);
    });

    it("TC-28: 여러 Yes 베팅자 -- 비례 보상 정확성 검증", async function () {
      /**
       * user1: Yes 200 META (2/3)
       * user3: Yes 100 META (1/3)
       * No풀 = 300 META
       * 수수료 = 300 * 2% = 6 META
       * distributable = 300 - 6 = 294 META
       * winPool = 300 META
       * user3 보상 = 100 + 294 * 100/300 = 100 + 98 = 198 META
       */
      const [owner, user1, , user3] = await ethers.getSigners();
      const MetaPool = await ethers.getContractFactory("MetaPool");
      const metaPool = await MetaPool.deploy(
        owner.address,
        ethers.parseEther("100"),
        ethers.parseEther("100000"),
        200
      );

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);

      await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("200") });
      await metaPool.connect(user3).placeBet(1, true, { value: ethers.parseEther("100") });
      await metaPool.connect((await ethers.getSigners())[2]).placeBet(1, false, { value: ethers.parseEther("300") });

      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 1); // Yes 승리

      const winnings = await metaPool.calculateWinnings(1, user3.address);
      expect(winnings).to.equal(ethers.parseEther("198"));
    });
  });

  // ----------------------------------------------------------
  // F-04/F-08: claimRefund
  // ----------------------------------------------------------
  describe("F-04/F-08: claimRefund", function () {

    it("TC-29: Void 환불 성공 -- user1 원금 전액 반환", async function () {
      const { metaPool, owner, user1, marketId, yesAmount } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3); // Void

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await metaPool.connect(user1).claimRefund(marketId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      const refunded = balanceAfter - balanceBefore + gasUsed;
      expect(refunded).to.equal(yesAmount); // 1,000 META
    });

    it("TC-30: Void 환불 성공 -- user2 원금 전액 반환", async function () {
      const { metaPool, owner, user2, marketId, noAmount } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3); // Void

      const balanceBefore = await ethers.provider.getBalance(user2.address);
      const tx = await metaPool.connect(user2).claimRefund(marketId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user2.address);

      const refunded = balanceAfter - balanceBefore + gasUsed;
      expect(refunded).to.equal(noAmount); // 1,500 META
    });

    it("TC-31: RefundClaimed 이벤트 emit 검증", async function () {
      const { metaPool, owner, user1, marketId, yesAmount } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3);

      await expect(metaPool.connect(user1).claimRefund(marketId))
        .to.emit(metaPool, "RefundClaimed")
        .withArgs(marketId, user1.address, yesAmount);
    });

    it("TC-32: Voided 상태 아닌 마켓에서 환불 시 MarketNotVoided revert", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes (Resolved)

      await expect(
        metaPool.connect(user1).claimRefund(marketId)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotVoided")
        .withArgs(marketId, 2); // Resolved=2
    });

    it("TC-33: Active 마켓에서 환불 시 MarketNotVoided revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);
      // resolveMarket 호출 없이 클레임 (Active=0 상태)

      await expect(
        metaPool.connect(user1).claimRefund(marketId)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotVoided")
        .withArgs(marketId, 0); // Active=0
    });

    it("TC-34: 이중 환불 시 AlreadyClaimed revert", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3);
      await metaPool.connect(user1).claimRefund(marketId);

      await expect(
        metaPool.connect(user1).claimRefund(marketId)
      ).to.be.revertedWithCustomError(metaPool, "AlreadyClaimed")
        .withArgs(marketId, user1.address);
    });

    it("TC-35: 베팅 기록 없는 사용자 환불 시 NoBetFound revert", async function () {
      const { metaPool, owner, user3, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3);

      await expect(
        metaPool.connect(user3).claimRefund(marketId)
      ).to.be.revertedWithCustomError(metaPool, "NoBetFound")
        .withArgs(marketId, user3.address);
    });

    it("TC-36: 환불 후 bet.claimed == true 검증", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 3);
      await metaPool.connect(user1).claimRefund(marketId);

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.claimed).to.equal(true);
    });
  });

  // ----------------------------------------------------------
  // 통합 테스트: 전체 라이프사이클
  // ----------------------------------------------------------
  describe("통합: 전체 라이프사이클", function () {

    it("TC-37: 생성 → 베팅 → Yes 확정 → 승리 클레임 전체 흐름", async function () {
      const { metaPool, owner, user1, user2 } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);

      await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user2).placeBet(1, false, { value: ethers.parseEther("1000") });

      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 1); // Yes

      const market = await metaPool.getMarket(1);
      expect(market.status).to.equal(2); // Resolved
      expect(market.outcome).to.equal(1); // Yes

      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);
      await metaPool.connect(user1).claimWinnings(1);
      const bet = await metaPool.getUserBet(1, user1.address);
      expect(bet.claimed).to.equal(true);
    });

    it("TC-38: 생성 → 베팅 → Void 확정 → 전원 환불 전체 흐름", async function () {
      const { metaPool, owner, user1, user2 } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);

      const amount1 = ethers.parseEther("500");
      const amount2 = ethers.parseEther("1500");
      await metaPool.connect(user1).placeBet(1, true, { value: amount1 });
      await metaPool.connect(user2).placeBet(1, false, { value: amount2 });

      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 3); // Void

      await expect(metaPool.connect(user1).claimRefund(1))
        .to.emit(metaPool, "RefundClaimed")
        .withArgs(1, user1.address, amount1);

      await expect(metaPool.connect(user2).claimRefund(1))
        .to.emit(metaPool, "RefundClaimed")
        .withArgs(1, user2.address, amount2);
    });

    it("TC-39: Active 상태에서 베팅마감 이후 결과 확정 가능", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      // 현재 Active 상태 + 베팅마감 이후 → resolve 가능
      const market = await metaPool.getMarket(marketId);
      expect(market.status).to.equal(0); // Active=0

      await metaPool.connect(owner).resolveMarket(marketId, 1);
      const resolvedMarket = await metaPool.getMarket(marketId);
      expect(resolvedMarket.status).to.equal(2); // Resolved=2
    });

    it("TC-40: 다중 베팅자 Yes 승리 -- 비례 정산 후 컨트랙트 잔액 = accumulatedFees", async function () {
      const { metaPool, owner, user1, user2, user3 } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);

      // Yes: user1 600, user3 400 (합계 1000)
      // No: user2 1500
      await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("600") });
      await metaPool.connect(user3).placeBet(1, true, { value: ethers.parseEther("400") });
      await metaPool.connect(user2).placeBet(1, false, { value: ethers.parseEther("1500") });

      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 1); // Yes 승리

      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);

      // user1 클레임: 600 + 1470 * 600/1000 = 600 + 882 = 1482
      await metaPool.connect(user1).claimWinnings(1);
      // user3 클레임: 400 + 1470 * 400/1000 = 400 + 588 = 988
      await metaPool.connect(user3).claimWinnings(1);

      // 컨트랙트 잔액 = accumulatedFees (30 META)
      const contractBalance = await ethers.provider.getBalance(await metaPool.getAddress());
      const accFees = await metaPool.accumulatedFees();
      expect(contractBalance).to.equal(accFees);
      expect(accFees).to.equal(ethers.parseEther("30"));
    });

    it("TC-41: 승리자 클레임 후 패배자 클레임 불가 -- NotWinner revert", async function () {
      const { metaPool, owner, user1, user2, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes
      // 이의제기 기간(24시간) 이후로 시간 이동
      await networkHelpers.time.increase(86401);
      await metaPool.connect(user1).claimWinnings(marketId);

      // user2(No 베팅)는 NotWinner
      await expect(
        metaPool.connect(user2).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(metaPool, "NotWinner");
    });
  });

  // ----------------------------------------------------------
  // withdrawFees
  // ----------------------------------------------------------
  describe("withdrawFees", function () {

    it("TC-42: 수수료 인출 성공 -- owner 잔액 증가, accumulatedFees 초기화", async function () {
      const { metaPool, owner, marketId, yesFee } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes, 수수료 30 META

      const ownerBefore = await ethers.provider.getBalance(owner.address);
      const tx = await metaPool.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ownerAfter = await ethers.provider.getBalance(owner.address);

      const gained = ownerAfter - ownerBefore + gasUsed;
      expect(gained).to.equal(yesFee); // 30 META

      expect(await metaPool.accumulatedFees()).to.equal(0);
    });

    it("TC-43: 비관리자 수수료 인출 시 OwnableUnauthorizedAccount revert", async function () {
      const { metaPool, user1, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(owner).resolveMarket(marketId, 1);

      await expect(
        metaPool.connect(user1).withdrawFees()
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("TC-44: 수수료가 없을 때 withdrawFees 호출 시 정상 처리 (no revert)", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(deployFixture);

      // 수수료 없음 상태에서 인출 호출
      await metaPool.connect(owner).withdrawFees();
      expect(await metaPool.accumulatedFees()).to.equal(0);
    });
  });
});
