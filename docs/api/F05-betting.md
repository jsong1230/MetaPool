# F-05/F-06 Yes/No 베팅 -- API 스펙 확정본

> 구현 완료: 2026-03-15
> 기준 파일: contracts/MetaPool.sol (F-05 구현 완료 상태)

---

## 1. 함수 목록

| 함수명 | 종류 | Modifier | 설명 |
|--------|------|----------|------|
| `placeBet(uint256 _marketId, bool _isYes)` | `external payable` | `whenNotPaused` | Yes/No 베팅 (첫 베팅 + 추가 베팅 통합) |
| `getUserBet(uint256 _marketId, address _user)` | `external view` | - | 특정 사용자의 베팅 정보 조회 |
| `getOdds(uint256 _marketId)` | `external view` | - | 마켓 배당률 조회 (basis points) |

---

## 2. placeBet

### 시그니처

```solidity
function placeBet(uint256 _marketId, bool _isYes) external payable whenNotPaused
```

### 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_marketId` | `uint256` | 베팅할 마켓 ID (1 이상) |
| `_isYes` | `bool` | `true`=Yes 베팅, `false`=No 베팅 |
| `msg.value` | `uint256` (wei) | 베팅 금액. `minBet` 이상 `maxBet` 이하 |

### 검증 순서

1. `market.id == 0` → `MarketNotFound(_marketId)` revert
2. `market.status != Active` → `MarketNotActive(_marketId, currentStatus)` revert
3. `block.timestamp >= market.bettingDeadline` → `BettingDeadlinePassed(_marketId, deadline)` revert
4. `msg.value < minBet` → `BetAmountTooLow(msg.value, minBet)` revert
5. `msg.value > maxBet` → `BetAmountTooHigh(msg.value, maxBet)` revert
6. `bet.amount > 0 && bet.isYes != _isYes` → `OppositeBetExists(_marketId, msg.sender)` revert

### 상태 변경

- **첫 베팅** (`bet.amount == 0`):
  - `bet.isYes = _isYes`
  - `_isYes ? market.yesCount++ : market.noCount++`
- **공통**:
  - `bet.amount += msg.value`
  - `_isYes ? market.yesPool += msg.value : market.noPool += msg.value`

### emit 이벤트

```solidity
event BetPlaced(
    uint256 indexed marketId,
    address indexed bettor,
    bool isYes,
    uint256 amount,         // 이번 트랜잭션 금액 (추가 베팅 시 증분만)
    uint256 newYesPool,     // 베팅 후 전체 Yes 풀
    uint256 newNoPool       // 베팅 후 전체 No 풀
);
```

---

## 3. getUserBet

### 시그니처

```solidity
function getUserBet(uint256 _marketId, address _user) external view returns (Bet memory)
```

### 반환값

```solidity
struct Bet {
    uint256 amount;  // 누적 베팅 금액 (wei). 0이면 베팅 없음
    bool isYes;      // 베팅 방향 (amount==0이면 의미 없음)
    bool claimed;    // 보상 수령 여부
}
```

### 특이사항

- 미존재 마켓 또는 베팅 없는 사용자: `{ amount: 0, isYes: false, claimed: false }` 반환 (revert 없음)

---

## 4. getOdds

### 시그니처

```solidity
function getOdds(uint256 _marketId) external view returns (uint256 yesOdds, uint256 noOdds)
```

### 반환값

- 단위: **basis points** (10000 = 1.00x)
- `(0, 0)` 반환 조건:
  - 풀이 완전히 비어있을 때 (`totalPool == 0`)
  - 한쪽 풀이 0일 때 (`yesPool == 0` 또는 `noPool == 0`)

### 배당률 계산 공식

```
totalPool   = yesPool + noPool
feeAdjusted = FEE_DENOMINATOR - platformFeeRate  // 예: 10000 - 200 = 9800
yesOdds     = totalPool * feeAdjusted / yesPool
noOdds      = totalPool * feeAdjusted / noPool
```

### 예시

| yesPool | noPool | yesOdds | noOdds | 설명 |
|---------|--------|---------|--------|------|
| 0 | 0 | 0 | 0 | 풀 없음 |
| 1000 | 0 | 0 | 0 | 한쪽만 있음 |
| 1000 | 1000 | 19600 | 19600 | 균등 (1.96x) |
| 3000 | 1000 | 13066 | 39200 | Yes 우세 |
| 1000 | 3000 | 39200 | 13066 | No 우세 |

---

## 5. Custom Errors (F-05 신규 추가)

| Error | 파라미터 | 발생 조건 |
|-------|---------|-----------|
| `MarketNotFound(uint256 marketId)` | marketId | 마켓 미존재 (market.id == 0) |
| `MarketNotActive(uint256 marketId, MarketStatus currentStatus)` | marketId, status | 마켓 상태가 Active 아님 |
| `BettingDeadlinePassed(uint256 marketId, uint256 deadline)` | marketId, deadline | 마감 시간 경과 |
| `BetAmountTooLow(uint256 amount, uint256 minBet)` | amount, minBet | msg.value < minBet |
| `BetAmountTooHigh(uint256 amount, uint256 maxBet)` | amount, maxBet | msg.value > maxBet |
| `OppositeBetExists(uint256 marketId, address user)` | marketId, user | 반대 방향 추가 베팅 시도 |

---

## 6. 관리자 함수 (F-05에서 함께 추가)

| 함수명 | 종류 | Modifier | 설명 |
|--------|------|----------|------|
| `pause()` | `external` | `onlyOwner` | 글로벌 pause (모든 placeBet 차단) |
| `unpause()` | `external` | `onlyOwner` | 글로벌 pause 해제 |

pause 상태에서 placeBet 호출 시 OpenZeppelin `EnforcedPause()` 에러로 revert.
