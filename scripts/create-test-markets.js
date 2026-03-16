/**
 * 테스트넷 샘플 마켓 생성 스크립트
 *
 * 실행:
 *   npx hardhat run scripts/create-test-markets.js --network metadiumTestnet
 *   npx hardhat run scripts/create-test-markets.js --network localhost
 *
 * 환경변수:
 *   CONTRACT_ADDRESS — 배포된 MetaPool 컨트랙트 주소 (deploy-testnet.js 결과)
 *
 * 생성 마켓:
 *   1. Crypto    — BTC $100K 돌파 여부
 *   2. Sports    — 축구 월드컵 우승 여부
 *   3. Politics  — 선거 결과 예측
 */

import { network } from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const { ethers } = await network.connect();

// ABI 로드 (Hardhat 컴파일 아티팩트)
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadAbi() {
  const artifactPath = resolve(
    __dirname,
    "../artifacts/contracts/MetaPool.sol/MetaPool.json"
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  return artifact.abi;
}

// 마켓 카테고리 상수 (MetaPool.sol Enum 순서와 일치)
const MarketCategory = {
  Crypto: 0,
  Sports: 1,
  Weather: 2,
  Politics: 3,
  Entertainment: 4,
  Other: 5,
};

// 테스트 마켓 정의 (3개, 카테고리 다양화)
function buildTestMarkets(now) {
  return [
    {
      // 마켓 1: Crypto — BTC $100K 돌파
      question: "Will BTC exceed $100K by end of 2026?",
      questionKo: "2026년 말까지 BTC가 10만 달러를 돌파할까요?",
      questionZh: "BTC会在2026年底前突破10万美元吗？",
      questionJa: "BTCは2026年末までに10万ドルを突破しますか？",
      category: MarketCategory.Crypto,
      bettingDeadline: now + 7 * 24 * 3600,      // 7일 후
      resolutionDeadline: now + 14 * 24 * 3600,  // 14일 후
    },
    {
      // 마켓 2: Sports — 한국 축구 월드컵 16강 진출
      question: "Will South Korea advance to the Round of 16 in the 2026 FIFA World Cup?",
      questionKo: "2026 FIFA 월드컵에서 대한민국이 16강에 진출할까요?",
      questionZh: "韩国队能否在2026年FIFA世界杯上晋级16强？",
      questionJa: "韓国は2026FIFAワールドカップでベスト16に進出できますか？",
      category: MarketCategory.Sports,
      bettingDeadline: now + 3 * 24 * 3600,      // 3일 후
      resolutionDeadline: now + 10 * 24 * 3600,  // 10일 후
    },
    {
      // 마켓 3: Politics — 미국 연방준비제도 금리 인하
      question: "Will the US Federal Reserve cut interest rates in Q1 2027?",
      questionKo: "미국 연방준비제도가 2027년 1분기에 금리를 인하할까요?",
      questionZh: "美联储将在2027年第一季度降息吗？",
      questionJa: "米連邦準備制度は2027年第1四半期に利下げを行いますか？",
      category: MarketCategory.Politics,
      bettingDeadline: now + 14 * 24 * 3600,     // 14일 후
      resolutionDeadline: now + 21 * 24 * 3600,  // 21일 후
    },
  ];
}

async function main() {
  const [deployer] = await ethers.getSigners();

  // 컨트랙트 주소: 환경변수 또는 args
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error(
      "CONTRACT_ADDRESS 환경변수가 설정되지 않았습니다.\n" +
      "예: CONTRACT_ADDRESS=0x... npx hardhat run scripts/create-test-markets.js --network metadiumTestnet"
    );
  }

  console.log("==========================================================");
  console.log("테스트 마켓 생성 시작");
  console.log("==========================================================");
  console.log(`컨트랙트 주소: ${contractAddress}`);
  console.log(`배포자 주소:   ${deployer.address}`);
  console.log("----------------------------------------------------------");

  const abi = loadAbi();
  const metaPool = new ethers.Contract(contractAddress, abi, deployer);

  // Owner 확인
  const owner = await metaPool.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `권한 없음: 현재 계정 ${deployer.address}은 Owner(${owner})가 아닙니다.`
    );
  }

  const block = await ethers.provider.getBlock("latest");
  const now = block.timestamp;
  const testMarkets = buildTestMarkets(now);

  const createdMarketIds = [];

  for (let i = 0; i < testMarkets.length; i++) {
    const m = testMarkets[i];
    const categoryLabel = Object.keys(MarketCategory).find(
      (k) => MarketCategory[k] === m.category
    );

    console.log(`[${i + 1}/${testMarkets.length}] 마켓 생성 중...`);
    console.log(`  카테고리: ${categoryLabel}`);
    console.log(`  질문(EN): ${m.question}`);
    console.log(`  질문(KO): ${m.questionKo}`);

    const tx = await metaPool.createMarket(
      m.question,
      m.questionKo,
      m.questionZh,
      m.questionJa,
      m.category,
      m.bettingDeadline,
      m.resolutionDeadline
    );

    const receipt = await tx.wait();

    // MarketCreated 이벤트에서 marketId 추출
    const marketCreatedEvent = receipt.logs
      .map((log) => {
        try {
          return metaPool.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "MarketCreated");

    const marketId = marketCreatedEvent
      ? marketCreatedEvent.args.marketId
      : await metaPool.marketCount();

    createdMarketIds.push(marketId);
    console.log(`  -> 마켓 ID: ${marketId}, tx: ${receipt.hash}`);
    console.log("");
  }

  console.log("==========================================================");
  console.log("테스트 마켓 생성 완료!");
  console.log("==========================================================");
  console.log(`생성된 마켓 ID: ${createdMarketIds.join(", ")}`);
  console.log(`총 마켓 수: ${await metaPool.marketCount()}`);
  console.log("==========================================================");
}

main().catch((err) => {
  console.error("마켓 생성 실패:", err);
  process.exitCode = 1;
});
