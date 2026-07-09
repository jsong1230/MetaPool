/**
 * C5 어댑터 설정 스크립트 — MetaPool 수수료 → MetaStake FeeDistributor 라우팅
 *
 * MetaPool(v3, setFeeDistributor/routeFees 포함)에 FeeDistributor를 연결하고,
 * 선택적으로 누적 수수료를 즉시 라우팅한다.
 *
 * 실행:
 *   METAPOOL_ADDRESS=0x8dc0... FEE_DISTRIBUTOR_ADDRESS=0x2654... [ROUTE_NOW=1] \
 *   npx hardhat run scripts/configure-fee-routing.js --network metadiumTestnet
 *
 * 사전 조건:
 *   - MetaPool이 v3(setFeeDistributor/routeFees)여야 함. 구버전(v2)이면 재배포 필요.
 *   - 배포자가 MetaPool owner여야 setFeeDistributor 호출 가능.
 */
import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const METAPOOL = process.env.METAPOOL_ADDRESS;
  const FEE_DISTRIBUTOR = process.env.FEE_DISTRIBUTOR_ADDRESS;
  const ROUTE_NOW = process.env.ROUTE_NOW === "1";
  if (!METAPOOL || !FEE_DISTRIBUTOR) {
    throw new Error("환경변수 METAPOOL_ADDRESS, FEE_DISTRIBUTOR_ADDRESS 필요");
  }

  const [signer] = await ethers.getSigners();
  const metaPool = await ethers.getContractAt("MetaPool", METAPOOL);

  console.log("==========================================================");
  console.log("C5: MetaPool 수수료 라우팅 설정");
  console.log("==========================================================");
  console.log("caller:          ", signer.address);
  console.log("MetaPool:        ", METAPOOL);
  console.log("FeeDistributor:  ", FEE_DISTRIBUTOR);

  const owner = await metaPool.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log(`⚠️  caller가 MetaPool owner(${owner})가 아닙니다. owner가 setFeeDistributor를 호출해야 합니다.`);
    return;
  }

  const tx = await metaPool.setFeeDistributor(FEE_DISTRIBUTOR);
  await tx.wait();
  console.log("setFeeDistributor 완료. feeDistributor =", await metaPool.feeDistributor());

  const accrued = await metaPool.accumulatedFees();
  console.log("현재 accumulatedFees:", ethers.formatEther(accrued), "META");

  if (ROUTE_NOW && accrued > 0n) {
    const rt = await metaPool.routeFees();
    await rt.wait();
    console.log("routeFees 완료 (tx:", rt.hash + ") →", ethers.formatEther(accrued), "META를 FeeDistributor로 전송");
  } else if (ROUTE_NOW) {
    console.log("ROUTE_NOW=1이지만 누적 수수료가 0이라 라우팅 생략");
  } else {
    console.log("설정만 완료. 라우팅은 routeFees() 호출 시 (permissionless, keeper 가능)");
  }
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("실패:", err);
  process.exitCode = 1;
});
