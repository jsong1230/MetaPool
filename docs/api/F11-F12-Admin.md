# API 스펙: F-11 긴급 마켓 중단 + F-12 설정 관리

> 확정본 — contracts/MetaPool.sol 기준

---

## F-11: 긴급 마켓 중단

### pauseMarket

| 항목 | 내용 |
|------|------|
| 함수명 | `pauseMarket(uint256 _marketId)` |
| 접근 제어 | `onlyOwner` |
| 상태 변경 | `Active(0)` → `Paused(4)` |
| 가스 타입 | 트랜잭션 (상태 변경) |

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| _marketId | uint256 | 중단할 마켓 ID |

**이벤트**

```solidity
event MarketPaused(uint256 indexed marketId);
```

**revert 조건**

| 에러 | 조건 |
|------|------|
| `OwnableUnauthorizedAccount(address)` | 호출자가 owner가 아닌 경우 |
| `MarketNotFound(uint256 marketId)` | 마켓 ID가 존재하지 않는 경우 (id == 0) |
| `MarketNotPausable(uint256 marketId, MarketStatus currentStatus)` | 마켓 상태가 Active가 아닌 경우 |

---

### resumeMarket

| 항목 | 내용 |
|------|------|
| 함수명 | `resumeMarket(uint256 _marketId, uint256 _newBettingDeadline, uint256 _newResolutionDeadline)` |
| 접근 제어 | `onlyOwner` |
| 상태 변경 | `Paused(4)` → `Active(0)`, `bettingDeadline` 및 `resolutionDeadline` 갱신 |
| 가스 타입 | 트랜잭션 (상태 변경) |

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| _marketId | uint256 | 재개할 마켓 ID |
| _newBettingDeadline | uint256 | 새 베팅 마감 timestamp (block.timestamp 초과여야 함) |
| _newResolutionDeadline | uint256 | 새 결과 확정 예정 timestamp (_newBettingDeadline 초과여야 함) |

**이벤트**

```solidity
event MarketResumed(uint256 indexed marketId, uint256 newBettingDeadline, uint256 newResolutionDeadline);
```

**revert 조건**

| 에러 | 조건 |
|------|------|
| `OwnableUnauthorizedAccount(address)` | 호출자가 owner가 아닌 경우 |
| `MarketNotFound(uint256 marketId)` | 마켓 ID가 존재하지 않는 경우 |
| `MarketNotPaused(uint256 marketId, MarketStatus currentStatus)` | 마켓 상태가 Paused가 아닌 경우 |
| `InvalidDeadline(uint256 bettingDeadline, uint256 resolutionDeadline)` | `_newBettingDeadline <= block.timestamp` 또는 `_newResolutionDeadline <= _newBettingDeadline` |

---

## F-12: 설정 관리

### setMinBet

| 항목 | 내용 |
|------|------|
| 함수명 | `setMinBet(uint256 _minBet)` |
| 접근 제어 | `onlyOwner` |
| 상태 변경 | `minBet` 갱신 |

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| _minBet | uint256 | 새 최소 베팅 금액 (wei). 0 초과, maxBet 미만이어야 함 |

**이벤트**

```solidity
event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
// setting = "minBet"
```

**revert 조건**

| 에러 | 조건 |
|------|------|
| `OwnableUnauthorizedAccount(address)` | 호출자가 owner가 아닌 경우 |
| `InvalidMinBet(uint256 minBet)` | `_minBet == 0` 또는 `_minBet >= maxBet` |

---

### setMaxBet

| 항목 | 내용 |
|------|------|
| 함수명 | `setMaxBet(uint256 _maxBet)` |
| 접근 제어 | `onlyOwner` |
| 상태 변경 | `maxBet` 갱신 |

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| _maxBet | uint256 | 새 최대 베팅 금액 (wei). minBet 초과여야 함 |

**이벤트**

```solidity
event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
// setting = "maxBet"
```

**revert 조건**

| 에러 | 조건 |
|------|------|
| `OwnableUnauthorizedAccount(address)` | 호출자가 owner가 아닌 경우 |
| `InvalidMaxBet(uint256 maxBet, uint256 currentMinBet)` | `_maxBet <= minBet` |

---

### setPlatformFeeRate

| 항목 | 내용 |
|------|------|
| 함수명 | `setPlatformFeeRate(uint256 _feeRate)` |
| 접근 제어 | `onlyOwner` |
| 상태 변경 | `platformFeeRate` 갱신 |

**파라미터**

| 이름 | 타입 | 설명 |
|------|------|------|
| _feeRate | uint256 | 새 수수료율 (basis points). 최대 1000 (10%). 0 허용 |

**이벤트**

```solidity
event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
// setting = "platformFeeRate"
```

**revert 조건**

| 에러 | 조건 |
|------|------|
| `OwnableUnauthorizedAccount(address)` | 호출자가 owner가 아닌 경우 |
| `InvalidFeeRate(uint256 feeRate)` | `_feeRate > 1000` |

---

### withdrawFees (업데이트)

> 기존 함수에 `FeesWithdrawn` 이벤트 추가됨

| 항목 | 내용 |
|------|------|
| 함수명 | `withdrawFees()` |
| 접근 제어 | `onlyOwner`, `nonReentrant` |
| 상태 변경 | `accumulatedFees` → 0, owner 주소로 누적 수수료 전송 |

**이벤트**

```solidity
event FeesWithdrawn(address indexed recipient, uint256 amount);
```

**동작**

- `accumulatedFees == 0` 이면 이벤트 emit 없이 정상 반환 (no revert)
- CEI 패턴 적용: `accumulatedFees = 0` 후 전송

---

## 추가된 Custom Errors 목록

| 에러 | 파라미터 | 발생 함수 |
|------|----------|----------|
| `MarketNotPausable(uint256 marketId, MarketStatus currentStatus)` | 마켓ID, 현재 상태 | `pauseMarket` |
| `MarketNotPaused(uint256 marketId, MarketStatus currentStatus)` | 마켓ID, 현재 상태 | `resumeMarket` |
| `InvalidMinBet(uint256 minBet)` | 입력값 | `setMinBet` |
| `InvalidMaxBet(uint256 maxBet, uint256 currentMinBet)` | 입력값, 현재 minBet | `setMaxBet` |
| `InvalidFeeRate(uint256 feeRate)` | 입력값 | `setPlatformFeeRate` |

---

## 추가된 Events 목록

| 이벤트 | 파라미터 | 발생 함수 |
|--------|----------|----------|
| `MarketPaused(uint256 indexed marketId)` | 마켓ID | `pauseMarket` |
| `MarketResumed(uint256 indexed marketId, uint256 newBettingDeadline, uint256 newResolutionDeadline)` | 마켓ID, 새 베팅 마감, 새 결과 마감 | `resumeMarket` |
| `SettingsUpdated(string setting, uint256 oldValue, uint256 newValue)` | 설정명, 이전값, 새값 | `setMinBet`, `setMaxBet`, `setPlatformFeeRate` |
| `FeesWithdrawn(address indexed recipient, uint256 amount)` | 수신자, 금액 | `withdrawFees` |
