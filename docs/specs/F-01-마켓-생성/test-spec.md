# F-01 마켓 생성 -- 테스트 명세

## 참조
- 설계서: docs/specs/F-01-마켓-생성/design.md
- 인수조건: docs/project/features.md #F-01

## 테스트 환경
- Hardhat + Chai (expect) + ethers.js v6
- `@nomicfoundation/hardhat-toolbox` (hardhat-chai-matchers 포함)
- 테스트 파일: `test/MetaPool.test.js`
- 시간 조작: `helpers.time.latest()`, `helpers.time.increase()`

## 공통 Fixture

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function deployFixture() {
  const [owner, user1, user2] = await ethers.getSigners();
  const minBet = ethers.parseEther("100");     // 100 META
  const maxBet = ethers.parseEther("100000");   // 100,000 META
  const feeRate = 200;                          // 2%

  const MetaPool = await ethers.getContractFactory("MetaPool");
  const metaPool = await MetaPool.deploy(owner.address, minBet, maxBet, feeRate);

  // 마켓 생성용 기본 파라미터
  const now = await time.latest();
  const bettingDeadline = now + 86400;          // +1일
  const resolutionDeadline = now + 172800;      // +2일
  const question = "Will BTC exceed $100K by end of 2026?";
  const questionKo = "2026년 말까지 BTC가 10만 달러를 돌파할까요?";
  const questionZh = "BTC会在2026年底前突破10万美元吗？";
  const questionJa = "BTCは2026年末までに10万ドルを突破しますか？";
  const category = 0; // Crypto

  return {
    metaPool, owner, user1, user2,
    question, questionKo, questionZh, questionJa,
    category, bettingDeadline, resolutionDeadline
  };
}
```

## 테스트 구조

```
describe("MetaPool")
  describe("배포")
    it("올바른 owner가 설정된다")
    it("초기 marketCount가 0이다")
    it("minBet, maxBet, platformFeeRate 초기값이 올바르다")

  describe("F-01: createMarket")
    describe("정상 케이스")
      it("관리자가 마켓을 성공적으로 생성한다")
      it("생성된 마켓의 모든 필드가 올바르게 저장된다")
      it("마켓 ID가 1부터 시작한다")
      it("마켓 ID가 순차적으로 증가한다")
      it("MarketCreated 이벤트가 올바른 파라미터로 emit된다")
      it("생성된 마켓의 초기 상태가 Active이다")
      it("생성된 마켓의 초기 outcome이 Undecided이다")
      it("생성된 마켓의 초기 풀이 모두 0이다")
      it("다국어 질문이 빈 문자열이어도 생성된다")
      it("모든 카테고리(0~5)로 마켓을 생성할 수 있다")
      it("반환된 marketId가 marketCount와 일치한다")

    describe("실패 케이스")
      it("비관리자가 생성하면 OwnableUnauthorizedAccount로 revert된다")
      it("영어 질문이 빈 문자열이면 EmptyQuestion으로 revert된다")
      it("bettingDeadline이 현재 시간 이하이면 InvalidDeadline으로 revert된다")
      it("resolutionDeadline이 bettingDeadline 이하이면 InvalidDeadline으로 revert된다")

    describe("경계값")
      it("bettingDeadline이 현재 시간+1초일 때 성공한다")
      it("resolutionDeadline이 bettingDeadline+1초일 때 성공한다")
      it("매우 긴 질문 텍스트로 마켓을 생성할 수 있다")

    describe("getMarket view 함수")
      it("존재하는 마켓 ID로 조회하면 올바른 Market struct를 반환한다")
      it("존재하지 않는 마켓 ID로 조회하면 모든 필드가 기본값인 struct를 반환한다")
      it("id가 0인 struct 반환으로 마켓 미존재를 판별할 수 있다")
```

## 단위 테스트 상세

### 배포 테스트

| 대상 | 시나리오 | 입력 | 예상 결과 |
|------|----------|------|-----------|
| constructor | 올바른 owner 설정 | `owner.address` | `await metaPool.owner()` === `owner.address` |
| constructor | 초기 marketCount | - | `await metaPool.marketCount()` === `0n` |
| constructor | 초기 설정값 | minBet, maxBet, feeRate | `minBet()` === `parseEther("100")`, `maxBet()` === `parseEther("100000")`, `platformFeeRate()` === `200n` |

### 정상 케이스

| 대상 | 시나리오 | 입력 | 예상 결과 |
|------|----------|------|-----------|
| createMarket | 마켓 생성 성공 | 유효한 전체 파라미터 | `tx` 성공, `marketCount()` === `1n` |
| createMarket | 필드값 검증 | 유효한 파라미터 | `getMarket(1).question` === `question`, `.category` === `0`, `.bettingDeadline` === `bettingDeadline` |
| createMarket | ID 시작값 | 첫 번째 마켓 생성 | `getMarket(1).id` === `1n` |
| createMarket | ID 순차 증가 | 3개 마켓 연속 생성 | `getMarket(1).id` === `1n`, `getMarket(2).id` === `2n`, `getMarket(3).id` === `3n`, `marketCount()` === `3n` |
| createMarket | 이벤트 emit | 유효한 파라미터 | `expect(tx).to.emit(metaPool, "MarketCreated").withArgs(1n, question, category, bettingDeadline, resolutionDeadline)` |
| createMarket | 초기 상태 Active | - | `getMarket(1).status` === `0` (Active) |
| createMarket | 초기 outcome Undecided | - | `getMarket(1).outcome` === `0` (Undecided) |
| createMarket | 초기 풀 0 | - | `getMarket(1).yesPool` === `0n`, `.noPool` === `0n`, `.yesCount` === `0n`, `.noCount` === `0n` |
| createMarket | 다국어 빈 문자열 허용 | `questionKo=""`, `questionZh=""`, `questionJa=""` | 성공, `getMarket(1).questionKo` === `""` |
| createMarket | 전체 카테고리 | category 0~5 각각 | 6개 모두 성공 |
| createMarket | 반환값 검증 | 유효한 파라미터 | `createMarket.staticCall(...)` 반환값 === `1n` (첫 번째), `2n` (두 번째) |

### 실패 케이스

| 대상 | 시나리오 | 입력 | 예상 결과 |
|------|----------|------|-----------|
| createMarket | 비관리자 호출 | `metaPool.connect(user1).createMarket(...)` | `revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount").withArgs(user1.address)` |
| createMarket | 빈 질문 | `question = ""` | `revertedWithCustomError(metaPool, "EmptyQuestion")` |
| createMarket | 과거 bettingDeadline | `bettingDeadline = now - 1` | `revertedWithCustomError(metaPool, "InvalidDeadline")` |
| createMarket | 현재와 동일한 bettingDeadline | `bettingDeadline = now` | `revertedWithCustomError(metaPool, "InvalidDeadline")` |
| createMarket | resolutionDeadline <= bettingDeadline | `resolutionDeadline = bettingDeadline` | `revertedWithCustomError(metaPool, "InvalidDeadline")` |
| createMarket | resolutionDeadline < bettingDeadline | `resolutionDeadline = bettingDeadline - 1` | `revertedWithCustomError(metaPool, "InvalidDeadline")` |

### 경계값 테스트

| 대상 | 시나리오 | 입력 | 예상 결과 |
|------|----------|------|-----------|
| createMarket | 최소 미래 시간 | `bettingDeadline = now + 1` | 성공 |
| createMarket | 최소 resolution 간격 | `resolutionDeadline = bettingDeadline + 1` | 성공 |
| createMarket | 긴 질문 텍스트 | `"A".repeat(1000)` | 성공 (가스비 증가 확인) |

### getMarket View 함수

| 대상 | 시나리오 | 입력 | 예상 결과 |
|------|----------|------|-----------|
| getMarket | 존재하는 마켓 | `getMarket(1)` (생성 후) | `market.id` === `1n`, `market.question` === `question` |
| getMarket | 존재하지 않는 ID | `getMarket(999)` | `market.id` === `0n`, `market.question` === `""`, revert 없음 |
| getMarket | ID 0 조회 | `getMarket(0)` | `market.id` === `0n`, revert 없음 |

## 통합 테스트

| 시나리오 | 입력 | 예상 결과 |
|----------|------|-----------|
| 마켓 생성 후 조회 일관성 | `createMarket()` -> `getMarket()` | 생성 파라미터와 조회 결과가 완전히 일치 |
| 다수 마켓 생성 후 개별 조회 | 5개 마켓 생성 후 각각 `getMarket(1~5)` | 각 마켓의 question, category, deadline이 개별적으로 올바름 |
| 마켓 생성 후 marketCount 확인 | 3개 마켓 생성 | `marketCount()` === `3n` |

## 경계 조건 / 에러 케이스

- 비관리자가 createMarket 호출 시: `OwnableUnauthorizedAccount(user1.address)` 에러로 revert
- 빈 영어 질문(`""`) 전달 시: `EmptyQuestion()` 에러로 revert
- `bettingDeadline`이 `block.timestamp` 이하 시: `InvalidDeadline(bettingDeadline, resolutionDeadline)` 에러로 revert
- `resolutionDeadline`이 `bettingDeadline` 이하 시: `InvalidDeadline(bettingDeadline, resolutionDeadline)` 에러로 revert
- 존재하지 않는 마켓 ID 조회: revert 없이 기본값 struct 반환 (`id === 0n`으로 미존재 판별)

## 테스트 코드 스켈레톤

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MetaPool", function () {
  // deployFixture 정의 (공통 Fixture 섹션 참조)

  describe("배포", function () {
    it("올바른 owner가 설정된다", async function () {
      const { metaPool, owner } = await loadFixture(deployFixture);
      expect(await metaPool.owner()).to.equal(owner.address);
    });

    it("초기 marketCount가 0이다", async function () {
      const { metaPool } = await loadFixture(deployFixture);
      expect(await metaPool.marketCount()).to.equal(0n);
    });

    it("minBet, maxBet, platformFeeRate 초기값이 올바르다", async function () {
      const { metaPool } = await loadFixture(deployFixture);
      expect(await metaPool.minBet()).to.equal(ethers.parseEther("100"));
      expect(await metaPool.maxBet()).to.equal(ethers.parseEther("100000"));
      expect(await metaPool.platformFeeRate()).to.equal(200n);
    });
  });

  describe("F-01: createMarket", function () {
    describe("정상 케이스", function () {
      it("관리자가 마켓을 성공적으로 생성한다", async function () {
        const { metaPool, owner, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline)
        ).to.not.be.reverted;
        expect(await metaPool.marketCount()).to.equal(1n);
      });

      it("생성된 마켓의 모든 필드가 올바르게 저장된다", async function () {
        const { metaPool, owner, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);

        const market = await metaPool.getMarket(1);
        expect(market.id).to.equal(1n);
        expect(market.question).to.equal(question);
        expect(market.questionKo).to.equal(questionKo);
        expect(market.questionZh).to.equal(questionZh);
        expect(market.questionJa).to.equal(questionJa);
        expect(market.category).to.equal(category);
        expect(market.bettingDeadline).to.equal(bettingDeadline);
        expect(market.resolutionDeadline).to.equal(resolutionDeadline);
        expect(market.creator).to.equal(owner.address);
      });

      it("마켓 ID가 1부터 시작한다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);
        const market = await metaPool.getMarket(1);
        expect(market.id).to.equal(1n);
      });

      it("마켓 ID가 순차적으로 증가한다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);
        await metaPool.createMarket("Second market?", "", "", "", 1, bettingDeadline, resolutionDeadline);
        await metaPool.createMarket("Third market?", "", "", "", 2, bettingDeadline, resolutionDeadline);

        expect((await metaPool.getMarket(1)).id).to.equal(1n);
        expect((await metaPool.getMarket(2)).id).to.equal(2n);
        expect((await metaPool.getMarket(3)).id).to.equal(3n);
        expect(await metaPool.marketCount()).to.equal(3n);
      });

      it("MarketCreated 이벤트가 올바른 파라미터로 emit된다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline)
        ).to.emit(metaPool, "MarketCreated")
          .withArgs(1n, question, category, bettingDeadline, resolutionDeadline);
      });

      it("생성된 마켓의 초기 상태가 Active이다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);
        const market = await metaPool.getMarket(1);
        expect(market.status).to.equal(0); // Active
      });

      it("생성된 마켓의 초기 outcome이 Undecided이다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);
        const market = await metaPool.getMarket(1);
        expect(market.outcome).to.equal(0); // Undecided
      });

      it("생성된 마켓의 초기 풀이 모두 0이다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);
        const market = await metaPool.getMarket(1);
        expect(market.yesPool).to.equal(0n);
        expect(market.noPool).to.equal(0n);
        expect(market.yesCount).to.equal(0n);
        expect(market.noCount).to.equal(0n);
      });

      it("다국어 질문이 빈 문자열이어도 생성된다", async function () {
        const { metaPool, question, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await expect(
          metaPool.createMarket(question, "", "", "", category, bettingDeadline, resolutionDeadline)
        ).to.not.be.reverted;

        const market = await metaPool.getMarket(1);
        expect(market.questionKo).to.equal("");
        expect(market.questionZh).to.equal("");
        expect(market.questionJa).to.equal("");
      });

      it("모든 카테고리(0~5)로 마켓을 생성할 수 있다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        for (let cat = 0; cat <= 5; cat++) {
          await metaPool.createMarket(question, questionKo, questionZh, questionJa, cat, bettingDeadline, resolutionDeadline);
          const market = await metaPool.getMarket(cat + 1);
          expect(market.category).to.equal(cat);
        }
      });

      it("반환된 marketId가 marketCount와 일치한다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        // staticCall로 반환값 확인
        const returnedId = await metaPool.createMarket.staticCall(
          question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline
        );
        expect(returnedId).to.equal(1n);

        // 실제 실행
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);
        expect(await metaPool.marketCount()).to.equal(1n);
      });
    });

    describe("실패 케이스", function () {
      it("비관리자가 생성하면 OwnableUnauthorizedAccount로 revert된다", async function () {
        const { metaPool, user1, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await expect(
          metaPool.connect(user1).createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline)
        ).to.be.revertedWithCustomError(metaPool, "OwnableUnauthorizedAccount")
          .withArgs(user1.address);
      });

      it("영어 질문이 빈 문자열이면 EmptyQuestion으로 revert된다", async function () {
        const { metaPool, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await expect(
          metaPool.createMarket("", questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline)
        ).to.be.revertedWithCustomError(metaPool, "EmptyQuestion");
      });

      it("bettingDeadline이 현재 시간 이하이면 InvalidDeadline으로 revert된다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, resolutionDeadline } = await loadFixture(deployFixture);
        const now = await time.latest();
        // 과거 시간
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, now - 100, resolutionDeadline)
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
        // 현재 시간 (동일 = 미래가 아님)
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, now, resolutionDeadline)
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
      });

      it("resolutionDeadline이 bettingDeadline 이하이면 InvalidDeadline으로 revert된다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline } = await loadFixture(deployFixture);
        // 동일 시간
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, bettingDeadline)
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
        // 이전 시간
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, bettingDeadline - 1)
        ).to.be.revertedWithCustomError(metaPool, "InvalidDeadline");
      });
    });

    describe("경계값", function () {
      it("bettingDeadline이 현재 시간+1초일 때 성공한다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category } = await loadFixture(deployFixture);
        const now = await time.latest();
        const minDeadline = now + 1;
        const resDeadline = minDeadline + 1;
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, minDeadline, resDeadline)
        ).to.not.be.reverted;
      });

      it("resolutionDeadline이 bettingDeadline+1초일 때 성공한다", async function () {
        const { metaPool, question, questionKo, questionZh, questionJa, category, bettingDeadline } = await loadFixture(deployFixture);
        const resDeadline = bettingDeadline + 1;
        await expect(
          metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resDeadline)
        ).to.not.be.reverted;
      });

      it("매우 긴 질문 텍스트로 마켓을 생성할 수 있다", async function () {
        const { metaPool, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        const longQuestion = "A".repeat(1000);
        await expect(
          metaPool.createMarket(longQuestion, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline)
        ).to.not.be.reverted;

        const market = await metaPool.getMarket(1);
        expect(market.question).to.equal(longQuestion);
      });
    });

    describe("getMarket view 함수", function () {
      it("존재하는 마켓 ID로 조회하면 올바른 Market struct를 반환한다", async function () {
        const { metaPool, owner, question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline } = await loadFixture(deployFixture);
        await metaPool.createMarket(question, questionKo, questionZh, questionJa, category, bettingDeadline, resolutionDeadline);

        const market = await metaPool.getMarket(1);
        expect(market.id).to.equal(1n);
        expect(market.question).to.equal(question);
        expect(market.questionKo).to.equal(questionKo);
        expect(market.questionZh).to.equal(questionZh);
        expect(market.questionJa).to.equal(questionJa);
        expect(market.category).to.equal(category);
        expect(market.bettingDeadline).to.equal(bettingDeadline);
        expect(market.resolutionDeadline).to.equal(resolutionDeadline);
        expect(market.status).to.equal(0); // Active
        expect(market.outcome).to.equal(0); // Undecided
        expect(market.creator).to.equal(owner.address);
      });

      it("존재하지 않는 마켓 ID로 조회하면 모든 필드가 기본값인 struct를 반환한다", async function () {
        const { metaPool } = await loadFixture(deployFixture);
        const market = await metaPool.getMarket(999);
        expect(market.id).to.equal(0n);
        expect(market.question).to.equal("");
        expect(market.yesPool).to.equal(0n);
        expect(market.noPool).to.equal(0n);
      });

      it("id가 0인 struct 반환으로 마켓 미존재를 판별할 수 있다", async function () {
        const { metaPool } = await loadFixture(deployFixture);
        // ID 0은 유효하지 않은 마켓
        const market = await metaPool.getMarket(0);
        expect(market.id).to.equal(0n);
      });
    });
  });
});
```

---

## 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|----------|------|
| 2026-03-15 | 최초 작성 | F-01 마켓 생성 테스트 명세 |
