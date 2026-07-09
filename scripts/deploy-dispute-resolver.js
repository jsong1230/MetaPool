/**
 * C1 어댑터 (MetaPoolDisputeResolver) 배포 스크립트
 *
 * MetaPool의 이의제기(F-10)/재심(F-09)을 MetaStake OperatorRegistry의
 * operator majority vote로 판정하도록 연결한다.
 *
 * 실행:
 *   METAPOOL_ADDRESS=0x... \
 *   OPERATOR_REGISTRY_ADDRESS=0x... \
 *   DISPUTE_SERVICE_ID=1 \
 *   npx hardhat run scripts/deploy-dispute-resolver.js --network metadiumTestnet
 *
 * 사전 조건:
 *   - MetaPool(v2)가 배포되어 있어야 함 (disputeResolver setter 포함)
 *   - MetaStake OperatorRegistry에 dispute-resolver 서비스가 registerService 되어
 *     있고, operator들이 stake() 로 등록되어 있어야 함 (DISPUTE_SERVICE_ID)
 *   - 배포자가 MetaPool의 owner 여야 setDisputeResolver 호출 가능
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  const METAPOOL_ADDRESS = process.env.METAPOOL_ADDRESS;
  const OPERATOR_REGISTRY_ADDRESS = process.env.OPERATOR_REGISTRY_ADDRESS;
  const DISPUTE_SERVICE_ID = process.env.DISPUTE_SERVICE_ID ?? "1";

  if (!METAPOOL_ADDRESS || !OPERATOR_REGISTRY_ADDRESS) {
    throw new Error(
      "환경변수 METAPOOL_ADDRESS, OPERATOR_REGISTRY_ADDRESS 필요"
    );
  }

  const [deployer] = await ethers.getSigners();
  const serviceId = BigInt(DISPUTE_SERVICE_ID);

  console.log("==========================================================");
  console.log("C1 어댑터 (MetaPoolDisputeResolver) 배포");
  console.log("==========================================================");
  console.log(`배포자:            ${deployer.address}`);
  console.log(`잔액:              ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} META`);
  console.log(`MetaPool:          ${METAPOOL_ADDRESS}`);
  console.log(`OperatorRegistry:  ${OPERATOR_REGISTRY_ADDRESS}`);
  console.log(`serviceId:         ${serviceId}`);
  console.log("----------------------------------------------------------");

  // 어댑터 배포
  const Resolver = await ethers.getContractFactory("MetaPoolDisputeResolver");
  const resolver = await Resolver.deploy(
    deployer.address,
    METAPOOL_ADDRESS,
    OPERATOR_REGISTRY_ADDRESS,
    serviceId
  );
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log(`어댑터 배포 완료:  ${resolverAddress}`);

  // MetaPool에 disputeResolver 등록 (배포자 = MetaPool owner 필요)
  const metaPool = await ethers.getContractAt("MetaPool", METAPOOL_ADDRESS);
  const owner = await metaPool.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("----------------------------------------------------------");
    console.log(`⚠️  배포자가 MetaPool owner(${owner})가 아닙니다.`);
    console.log(`   owner가 아래를 직접 호출해야 합니다:`);
    console.log(`   metaPool.setDisputeResolver("${resolverAddress}")`);
  } else {
    const tx = await metaPool.setDisputeResolver(resolverAddress);
    await tx.wait();
    console.log(`setDisputeResolver 완료 (tx: ${tx.hash})`);
  }

  console.log("==========================================================");
  console.log("완료!");
  console.log(`  disputeResolver: ${await metaPool.disputeResolver()}`);
  console.log("----------------------------------------------------------");
  console.log("다음 단계:");
  console.log("  - OperatorRegistry에 dispute-resolver 서비스/operator 등록 확인");
  console.log("  - operator들이 voteDispute / voteReview 로 판정 참여");
  console.log("==========================================================");

  return resolverAddress;
}

main().catch((err) => {
  console.error("배포 실패:", err);
  process.exitCode = 1;
});
