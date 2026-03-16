/**
 * 메인넷 배포 스크립트
 *
 * 실행:
 *   npx hardhat run scripts/deploy.js --network metadiumMainnet
 *
 * 파라미터:
 *   minBet:    100 META   (소액 베팅 스팸 방지)
 *   maxBet:    100,000 META (단일 대규모 조작 방지)
 *   feeRate:   200 (2%)
 *
 * 주의: DEPLOYER_PRIVATE_KEY 환경변수가 설정되어 있어야 합니다.
 *       .env 파일에 보관하고 절대 커밋하지 마세요.
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  // 배포자 계정 확인
  const [deployer] = await ethers.getSigners();

  console.log("==========================================================");
  console.log("MetaPool 메인넷 배포 시작");
  console.log("==========================================================");
  console.log(`배포자 주소:   ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`배포자 잔액:   ${ethers.formatEther(balance)} META`);
  console.log("----------------------------------------------------------");

  // 메인넷 배포 전 최종 확인 프롬프트 (잔액 충분 여부)
  const minBalanceForDeploy = ethers.parseEther("1"); // 최소 1 META 보유 필요
  if (balance < minBalanceForDeploy) {
    throw new Error(
      `배포자 잔액 부족: ${ethers.formatEther(balance)} META. 최소 1 META 이상 필요합니다.`
    );
  }

  // 배포 파라미터 (메인넷 운영)
  const minBet = ethers.parseEther("100");       // 100 META
  const maxBet = ethers.parseEther("100000");    // 100,000 META
  const feeRate = 200;                            // 2%

  console.log("배포 파라미터:");
  console.log(`  minBet:    ${ethers.formatEther(minBet)} META`);
  console.log(`  maxBet:    ${ethers.formatEther(maxBet)} META`);
  console.log(`  feeRate:   ${feeRate} basis points (${feeRate / 100}%)`);
  console.log("----------------------------------------------------------");

  // 컨트랙트 배포
  const MetaPool = await ethers.getContractFactory("MetaPool");
  console.log("컨트랙트 배포 중...");

  const metaPool = await MetaPool.deploy(
    deployer.address,
    minBet,
    maxBet,
    feeRate
  );

  await metaPool.waitForDeployment();

  const contractAddress = await metaPool.getAddress();

  // 배포 후 파라미터 검증
  const deployedOwner = await metaPool.owner();
  const deployedMinBet = await metaPool.minBet();
  const deployedMaxBet = await metaPool.maxBet();
  const deployedFeeRate = await metaPool.platformFeeRate();

  if (deployedOwner !== deployer.address) {
    throw new Error(`Owner 불일치: 예상 ${deployer.address}, 실제 ${deployedOwner}`);
  }
  if (deployedMinBet !== minBet) {
    throw new Error(`minBet 불일치: 예상 ${minBet}, 실제 ${deployedMinBet}`);
  }
  if (deployedMaxBet !== maxBet) {
    throw new Error(`maxBet 불일치: 예상 ${maxBet}, 실제 ${deployedMaxBet}`);
  }
  if (deployedFeeRate !== BigInt(feeRate)) {
    throw new Error(`feeRate 불일치: 예상 ${feeRate}, 실제 ${deployedFeeRate}`);
  }

  console.log("==========================================================");
  console.log("메인넷 배포 완료!");
  console.log("==========================================================");
  console.log(`컨트랙트 주소: ${contractAddress}`);
  console.log(`Owner:         ${deployedOwner}`);
  console.log(`minBet:        ${ethers.formatEther(deployedMinBet)} META`);
  console.log(`maxBet:        ${ethers.formatEther(deployedMaxBet)} META`);
  console.log(`feeRate:       ${deployedFeeRate} basis points`);
  console.log("----------------------------------------------------------");
  console.log("필수 후속 조치:");
  console.log("  1. 컨트랙트 주소를 frontend/src/lib/constants.js의");
  console.log("     MAINNET_CONTRACT_ADDRESS에 반영하세요.");
  console.log("  2. frontend/.env.production의 VITE_CONTRACT_ADDRESS를 갱신하세요.");
  console.log("  3. 프론트엔드를 재빌드 후 Vercel/Netlify에 배포하세요.");
  console.log("  4. 테스트 마켓 생성 후 전체 플로우 검증을 수행하세요.");
  console.log("==========================================================");

  return contractAddress;
}

main().catch((err) => {
  console.error("배포 실패:", err);
  process.exitCode = 1;
});
