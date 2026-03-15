import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// Fixture: MetaPool 배포 + Active 마켓 1개 생성
// ============================================================

async function deployAndCreateMarketFixture() {
  const [owner, user1, user2, user3, ...rest] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200;

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 86400;      // +1일
  const resolutionDeadline = now + 172800;  // +2일

  await metaPool.createMarket(
    "Will BTC exceed $100K?",
    "BTC 10만불 돌파?",
    "BTC破10万？",
    "BTC10万ドル？",
    0, // Crypto
    bettingDeadline,
    resolutionDeadline
  );

  return { metaPool, owner, user1, user2, user3, rest, marketId: 1, bettingDeadline, resolutionDeadline };
}

// ============================================================
// 테스트 스위트
// ============================================================

describe("MetaPool - F-05/F-06 베팅", function () {

  // ----------------------------------------------------------
  // F-05: placeBet -- 정상 케이스
  // ----------------------------------------------------------
  describe("F-05: placeBet -- 정상 케이스", function () {

    it("TC-01: Yes 베팅 성공 -- yesPool, bet.amount, bet.isYes 검증", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(ethers.parseEther("500"));

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("500"));
      expect(bet.isYes).to.equal(true);
    });

    it("TC-02: No 베팅 성공 -- noPool, bet.amount, bet.isYes 검증", async function () {
      const { metaPool, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1000") });

      const market = await metaPool.getMarket(marketId);
      expect(market.noPool).to.equal(ethers.parseEther("1000"));

      const bet = await metaPool.getUserBet(marketId, user2.address);
      expect(bet.amount).to.equal(ethers.parseEther("1000"));
      expect(bet.isYes).to.equal(false);
    });

    it("TC-03: 최소 금액(100 META) 정확히 베팅 성공", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") });

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("100"));
    });

    it("TC-04: 최대 금액(100,000 META) 정확히 베팅 성공", async function () {
      // Hardhat 기본 계정 잔액(10,000 ETH)으로 100,000 META는 초과이므로
      // fixture의 maxBet을 낮게 설정한 별도 배포로 검증
      const [owner, , , , user4] = await ethers.getSigners();
      const minBetSmall = ethers.parseEther("100");
      const maxBetSmall = ethers.parseEther("5000"); // 잔액 내 최대값
      const MetaPool = await ethers.getContractFactory("MetaPool");
      const metaPoolSmall = await MetaPool.deploy(owner.address, minBetSmall, maxBetSmall, 200);

      const now = await networkHelpers.time.latest();
      await metaPoolSmall.createMarket(
        "Test?", "", "", "",
        0,
        now + 86400,
        now + 172800
      );

      await metaPoolSmall.connect(user4).placeBet(1, true, { value: ethers.parseEther("5000") });

      const bet = await metaPoolSmall.getUserBet(1, user4.address);
      expect(bet.amount).to.equal(ethers.parseEther("5000"));
    });

    it("TC-05: Yes 베팅 후 yesPool이 정확히 증가한다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(ethers.parseEther("500"));
    });

    it("TC-06: No 베팅 후 noPool이 정확히 증가한다", async function () {
      const { metaPool, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("300") });

      const market = await metaPool.getMarket(marketId);
      expect(market.noPool).to.equal(ethers.parseEther("300"));
    });

    it("TC-07: 첫 Yes 베팅 시 yesCount가 1 증가한다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesCount).to.equal(1n);
    });

    it("TC-08: 첫 No 베팅 시 noCount가 1 증가한다", async function () {
      const { metaPool, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("500") });

      const market = await metaPool.getMarket(marketId);
      expect(market.noCount).to.equal(1n);
    });

    it("TC-09: Yes 베팅 시 BetPlaced 이벤트가 올바른 파라미터로 emit된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const tx = await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await expect(tx)
        .to.emit(metaPool, "BetPlaced")
        .withArgs(
          1n,
          user1.address,
          true,
          ethers.parseEther("500"),
          ethers.parseEther("500"),
          0n
        );
    });

    it("TC-10: Yes 베팅 후 No 베팅 시 BetPlaced 이벤트의 풀 값이 정확하다", async function () {
      const { metaPool, user1, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      const tx = await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("300") });
      await expect(tx)
        .to.emit(metaPool, "BetPlaced")
        .withArgs(
          1n,
          user2.address,
          false,
          ethers.parseEther("300"),
          ethers.parseEther("500"),
          ethers.parseEther("300")
        );
    });
  });

  // ----------------------------------------------------------
  // F-06: placeBet -- 추가 베팅
  // ----------------------------------------------------------
  describe("F-06: placeBet -- 추가 베팅", function () {

    it("TC-11: 같은 방향 추가 베팅 시 bet.amount가 합산된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("300") });

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("800"));
    });

    it("TC-12: 추가 베팅 시 yesPool이 합산된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("300") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(ethers.parseEther("800"));
    });

    it("TC-13: 추가 베팅 시 yesCount는 변하지 않는다 (1 유지)", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("300") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesCount).to.equal(1n);
    });

    it("TC-14: 추가 베팅 시 BetPlaced 이벤트의 amount는 이번 트랜잭션 금액이다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      const tx = await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("300") });

      await expect(tx)
        .to.emit(metaPool, "BetPlaced")
        .withArgs(
          1n,
          user1.address,
          true,
          ethers.parseEther("300"),  // 이번 트랜잭션 금액
          ethers.parseEther("800"),  // 누적 yesPool
          0n
        );
    });

    it("TC-15: 3회 추가 베팅 후 누적 bet.amount가 정확하다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("200") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("300") });

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("600"));

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(ethers.parseEther("600"));
    });
  });

  // ----------------------------------------------------------
  // F-05: placeBet -- revert 케이스
  // ----------------------------------------------------------
  describe("F-05: placeBet -- revert 케이스", function () {

    it("TC-16: 미존재 마켓(ID=999)에 베팅하면 MarketNotFound로 revert된다", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).placeBet(999, true, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(metaPool, "MarketNotFound")
        .withArgs(999n);
    });

    it("TC-17: 마켓 ID 0에 베팅하면 MarketNotFound로 revert된다", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).placeBet(0, true, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(metaPool, "MarketNotFound")
        .withArgs(0n);
    });

    it("TC-19: 마감 시간 이후 베팅하면 BettingDeadlinePassed로 revert된다", async function () {
      const { metaPool, user1, marketId, bettingDeadline } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await networkHelpers.time.increaseTo(bettingDeadline);

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(metaPool, "BettingDeadlinePassed")
        .withArgs(marketId, bettingDeadline);
    });

    it("TC-20: 마감 시간 정확히 도달 시(>=) BettingDeadlinePassed로 revert된다", async function () {
      const { metaPool, user1, marketId, bettingDeadline } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await networkHelpers.time.increaseTo(bettingDeadline);

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(metaPool, "BettingDeadlinePassed");
    });

    it("TC-21: 최소 금액 미달(99 META) 시 BetAmountTooLow로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("99") })
      ).to.be.revertedWithCustomError(metaPool, "BetAmountTooLow")
        .withArgs(ethers.parseEther("99"), ethers.parseEther("100"));
    });

    it("TC-22: 최소 금액 미달(0 META) 시 BetAmountTooLow로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: 0n })
      ).to.be.revertedWithCustomError(metaPool, "BetAmountTooLow")
        .withArgs(0n, ethers.parseEther("100"));
    });

    it("TC-23: 최대 금액 초과(100,001 META) 시 BetAmountTooHigh로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100001") })
      ).to.be.revertedWithCustomError(metaPool, "BetAmountTooHigh")
        .withArgs(ethers.parseEther("100001"), ethers.parseEther("100000"));
    });

    it("TC-24: Yes 베팅 후 No 베팅 시도 시 OppositeBetExists로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      await expect(
        metaPool.connect(user1).placeBet(marketId, false, { value: ethers.parseEther("500") })
      ).to.be.revertedWithCustomError(metaPool, "OppositeBetExists")
        .withArgs(marketId, user1.address);
    });

    it("TC-25: No 베팅 후 Yes 베팅 시도 시 OppositeBetExists로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, false, { value: ethers.parseEther("500") });

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") })
      ).to.be.revertedWithCustomError(metaPool, "OppositeBetExists")
        .withArgs(marketId, user1.address);
    });

    it("TC-26: 글로벌 pause 상태에서 베팅하면 EnforcedPause로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      // owner는 첫 번째 signer이므로 connect 없이 pause 호출 가능
      await metaPool.pause();

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(metaPool, "EnforcedPause");
    });
  });

  // ----------------------------------------------------------
  // F-06: 추가 베팅 -- revert 케이스
  // ----------------------------------------------------------
  describe("F-06: 추가 베팅 -- revert 케이스", function () {

    it("TC-27: 추가 베팅 시 최소 금액 미달(99 META) 시 BetAmountTooLow로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("99") })
      ).to.be.revertedWithCustomError(metaPool, "BetAmountTooLow")
        .withArgs(ethers.parseEther("99"), ethers.parseEther("100"));
    });

    it("TC-28: 추가 베팅 시 최대 금액 초과(100,001 META) 시 BetAmountTooHigh로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100001") })
      ).to.be.revertedWithCustomError(metaPool, "BetAmountTooHigh")
        .withArgs(ethers.parseEther("100001"), ethers.parseEther("100000"));
    });
  });

  // ----------------------------------------------------------
  // getUserBet View 함수 테스트
  // ----------------------------------------------------------
  describe("getUserBet", function () {

    it("TC-29: 베팅 후 getUserBet 조회 결과가 정확하다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("500"));
      expect(bet.isYes).to.equal(true);
      expect(bet.claimed).to.equal(false);
    });

    it("TC-30: 베팅하지 않은 사용자 조회 시 기본값이 반환된다", async function () {
      const { metaPool, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const bet = await metaPool.getUserBet(marketId, user2.address);
      expect(bet.amount).to.equal(0n);
      expect(bet.isYes).to.equal(false);
      expect(bet.claimed).to.equal(false);
    });

    it("TC-31: 추가 베팅 후 getUserBet 조회 시 누적 금액이 반환된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("300") });

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("800"));
      expect(bet.isYes).to.equal(true);
      expect(bet.claimed).to.equal(false);
    });

    it("TC-32: 미존재 마켓 조회 시 기본값이 반환된다 (revert 아님)", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const bet = await metaPool.getUserBet(999, user1.address);
      expect(bet.amount).to.equal(0n);
      expect(bet.isYes).to.equal(false);
      expect(bet.claimed).to.equal(false);
    });
  });

  // ----------------------------------------------------------
  // getOdds View 함수 테스트
  // ----------------------------------------------------------
  describe("getOdds", function () {

    it("TC-33: 아무도 베팅 안 한 마켓의 배당률은 (0, 0)이다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(0n);
      expect(noOdds).to.equal(0n);
    });

    it("TC-34: Yes만 베팅 (No풀 0) 시 배당률은 (0, 0)이다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });

      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(0n);
      expect(noOdds).to.equal(0n);
    });

    it("TC-35: No만 베팅 (Yes풀 0) 시 배당률은 (0, 0)이다", async function () {
      const { metaPool, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1000") });

      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(0n);
      expect(noOdds).to.equal(0n);
    });

    it("TC-36: 균등 풀 (Yes=No=1000) 시 배당률이 9800 (수수료 2% 차감)이다", async function () {
      const { metaPool, user1, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1000") });

      // yesOdds = (1000+1000)*9800/1000 = 2000*9800/1000 = 19600
      // 단, getOdds는 basis points 기준이므로: totalPool * feeAdjusted / yesPool
      // = 2000 * 9800 / 1000 = 19600 -- 이는 1.96배
      // 실제로는 총풀(ETH 단위) * 9800 / yesPool(ETH 단위) = 2000*9800/1000 = 19600
      // 아, 실제 계산: yesOdds = totalPool * feeAdjusted / yesPool
      // = 2000*9800/1000 = 19600 -- 배당률이 1.96x
      // 균등 풀이면 2:1 배당 * 0.98 = 1.96x = 19600 basis points
      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(19600n);
      expect(noOdds).to.equal(19600n);
    });

    it("TC-37: Yes 풀 > No 풀 시 (Yes=3000, No=1000) 배당률이 정확하다", async function () {
      const { metaPool, user1, user2, user3, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      // Yes: user1 3000 META
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("3000") });
      // No: user2 1000 META
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1000") });

      // totalPool = 4000, feeAdjusted = 9800
      // yesOdds = 4000 * 9800 / 3000 = 39200000 / 3000 = 13066 (정수 나눔)
      // noOdds  = 4000 * 9800 / 1000 = 39200
      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(13066n);
      expect(noOdds).to.equal(39200n);
    });

    it("TC-38: No 풀 > Yes 풀 시 (Yes=1000, No=3000) 배당률이 정확하다", async function () {
      const { metaPool, user1, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("3000") });

      // totalPool = 4000, feeAdjusted = 9800
      // yesOdds = 4000 * 9800 / 1000 = 39200
      // noOdds  = 4000 * 9800 / 3000 = 13066
      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(39200n);
      expect(noOdds).to.equal(13066n);
    });
  });

  // ----------------------------------------------------------
  // 복수 사용자 베팅 시나리오
  // ----------------------------------------------------------
  describe("복수 사용자 베팅", function () {

    it("TC-39: 3명이 각각 다른 방향으로 베팅 후 풀/참여자 수가 정확하다", async function () {
      const { metaPool, user1, user2, user3, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("300") });
      await metaPool.connect(user3).placeBet(marketId, true, { value: ethers.parseEther("200") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(ethers.parseEther("700"));
      expect(market.noPool).to.equal(ethers.parseEther("300"));
      expect(market.yesCount).to.equal(2n);
      expect(market.noCount).to.equal(1n);
    });

    it("TC-40: 동일 방향으로 2명이 베팅 시 yesCount가 각각 1씩 증가한다", async function () {
      const { metaPool, user1, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user2).placeBet(marketId, true, { value: ethers.parseEther("300") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesCount).to.equal(2n);
    });

    it("TC-41: 한 사용자 추가 베팅 + 다른 사용자 첫 베팅 후 상태가 정확하다", async function () {
      const { metaPool, user1, user2, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      // user1: Yes 500 + 추가 Yes 200
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("500") });
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("200") });
      // user2: No 1000
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1000") });

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(ethers.parseEther("700"));
      expect(market.noPool).to.equal(ethers.parseEther("1000"));
      expect(market.yesCount).to.equal(1n);
      expect(market.noCount).to.equal(1n);

      const user1Bet = await metaPool.getUserBet(marketId, user1.address);
      expect(user1Bet.amount).to.equal(ethers.parseEther("700"));
    });

    it("TC-42: 배당률 변화 검증 (Yes=1000, No=2000)", async function () {
      const { metaPool, user1, user2, user3, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("500") });
      await metaPool.connect(user3).placeBet(marketId, false, { value: ethers.parseEther("1500") });

      // totalPool = 3000, yesPool = 1000, noPool = 2000, feeAdjusted = 9800
      // yesOdds = 3000 * 9800 / 1000 = 29400
      // noOdds  = 3000 * 9800 / 2000 = 14700
      const [yesOdds, noOdds] = await metaPool.getOdds(marketId);
      expect(yesOdds).to.equal(29400n);
      expect(noOdds).to.equal(14700n);
    });

    it("TC-43: 10명이 베팅 후 풀 합산, 참여자 수, 개인 bet.amount가 정확하다", async function () {
      const { metaPool, owner, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      // Hardhat 기본 signers를 10명 가져옴 (owner 제외)
      const signers = await ethers.getSigners();
      const bettors = signers.slice(1, 11); // 10명

      let expectedYesPool = 0n;
      let expectedNoPool = 0n;
      let expectedYesCount = 0n;
      let expectedNoCount = 0n;

      const bets = [
        { isYes: true,  amount: "100" },
        { isYes: false, amount: "200" },
        { isYes: true,  amount: "300" },
        { isYes: false, amount: "400" },
        { isYes: true,  amount: "500" },
        { isYes: false, amount: "600" },
        { isYes: true,  amount: "700" },
        { isYes: false, amount: "800" },
        { isYes: true,  amount: "900" },
        { isYes: false, amount: "1000" },
      ];

      for (let i = 0; i < 10; i++) {
        const { isYes, amount } = bets[i];
        await metaPool.connect(bettors[i]).placeBet(marketId, isYes, { value: ethers.parseEther(amount) });

        if (isYes) {
          expectedYesPool += ethers.parseEther(amount);
          expectedYesCount++;
        } else {
          expectedNoPool += ethers.parseEther(amount);
          expectedNoCount++;
        }
      }

      const market = await metaPool.getMarket(marketId);
      expect(market.yesPool).to.equal(expectedYesPool);
      expect(market.noPool).to.equal(expectedNoPool);
      expect(market.yesCount).to.equal(expectedYesCount);
      expect(market.noCount).to.equal(expectedNoCount);

      // 각 개인 bet.amount 검증
      for (let i = 0; i < 10; i++) {
        const bet = await metaPool.getUserBet(marketId, bettors[i].address);
        expect(bet.amount).to.equal(ethers.parseEther(bets[i].amount));
        expect(bet.isYes).to.equal(bets[i].isYes);
      }
    });
  });
});
