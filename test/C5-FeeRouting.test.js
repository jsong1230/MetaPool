import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// Fixtures
// ============================================================

async function deployFixture() {
  const [owner, user1, user2, keeper] = await ethers.getSigners();
  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(
    owner.address,
    ethers.parseEther("100"),
    ethers.parseEther("100000"),
    200 // 2%
  );
  const fd = await (await ethers.getContractFactory("MockFeeDistributor")).deploy();
  return { metaPool, fd, owner, user1, user2, keeper };
}

/**
 * 수수료가 누적된 상태 fixture.
 * user1 Yes 1000, user2 No 1500, Yes 확정 → 패자풀(No 1500)의 2% = 30 META 누적
 */
async function feeAccruedFixture() {
  const base = await deployFixture();
  const { metaPool, owner, user1, user2 } = base;
  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 3600;
  await metaPool.createMarket("Q?", "", "", "", 0, bettingDeadline, now + 86400);
  await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("1000") });
  await metaPool.connect(user2).placeBet(1, false, { value: ethers.parseEther("1500") });
  await networkHelpers.time.increaseTo(bettingDeadline + 1);
  await metaPool.connect(owner).resolveMarket(1, 1); // Yes 확정
  return { ...base, expectedFee: ethers.parseEther("30") };
}

// ============================================================
// 테스트
// ============================================================

describe("C5 Adapter — MetaPool 수수료 → FeeDistributor", function () {

  describe("setFeeDistributor", function () {
    it("owner가 설정 → 저장 + 이벤트", async function () {
      const { metaPool, fd, owner } = await networkHelpers.loadFixture(deployFixture);
      const addr = await fd.getAddress();
      await expect(metaPool.connect(owner).setFeeDistributor(addr))
        .to.emit(metaPool, "FeeDistributorUpdated")
        .withArgs(ethers.ZeroAddress, addr);
      expect(await metaPool.feeDistributor()).to.equal(addr);
    });

    it("non-owner는 revert", async function () {
      const { metaPool, fd, user1 } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        metaPool.connect(user1).setFeeDistributor(await fd.getAddress())
      ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount");
    });
  });

  describe("routeFees", function () {
    it("FeeDistributor 미설정 시 FeeDistributorNotSet", async function () {
      const { metaPool } = await networkHelpers.loadFixture(feeAccruedFixture);
      await expect(metaPool.routeFees()).to.be.revertedWithCustomError(metaPool, "FeeDistributorNotSet");
    });

    it("누적 수수료 0이면 NoFeesToRoute", async function () {
      const { metaPool, fd, owner } = await networkHelpers.loadFixture(deployFixture);
      await metaPool.connect(owner).setFeeDistributor(await fd.getAddress());
      await expect(metaPool.routeFees()).to.be.revertedWithCustomError(metaPool, "NoFeesToRoute");
    });

    it("누적 수수료를 FeeDistributor로 전송 + accumulatedFees=0 + 이벤트", async function () {
      const { metaPool, fd, owner, expectedFee } = await networkHelpers.loadFixture(feeAccruedFixture);
      const fdAddr = await fd.getAddress();
      expect(await metaPool.accumulatedFees()).to.equal(expectedFee);

      await metaPool.connect(owner).setFeeDistributor(fdAddr);
      await expect(metaPool.routeFees())
        .to.emit(metaPool, "FeesRouted").withArgs(fdAddr, expectedFee);

      expect(await metaPool.accumulatedFees()).to.equal(0n);
      expect(await ethers.provider.getBalance(fdAddr)).to.equal(expectedFee);
      expect(await fd.totalReceived()).to.equal(expectedFee);
      expect(await fd.depositCalls()).to.equal(1n);
    });

    it("permissionless — non-owner(keeper)도 호출 가능", async function () {
      const { metaPool, fd, owner, keeper, expectedFee } = await networkHelpers.loadFixture(feeAccruedFixture);
      await metaPool.connect(owner).setFeeDistributor(await fd.getAddress());
      await metaPool.connect(keeper).routeFees();
      expect(await fd.totalReceived()).to.equal(expectedFee);
      expect(await metaPool.accumulatedFees()).to.equal(0n);
    });

    it("route 후 재호출은 NoFeesToRoute (이중 인출 방지)", async function () {
      const { metaPool, fd, owner } = await networkHelpers.loadFixture(feeAccruedFixture);
      await metaPool.connect(owner).setFeeDistributor(await fd.getAddress());
      await metaPool.routeFees();
      await expect(metaPool.routeFees()).to.be.revertedWithCustomError(metaPool, "NoFeesToRoute");
    });
  });

  describe("withdrawFees (기존 동작 불변)", function () {
    it("owner는 여전히 직접 회수 가능 (FeeDistributor 설정과 무관)", async function () {
      const { metaPool, fd, owner, expectedFee } = await networkHelpers.loadFixture(feeAccruedFixture);
      await metaPool.connect(owner).setFeeDistributor(await fd.getAddress());
      // routeFees 대신 owner가 withdrawFees 선택
      await expect(metaPool.connect(owner).withdrawFees())
        .to.emit(metaPool, "FeesWithdrawn").withArgs(owner.address, expectedFee);
      expect(await metaPool.accumulatedFees()).to.equal(0n);
      expect(await fd.totalReceived()).to.equal(0n); // FeeDistributor로 안 감
    });
  });
});
