# MetaPool — 스마트 컨트랙트 기술 스펙

**Technical Specification for Claude Code Development v1.0**
**작성일:** 2026-03-15
**대상:** Solidity 개발자 / Claude Code

---

## 1. 개요

MetaPool은 Metadium 블록체인 위의 Binary(Yes/No) 예측 마켓 스마트 컨트랙트이다. 관리자가 마켓을 생성하고, 사용자가 META(native token)로 Yes 또는 No에 베팅하며, 결과 확정 후 승리 측이 보상을 클레임하는 구조이다.

---

## 2. 개발 환경

| 항목 | 값 |
|------|-----|
| Solidity | ^0.8.19 |
| 프레임워크 | Hardhat |
| 체인 | Metadium Mainnet (Chain ID: 11) |
| RPC | https://api.metadium.com/prod |
| 테스트 체인 | Metadium Testnet (Chain ID: 12) |
| 테스트 RPC | https://api.metadium.com/dev |
| 토큰 | META (native token, msg.value) |
| 의존성 | OpenZeppelin Contracts v5.x |

---

## 3. 데이터 구조

### 3.1 Enums

```solidity
enum MarketStatus {
    Active,     // 0: 베팅 진행 중
    Closed,     // 1: 베팅 마감, 결과 대기
    Resolved,   // 2: 결과 확정, 클레임 가능
    Voided,     // 3: 무효 처리, 전액 환불
    Paused      // 4: 긴급 중단
}

enum MarketOutcome {
    Undecided,  // 0: 미결정
    Yes,        // 1: Yes 승리
    No,         // 2: No 승리
    Void        // 3: 무효
}

enum MarketCategory {
    Crypto,         // 0
    Sports,         // 1
    Weather,        // 2
    Politics,       // 3
    Entertainment,  // 4
    Other           // 5
}
```

### 3.2 Structs

```solidity
struct Market {
    uint256 id;                  // 마켓 고유 ID
    string question;             // 질문 텍스트 (영어 기본)
    string questionKo;           // 한국어 질문
    string questionZh;           // 중국어 질문
    string questionJa;           // 일본어 질문
    MarketCategory category;     // 카테고리
    uint256 bettingDeadline;     // 베팅 마감 timestamp
    uint256 resolutionDeadline;  // 결과 확정 예정 timestamp
    MarketStatus status;         // 마켓 상태
    MarketOutcome outcome;       // 결과
    uint256 yesPool;             // Yes 풀 총액 (wei)
    uint256 noPool;              // No 풀 총액 (wei)
    uint256 yesCount;            // Yes 베팅 참여자 수
    uint256 noCount;             // No 베팅 참여자 수
    uint256 createdAt;           // 생성 시간
    uint256 resolvedAt;          // 결과 확정 시간 (0이면 미확정)
    address creator;             // 마켓 생성자 (관리자)
}

struct Bet {
    uint256 amount;     // 베팅 금액 (wei)
    bool isYes;         // true=Yes, false=No
    bool claimed;       // 클레임 여부
}
```

### 3.3 State Variables

```solidity
// 관리자
address public owner;

// 설정
uint256 public minBet;            // 최소 베팅 금액 (기본: 100 META = 100e18)
uint256 public maxBet;            // 최대 베팅 금액 (기본: 100,000 META = 100000e18)
uint256 public platformFeeRate;   // 플랫폼 수수료율 (기본: 200 = 2%, basis points)
uint256 public constant FEE_DENOMINATOR = 10000;

// 마켓 관리
uint256 public marketCount;       // 총 마켓 수
mapping(uint256 => Market) public markets;  // marketId => Market

// 베팅 관리
mapping(uint256 => mapping(address => Bet)) public bets;  // marketId => user => Bet

// 수수료 누적
uint256 public accumulatedFees;

// 긴급 중단
bool public paused;
```

---

## 4. 함수 명세

### 4.1 관리자 함수

#### createMarket

```solidity
function createMarket(
    string calldata _question,
    string calldata _questionKo,
    string calldata _questionZh,
    string calldata _questionJa,
    MarketCategory _category,
    uint256 _bettingDeadline,
    uint256 _resolutionDeadline
) external onlyOwner returns (uint256 marketId)
```

**설명:** 새 마켓을 생성한다.

**검증:**
- `_bettingDeadline > block.timestamp`: 마감이 미래여야 함
- `_resolutionDeadline > _bettingDeadline`: 결과 확정은 베팅 마감 이후
- `bytes(_question).length > 0`: 질문 비어있지 않음

**동작:**
1. `marketCount++`
2. `Market` 구조체 생성, `status = Active`
3. `MarketCreated` 이벤트 emit

**가스:** ~200,000

---

#### resolveMarket

```solidity
function resolveMarket(
    uint256 _marketId,
    MarketOutcome _outcome
) external onlyOwner
```

**설명:** 마켓 결과를 확정한다.

**검증:**
- `markets[_marketId].status == MarketStatus.Active || markets[_marketId].status == MarketStatus.Closed`: Active 또는 Closed 상태
- `_outcome != MarketOutcome.Undecided`: Undecided로는 확정 불가
- `block.timestamp >= markets[_marketId].bettingDeadline`: 베팅 마감 이후만 가능

**동작:**
1. `_outcome == Void`이면 `status = Voided`
2. 그 외 `status = Resolved`, `outcome = _outcome`
3. `resolvedAt = block.timestamp`
4. 플랫폼 수수료 계산 후 `accumulatedFees`에 누적
5. `MarketResolved` 이벤트 emit

**수수료 계산 로직:**
```solidity
uint256 losingPool = (_outcome == MarketOutcome.Yes) ? market.noPool : market.yesPool;
uint256 fee = (losingPool * platformFeeRate) / FEE_DENOMINATOR;
accumulatedFees += fee;
```

**가스:** ~100,000

---

#### closeMarket

```solidity
function closeMarket(uint256 _marketId) external onlyOwner
```

**설명:** 베팅을 수동으로 마감한다 (자동 마감 외 수동 조기 마감용).

**검증:**
- `markets[_marketId].status == MarketStatus.Active`

**동작:**
1. `status = Closed`
2. `MarketClosed` 이벤트 emit

---

#### pauseMarket

```solidity
function pauseMarket(uint256 _marketId) external onlyOwner
```

**설명:** 특정 마켓을 긴급 중단한다.

**검증:**
- `markets[_marketId].status == MarketStatus.Active`

**동작:**
1. `status = Paused`
2. `MarketPaused` 이벤트 emit

---

#### resumeMarket

```solidity
function resumeMarket(uint256 _marketId, uint256 _newBettingDeadline) external onlyOwner
```

**설명:** 중단된 마켓을 재개한다.

**검증:**
- `markets[_marketId].status == MarketStatus.Paused`
- `_newBettingDeadline > block.timestamp`

**동작:**
1. `status = Active`, `bettingDeadline = _newBettingDeadline`
2. `MarketResumed` 이벤트 emit

---

#### withdrawFees

```solidity
function withdrawFees() external onlyOwner
```

**설명:** 누적된 플랫폼 수수료를 인출한다.

**검증:**
- `accumulatedFees > 0`

**동작:**
1. `amount = accumulatedFees`
2. `accumulatedFees = 0`
3. `payable(owner).transfer(amount)`
4. `FeesWithdrawn` 이벤트 emit

---

#### updateSettings

```solidity
function updateSettings(
    uint256 _minBet,
    uint256 _maxBet,
    uint256 _platformFeeRate
) external onlyOwner
```

**설명:** 플랫폼 설정을 변경한다.

**검증:**
- `_minBet > 0`
- `_maxBet > _minBet`
- `_platformFeeRate <= 1000`: 최대 10%

---

### 4.2 사용자 함수

#### placeBet

```solidity
function placeBet(uint256 _marketId, bool _isYes) external payable
```

**설명:** Yes 또는 No에 META를 베팅한다.

**검증:**
- `!paused`: 글로벌 비중단 상태
- `markets[_marketId].status == MarketStatus.Active`: 활성 마켓
- `block.timestamp < markets[_marketId].bettingDeadline`: 마감 전
- `msg.value >= minBet`: 최소 금액 이상
- `msg.value <= maxBet`: 최대 금액 이하
- `bets[_marketId][msg.sender].amount == 0 || bets[_marketId][msg.sender].isYes == _isYes`: 첫 베팅이거나 같은 방향 추가 베팅

**동작:**
1. 첫 베팅이면 새 `Bet` 생성, 해당 방향 `Count++`
2. 추가 베팅이면 기존 `amount`에 합산
3. `_isYes`면 `yesPool += msg.value`, 아니면 `noPool += msg.value`
4. `BetPlaced` 이벤트 emit

**가스:** ~80,000

---

#### claimWinnings

```solidity
function claimWinnings(uint256 _marketId) external
```

**설명:** 결과 확정 후 승리자가 보상을 클레임한다.

**검증:**
- `markets[_marketId].status == MarketStatus.Resolved`: 결과 확정 상태
- `bets[_marketId][msg.sender].amount > 0`: 베팅 기록 존재
- `!bets[_marketId][msg.sender].claimed`: 미클레임 상태
- 승리 방향 일치: `(outcome == Yes && bet.isYes) || (outcome == No && !bet.isYes)`

**동작:**
```solidity
uint256 winningPool = (outcome == Yes) ? market.yesPool : market.noPool;
uint256 losingPool = (outcome == Yes) ? market.noPool : market.yesPool;
uint256 fee = (losingPool * platformFeeRate) / FEE_DENOMINATOR;
uint256 distributable = losingPool - fee;

uint256 reward = bet.amount + (distributable * bet.amount / winningPool);

bet.claimed = true;
payable(msg.sender).transfer(reward);
```

**가스:** ~60,000

---

#### claimRefund

```solidity
function claimRefund(uint256 _marketId) external
```

**설명:** Void 마켓에서 베팅 원금을 환불받는다.

**검증:**
- `markets[_marketId].status == MarketStatus.Voided`
- `bets[_marketId][msg.sender].amount > 0`
- `!bets[_marketId][msg.sender].claimed`

**동작:**
1. `bet.claimed = true`
2. `payable(msg.sender).transfer(bet.amount)`
3. `RefundClaimed` 이벤트 emit

**가스:** ~50,000

---

### 4.3 View 함수

```solidity
// 마켓 정보 조회
function getMarket(uint256 _marketId) external view returns (Market memory);

// 특정 사용자의 베팅 조회
function getBet(uint256 _marketId, address _user) external view returns (Bet memory);

// 현재 배당률 조회 (basis points 반환, 10000 = 1.0x)
function getOdds(uint256 _marketId) external view returns (uint256 yesOdds, uint256 noOdds);

// 예상 수익 계산
function calculatePotentialWinnings(
    uint256 _marketId,
    bool _isYes,
    uint256 _amount
) external view returns (uint256);

// 활성 마켓 수
function getActiveMarketCount() external view returns (uint256);

// 마켓 총 풀
function getTotalPool(uint256 _marketId) external view returns (uint256);
```

---

## 5. 이벤트

```solidity
event MarketCreated(
    uint256 indexed marketId,
    string question,
    MarketCategory category,
    uint256 bettingDeadline,
    uint256 resolutionDeadline
);

event MarketClosed(uint256 indexed marketId);

event MarketResolved(
    uint256 indexed marketId,
    MarketOutcome outcome,
    uint256 yesPool,
    uint256 noPool
);

event MarketPaused(uint256 indexed marketId);

event MarketResumed(uint256 indexed marketId, uint256 newBettingDeadline);

event BetPlaced(
    uint256 indexed marketId,
    address indexed bettor,
    bool isYes,
    uint256 amount,
    uint256 newYesPool,
    uint256 newNoPool
);

event WinningsClaimed(
    uint256 indexed marketId,
    address indexed bettor,
    uint256 reward
);

event RefundClaimed(
    uint256 indexed marketId,
    address indexed bettor,
    uint256 amount
);

event FeesWithdrawn(address indexed to, uint256 amount);

event SettingsUpdated(uint256 minBet, uint256 maxBet, uint256 platformFeeRate);
```

---

## 6. Modifier

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}

modifier marketExists(uint256 _marketId) {
    require(_marketId > 0 && _marketId <= marketCount, "Invalid market");
    _;
}
```

---

## 7. 배포 파라미터

### 7.1 Constructor

```solidity
constructor(uint256 _minBet, uint256 _maxBet, uint256 _platformFeeRate)
```

### 7.2 Mainnet 배포 값

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `_minBet` | `100000000000000000000` | 100 META (100 × 10^18) |
| `_maxBet` | `100000000000000000000000` | 100,000 META (100000 × 10^18) |
| `_platformFeeRate` | `200` | 2% (200 / 10000) |

### 7.3 Testnet 배포 값

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| `_minBet` | `1000000000000000000` | 1 META (테스트용 소액) |
| `_maxBet` | `1000000000000000000000` | 1,000 META |
| `_platformFeeRate` | `200` | 2% |

---

## 8. 보안 고려사항

### 8.1 재진입 공격 방지

`claimWinnings`와 `claimRefund`에서 `claimed = true`를 transfer **이전에** 설정한다 (Checks-Effects-Interactions 패턴).

```solidity
// 올바른 패턴
bet.claimed = true;                    // Effects (상태 변경 먼저)
payable(msg.sender).transfer(reward);  // Interactions (외부 호출 나중에)
```

추가로 OpenZeppelin `ReentrancyGuard`를 상속하여 `nonReentrant` modifier를 적용한다.

### 8.2 정수 오버플로우

Solidity 0.8+의 내장 오버플로우/언더플로우 체크를 활용한다.

### 8.3 프론트러닝 방지

예측 마켓 특성상 프론트러닝은 큰 리스크가 아님 (배당률 변동 정도). 대규모 풀 조작을 방지하기 위해 `maxBet` 제한을 둔다.

### 8.4 시간 조작

`block.timestamp`는 ±15초 정도 조작 가능하나, 마켓 마감 시간이 보통 시간~일 단위이므로 무시 가능한 수준이다.

### 8.5 먼지 공격 (Dust Attack)

`minBet`을 100 META로 설정하여 극소액 스팸 베팅을 방지한다.

---

## 9. 프론트엔드 연동 가이드

### 9.1 ethers.js 연동 예시

```javascript
// 마켓 목록 로딩
async function loadMarkets() {
    const count = await contract.marketCount();
    const markets = [];
    for (let i = 1; i <= count; i++) {
        const m = await contract.getMarket(i);
        markets.push(m);
    }
    return markets;
}

// 베팅
async function placeBet(marketId, isYes, amountMETA) {
    const amountWei = ethers.parseEther(amountMETA.toString());
    const tx = await contract.placeBet(marketId, isYes, { value: amountWei });
    await tx.wait();
}

// 배당률 표시
async function displayOdds(marketId) {
    const [yesOdds, noOdds] = await contract.getOdds(marketId);
    // yesOdds, noOdds는 basis points (10000 = 1.0x)
    const yesMultiplier = Number(yesOdds) / 10000;
    const noMultiplier = Number(noOdds) / 10000;
}

// 예상 수익 계산
async function calculateReturn(marketId, isYes, amount) {
    const amountWei = ethers.parseEther(amount.toString());
    const potential = await contract.calculatePotentialWinnings(marketId, isYes, amountWei);
    return ethers.formatEther(potential);
}

// 보상 클레임
async function claimReward(marketId) {
    const tx = await contract.claimWinnings(marketId);
    await tx.wait();
}
```

### 9.2 이벤트 리스닝

```javascript
// 실시간 베팅 업데이트
contract.on("BetPlaced", (marketId, bettor, isYes, amount, newYesPool, newNoPool) => {
    updateMarketCard(marketId, newYesPool, newNoPool);
});

// 결과 확정 알림
contract.on("MarketResolved", (marketId, outcome, yesPool, noPool) => {
    showResultNotification(marketId, outcome);
});
```

---

## 10. 테스트 시나리오

### 10.1 마켓 생성

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | 관리자가 유효한 마켓 생성 | 성공, MarketCreated 이벤트 |
| 2 | 비관리자가 마켓 생성 시도 | revert "Not owner" |
| 3 | 과거 시간으로 마감 설정 | revert |
| 4 | 빈 질문 텍스트 | revert |

### 10.2 베팅

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | 100 META Yes 베팅 | 성공, yesPool 증가 |
| 2 | 99 META 베팅 (최소 미달) | revert |
| 3 | 100,001 META 베팅 (최대 초과) | revert |
| 4 | 마감 후 베팅 시도 | revert |
| 5 | Closed 마켓에 베팅 시도 | revert |
| 6 | Yes 베팅 후 Yes 추가 베팅 | 성공, 금액 합산 |
| 7 | Yes 베팅 후 No 베팅 시도 | revert |

### 10.3 결과 확정 & 클레임

| # | 시나리오 | 예상 결과 |
|---|---------|----------|
| 1 | Yes 확정, Yes 베터 클레임 | 원금 + 보상 수령 |
| 2 | Yes 확정, No 베터 클레임 시도 | revert |
| 3 | 같은 마켓에서 이중 클레임 | revert |
| 4 | Void 마켓 환불 클레임 | 원금 반환 |
| 5 | 미확정 마켓에서 클레임 시도 | revert |

### 10.4 보상 계산 검증

```
시나리오: Yes 풀 10,000 META, No 풀 15,000 META, 수수료 2%
결과: Yes 승리

수수료 = 15,000 × 2% = 300 META
분배 가능 = 14,700 META

A (Yes 6,000 META): 6,000 + 14,700 × 6,000/10,000 = 14,820 META
B (Yes 4,000 META): 4,000 + 14,700 × 4,000/10,000 = 9,880 META

검증: 14,820 + 9,880 = 24,700 META = 25,000 - 300 ✓
```

---

## 11. ABI 요약 (프론트엔드용)

```json
[
  "function createMarket(string,string,string,string,uint8,uint256,uint256) returns (uint256)",
  "function resolveMarket(uint256,uint8)",
  "function closeMarket(uint256)",
  "function pauseMarket(uint256)",
  "function resumeMarket(uint256,uint256)",
  "function withdrawFees()",
  "function updateSettings(uint256,uint256,uint256)",
  "function placeBet(uint256,bool) payable",
  "function claimWinnings(uint256)",
  "function claimRefund(uint256)",
  "function getMarket(uint256) view returns (tuple)",
  "function getBet(uint256,address) view returns (tuple)",
  "function getOdds(uint256) view returns (uint256,uint256)",
  "function calculatePotentialWinnings(uint256,bool,uint256) view returns (uint256)",
  "function marketCount() view returns (uint256)",
  "function minBet() view returns (uint256)",
  "function maxBet() view returns (uint256)",
  "function platformFeeRate() view returns (uint256)",
  "function accumulatedFees() view returns (uint256)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)"
]
```
