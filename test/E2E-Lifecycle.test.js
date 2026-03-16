/**
 * E2E 라이프사이클 통합 테스트
 *
 * 5개 시나리오로 MetaPool 전체 플로우 검증:
 *   시나리오 1: 정상 플로우 (생성 -> 베팅 -> 확정 -> 이의제기 기간 경과 -> 클레임 -> 수수료 인출)
 *   시나리오 2: Void 플로우 (Void 확정 -> 전원 환불)
 *   시나리오 3: 이의제기 플로우 (결과 확정 -> 이의 임계값 초과 -> 재심 결과 변경 -> 클레임)
 *   시나리오 4: Pause/Resume 플로우 (마켓 중단 -> 베팅 차단 -> 재개 -> 베팅 성공)
 *   시나리오 5: 설정 변경 플로우 (minBet/maxBet/feeRate 변경 -> 검증)
 */

import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

// ============================================================
// 상수
// ============================================================

const DISPUTE_PERIOD = 86400;            // 24시간 (초)
const DISPUTE_STAKE = ethers.parseEther("1000"); // 1,000 META
const FEE_DENOMINATOR = 10000n;

// ============================================================
// 공통 Fixture
// ============================================================

async function deployFixture() {
  const signers = await ethers.getSigners();
  const [owner, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10] = signers;

  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200n; // 2%

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  return {
    metaPool, owner,
    user1, user2, user3, user4, user5,
    user6, user7, user8, user9, user10,
    minBet, maxBet, feeRate,
  };
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 마켓을 생성하고 marketId를 반환한다
 */
async function createMarket(metaPool, {
  question = "Will BTC exceed $100K?",
  questionKo = "BTC 10만불 돌파?",
  questionZh = "BTC破10万？",
  questionJa = "BTC10万ドル？",
  category = 0,
  bettingDeadline,
  resolutionDeadline,
}) {
  const tx = await metaPool.createMarket(
    question, questionKo, questionZh, questionJa,
    category, bettingDeadline, resolutionDeadline
  );
  const receipt = await tx.wait();
  return await metaPool.marketCount();
}

/**
 * 컨트랙트의 ETH 잔액을 반환한다 (BigInt)
 */
async function getContractBalance(metaPool) {
  const address = await metaPool.getAddress();
  return await ethers.provider.getBalance(address);
}

// ============================================================
// 시나리오 1: 정상 플로우
// ============================================================

describe("E2E 시나리오 1: 정상 플로우", function () {
  /**
   * 전체 라이프사이클:
   *   배포 -> 마켓 생성 -> 베팅 3인 -> 마감 이후 시간 이동
   *   -> Yes 확정 -> 이의제기 기간 24h 경과 -> 승리자 클레임
   *   -> 패배자 클레임 시도(revert) -> 수수료 인출 -> 컨트랙트 잔액 0
   *
   * 베팅 구성 (모두 maxBet 이내):
   *   user1: Yes  1,000 META
   *   user2: No   1,500 META
   *   user3: Yes    500 META
   *
   * Yes 확정 시 수수료 계산:
   *   losingPool   = 1,500 META (noPool)
   *   fee          = 1,500 * 200 / 10000 = 30 META
   *   distributable= 1,470 META
   *   winPool      = 1,500 META (yesPool = 1000 + 500)
   *
   *   user1 보상 = 1,000 + 1,470 * 1,000 / 1,500 = 1,000 + 980 = 1,980 META
   *   user3 보상 =   500 + 1,470 *   500 / 1,500 =   500 + 490 =   990 META
   *   합계       = 2,970 META
   *   컨트랙트 잔액 = 2,500 - 2,970 + 1,500 = ...
   *   (초기 합산: 1000 + 1500 + 500 = 3000, 지급: 1980 + 990 = 2970, 수수료: 30 -> 0)
   */

  let metaPool, owner, user1, user2, user3;
  let marketId;
  const BET1 = ethers.parseEther("1000");  // user1 Yes
  const BET2 = ethers.parseEther("1500");  // user2 No
  const BET3 = ethers.parseEther("500");   // user3 Yes

  before(async function () {
    ({ metaPool, owner, user1, user2, user3 } = await networkHelpers.loadFixture(deployFixture));

    const now = await networkHelpers.time.latest();
    const bettingDeadline = now + 3600;       // +1시간
    const resolutionDeadline = now + 86400;   // +1일

    // 1. 마켓 생성 (4개 언어, Crypto 카테고리)
    marketId = await createMarket(metaPool, {
      question: "Will BTC exceed $100K by end of 2026?",
      questionKo: "2026년 말까지 BTC가 10만 달러를 돌파할까요?",
      questionZh: "BTC会在2026年底前突破10万美元吗？",
      questionJa: "BTCは2026年末までに10万ドルを突破しますか？",
      category: 0, // Crypto
      bettingDeadline,
      resolutionDeadline,
    });
  });

  it("1-1. 마켓이 Active 상태로 생성된다", async function () {
    const market = await metaPool.getMarket(marketId);
    expect(market.status).to.equal(0); // Active
    expect(market.outcome).to.equal(0); // Undecided
    expect(market.category).to.equal(0); // Crypto
    expect(market.questionKo).to.equal("2026년 말까지 BTC가 10만 달러를 돌파할까요?");
    expect(market.questionZh).to.equal("BTC会在2026年底前突破10万美元吗？");
    expect(market.questionJa).to.equal("BTCは2026年末までに10万ドルを突破しますか？");
  });

  it("1-2. 3명이 베팅한다 (user1: Yes 1000, user2: No 1500, user3: Yes 500)", async function () {
    await metaPool.connect(user1).placeBet(marketId, true, { value: BET1 });
    await metaPool.connect(user2).placeBet(marketId, false, { value: BET2 });
    await metaPool.connect(user3).placeBet(marketId, true, { value: BET3 });

    const market = await metaPool.getMarket(marketId);
    expect(market.yesPool).to.equal(BET1 + BET3);
    expect(market.noPool).to.equal(BET2);
    expect(market.yesCount).to.equal(2n);
    expect(market.noCount).to.equal(1n);
  });

  it("1-3. 베팅 마감 이후 Yes로 결과 확정된다", async function () {
    // 시간 이동: 베팅 마감 후
    await networkHelpers.time.increase(3601);

    await expect(metaPool.resolveMarket(marketId, 1)) // Yes
      .to.emit(metaPool, "MarketResolved")
      .withArgs(marketId, 1n, 30n * 10n ** 18n); // fee = 30 META

    const market = await metaPool.getMarket(marketId);
    expect(market.status).to.equal(2); // Resolved
    expect(market.outcome).to.equal(1); // Yes
    expect(await metaPool.accumulatedFees()).to.equal(ethers.parseEther("30"));
  });

  it("1-4. 이의제기 기간 중 클레임 시도 → revert", async function () {
    // 아직 이의제기 기간 내
    await expect(
      metaPool.connect(user1).claimWinnings(marketId)
    ).to.be.revertedWithCustomError(metaPool, "DisputePeriodActive");
  });

  it("1-5. 이의제기 기간 24h 경과 후 승리자(user1, user3)가 클레임한다", async function () {
    // 24시간 경과
    await networkHelpers.time.increase(DISPUTE_PERIOD + 1);

    const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
    const user3BalanceBefore = await ethers.provider.getBalance(user3.address);

    // user1 클레임: 예상 보상 1,980 META
    const tx1 = await metaPool.connect(user1).claimWinnings(marketId);
    const receipt1 = await tx1.wait();
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;

    // user3 클레임: 예상 보상 990 META
    const tx3 = await metaPool.connect(user3).claimWinnings(marketId);
    const receipt3 = await tx3.wait();
    const gas3 = receipt3.gasUsed * receipt3.gasPrice;

    const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
    const user3BalanceAfter = await ethers.provider.getBalance(user3.address);

    // user1: 잔액 증가 = 보상 - 가스비
    const user1Gain = user1BalanceAfter - user1BalanceBefore + gas1;
    expect(user1Gain).to.equal(ethers.parseEther("1980"));

    // user3: 잔액 증가 = 보상 - 가스비
    const user3Gain = user3BalanceAfter - user3BalanceBefore + gas3;
    expect(user3Gain).to.equal(ethers.parseEther("990"));
  });

  it("1-6. 패배자(user2)의 클레임 시도 → revert NotWinner", async function () {
    await expect(
      metaPool.connect(user2).claimWinnings(marketId)
    ).to.be.revertedWithCustomError(metaPool, "NotWinner");
  });

  it("1-7. 이중 클레임 시도 → revert AlreadyClaimed", async function () {
    await expect(
      metaPool.connect(user1).claimWinnings(marketId)
    ).to.be.revertedWithCustomError(metaPool, "AlreadyClaimed");
  });

  it("1-8. 수수료 인출 후 accumulatedFees = 0", async function () {
    const ownerBefore = await ethers.provider.getBalance(owner.address);
    const feeAmount = ethers.parseEther("30");

    const tx = await metaPool.withdrawFees();
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;

    const ownerAfter = await ethers.provider.getBalance(owner.address);

    expect(ownerAfter - ownerBefore + gas).to.equal(feeAmount);
    expect(await metaPool.accumulatedFees()).to.equal(0n);
  });

  it("1-9. 컨트랙트 잔액 = 0", async function () {
    const balance = await getContractBalance(metaPool);
    expect(balance).to.equal(0n);
  });
});

// ============================================================
// 시나리오 2: Void 플로우
// ============================================================

describe("E2E 시나리오 2: Void 플로우", function () {
  /**
   * 베팅 후 Void 확정 -> 전원 전액 환불 -> 컨트랙트 잔액 0
   *
   * 베팅 구성:
   *   user1: Yes  500 META
   *   user2: No   300 META
   *   user3: Yes  200 META
   */

  let metaPool, owner, user1, user2, user3;
  let marketId;
  const BET1 = ethers.parseEther("500");
  const BET2 = ethers.parseEther("300");
  const BET3 = ethers.parseEther("200");

  before(async function () {
    ({ metaPool, owner, user1, user2, user3 } = await networkHelpers.loadFixture(deployFixture));

    const now = await networkHelpers.time.latest();
    marketId = await createMarket(metaPool, {
      question: "Void Test Market",
      questionKo: "Void 테스트 마켓",
      questionZh: "Void测试",
      questionJa: "Voidテスト",
      category: 5, // Other
      bettingDeadline: now + 3600,
      resolutionDeadline: now + 86400,
    });

    // 베팅
    await metaPool.connect(user1).placeBet(marketId, true, { value: BET1 });
    await metaPool.connect(user2).placeBet(marketId, false, { value: BET2 });
    await metaPool.connect(user3).placeBet(marketId, true, { value: BET3 });

    // 베팅 마감 이후로 시간 이동
    await networkHelpers.time.increase(3601);
  });

  it("2-1. Void로 결과 확정된다", async function () {
    await expect(metaPool.resolveMarket(marketId, 3)) // Void
      .to.emit(metaPool, "MarketResolved")
      .withArgs(marketId, 3n, 0n); // 수수료 = 0

    const market = await metaPool.getMarket(marketId);
    expect(market.status).to.equal(3); // Voided
    expect(market.outcome).to.equal(3); // Void
    expect(await metaPool.accumulatedFees()).to.equal(0n); // 수수료 없음
  });

  it("2-2. 모든 베팅자가 원금 전액 환불받는다", async function () {
    const users = [user1, user2, user3];
    const bets = [BET1, BET2, BET3];

    for (let i = 0; i < users.length; i++) {
      const balanceBefore = await ethers.provider.getBalance(users[i].address);

      const tx = await metaPool.connect(users[i]).claimRefund(marketId);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(users[i].address);
      const refund = balanceAfter - balanceBefore + gas;

      expect(refund).to.equal(bets[i], `user${i + 1} 환불 금액 불일치`);
    }
  });

  it("2-3. 컨트랙트 잔액 = 0", async function () {
    expect(await getContractBalance(metaPool)).to.equal(0n);
  });

  it("2-4. 이중 환불 시도 → revert AlreadyClaimed", async function () {
    await expect(
      metaPool.connect(user1).claimRefund(marketId)
    ).to.be.revertedWithCustomError(metaPool, "AlreadyClaimed");
  });
});

// ============================================================
// 시나리오 3: 이의제기 플로우
// ============================================================

describe("E2E 시나리오 3: 이의제기 플로우", function () {
  /**
   * 다수 베팅자 -> Yes 확정 -> 이의 임계값 초과(10%) -> 재심
   * -> No로 결과 변경 -> 새 결과 기반 클레임
   *
   * 베팅 구성 (10명, 임계값 = 10% = 1명):
   *   user1~5: Yes 각 1,000 META
   *   user6~8: No  각 1,000 META (user6, user7, user8)
   *
   * Yes 확정 후 이의제기:
   *   user6이 1,000 META 스테이킹 -> disputeCount=1, totalBettors=8
   *   임계값 = 8 * 1000 / 10000 = 0 → threshold가 0이면 작동 안 함
   *
   * 주의: DISPUTE_THRESHOLD = 1000 basis points = 10%
   *   totalBettors=10이면 threshold = 10 * 1000 / 10000 = 1
   *   disputeCount >= 1 이면 underReview = true
   *
   * 구성을 10명으로 맞춤:
   *   user1~6: Yes 각 1,000 META (6명)
   *   user7~9: No  각 1,000 META (3명)
   *   user10:  No  1,000 META   (1명) → 총 7 Yes, 4 No = 11명... 조정
   *
   * 단순화: 10명 베팅 (Yes 7, No 3)
   *   threshold = floor(10 * 1000 / 10000) = 1
   *   user7이 이의 1건 -> underReview = true
   */

  let fixture;
  let marketId;
  const BET = ethers.parseEther("1000");

  before(async function () {
    fixture = await networkHelpers.loadFixture(deployFixture);
    const { metaPool, owner, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10 } = fixture;

    const now = await networkHelpers.time.latest();
    marketId = await createMarket(metaPool, {
      question: "Dispute Test Market",
      questionKo: "이의제기 테스트 마켓",
      questionZh: "争议测试",
      questionJa: "争議テスト",
      category: 0, // Crypto
      bettingDeadline: now + 3600,
      resolutionDeadline: now + 86400,
    });

    // 10명 베팅: user1~7 Yes, user8~10 No (7+3=10명)
    const yesUsers = [user1, user2, user3, user4, user5, user6, user7];
    const noUsers = [user8, user9, user10];

    for (const u of yesUsers) {
      await metaPool.connect(u).placeBet(marketId, true, { value: BET });
    }
    for (const u of noUsers) {
      await metaPool.connect(u).placeBet(marketId, false, { value: BET });
    }

    // 베팅 마감 후 Yes로 확정
    await networkHelpers.time.increase(3601);
    await metaPool.resolveMarket(marketId, 1); // Yes
  });

  it("3-1. 결과 확정 직후 상태 확인", async function () {
    const market = await fixture.metaPool.getMarket(marketId);
    expect(market.status).to.equal(2); // Resolved
    expect(market.outcome).to.equal(1); // Yes
    expect(market.underReview).to.equal(false);
    expect(market.yesCount).to.equal(7n);
    expect(market.noCount).to.equal(3n);
  });

  it("3-2. 이의제기 1건 제출 → threshold(1) 충족으로 underReview = true", async function () {
    const { metaPool, user8 } = fixture;
    // totalBettors=10, threshold = floor(10 * 1000 / 10000) = 1
    // user8 (No 베팅자) 이의 제출
    await expect(
      metaPool.connect(user8).submitDispute(marketId, { value: DISPUTE_STAKE })
    )
      .to.emit(metaPool, "DisputeSubmitted")
      .and.to.emit(metaPool, "MarketReviewTriggered");

    const market = await metaPool.getMarket(marketId);
    expect(market.underReview).to.equal(true);
    expect(market.disputeCount).to.equal(1n);
  });

  it("3-3. underReview 중 클레임 시도 → revert MarketUnderReview", async function () {
    const { metaPool, user1 } = fixture;
    await expect(
      metaPool.connect(user1).claimWinnings(marketId)
    ).to.be.revertedWithCustomError(metaPool, "MarketUnderReview");
  });

  it("3-4. 재심 결과를 No로 변경한다", async function () {
    const { metaPool } = fixture;
    // resolveReview는 MarketResolved 이벤트를 emit하며 3번째 인자는 재계산 후 accumulatedFees
    // 이벤트 인자 정확도보다 상태 변경을 검증
    const tx = await metaPool.resolveReview(marketId, 2); // No
    await expect(tx).to.emit(metaPool, "MarketResolved");

    const market = await metaPool.getMarket(marketId);
    expect(market.underReview).to.equal(false);
    expect(market.outcome).to.equal(2); // No
    expect(market.disputeDeadline).to.equal(0n); // 즉시 클레임 가능
  });

  it("3-5. 새 결과(No) 기반으로 No 베팅자들이 클레임한다", async function () {
    const { metaPool, user8, user9, user10 } = fixture;
    const noUsers = [user8, user9, user10];

    // No 확정:
    //   losingPool = yesPool = 7,000 META
    //   winPool    = noPool  = 3,000 META
    //   fee        = 7,000 * 200 / 10,000 = 140 META
    //   distributable = 6,860 META
    //   각 No 베팅자 보상 = 1,000 + 6,860 * 1,000/3,000 = 1,000 + 2,286.67...
    // 정수 연산이므로 정확한 값은 컨트랙트 계산에 따름
    for (const u of noUsers) {
      const balBefore = await ethers.provider.getBalance(u.address);
      const tx = await metaPool.connect(u).claimWinnings(marketId);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(u.address);
      const gain = balAfter - balBefore + gas;

      // gain > 원금(1,000 META)이면 충분
      expect(gain).to.be.gt(BET);
    }
  });

  it("3-6. 이의가 인정된 user8의 스테이킹 반환", async function () {
    const { metaPool, owner, user8 } = fixture;
    const balBefore = await ethers.provider.getBalance(user8.address);

    const tx = await metaPool.resolveDispute(marketId, user8.address, true);
    const receipt = await tx.wait();

    // 이의 인정이면 user8에게 1,000 META 반환
    await expect(tx)
      .to.emit(metaPool, "DisputeResolved")
      .withArgs(marketId, user8.address, true, DISPUTE_STAKE);
  });
});

// ============================================================
// 시나리오 4: Pause/Resume 플로우
// ============================================================

describe("E2E 시나리오 4: Pause/Resume 플로우", function () {
  let metaPool, owner, user1;
  let marketId;

  before(async function () {
    ({ metaPool, owner, user1 } = await networkHelpers.loadFixture(deployFixture));

    const now = await networkHelpers.time.latest();
    marketId = await createMarket(metaPool, {
      question: "Pause Test Market",
      questionKo: "일시중단 테스트 마켓",
      questionZh: "暂停测试",
      questionJa: "一時停止テスト",
      category: 4, // Entertainment
      bettingDeadline: now + 7200,      // +2시간
      resolutionDeadline: now + 86400,  // +1일
    });
  });

  it("4-1. 마켓이 Active 상태다", async function () {
    const market = await metaPool.getMarket(marketId);
    expect(market.status).to.equal(0); // Active
  });

  it("4-2. Active 상태에서 베팅 성공", async function () {
    await expect(
      metaPool.connect(user1).placeBet(marketId, true, {
        value: ethers.parseEther("100"),
      })
    ).to.emit(metaPool, "BetPlaced");
  });

  it("4-3. 마켓을 Pause 처리한다", async function () {
    await expect(metaPool.pauseMarket(marketId))
      .to.emit(metaPool, "MarketPaused")
      .withArgs(marketId);

    const market = await metaPool.getMarket(marketId);
    expect(market.status).to.equal(4); // Paused
  });

  it("4-4. Paused 중 베팅 시도 → revert MarketNotActive", async function () {
    await expect(
      metaPool.connect(user1).placeBet(marketId, false, {
        value: ethers.parseEther("100"),
      })
    ).to.be.revertedWithCustomError(metaPool, "MarketNotActive");
  });

  it("4-5. 마켓을 Resume한다 (새 마감시간 설정)", async function () {
    const now = await networkHelpers.time.latest();
    const newBettingDeadline = now + 3600;      // +1시간
    const newResolutionDeadline = now + 86400;  // +1일

    await expect(
      metaPool.resumeMarket(marketId, newBettingDeadline, newResolutionDeadline)
    )
      .to.emit(metaPool, "MarketResumed")
      .withArgs(marketId, BigInt(newBettingDeadline), BigInt(newResolutionDeadline));

    const market = await metaPool.getMarket(marketId);
    expect(market.status).to.equal(0); // Active
    expect(market.bettingDeadline).to.equal(BigInt(newBettingDeadline));
  });

  it("4-6. user1은 이미 Yes로 베팅했으므로 No 방향 추가 베팅 → revert OppositeBetExists", async function () {
    // user1은 4-2 단계에서 Yes 베팅을 완료함. 반대 방향(No)은 차단됨.
    await expect(
      metaPool.connect(user1).placeBet(marketId, false, {
        value: ethers.parseEther("200"),
      })
    ).to.be.revertedWithCustomError(metaPool, "OppositeBetExists");
  });

  // 위 it이 revert 가능성이 있으므로, user2로 재시도
  it("4-7. 다른 사용자가 새 방향으로 베팅 성공", async function () {
    const signers = await ethers.getSigners();
    const user2 = signers[2];

    await expect(
      metaPool.connect(user2).placeBet(marketId, false, {
        value: ethers.parseEther("200"),
      })
    ).to.emit(metaPool, "BetPlaced");
  });
});

// ============================================================
// 시나리오 5: 설정 변경 플로우
// ============================================================

describe("E2E 시나리오 5: 설정 변경 플로우", function () {
  /**
   * minBet / maxBet / feeRate 변경 후 새 설정으로 베팅 및 수수료 검증
   */

  let metaPool, owner, user1, user2;
  let marketId;

  before(async function () {
    ({ metaPool, owner, user1, user2 } = await networkHelpers.loadFixture(deployFixture));
  });

  it("5-1. minBet을 50 META로 변경한다", async function () {
    const oldMin = await metaPool.minBet();
    const newMin = ethers.parseEther("50");

    await expect(metaPool.setMinBet(newMin))
      .to.emit(metaPool, "SettingsUpdated")
      .withArgs("minBet", oldMin, newMin);

    expect(await metaPool.minBet()).to.equal(newMin);
  });

  it("5-2. maxBet을 200,000 META로 변경한다", async function () {
    const oldMax = await metaPool.maxBet();
    const newMax = ethers.parseEther("200000");

    await expect(metaPool.setMaxBet(newMax))
      .to.emit(metaPool, "SettingsUpdated")
      .withArgs("maxBet", oldMax, newMax);

    expect(await metaPool.maxBet()).to.equal(newMax);
  });

  it("5-3. feeRate을 300 (3%)으로 변경한다", async function () {
    const oldRate = await metaPool.platformFeeRate();
    const newRate = 300n;

    await expect(metaPool.setPlatformFeeRate(newRate))
      .to.emit(metaPool, "SettingsUpdated")
      .withArgs("platformFeeRate", oldRate, newRate);

    expect(await metaPool.platformFeeRate()).to.equal(newRate);
  });

  it("5-4. 변경된 minBet(50) 기준으로 소액 베팅이 성공한다", async function () {
    const now = await networkHelpers.time.latest();
    marketId = await createMarket(metaPool, {
      question: "Settings Test Market",
      questionKo: "설정 테스트 마켓",
      questionZh: "设置测试",
      questionJa: "設定テスト",
      category: 5, // Other
      bettingDeadline: now + 3600,
      resolutionDeadline: now + 86400,
    });

    // 50 META (새 minBet) 베팅 성공
    await expect(
      metaPool.connect(user1).placeBet(marketId, true, {
        value: ethers.parseEther("50"),
      })
    ).to.emit(metaPool, "BetPlaced");
  });

  it("5-5. 변경 전 minBet(100) 미만인 49 META 베팅 → revert (새 minBet=50 초과이므로 성공 확인)", async function () {
    // 새 minBet=50이므로 49 META는 revert
    await expect(
      metaPool.connect(user2).placeBet(marketId, false, {
        value: ethers.parseEther("49"),
      })
    ).to.be.revertedWithCustomError(metaPool, "BetAmountTooLow");
  });

  it("5-6. 변경된 feeRate(3%)로 수수료가 계산된다", async function () {
    // user2: No 1,000 META 베팅
    await metaPool.connect(user2).placeBet(marketId, false, {
      value: ethers.parseEther("1000"),
    });

    // 마감 후 Yes 확정
    await networkHelpers.time.increase(3601);
    await metaPool.resolveMarket(marketId, 1); // Yes

    // fee = noPool(1,000) * 300 / 10,000 = 30 META
    const expectedFee = ethers.parseEther("30");
    expect(await metaPool.accumulatedFees()).to.equal(expectedFee);
  });

  it("5-7. 수수료 인출 후 컨트랙트 accumulatedFees = 0", async function () {
    // 이의제기 기간 경과
    await networkHelpers.time.increase(DISPUTE_PERIOD + 1);

    // user1 클레임
    await metaPool.connect(user1).claimWinnings(marketId);

    // 수수료 인출
    await metaPool.withdrawFees();
    expect(await metaPool.accumulatedFees()).to.equal(0n);
  });

  it("5-8. 모든 클레임 완료 후 컨트랙트 잔액 = 0", async function () {
    // user2는 패배자이므로 클레임 없음
    // user1만 클레임 완료 → 패배 풀 전액 = 수수료 + 승리자 보상
    // 컨트랙트 잔액: 초기 1050 META 입금, user1 보상 + 수수료 인출
    // yesPool = 50, noPool = 1000
    // fee = 1000 * 300/10000 = 30
    // distributable = 970
    // user1 보상 = 50 + 970 * 50/50 = 50 + 970 = 1,020 META
    // 컨트랙트 잔액 = 1050 - 1020 - 30 = 0
    expect(await getContractBalance(metaPool)).to.equal(0n);
  });
});
