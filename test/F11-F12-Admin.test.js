import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// Fixture: MetaPool 배포 + Active 마켓 1개 생성
// ============================================================

async function deployAndCreateMarketFixture() {
  const [owner, user1, user2, ...rest] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200; // 2%

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

  return { metaPool, owner, user1, user2, rest, marketId: 1, bettingDeadline, resolutionDeadline };
}

// ============================================================
// F-11: 긴급 마켓 중단 테스트
// ============================================================

describe("MetaPool - F-11 긴급 마켓 중단", function () {

  // ----------------------------------------------------------
  // pauseMarket -- 정상 케이스
  // ----------------------------------------------------------
  describe("pauseMarket -- 정상 케이스", function () {

    it("TC-F11-01: Active 마켓을 Paused 상태로 전환할 수 있다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const market = await metaPool.getMarket(marketId);
      // MarketStatus.Paused = 4
      expect(market.status).to.equal(4n);
    });

    it("TC-F11-02: pauseMarket 호출 시 MarketPaused 이벤트가 emit된다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const tx = await metaPool.pauseMarket(marketId);
      await expect(tx)
        .to.emit(metaPool, "MarketPaused")
        .withArgs(BigInt(marketId));
    });

    it("TC-F11-03: Paused 마켓에 베팅 시 MarketNotActive로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      await expect(
        metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(metaPool, "MarketNotActive")
        .withArgs(marketId, 4n); // Paused = 4
    });
  });

  // ----------------------------------------------------------
  // resumeMarket -- 정상 케이스
  // ----------------------------------------------------------
  describe("resumeMarket -- 정상 케이스", function () {

    it("TC-F11-04: Paused 마켓을 새 마감시간과 함께 Active로 재개할 수 있다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      const newBettingDeadline = now + 86400 * 3;    // +3일
      const newResolutionDeadline = now + 86400 * 6; // +6일

      await metaPool.resumeMarket(marketId, newBettingDeadline, newResolutionDeadline);

      const market = await metaPool.getMarket(marketId);
      // MarketStatus.Active = 0
      expect(market.status).to.equal(0n);
      expect(market.bettingDeadline).to.equal(BigInt(newBettingDeadline));
      expect(market.resolutionDeadline).to.equal(BigInt(newResolutionDeadline));
    });

    it("TC-F11-05: resumeMarket 호출 시 MarketResumed 이벤트가 올바른 파라미터로 emit된다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      const newBettingDeadline = now + 86400 * 3;
      const newResolutionDeadline = now + 86400 * 6;

      const tx = await metaPool.resumeMarket(marketId, newBettingDeadline, newResolutionDeadline);
      await expect(tx)
        .to.emit(metaPool, "MarketResumed")
        .withArgs(BigInt(marketId), BigInt(newBettingDeadline), BigInt(newResolutionDeadline));
    });

    it("TC-F11-06: resumeMarket 후 베팅이 정상적으로 가능하다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      const newBettingDeadline = now + 86400 * 3;
      const newResolutionDeadline = now + 86400 * 6;

      await metaPool.resumeMarket(marketId, newBettingDeadline, newResolutionDeadline);

      // 재개 후 베팅 성공 확인 (revert 없이 처리)
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("100") });

      const bet = await metaPool.getUserBet(marketId, user1.address);
      expect(bet.amount).to.equal(ethers.parseEther("100"));
    });

    it("TC-F11-07: resumeMarket 후 재개된 마켓을 다시 pauseMarket 할 수 있다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      const newBettingDeadline = now + 86400 * 3;
      const newResolutionDeadline = now + 86400 * 6;

      await metaPool.resumeMarket(marketId, newBettingDeadline, newResolutionDeadline);

      // 다시 Pause
      await metaPool.pauseMarket(marketId);

      const market = await metaPool.getMarket(marketId);
      expect(market.status).to.equal(4n); // Paused
    });
  });

  // ----------------------------------------------------------
  // pauseMarket -- revert 케이스
  // ----------------------------------------------------------
  describe("pauseMarket -- revert 케이스", function () {

    it("TC-F11-08: 비관리자가 pauseMarket 호출 시 OwnableUnauthorizedAccount로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).pauseMarket(marketId)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });

    it("TC-F11-09: 미존재 마켓 pause 시 MarketNotFound로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.pauseMarket(999)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotFound")
        .withArgs(999n);
    });

    it("TC-F11-10: 이미 Paused 상태인 마켓을 pauseMarket 하면 MarketNotPausable로 revert된다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      await expect(
        metaPool.pauseMarket(marketId)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotPausable")
        .withArgs(marketId, 4n); // Paused = 4
    });

    it("TC-F11-11: Resolved 상태 마켓을 pauseMarket 하면 MarketNotPausable로 revert된다", async function () {
      const { metaPool, user1, user2, marketId, bettingDeadline } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      // 베팅 후 마켓 resolve
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1000") });
      await networkHelpers.time.increaseTo(bettingDeadline);
      await metaPool.resolveMarket(marketId, 1); // Yes

      await expect(
        metaPool.pauseMarket(marketId)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotPausable")
        .withArgs(marketId, 2n); // Resolved = 2
    });
  });

  // ----------------------------------------------------------
  // resumeMarket -- revert 케이스
  // ----------------------------------------------------------
  describe("resumeMarket -- revert 케이스", function () {

    it("TC-F11-12: 비관리자가 resumeMarket 호출 시 OwnableUnauthorizedAccount로 revert된다", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      await expect(
        metaPool.connect(user1).resumeMarket(marketId, now + 86400, now + 172800)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });

    it("TC-F11-13: Active 상태 마켓을 resumeMarket 하면 MarketNotPaused로 revert된다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const now = await networkHelpers.time.latest();
      await expect(
        metaPool.resumeMarket(marketId, now + 86400, now + 172800)
      ).to.be.revertedWithCustomError(metaPool, "MarketNotPaused")
        .withArgs(marketId, 0n); // Active = 0
    });

    it("TC-F11-14: resumeMarket에 과거 bettingDeadline 입력 시 InvalidDeadline으로 revert된다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      const pastDeadline = now - 1;
      const futureResolution = now + 172800;

      await expect(
        metaPool.resumeMarket(marketId, pastDeadline, futureResolution)
      ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
    });

    it("TC-F11-15: resumeMarket에 bettingDeadline >= resolutionDeadline 입력 시 InvalidDeadline으로 revert된다", async function () {
      const { metaPool, marketId } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.pauseMarket(marketId);

      const now = await networkHelpers.time.latest();
      const newBettingDeadline = now + 86400;
      const invalidResolutionDeadline = now + 86400; // bettingDeadline과 같음

      await expect(
        metaPool.resumeMarket(marketId, newBettingDeadline, invalidResolutionDeadline)
      ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
    });
  });
});

// ============================================================
// F-12: 설정 관리 테스트
// ============================================================

describe("MetaPool - F-12 설정 관리", function () {

  // ----------------------------------------------------------
  // setMinBet -- 정상 케이스
  // ----------------------------------------------------------
  describe("setMinBet -- 정상 케이스", function () {

    it("TC-F12-01: 관리자가 minBet을 유효한 값으로 변경할 수 있다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const newMinBet = ethers.parseEther("200");
      await metaPool.setMinBet(newMinBet);

      expect(await metaPool.minBet()).to.equal(newMinBet);
    });

    it("TC-F12-02: setMinBet 호출 시 SettingsUpdated 이벤트가 올바른 파라미터로 emit된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const oldMinBet = await metaPool.minBet();
      const newMinBet = ethers.parseEther("200");

      const tx = await metaPool.setMinBet(newMinBet);
      await expect(tx)
        .to.emit(metaPool, "SettingsUpdated")
        .withArgs("minBet", oldMinBet, newMinBet);
    });
  });

  // ----------------------------------------------------------
  // setMaxBet -- 정상 케이스
  // ----------------------------------------------------------
  describe("setMaxBet -- 정상 케이스", function () {

    it("TC-F12-03: 관리자가 maxBet을 유효한 값으로 변경할 수 있다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const newMaxBet = ethers.parseEther("200000");
      await metaPool.setMaxBet(newMaxBet);

      expect(await metaPool.maxBet()).to.equal(newMaxBet);
    });

    it("TC-F12-04: setMaxBet 호출 시 SettingsUpdated 이벤트가 올바른 파라미터로 emit된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const oldMaxBet = await metaPool.maxBet();
      const newMaxBet = ethers.parseEther("200000");

      const tx = await metaPool.setMaxBet(newMaxBet);
      await expect(tx)
        .to.emit(metaPool, "SettingsUpdated")
        .withArgs("maxBet", oldMaxBet, newMaxBet);
    });
  });

  // ----------------------------------------------------------
  // setPlatformFeeRate -- 정상 케이스
  // ----------------------------------------------------------
  describe("setPlatformFeeRate -- 정상 케이스", function () {

    it("TC-F12-05: 관리자가 platformFeeRate를 유효한 값으로 변경할 수 있다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const newFeeRate = 500; // 5%
      await metaPool.setPlatformFeeRate(newFeeRate);

      expect(await metaPool.platformFeeRate()).to.equal(BigInt(newFeeRate));
    });

    it("TC-F12-06: setPlatformFeeRate 호출 시 SettingsUpdated 이벤트가 올바른 파라미터로 emit된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const oldFeeRate = await metaPool.platformFeeRate();
      const newFeeRate = 500n;

      const tx = await metaPool.setPlatformFeeRate(newFeeRate);
      await expect(tx)
        .to.emit(metaPool, "SettingsUpdated")
        .withArgs("platformFeeRate", oldFeeRate, newFeeRate);
    });

    it("TC-F12-07: feeRate를 경계값 1000(10%)으로 설정할 수 있다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.setPlatformFeeRate(1000);

      expect(await metaPool.platformFeeRate()).to.equal(1000n);
    });

    it("TC-F12-08: feeRate를 0으로 설정할 수 있다 (수수료 없음)", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.setPlatformFeeRate(0);

      expect(await metaPool.platformFeeRate()).to.equal(0n);
    });
  });

  // ----------------------------------------------------------
  // withdrawFees + FeesWithdrawn 이벤트
  // ----------------------------------------------------------
  describe("withdrawFees -- FeesWithdrawn 이벤트", function () {

    it("TC-F12-09: withdrawFees 호출 시 FeesWithdrawn 이벤트가 emit된다", async function () {
      const { metaPool, owner, user1, user2, marketId, bettingDeadline } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      // 베팅 -> resolve -> 수수료 누적 (잔액 내 금액 사용)
      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1500") });
      await networkHelpers.time.increaseTo(bettingDeadline);
      await metaPool.resolveMarket(marketId, 1); // Yes 확정

      const accFees = await metaPool.accumulatedFees();
      expect(accFees).to.be.gt(0n);

      const tx = await metaPool.withdrawFees();
      await expect(tx)
        .to.emit(metaPool, "FeesWithdrawn")
        .withArgs(owner.address, accFees);
    });

    it("TC-F12-10: withdrawFees 후 accumulatedFees가 0으로 초기화된다", async function () {
      const { metaPool, user1, user2, marketId, bettingDeadline } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
      await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1500") });
      await networkHelpers.time.increaseTo(bettingDeadline);
      await metaPool.resolveMarket(marketId, 1);

      await metaPool.withdrawFees();

      expect(await metaPool.accumulatedFees()).to.equal(0n);
    });
  });

  // ----------------------------------------------------------
  // setMinBet -- revert 케이스
  // ----------------------------------------------------------
  describe("setMinBet -- revert 케이스", function () {

    it("TC-F12-11: 비관리자가 setMinBet 호출 시 OwnableUnauthorizedAccount로 revert된다", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).setMinBet(ethers.parseEther("200"))
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });

    it("TC-F12-12: minBet=0 설정 시 InvalidMinBet으로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.setMinBet(0)
      ).to.be.revertedWithCustomError(metaPool, "InvalidMinBet")
        .withArgs(0n);
    });

    it("TC-F12-13: minBet >= maxBet 설정 시 InvalidMinBet으로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const currentMaxBet = await metaPool.maxBet();

      await expect(
        metaPool.setMinBet(currentMaxBet)
      ).to.be.revertedWithCustomError(metaPool, "InvalidMinBet")
        .withArgs(currentMaxBet);
    });
  });

  // ----------------------------------------------------------
  // setMaxBet -- revert 케이스
  // ----------------------------------------------------------
  describe("setMaxBet -- revert 케이스", function () {

    it("TC-F12-14: 비관리자가 setMaxBet 호출 시 OwnableUnauthorizedAccount로 revert된다", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).setMaxBet(ethers.parseEther("200000"))
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });

    it("TC-F12-15: maxBet <= minBet 설정 시 InvalidMaxBet으로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const currentMinBet = await metaPool.minBet();

      await expect(
        metaPool.setMaxBet(currentMinBet)
      ).to.be.revertedWithCustomError(metaPool, "InvalidMaxBet")
        .withArgs(currentMinBet, currentMinBet);
    });

    it("TC-F12-16: maxBet을 minBet보다 1 wei 작은 값으로 설정 시 InvalidMaxBet으로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      const currentMinBet = await metaPool.minBet();
      const tooSmall = currentMinBet - 1n;

      await expect(
        metaPool.setMaxBet(tooSmall)
      ).to.be.revertedWithCustomError(metaPool, "InvalidMaxBet");
    });
  });

  // ----------------------------------------------------------
  // setPlatformFeeRate -- revert 케이스
  // ----------------------------------------------------------
  describe("setPlatformFeeRate -- revert 케이스", function () {

    it("TC-F12-17: 비관리자가 setPlatformFeeRate 호출 시 OwnableUnauthorizedAccount로 revert된다", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.connect(user1).setPlatformFeeRate(500)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });

    it("TC-F12-18: feeRate > 1000(10%) 설정 시 InvalidFeeRate로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.setPlatformFeeRate(1001)
      ).to.be.revertedWithCustomError(metaPool, "InvalidFeeRate")
        .withArgs(1001n);
    });

    it("TC-F12-19: feeRate = 9999 설정 시 InvalidFeeRate로 revert된다", async function () {
      const { metaPool } = await networkHelpers.loadFixture(deployAndCreateMarketFixture);

      await expect(
        metaPool.setPlatformFeeRate(9999)
      ).to.be.revertedWithCustomError(metaPool, "InvalidFeeRate")
        .withArgs(9999n);
    });
  });
});
