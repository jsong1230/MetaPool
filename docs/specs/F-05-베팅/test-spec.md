# F-05 Yes/No 베팅 + F-06 추가 베팅 -- 테스트 명세

## 참조
- 설계서: docs/specs/F-05-베팅/design.md
- 인수조건: docs/project/features.md #F-05, #F-06
- 테스트 패턴: test/MetaPool.test.js (기존 F-01 테스트 참고)

## 테스트 환경
- Hardhat v3 + ESM (`import` 구문 사용)
- `network.connect()` / `networkHelpers.loadFixture` 사용
- Chai expect 사용
- `.to.not.be.reverted` 사용 금지 (deprecated). 정상 케이스는 단순 `await` 사용
- 테스트 파일: `test/F05-Betting.test.js`

## Fixture 설계

```javascript
// deployAndCreateMarketFixture
// - MetaPool 배포 (minBet: 100 META, maxBet: 100,000 META, feeRate: 200)
// - Active 마켓 1개 생성 (bettingDeadline: now + 1일, resolutionDeadline: now + 2일)
// - signers: owner, user1, user2, user3
// - 반환: { metaPool, owner, user1, user2, user3, marketId }
```

---

## 단위 테스트

### describe("F-05: placeBet -- 정상 케이스")

| # | 시나리오 | 입력 | 예상 결과 |
|---|---------|------|-----------|
| 1 | Yes 베팅 성공 | user1이 marketId=1, isYes=true, value=500 META | tx 성공. market.yesPool == 500 META, bet.amount == 500 META, bet.isYes == true |
| 2 | No 베팅 성공 | user2가 marketId=1, isYes=false, value=1000 META | tx 성공. market.noPool == 1000 META, bet.amount == 1000 META, bet.isYes == false |
| 3 | 최소 금액(100 META) 정확히 베팅 | user1이 value=100 META (ethers.parseEther("100")) | tx 성공 |
| 4 | 최대 금액(100,000 META) 정확히 베팅 | user1이 value=100000 META | tx 성공 |
| 5 | yesPool 정확히 증가 | user1이 Yes로 500 META 베팅 | getMarket().yesPool == ethers.parseEther("500") |
| 6 | noPool 정확히 증가 | user2가 No로 300 META 베팅 | getMarket().noPool == ethers.parseEther("300") |
| 7 | 첫 Yes 베팅 시 yesCount 1 증가 | user1이 첫 Yes 베팅 | getMarket().yesCount == 1 |
| 8 | 첫 No 베팅 시 noCount 1 증가 | user2가 첫 No 베팅 | getMarket().noCount == 1 |
| 9 | BetPlaced 이벤트 emit 검증 | user1이 Yes로 500 META 베팅 | `expect(tx).to.emit(metaPool, "BetPlaced").withArgs(1, user1.address, true, ethers.parseEther("500"), ethers.parseEther("500"), 0n)` |
| 10 | BetPlaced 이벤트 -- No 베팅 후 풀 값 검증 | user1이 Yes 500 META 후, user2가 No 300 META | BetPlaced의 newYesPool=500 META, newNoPool=300 META |

### describe("F-06: placeBet -- 추가 베팅")

| # | 시나리오 | 입력 | 예상 결과 |
|---|---------|------|-----------|
| 11 | 같은 방향 추가 베팅 -- 금액 합산 | user1이 Yes 500 META 후 Yes 300 META 추가 | bet.amount == 800 META |
| 12 | 추가 베팅 시 풀 합산 | user1이 Yes 500 후 Yes 300 추가 | yesPool == 800 META |
| 13 | 추가 베팅 시 yesCount 불변 | user1이 Yes 500 후 Yes 300 추가 | yesCount == 1 (증가 안 함) |
| 14 | 추가 베팅도 BetPlaced 이벤트 emit | user1이 추가 베팅 300 META | BetPlaced의 amount == 300 META (이번 트랜잭션 금액) |
| 15 | 여러 번 추가 베팅 누적 | user1이 100 + 200 + 300 META 3회 | bet.amount == 600 META, yesPool == 600 META |

---

## 경계 조건 / 에러 케이스

### describe("F-05: placeBet -- revert 케이스")

| # | 시나리오 | 입력 | 예상 에러 |
|---|---------|------|-----------|
| 16 | 미존재 마켓 | marketId=999, value=100 META | `MarketNotFound(999)` |
| 17 | 마켓 ID 0 | marketId=0, value=100 META | `MarketNotFound(0)` |
| 18 | 비Active 상태 (Paused 마켓) | 마켓을 pauseMarket 후 베팅 시도 (F-11 구현 후 가능, 또는 직접 status 변경이 불가하므로 이 테스트는 F-11 구현 후로 defer) | `MarketNotActive(marketId, MarketStatus.Paused)` |
| 19 | 마감 후 베팅 시도 | `networkHelpers.time.increaseTo(bettingDeadline)` 후 베팅 | `BettingDeadlinePassed(marketId, bettingDeadline)` |
| 20 | 마감 시간 정확히 도달 (경계) | `networkHelpers.time.increaseTo(bettingDeadline)` -- `>=` 이므로 revert | `BettingDeadlinePassed(marketId, bettingDeadline)` |
| 21 | 최소 금액 미달 (99 META) | value=ethers.parseEther("99") | `BetAmountTooLow(ethers.parseEther("99"), ethers.parseEther("100"))` |
| 22 | 최소 금액 미달 (0 META) | value=0 | `BetAmountTooLow(0, ethers.parseEther("100"))` |
| 23 | 최대 금액 초과 (100,001 META) | value=ethers.parseEther("100001") | `BetAmountTooHigh(ethers.parseEther("100001"), ethers.parseEther("100000"))` |
| 24 | 반대 방향 베팅 차단 | user1이 Yes 500 META 후 No 500 META 시도 | `OppositeBetExists(marketId, user1.address)` |
| 25 | 반대 방향 차단 (No 먼저 후 Yes) | user1이 No 500 META 후 Yes 500 META 시도 | `OppositeBetExists(marketId, user1.address)` |
| 26 | 글로벌 pause 상태에서 베팅 | owner가 `metaPool.pause()` 후 user1이 베팅 시도 | OpenZeppelin의 `EnforcedPause()` (Pausable의 whenNotPaused modifier) |

### describe("F-06: 추가 베팅 -- revert 케이스")

| # | 시나리오 | 입력 | 예상 에러 |
|---|---------|------|-----------|
| 27 | 추가 베팅 최소 미달 | user1이 Yes 500 후 추가 99 META | `BetAmountTooLow(ethers.parseEther("99"), ethers.parseEther("100"))` |
| 28 | 추가 베팅 최대 초과 | user1이 Yes 500 후 추가 100,001 META | `BetAmountTooHigh(...)` |

---

## View 함수 테스트

### describe("getUserBet")

| # | 시나리오 | 입력 | 예상 결과 |
|---|---------|------|-----------|
| 29 | 베팅 후 조회 | user1이 Yes 500 META 후 getUserBet(1, user1) | `{ amount: parseEther("500"), isYes: true, claimed: false }` |
| 30 | 베팅 없는 사용자 조회 | getUserBet(1, user2) (베팅 안 한 사용자) | `{ amount: 0, isYes: false, claimed: false }` |
| 31 | 추가 베팅 후 조회 | user1이 500 + 300 후 조회 | `{ amount: parseEther("800"), isYes: true, claimed: false }` |
| 32 | 미존재 마켓 조회 | getUserBet(999, user1) | `{ amount: 0, isYes: false, claimed: false }` (revert 아님, 기본값 반환) |

### describe("getOdds")

| # | 시나리오 | 입력 | 예상 결과 |
|---|---------|------|-----------|
| 33 | 풀이 비어있을 때 | 아무도 베팅 안 한 마켓 | `(0, 0)` |
| 34 | Yes만 베팅 (No풀 0) | user1이 Yes 1000 META만 | `(0, 0)` |
| 35 | No만 베팅 (Yes풀 0) | user2가 No 1000 META만 | `(0, 0)` |
| 36 | 균등 풀 (Yes=No) | Yes 1000, No 1000 | yesOdds == 9800, noOdds == 9800 (수수료 2% 차감 = 0.98x) |
| 37 | Yes 풀 > No 풀 | Yes 3000, No 1000 | yesOdds = 4000*9800/3000 = 13066, noOdds = 4000*9800/1000 = 39200 |
| 38 | No 풀 > Yes 풀 | Yes 1000, No 3000 | yesOdds = 4000*9800/1000 = 39200, noOdds = 4000*9800/3000 = 13066 |

**배당률 계산 검증 공식:**
```
totalPool = yesPool + noPool
feeAdjusted = FEE_DENOMINATOR - platformFeeRate = 10000 - 200 = 9800
yesOdds = totalPool * feeAdjusted / yesPool
noOdds = totalPool * feeAdjusted / noPool
```

---

## 복수 사용자 시나리오

### describe("복수 사용자 베팅")

| # | 시나리오 | 설정 | 예상 결과 |
|---|---------|------|-----------|
| 39 | 3명이 각각 다른 방향 베팅 | user1: Yes 500, user2: No 300, user3: Yes 200 | yesPool=700, noPool=300, yesCount=2, noCount=1 |
| 40 | 동일 방향 복수 사용자 -- 참여자 수 | user1: Yes 500, user2: Yes 300 | yesCount=2 (각각 1씩 증가) |
| 41 | 한 사용자 추가 + 다른 사용자 첫 베팅 | user1: Yes 500 후 추가 Yes 200, user2: No 1000 | yesPool=700, noPool=1000, yesCount=1, noCount=1, user1 bet.amount=700 |
| 42 | 배당률 변화 검증 | user1: Yes 1000 후, user2: No 500 후, user3: No 1500 | totalPool=3000, yesPool=1000, noPool=2000. yesOdds=3000*9800/1000=29400, noOdds=3000*9800/2000=14700 |
| 43 | 대규모 베팅자 (10명) | 10명이 각각 랜덤 방향/금액으로 베팅 | 모든 풀 합산 정확, 참여자 수 정확, 각 개인 bet.amount 정확 |

---

## 회귀 테스트

기존 F-01 기능에 대한 회귀 검증. MetaPool.sol에 코드 추가 시 기존 기능에 영향이 없는지 확인.

| 기존 기능 | 영향 여부 | 검증 방법 |
|-----------|-----------|-----------|
| F-01 createMarket | Custom Error 추가로 인한 컴파일 영향 없음 (추가만) | 기존 test/MetaPool.test.js의 F-01 테스트가 모두 통과하는지 확인 |
| getMarket view | 변경 없음 | 기존 테스트 통과 확인 |
| 배포 (constructor) | 변경 없음 | 기존 배포 테스트 통과 확인 |

---

## 테스트 구현 가이드

### 파일 구조

```javascript
// test/F05-Betting.test.js
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

async function deployAndCreateMarketFixture() {
  const [owner, user1, user2, user3] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");
  const maxBet = ethers.parseEther("100000");
  const feeRate = 200;

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  const now = await networkHelpers.time.latest();
  const bettingDeadline = now + 86400;      // +1일
  const resolutionDeadline = now + 172800;  // +2일

  // Active 마켓 생성
  await metaPool.createMarket(
    "Will BTC exceed $100K?", "BTC 10만불 돌파?", "BTC破10万？", "BTC10万ドル？",
    0, // Crypto
    bettingDeadline,
    resolutionDeadline
  );

  return { metaPool, owner, user1, user2, user3, marketId: 1, bettingDeadline, resolutionDeadline };
}

describe("MetaPool - F-05/F-06 베팅", function () {
  // describe 블록별로 위 테스트 표의 시나리오 구현
});
```

### Custom Error 검증 패턴

```javascript
// Custom Error revert 검증
await expect(
  metaPool.connect(user1).placeBet(999, true, { value: ethers.parseEther("100") })
).to.be.revertedWithCustomError(metaPool, "MarketNotFound")
  .withArgs(999);

// Custom Error with multiple args
await expect(
  metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("99") })
).to.be.revertedWithCustomError(metaPool, "BetAmountTooLow")
  .withArgs(ethers.parseEther("99"), ethers.parseEther("100"));
```

### 이벤트 검증 패턴

```javascript
// 이벤트 emit 검증
const tx = await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("500") });
await expect(tx)
  .to.emit(metaPool, "BetPlaced")
  .withArgs(1, user1.address, true, ethers.parseEther("500"), ethers.parseEther("500"), 0n);
```

### 시간 조작 패턴

```javascript
// 마감 시간 이후로 이동
await networkHelpers.time.increaseTo(bettingDeadline);

// 마감 1초 전 (아직 베팅 가능)
await networkHelpers.time.increaseTo(bettingDeadline - 1);
await metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("100") });
// 정상 성공 (단순 await, .to.not.be.reverted 사용 금지)
```

### 글로벌 Pause 검증 패턴

```javascript
// OpenZeppelin Pausable의 글로벌 pause
await metaPool.pause();  // owner 호출
await expect(
  metaPool.connect(user1).placeBet(1, true, { value: ethers.parseEther("100") })
).to.be.revertedWithCustomError(metaPool, "EnforcedPause");
```

## 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|----------|------|
| 2026-03-15 | 최초 작성 | F-05/F-06 베팅 기능 테스트 명세 |
