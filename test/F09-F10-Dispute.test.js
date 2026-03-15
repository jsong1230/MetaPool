import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// 공통 상수
// ============================================================

const DISPUTE_PERIOD = 86400n;          // 24시간 (초)
const DISPUTE_STAKE = ethers.parseEther("1000"); // 1,000 META

// ============================================================
// 공통 Fixture
// ============================================================

async function deployFixture() {
  const [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200; // 2%

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  return { metaPool, owner, user1, user2, user3, user4, user5 };
}

/**
 * 결과 확정 직후 상태 fixture (이의제기 기간 활성)
 * - user1: Yes 1,000 META
 * - user2: No  1,500 META
 * - marketId = 1
 * - Yes 확정 상태
 */
async function resolvedMarketFixture() {
  const { metaPool, owner, user1, user2, user3, user4, user5 } = await deployFixture();

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 3600;
  const resolutionDeadline = now + 86400;

  await metaPool.createMarket(
    "Will BTC exceed $100K?",
    "BTC 10만불 돌파?",
    "BTC破10万？",
    "BTC10万ドル？",
    0, // Crypto
    bettingDeadline,
    resolutionDeadline
  );

  const marketId = 1n;

  // Yes 베팅: user1 1,000 META
  await metaPool.connect(user1).placeBet(marketId, true, {
    value: ethers.parseEther("1000"),
  });

  // No 베팅: user2 1,500 META
  await metaPool.connect(user2).placeBet(marketId, false, {
    value: ethers.parseEther("1500"),
  });

  // 베팅 마감 이후로 시간 이동
  await networkHelpers.time.increaseTo(bettingDeadline + 1);

  // Yes 확정
  await metaPool.connect(owner).resolveMarket(marketId, 1);

  const market = await metaPool.getMarket(marketId);
  const disputeDeadline = market.disputeDeadline;

  return {
    metaPool,
    owner,
    user1,
    user2,
    user3,
    user4,
    user5,
    marketId,
    bettingDeadline,
    resolutionDeadline,
    disputeDeadline,
  };
}

/**
 * 10명의 베팅자 fixture (임계값 테스트용)
 * user1~5: Yes (5명)
 * user6~10: No (5명)
 * 총 10명, 10% 임계값 = 1명
 */
async function manyBettorsFixture() {
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const bettors = signers.slice(1, 21); // 20명

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
  const marketId = 1n;

  // 10명 Yes 베팅 (bettors[0]~[9])
  for (let i = 0; i < 10; i++) {
    await metaPool.connect(bettors[i]).placeBet(marketId, true, {
      value: ethers.parseEther("100"),
    });
  }

  // 베팅 마감 이후
  await networkHelpers.time.increaseTo(bettingDeadline + 1);
  await metaPool.connect(owner).resolveMarket(marketId, 1); // Yes 확정

  const market = await metaPool.getMarket(marketId);

  return { metaPool, owner, bettors, marketId, disputeDeadline: market.disputeDeadline };
}

// ============================================================
// 테스트 스위트
// ============================================================

describe("MetaPool - F-09/F-10 이의제기 기간 & 이의제기", function () {

  // ----------------------------------------------------------
  // F-09: 이의제기 기간 설정 (resolveMarket)
  // ----------------------------------------------------------
  describe("F-09: 이의제기 기간 설정", function () {

    it("TC-01: Yes 확정 시 disputeDeadline = resolvedAt + 24시간", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);
      await metaPool.connect((await ethers.getSigners())[1]).placeBet(1, true, {
        value: ethers.parseEther("100"),
      });
      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 1); // Yes

      const market = await metaPool.getMarket(1);
      const expectedDeadline = market.resolvedAt + DISPUTE_PERIOD;
      expect(market.disputeDeadline).to.equal(expectedDeadline);
    });

    it("TC-02: No 확정 시 disputeDeadline = resolvedAt + 24시간", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);
      await metaPool.connect((await ethers.getSigners())[1]).placeBet(1, false, {
        value: ethers.parseEther("100"),
      });
      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 2); // No

      const market = await metaPool.getMarket(1);
      const expectedDeadline = market.resolvedAt + DISPUTE_PERIOD;
      expect(market.disputeDeadline).to.equal(expectedDeadline);
    });

    it("TC-03: Void 확정 시 disputeDeadline = 0 (이의제기 없음)", async function () {
      const { metaPool, owner } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);
      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 3); // Void

      const market = await metaPool.getMarket(1);
      expect(market.disputeDeadline).to.equal(0);
    });

    it("TC-04: 이의제기 기간 중 claimWinnings 시 DisputePeriodActive revert", async function () {
      const { metaPool, user1, marketId, disputeDeadline } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(user1).claimWinnings(marketId)
      ).to.be.revertedWithCustomError(metaPool, "DisputePeriodActive")
        .withArgs(marketId, disputeDeadline);
    });

    it("TC-05: 이의제기 기간 종료 후 claimWinnings 성공", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      // 24시간 + 1초 이동
      await networkHelpers.time.increase(86401);

      // 정상 클레임 가능
      await metaPool.connect(user1).claimWinnings(marketId);
      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.claimed).to.be.true;
    });

    it("TC-06: Void 마켓은 이의제기 없이 즉시 환불 가능", async function () {
      const { metaPool, owner, user1 } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);
      await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("100") });
      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await metaPool.connect(owner).resolveMarket(1, 3); // Void — 즉시 환불 가능

      // 시간 이동 없이 바로 환불 가능
      await expect(metaPool.connect(user1).claimRefund(1))
        .to.emit(metaPool, "RefundClaimed");
    });

    it("TC-07: underReview 마켓에서 claimWinnings 시 MarketUnderReview revert", async function () {
      const { metaPool, owner, user1, user2, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      // user2(No 베팅)도 Yes 베팅 마켓에서 이의제기 가능하도록
      // 10명 베팅자 중 임계값 테스트를 위해 manyBettorsFixture 활용
      const { metaPool: mp, owner: own, bettors, marketId: mid } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      // bettors[0]이 이의 제출 → 10명 중 1명 = 10%, 임계값 충족 → underReview = true
      await mp.connect(bettors[0]).submitDispute(mid, { value: DISPUTE_STAKE });

      const market = await mp.getMarket(mid);
      expect(market.underReview).to.be.true;

      // 24시간 이후에도 underReview면 클레임 불가
      await networkHelpers.time.increase(86401);
      await expect(
        mp.connect(bettors[0]).claimWinnings(mid)
      ).to.be.revertedWithCustomError(mp, "MarketUnderReview")
        .withArgs(mid);
    });
  });

  // ----------------------------------------------------------
  // F-10: submitDispute
  // ----------------------------------------------------------
  describe("F-10: submitDispute", function () {

    it("TC-08: 베팅자가 1,000 META로 이의 제출 성공", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      const dispute = await metaPool.getDispute(marketId, user1.address);
      expect(dispute.stake).to.equal(DISPUTE_STAKE);
      expect(dispute.resolved).to.be.false;
      expect(dispute.accepted).to.be.false;
    });

    it("TC-09: DisputeSubmitted 이벤트 emit 검증", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE }))
        .to.emit(metaPool, "DisputeSubmitted")
        .withArgs(marketId, user1.address, DISPUTE_STAKE, 1n);
    });

    it("TC-10: disputeCount가 1 증가한다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      const before = (await metaPool.getMarket(marketId)).disputeCount;
      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });
      const after = (await metaPool.getMarket(marketId)).disputeCount;

      expect(after - before).to.equal(1n);
    });

    it("TC-11: 비베팅자 이의 제출 시 NotBettor revert", async function () {
      const { metaPool, user3, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(user3).submitDispute(marketId, { value: DISPUTE_STAKE })
      ).to.be.revertedWithCustomError(metaPool, "NotBettor")
        .withArgs(marketId, user3.address);
    });

    it("TC-12: 잘못된 스테이킹 금액(적음) 시 InvalidDisputeStake revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);
      const wrongAmount = ethers.parseEther("500");

      await expect(
        metaPool.connect(user1).submitDispute(marketId, { value: wrongAmount })
      ).to.be.revertedWithCustomError(metaPool, "InvalidDisputeStake")
        .withArgs(wrongAmount, DISPUTE_STAKE);
    });

    it("TC-13: 잘못된 스테이킹 금액(많음) 시 InvalidDisputeStake revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);
      const wrongAmount = ethers.parseEther("2000");

      await expect(
        metaPool.connect(user1).submitDispute(marketId, { value: wrongAmount })
      ).to.be.revertedWithCustomError(metaPool, "InvalidDisputeStake")
        .withArgs(wrongAmount, DISPUTE_STAKE);
    });

    it("TC-14: 이의제기 기간 종료 후 제출 시 DisputePeriodEnded revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      // 24시간 + 1초 이동
      await networkHelpers.time.increase(86401);

      await expect(
        metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE })
      ).to.be.revertedWithCustomError(metaPool, "DisputePeriodEnded")
        .withArgs(marketId);
    });

    it("TC-15: 중복 이의 제출 시 AlreadyDisputed revert", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      await expect(
        metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE })
      ).to.be.revertedWithCustomError(metaPool, "AlreadyDisputed")
        .withArgs(marketId, user1.address);
    });

    it("TC-16: Resolved 상태가 아닌 마켓에서 이의 제출 시 MarketNotResolved revert", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployFixture);

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await metaPool.createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);
      await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("100") });
      // resolve 안 함 → Active 상태

      await expect(
        metaPool.connect(user1).submitDispute(1, { value: DISPUTE_STAKE })
      ).to.be.revertedWithCustomError(metaPool, "MarketNotResolved")
        .withArgs(1n, 0n); // Active=0
    });

    it("TC-17: 존재하지 않는 마켓에서 이의 제출 시 MarketNotFound revert", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployFixture);

      await expect(
        metaPool.connect(user1).submitDispute(999, { value: DISPUTE_STAKE })
      ).to.be.revertedWithCustomError(metaPool, "MarketNotFound")
        .withArgs(999);
    });

    it("TC-18: 이의 제출 시 DISPUTE_STAKE가 컨트랙트에 보관된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      const contractBalanceBefore = await ethers.provider.getBalance(
        await metaPool.getAddress()
      );

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      const contractBalanceAfter = await ethers.provider.getBalance(
        await metaPool.getAddress()
      );

      expect(contractBalanceAfter - contractBalanceBefore).to.equal(DISPUTE_STAKE);
    });
  });

  // ----------------------------------------------------------
  // F-09: 임계값 초과 → underReview 전환
  // ----------------------------------------------------------
  describe("F-09: 임계값 초과 시 underReview 전환", function () {

    it("TC-19: 10명 중 1명 이의 제출 → underReview = true (임계값 = 10%)", async function () {
      const { metaPool, bettors, marketId } = await networkHelpers.loadFixture(manyBettorsFixture);

      // 1명 이의 제출 (10명 중 1명 = 10% = DISPUTE_THRESHOLD)
      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      const market = await metaPool.getMarket(marketId);
      expect(market.underReview).to.be.true;
    });

    it("TC-20: MarketReviewTriggered 이벤트 emit 검증", async function () {
      const { metaPool, bettors, marketId } = await networkHelpers.loadFixture(manyBettorsFixture);

      await expect(
        metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE })
      ).to.emit(metaPool, "MarketReviewTriggered")
        .withArgs(marketId, 1n, 10n); // disputeCount=1, totalBettors=10
    });

    it("TC-21: 총 베팅자가 9명이면 threshold=0이라 underReview 전환 안 됨", async function () {
      // 9명 * 1000 / 10000 = 0 → threshold=0, 조건 threshold > 0 불충족 → underReview 불가
      const [owner, ...allSigners] = await ethers.getSigners();
      const bettors9 = allSigners.slice(0, 9);

      const MetaPool = await ethers.getContractFactory("MetaPool");
      const mp = await MetaPool.deploy(
        owner.address,
        ethers.parseEther("100"),
        ethers.parseEther("100000"),
        200
      );

      const now = await networkHelpers.time.latest();
      const bettingDeadline = now + 3600;
      await mp.connect(owner).createMarket("Test?", "", "", "", 0, bettingDeadline, now + 86400);

      // 9명 Yes 베팅
      for (const bettor of bettors9) {
        await mp.connect(bettor).placeBet(1, true, { value: ethers.parseEther("100") });
      }

      await networkHelpers.time.increaseTo(bettingDeadline + 1);
      await mp.connect(owner).resolveMarket(1, 1); // Yes 확정

      // 모든 9명이 이의 제출해도 threshold=0이라 underReview 전환 불가
      await mp.connect(bettors9[0]).submitDispute(1, { value: DISPUTE_STAKE });

      const market = await mp.getMarket(1);
      expect(market.underReview).to.be.false;
    });

    it("TC-22: Yes/No 혼합 베팅자 10명에서 1명 이의 → 10% 충족 → underReview", async function () {
      // user1(Yes) 5명 + user2(No) 5명 = 총 10명
      // 10명 * 1000 / 10000 = 1 → threshold=1, 1명 이의 시 충족
      const { metaPool, bettors, marketId } = await networkHelpers.loadFixture(manyBettorsFixture);

      // 이미 10명 Yes 베팅 후 Resolved 상태
      // bettors[0]이 이의 제출 → underReview = true
      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      const market = await metaPool.getMarket(marketId);
      expect(market.disputeCount).to.equal(1n);
      expect(market.underReview).to.be.true;
    });

    it("TC-23: underReview 이미 true이면 MarketReviewTriggered 중복 emit 안 됨", async function () {
      const { metaPool, bettors, marketId } = await networkHelpers.loadFixture(manyBettorsFixture);

      // 첫 번째 이의 → underReview = true, 이벤트 emit
      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      // 두 번째 이의 → underReview 이미 true, 이벤트 emit 안 됨
      const tx = await metaPool.connect(bettors[1]).submitDispute(marketId, { value: DISPUTE_STAKE });
      const receipt = await tx.wait();

      // MarketReviewTriggered 이벤트가 없어야 함
      const reviewEvents = receipt.logs.filter(
        (log) => log.fragment && log.fragment.name === "MarketReviewTriggered"
      );
      expect(reviewEvents.length).to.equal(0);
    });
  });

  // ----------------------------------------------------------
  // F-10: resolveDispute
  // ----------------------------------------------------------
  describe("F-10: resolveDispute", function () {

    it("TC-24: 이의 인정 시 스테이킹 금액 반환", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await metaPool.connect(owner).resolveDispute(marketId, user1.address, true);
      const receipt = await tx.wait();
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // user1은 가스를 쓰지 않음 (owner가 트랜잭션 발행), 잔액 증가
      expect(balanceAfter - balanceBefore).to.equal(DISPUTE_STAKE);
    });

    it("TC-25: 이의 기각 시 스테이킹 금액 accumulatedFees에 추가", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      const feesBefore = await metaPool.accumulatedFees();
      await metaPool.connect(owner).resolveDispute(marketId, user1.address, false);
      const feesAfter = await metaPool.accumulatedFees();

      expect(feesAfter - feesBefore).to.equal(DISPUTE_STAKE);
    });

    it("TC-26: DisputeResolved 이벤트 emit 검증 (인정)", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      await expect(metaPool.connect(owner).resolveDispute(marketId, user1.address, true))
        .to.emit(metaPool, "DisputeResolved")
        .withArgs(marketId, user1.address, true, DISPUTE_STAKE);
    });

    it("TC-27: DisputeResolved 이벤트 emit 검증 (기각)", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      await expect(metaPool.connect(owner).resolveDispute(marketId, user1.address, false))
        .to.emit(metaPool, "DisputeResolved")
        .withArgs(marketId, user1.address, false, 0n);
    });

    it("TC-28: 비관리자 resolveDispute 호출 시 OwnableUnauthorizedAccount revert", async function () {
      const { metaPool, user1, user2, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });

      await expect(
        metaPool.connect(user2).resolveDispute(marketId, user1.address, true)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount")
        .withArgs(user2.address);
    });

    it("TC-29: 존재하지 않는 이의 처리 시 DisputeNotFound revert", async function () {
      const { metaPool, owner, user3, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(owner).resolveDispute(marketId, user3.address, true)
      ).to.be.revertedWithCustomError(metaPool, "DisputeNotFound")
        .withArgs(marketId, user3.address);
    });

    it("TC-30: 이미 처리된 이의 재처리 시 DisputeAlreadyResolved revert", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });
      await metaPool.connect(owner).resolveDispute(marketId, user1.address, true);

      await expect(
        metaPool.connect(owner).resolveDispute(marketId, user1.address, false)
      ).to.be.revertedWithCustomError(metaPool, "DisputeAlreadyResolved")
        .withArgs(marketId, user1.address);
    });

    it("TC-31: 이의 처리 후 dispute.resolved = true", async function () {
      const { metaPool, owner, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });
      await metaPool.connect(owner).resolveDispute(marketId, user1.address, false);

      const dispute = await metaPool.getDispute(marketId, user1.address);
      expect(dispute.resolved).to.be.true;
      expect(dispute.accepted).to.be.false;
    });
  });

  // ----------------------------------------------------------
  // F-09: resolveReview
  // ----------------------------------------------------------
  describe("F-09: resolveReview", function () {

    it("TC-32: 재심 후 결과 변경 (Yes → No) 성공", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      // underReview 상태 만들기
      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      await metaPool.connect(owner).resolveReview(marketId, 2); // No로 변경

      const market = await metaPool.getMarket(marketId);
      expect(market.outcome).to.equal(2n); // No=2
      expect(market.underReview).to.be.false;
      expect(market.disputeDeadline).to.equal(0n);
    });

    it("TC-33: 재심 후 원래 결과 유지 (Yes → Yes)", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      await metaPool.connect(owner).resolveReview(marketId, 1); // Yes 유지

      const market = await metaPool.getMarket(marketId);
      expect(market.outcome).to.equal(1n); // Yes=1
      expect(market.underReview).to.be.false;
    });

    it("TC-34: 재심 후 Void 전환 시 Voided 상태가 된다", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      await metaPool.connect(owner).resolveReview(marketId, 3); // Void

      const market = await metaPool.getMarket(marketId);
      expect(market.status).to.equal(3n); // Voided=3
      expect(market.outcome).to.equal(3n); // Void=3
    });

    it("TC-35: 재심 후 Void 전환 시 기존 수수료 취소", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      // Yes 확정 시 수수료 없음 (No 풀이 0이므로)
      const feesBefore = await metaPool.accumulatedFees();
      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });
      await metaPool.connect(owner).resolveReview(marketId, 3); // Void

      const feesAfter = await metaPool.accumulatedFees();
      // No 풀이 0이라 수수료도 0, 변화 없음
      expect(feesAfter).to.equal(feesBefore);
    });

    it("TC-36: 비관리자 resolveReview 시 OwnableUnauthorizedAccount revert", async function () {
      const { metaPool, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      await expect(
        metaPool.connect(bettors[1]).resolveReview(marketId, 2)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount")
        .withArgs(bettors[1].address);
    });

    it("TC-37: underReview 아닌 마켓에 resolveReview 시 MarketNotUnderReview revert", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      await expect(
        metaPool.connect(owner).resolveReview(marketId, 2)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotUnderReview")
        .withArgs(marketId);
    });

    it("TC-38: resolveReview에서 Undecided(0) 전달 시 InvalidOutcome revert", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      await expect(
        metaPool.connect(owner).resolveReview(marketId, 0) // Undecided
      ).to.be.revertedWithCustomError(metaPool, "InvalidOutcome");
    });

    it("TC-39: 재심 후 claimWinnings 가능 (disputeDeadline=0, underReview=false)", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });
      await metaPool.connect(owner).resolveReview(marketId, 1); // Yes 유지

      // disputeDeadline = 0 이므로 즉시 클레임 가능
      await metaPool.connect(bettors[1]).claimWinnings(marketId);
      const bet = await metaPool.getUserBet(marketId, bettors[1].address);
      expect(bet.claimed).to.be.true;
    });
  });

  // ----------------------------------------------------------
  // 통합: 전체 이의제기 플로우
  // ----------------------------------------------------------
  describe("통합: 전체 이의제기 플로우", function () {

    it("TC-40: 정상 플로우 -- 이의 제출 → 인정 → 재심 → 결과 변경 → 클레임", async function () {
      const { metaPool, owner, bettors, marketId } =
        await networkHelpers.loadFixture(manyBettorsFixture);

      // Step 1: 이의 제출 → underReview
      await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

      let market = await metaPool.getMarket(marketId);
      expect(market.underReview).to.be.true;

      // Step 2: 이의 인정 (스테이킹 반환)
      const balanceBefore = await ethers.provider.getBalance(bettors[0].address);
      await metaPool.connect(owner).resolveDispute(marketId, bettors[0].address, true);
      const balanceAfter = await ethers.provider.getBalance(bettors[0].address);
      expect(balanceAfter - balanceBefore).to.equal(DISPUTE_STAKE);

      // Step 3: 재심 → Yes 유지 (underReview 해제)
      await metaPool.connect(owner).resolveReview(marketId, 1); // Yes 유지

      market = await metaPool.getMarket(marketId);
      expect(market.underReview).to.be.false;
      expect(market.disputeDeadline).to.equal(0n);

      // Step 4: 즉시 클레임 가능
      await metaPool.connect(bettors[2]).claimWinnings(marketId);
      const bet = await metaPool.getUserBet(marketId, bettors[2].address);
      expect(bet.claimed).to.be.true;
    });

    it("TC-41: 정상 플로우 -- 이의 기간 종료 → 정상 클레임 (underReview 없음)", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(resolvedMarketFixture);

      // 이의 기간 내에 이의 제출 없음, 24시간 경과
      await networkHelpers.time.increase(86401);

      // 정상 클레임
      await metaPool.connect(user1).claimWinnings(marketId);
      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.claimed).to.be.true;
    });

    it("TC-42: 이의 기각 후 accumulatedFees 인출 가능", async function () {
      const { metaPool, owner, user1, marketId } =
        await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });
      await metaPool.connect(owner).resolveDispute(marketId, user1.address, false);

      const feesBefore = await metaPool.accumulatedFees();
      expect(feesBefore).to.be.greaterThanOrEqual(DISPUTE_STAKE);

      // owner가 수수료 인출
      await metaPool.connect(owner).withdrawFees();
      expect(await metaPool.accumulatedFees()).to.equal(0n);
    });

    it("TC-43: 복수 이의 제출 후 개별 처리 가능", async function () {
      const { metaPool, owner, user1, user2, marketId } =
        await networkHelpers.loadFixture(resolvedMarketFixture);

      await metaPool.connect(user1).submitDispute(marketId, { value: DISPUTE_STAKE });
      await metaPool.connect(user2).submitDispute(marketId, { value: DISPUTE_STAKE });

      // user1 인정, user2 기각
      await metaPool.connect(owner).resolveDispute(marketId, user1.address, true);
      await metaPool.connect(owner).resolveDispute(marketId, user2.address, false);

      const d1 = await metaPool.getDispute(marketId, user1.address);
      const d2 = await metaPool.getDispute(marketId, user2.address);

      expect(d1.resolved).to.be.true;
      expect(d1.accepted).to.be.true;
      expect(d2.resolved).to.be.true;
      expect(d2.accepted).to.be.false;
    });

    it("TC-44: DISPUTE_PERIOD, DISPUTE_STAKE, DISPUTE_THRESHOLD 상수 검증", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployFixture);

      expect(await metaPool.DISPUTE_PERIOD()).to.equal(86400n);
      expect(await metaPool.DISPUTE_STAKE()).to.equal(DISPUTE_STAKE);
      expect(await metaPool.DISPUTE_THRESHOLD()).to.equal(1000n);
    });
  });
});
