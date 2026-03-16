/**
 * 테스트넷 배포 스크립트
 *
 * 실행:
 *   npx hardhat run scripts/deploy-testnet.js --network metadiumTestnet
 *   npx hardhat run scripts/deploy-testnet.js --network localhost
 *
 * 파라미터:
 *   minBet:    1 META  (테스트 편의를 위한 소액 설정)
 *   maxBet:    1,000 META
 *   feeRate:   200 (2%)
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  // 배포자 계정 확인
  const [deployer] = await ethers.getSigners();

  console.log("==========================================================");
  console.log("MetaPool 테스트넷 배포 시작");
  console.log("==========================================================");
  console.log(`배포자 주소:   ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`배포자 잔액:   ${ethers.formatEther(balance)} META`);
  console.log("----------------------------------------------------------");

  // 배포 파라미터 (테스트넷)
  const minBet = ethers.parseEther("1");        // 1 META
  const maxBet = ethers.parseEther("1000");     // 1,000 META
  const feeRate = 200;                           // 2%

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

  console.log("==========================================================");
  console.log("배포 완료!");
  console.log("==========================================================");
  console.log(`컨트랙트 주소: ${contractAddress}`);
  console.log(`Owner:         ${await metaPool.owner()}`);
  console.log(`minBet:        ${ethers.formatEther(await metaPool.minBet())} META`);
  console.log(`maxBet:        ${ethers.formatEther(await metaPool.maxBet())} META`);
  console.log(`feeRate:       ${await metaPool.platformFeeRate()} basis points`);
  console.log("----------------------------------------------------------");
  console.log("다음 단계:");
  console.log("  1. 위 컨트랙트 주소를 frontend/.env.development의");
  console.log("     VITE_CONTRACT_ADDRESS에 입력하세요.");
  console.log("  2. npx hardhat run scripts/create-test-markets.js --network metadiumTestnet");
  console.log("==========================================================");

  return contractAddress;
}

main().catch((err) => {
  console.error("배포 실패:", err);
  process.exitCode = 1;
});
