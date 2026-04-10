/**
 * 샘플 마켓 대량 생성 스크립트 (로컬 개발용)
 * 실행: CONTRACT_ADDRESS=0x... npx hardhat run scripts/create-bulk-markets.js --network localhost
 */
import { network } from "hardhat";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const { ethers } = await network.connect();
const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
if (!CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS 환경변수 필요");

const { abi } = JSON.parse(readFileSync(
  resolve(__dirname, "../artifacts/contracts/MetaPool.sol/MetaPool.json"), "utf8"
));

const [signer] = await ethers.getSigners();
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

const block = await ethers.provider.getBlock("latest");
const now = block.timestamp;
const D = 86400;

const MARKETS = [
  // Crypto
  { q:"Will ETH reach $5,000 by end of 2026?",                           ko:"ETH가 2026년 말까지 5,000달러에 도달할까요?",                   zh:"ETH会在2026年底前达到5000美元吗？",                    ja:"ETHは2026年末までに5000ドルに達しますか？",               cat:0, bd:now+5*D,  rd:now+10*D },
  { q:"Will Solana surpass Ethereum in daily transactions in 2026?",      ko:"솔라나가 2026년 일일 거래량에서 이더리움을 넘어설까요?",          zh:"Solana会在2026年日交易量上超越以太坊吗？",                ja:"Solanaは2026年にイーサリアムの日次取引数を超えますか？",  cat:0, bd:now+10*D, rd:now+17*D },
  { q:"Will Bitcoin ETF AUM exceed $200B in 2026?",                       ko:"비트코인 ETF 운용자산이 2026년 2,000억 달러를 넘을까요?",        zh:"比特币ETF资产规模会在2026年超过2000亿美元吗？",            ja:"ビットコインETFのAUMは2026年に2000億ドルを超えますか？",  cat:0, bd:now+6*D,  rd:now+13*D },
  { q:"Will META token be listed on a major CEX in 2026?",               ko:"META 토큰이 2026년에 주요 CEX에 상장될까요?",                    zh:"META代币会在2026年在主要交易所上市吗？",                   ja:"METAトークンは2026年に主要なCEXに上場しますか？",          cat:0, bd:now+3*D,  rd:now+8*D  },

  // Sports
  { q:"Will Son Heung-min score 20+ Premier League goals in 2025/26?",    ko:"손흥민이 2025/26 프리미어리그에서 20골 이상 기록할까요?",        zh:"孙兴慜在2025/26英超能否打入20+球？",                       ja:"ソン・フンミンは2025/26PLで20ゴール以上を記録しますか？",  cat:1, bd:now+4*D,  rd:now+9*D  },
  { q:"Will Korea win a gold medal in football at 2028 LA Olympics?",     ko:"대한민국이 2028 LA 올림픽 남자 축구에서 금메달을 딸까요?",       zh:"韩国会在2028年洛杉矶奥运会男足中夺金吗？",                 ja:"韓国は2028年LAオリンピックのサッカーで金メダルを取りますか？", cat:1, bd:now+8*D, rd:now+15*D },
  { q:"Will the KBO regular season champion be Samsung Lions in 2026?",   ko:"2026년 KBO 정규시즌 우승팀이 삼성 라이온즈일까요?",             zh:"2026年KBO常规赛冠军会是三星狮子队吗？",                     ja:"2026年KBOペナントレースの優勝はサムスンライオンズですか？", cat:1, bd:now+2*D,  rd:now+7*D  },

  // Weather
  { q:"Will Seoul have 7+ consecutive heatwave days (35°C+) in Summer 2026?", ko:"2026년 여름 서울에서 35도 이상 폭염이 7일 이상 연속될까요?", zh:"2026年夏季首尔会出现连续7天以上热浪吗？",                  ja:"2026年夏のソウルで35°C以上が7日以上連続しますか？",        cat:2, bd:now+2*D,  rd:now+9*D  },
  { q:"Will Korea's 2026 monsoon start before June 15?",                  ko:"2026년 한국 장마가 6월 15일 이전에 시작될까요?",                zh:"2026年韩国梅雨季节会在6月15日前开始吗？",                   ja:"2026年の韓国の梅雨は6月15日より前に始まりますか？",         cat:2, bd:now+9*D,  rd:now+14*D },

  // Politics
  { q:"Will South Korea hold early presidential elections in 2026?",      ko:"대한민국에서 2026년 대통령 조기선거가 치러질까요?",              zh:"韩国会在2026年提前举行总统选举吗？",                        ja:"韓国で2026年に大統領選挙が前倒しで行われますか？",           cat:3, bd:now+5*D,  rd:now+12*D },
  { q:"Will the US Federal Reserve cut rates below 3% by end of 2026?",  ko:"미국 연준이 2026년 말까지 기준금리를 3% 미만으로 내릴까요?",    zh:"美联储会在2026年底前将利率降至3%以下吗？",                  ja:"FRBは2026年末までに政策金利を3%未満に引き下げますか？",     cat:3, bd:now+14*D, rd:now+21*D },

  // Entertainment
  { q:"Will a Korean film win the Palme d'Or at Cannes 2026?",           ko:"한국 영화가 2026년 칸 영화제 황금종려상을 수상할까요?",          zh:"韩国电影会在2026年戛纳获得金棕榈奖吗？",                    ja:"韓国映画が2026年カンヌでパルムドールを受賞しますか？",       cat:4, bd:now+12*D, rd:now+20*D },
  { q:"Will BTS release a full group album in 2026?",                     ko:"BTS가 2026년에 팀 전체 정규 앨범을 발매할까요?",                zh:"BTS会在2026年发布全体专辑吗？",                             ja:"BTSは2026年にグループフルアルバムをリリースしますか？",      cat:4, bd:now+7*D,  rd:now+14*D },
  { q:"Will Netflix reach 400M subscribers by end of 2026?",             ko:"넷플릭스가 2026년 말까지 4억 구독자를 달성할까요?",             zh:"Netflix会在2026年底前达到4亿订阅者吗？",                    ja:"Netflixは2026年末までに4億人の加入者を達成しますか？",      cat:4, bd:now+15*D, rd:now+22*D },

  // Other
  { q:"Will AI replace more than 10% of white-collar jobs in Korea by 2027?", ko:"AI가 2027년까지 한국 사무직의 10% 이상을 대체할까요?",     zh:"AI会在2027年前取代韩国10%以上白领工作吗？",                 ja:"AIは2027年までに韓国のホワイトカラーの10%以上を代替しますか？", cat:5, bd:now+11*D, rd:now+18*D },
  { q:"Will South Korea's total fertility rate exceed 1.0 in 2026?",     ko:"2026년 한국 합계출산율이 1.0을 초과할까요?",                    zh:"韩国2026年总和生育率会超过1.0吗？",                         ja:"韓国の2026年合計特殊出生率は1.0を超えますか？",              cat:5, bd:now+20*D, rd:now+30*D },
];

const CATS = ['Crypto','Sports','Weather','Politics','Entertainment','Other'];
console.log(`\n총 ${MARKETS.length}개 마켓 생성 시작...\n`);

for (let i = 0; i < MARKETS.length; i++) {
  const m = MARKETS[i];
  const tx = await contract.createMarket(m.q, m.ko, m.zh, m.ja, m.cat, m.bd, m.rd);
  await tx.wait();
  console.log(`[${String(i+1).padStart(2)}/${MARKETS.length}] ✓ [${CATS[m.cat].padEnd(13)}] ${m.ko}`);
}

const total = await contract.marketCount();
console.log(`\n완료! 총 마켓 수: ${total}개`);
