import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// 공통 상수
// ============================================================

const DISPUTE_STAKE = ethers.parseEther("1000");
const SERVICE_ID = 1n;

// MarketOutcome enum: Undecided=0, Yes=1, No=2, Void=3
const Outcome = { Undecided: 0, Yes: 1, No: 2, Void: 3 };

// ============================================================
// Fixtures
// ============================================================

async function baseFixture() {
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const user1 = signers[1];
  const user2 = signers[2];
  const operators = signers.slice(3, 8); // op0~op4 (최대 5명)

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(
    owner.address,
    ethers.parseEther("100"),
    ethers.parseEther("100000"),
    200 // 2%
  );

  const Registry = await ethers.getContractFactory("MockOperatorRegistry");
  const registry = await Registry.deploy();

  const Resolver = await ethers.getContractFactory("MetaPoolDisputeResolver");
  const resolver = await Resolver.deploy(
    owner.address,
    await metaPool.getAddress(),
    await registry.getAddress(),
    SERVICE_ID
  );

  // 어댑터를 disputeResolver로 등록
  await metaPool.connect(owner).setDisputeResolver(await resolver.getAddress());

  // N명 operator 활성화 헬퍼
  async function activateOperators(n) {
    for (let i = 0; i < n; i++) {
      await registry.setOperator(SERVICE_ID, operators[i].address, true);
    }
  }

  return { metaPool, registry, resolver, owner, user1, user2, operators, activateOperators };
}

/**
 * Yes 확정 + user2(패자, No)가 이의 제출한 상태 (베팅자 2명이라 underReview 미발동)
 */
async function disputedMarketFixture() {
  const base = await baseFixture();
  const { metaPool, owner, user1, user2 } = base;

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 3600;
  await metaPool.createMarket("Q?", "", "", "", 0, bettingDeadline, now + 86400);
  const marketId = 1n;

  await metaPool.connect(user1).placeBet(marketId, true, { value: ethers.parseEther("1000") });
  await metaPool.connect(user2).placeBet(marketId, false, { value: ethers.parseEther("1500") });

  await networkHelpers.time.increaseTo(bettingDeadline + 1);
  await metaPool.connect(owner).resolveMarket(marketId, Outcome.Yes);

  // user2가 이의 제출
  await metaPool.connect(user2).submitDispute(marketId, { value: DISPUTE_STAKE });

  return { ...base, marketId };
}

/**
 * 10명 베팅 + 1건 이의로 underReview 발동된 상태 (재심 투표용)
 */
async function reviewMarketFixture() {
  const base = await baseFixture();
  const { metaPool, owner } = base;
  const signers = await ethers.getSigners();
  const bettors = signers.slice(8, 18); // 10명 (operators 3~7과 겹치지 않음)

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 3600;
  await metaPool.createMarket("Q?", "", "", "", 0, bettingDeadline, now + 86400);
  const marketId = 1n;

  for (let i = 0; i < 10; i++) {
    await metaPool.connect(bettors[i]).placeBet(marketId, true, { value: ethers.parseEther("100") });
  }

  await networkHelpers.time.increaseTo(bettingDeadline + 1);
  await metaPool.connect(owner).resolveMarket(marketId, Outcome.Yes);

  // 10% 임계값 = 1명 → 1건 이의로 underReview 발동
  await metaPool.connect(bettors[0]).submitDispute(marketId, { value: DISPUTE_STAKE });

  const market = await metaPool.getMarket(marketId);
  expect(market.underReview).to.equal(true);

  return { ...base, marketId, bettors };
}

// ============================================================
// 테스트
// ============================================================

describe("C1 Adapter — MetaPoolDisputeResolver", function () {

  // ----------------------------------------------------------
  // MetaPool v2: disputeResolver 권한
  // ----------------------------------------------------------
  describe("MetaPool v2: disputeResolver 권한", function () {

    it("owner가 setDisputeResolver 호출 → 저장 + 이벤트", async function () {
      const { metaPool, owner, resolver } = await networkHelpers.loadFixture(baseFixture);
      const addr = await resolver.getAddress();
      expect(await metaPool.disputeResolver()).to.equal(addr);

      await expect(metaPool.connect(owner).setDisputeResolver(ethers.ZeroAddress))
        .to.emit(metaPool, "DisputeResolverUpdated")
        .withArgs(addr, ethers.ZeroAddress);
      expect(await metaPool.disputeResolver()).to.equal(ethers.ZeroAddress);
    });

    it("non-owner의 setDisputeResolver는 revert", async function () {
      const { metaPool, user1 } = await networkHelpers.loadFixture(baseFixture);
      await expect(
        metaPool.connect(user1).setDisputeResolver(user1.address)
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });

    it("어댑터/owner 외 주소가 resolveDispute 호출 시 NotAuthorizedResolver", async function () {
      const { metaPool, user1, marketId } = await networkHelpers.loadFixture(disputedMarketFixture);
      await expect(
        metaPool.connect(user1).resolveDispute(marketId, user1.address, true)
      ).to.be.revertedWithCustomError(metaPool, "NotAuthorizedResolver");
    });

    it("owner는 여전히 직접 resolveDispute 호출 가능", async function () {
      const { metaPool, owner, user2, marketId } = await networkHelpers.loadFixture(disputedMarketFixture);
      await expect(metaPool.connect(owner).resolveDispute(marketId, user2.address, true))
        .to.emit(metaPool, "DisputeResolved");
    });
  });

  // ----------------------------------------------------------
  // voteDispute (F-10)
  // ----------------------------------------------------------
  describe("voteDispute — operator majority", function () {

    it("non-operator 투표는 NotActiveOperator", async function () {
      const { resolver, user1, marketId, user2 } = await networkHelpers.loadFixture(disputedMarketFixture);
      await expect(
        resolver.connect(user1).voteDispute(marketId, user2.address, true)
      ).to.be.revertedWithCustomError(resolver, "NotActiveOperator");
    });

    it("operator 1명(과반=1) → 즉시 인정 실행 + 스테이크 반환", async function () {
      const { metaPool, resolver, operators, activateOperators, user2, marketId } =
        await networkHelpers.loadFixture(disputedMarketFixture);
      await activateOperators(1);

      const before = await ethers.provider.getBalance(user2.address);
      await expect(resolver.connect(operators[0]).voteDispute(marketId, user2.address, true))
        .to.emit(resolver, "DisputeExecuted").withArgs(marketId, user2.address, true)
        .to.emit(metaPool, "DisputeResolved");

      const dispute = await metaPool.getDispute(marketId, user2.address);
      expect(dispute.resolved).to.equal(true);
      expect(dispute.accepted).to.equal(true);
      const after = await ethers.provider.getBalance(user2.address);
      expect(after - before).to.equal(DISPUTE_STAKE); // user2는 tx 안 보냈으므로 정확히 반환액
    });

    it("operator 3명: 2표 모여야 실행 (1표는 미실행)", async function () {
      const { metaPool, resolver, operators, activateOperators, user2, marketId } =
        await networkHelpers.loadFixture(disputedMarketFixture);
      await activateOperators(3);

      // 1표 — 아직 미실행
      await resolver.connect(operators[0]).voteDispute(marketId, user2.address, true);
      let dispute = await metaPool.getDispute(marketId, user2.address);
      expect(dispute.resolved).to.equal(false);

      // 2표 — 과반(2*2>3) 실행
      await expect(resolver.connect(operators[1]).voteDispute(marketId, user2.address, true))
        .to.emit(resolver, "DisputeExecuted");
      dispute = await metaPool.getDispute(marketId, user2.address);
      expect(dispute.resolved).to.equal(true);
    });

    it("과반 기각 → resolveDispute(false), 스테이크 몰수", async function () {
      const { metaPool, resolver, operators, activateOperators, user2, marketId } =
        await networkHelpers.loadFixture(disputedMarketFixture);
      await activateOperators(1);

      const feesBefore = await metaPool.accumulatedFees();
      await resolver.connect(operators[0]).voteDispute(marketId, user2.address, false);

      const dispute = await metaPool.getDispute(marketId, user2.address);
      expect(dispute.resolved).to.equal(true);
      expect(dispute.accepted).to.equal(false);
      expect(await metaPool.accumulatedFees()).to.equal(feesBefore + DISPUTE_STAKE);
    });

    it("동일 operator 중복 투표는 AlreadyVoted", async function () {
      const { resolver, operators, activateOperators, user2, marketId } =
        await networkHelpers.loadFixture(disputedMarketFixture);
      await activateOperators(3);
      await resolver.connect(operators[0]).voteDispute(marketId, user2.address, true);
      await expect(
        resolver.connect(operators[0]).voteDispute(marketId, user2.address, true)
      ).to.be.revertedWithCustomError(resolver, "AlreadyVoted");
    });

    it("실행 후 추가 투표는 AlreadyExecuted", async function () {
      const { resolver, operators, activateOperators, user2, marketId } =
        await networkHelpers.loadFixture(disputedMarketFixture);
      await activateOperators(3);
      await resolver.connect(operators[0]).voteDispute(marketId, user2.address, true);
      await resolver.connect(operators[1]).voteDispute(marketId, user2.address, true); // 실행됨
      await expect(
        resolver.connect(operators[2]).voteDispute(marketId, user2.address, true)
      ).to.be.revertedWithCustomError(resolver, "AlreadyExecuted");
    });
  });

  // ----------------------------------------------------------
  // voteReview (F-09)
  // ----------------------------------------------------------
  describe("voteReview — operator majority", function () {

    it("Undecided 투표는 InvalidOutcome", async function () {
      const { resolver, operators, activateOperators, marketId } =
        await networkHelpers.loadFixture(reviewMarketFixture);
      await activateOperators(1);
      await expect(
        resolver.connect(operators[0]).voteReview(marketId, Outcome.Undecided)
      ).to.be.revertedWithCustomError(resolver, "InvalidOutcome");
    });

    it("과반 No → resolveReview 실행, 마켓 재확정 + underReview 해제", async function () {
      const { metaPool, resolver, operators, activateOperators, marketId } =
        await networkHelpers.loadFixture(reviewMarketFixture);
      await activateOperators(3);

      await resolver.connect(operators[0]).voteReview(marketId, Outcome.No);
      let market = await metaPool.getMarket(marketId);
      expect(market.underReview).to.equal(true); // 1표 미실행

      await expect(resolver.connect(operators[1]).voteReview(marketId, Outcome.No))
        .to.emit(resolver, "ReviewExecuted").withArgs(marketId, Outcome.No);

      market = await metaPool.getMarket(marketId);
      expect(market.underReview).to.equal(false);
      expect(market.outcome).to.equal(Outcome.No);
      expect(await resolver.reviewExecuted(marketId)).to.equal(true);
    });

    it("서로 다른 outcome 분산 투표는 과반 미달로 미실행", async function () {
      const { metaPool, resolver, operators, activateOperators, marketId } =
        await networkHelpers.loadFixture(reviewMarketFixture);
      await activateOperators(3);
      await resolver.connect(operators[0]).voteReview(marketId, Outcome.No);
      await resolver.connect(operators[1]).voteReview(marketId, Outcome.Void);
      const market = await metaPool.getMarket(marketId);
      expect(market.underReview).to.equal(true); // 어느 쪽도 과반 아님
      expect(await resolver.reviewExecuted(marketId)).to.equal(false);
    });

    it("재심 중복 투표는 AlreadyVoted", async function () {
      const { resolver, operators, activateOperators, marketId } =
        await networkHelpers.loadFixture(reviewMarketFixture);
      await activateOperators(3);
      await resolver.connect(operators[0]).voteReview(marketId, Outcome.No);
      await expect(
        resolver.connect(operators[0]).voteReview(marketId, Outcome.Void)
      ).to.be.revertedWithCustomError(resolver, "AlreadyVoted");
    });
  });
});
