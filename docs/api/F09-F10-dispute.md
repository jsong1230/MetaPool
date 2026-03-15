# F-09 / F-10 이의제기 기간 & 이의제기 — Smart Contract API 스펙 (확정본)

## 개요

| 항목 | 내용 |
|------|------|
| 기능 | F-09 이의제기 기간, F-10 이의제기 |
| 컨트랙트 | MetaPool.sol |
| 구현 일자 | 2026-03-15 |

---

## 상수

| 상수명 | 타입 | 값 | 설명 |
|--------|------|-----|------|
| `DISPUTE_PERIOD` | `uint256` | `86400` (24h) | 이의제기 기간 (초) |
| `DISPUTE_STAKE` | `uint256` | `1000 ether` | 이의 제출 시 필요한 스테이킹 금액 |
| `DISPUTE_THRESHOLD` | `uint256` | `1000` (10%) | 재심 전환 임계값 (basis points) |

---

## Struct

### Dispute

```solidity
struct Dispute {
    uint256 stake;    // 스테이킹 금액 (1,000 META)
    bool resolved;    // 이의 처리 완료 여부
    bool accepted;    // 이의 인정 여부
}
```

### Market (변경 필드)

| 필드 | 타입 | 설명 |
|------|------|------|
| `disputeDeadline` | `uint256` | 이의제기 마감 timestamp (Yes/No 확정 시 resolvedAt + 24h) |
| `disputeCount` | `uint256` | 이의 제출 건수 |
| `underReview` | `bool` | 재심 상태 여부 |

---

## Mapping

```solidity
mapping(uint256 => mapping(address => Dispute)) public disputes;
// disputes[marketId][disputerAddress]
```

---

## 함수

### resolveMarket (수정)

F-09 적용: Yes/No 확정 시 `disputeDeadline` 자동 설정.

```solidity
function resolveMarket(uint256 _marketId, MarketOutcome _outcome) external onlyOwner
```

**변경 사항**: Yes/No 확정 시 `market.disputeDeadline = block.timestamp + DISPUTE_PERIOD` 설정.
Void 확정 시 `disputeDeadline = 0` (이의제기 없음, 즉시 환불 가능).

---

### claimWinnings (수정)

F-09 적용: 이의제기 기간 중 또는 재심 상태에서 클레임 차단.

```solidity
function claimWinnings(uint256 _marketId) external nonReentrant
```

**추가된 검증 (순서)**:
1. `market.status == Resolved` — 기존
2. `market.underReview == false` — `MarketUnderReview` revert
3. `block.timestamp > market.disputeDeadline` — `DisputePeriodActive` revert
4. 이후 기존 로직 동일

---

### submitDispute

```solidity
function submitDispute(uint256 _marketId) external payable nonReentrant
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_marketId` | `uint256` | 이의를 제출할 마켓 ID |
| `msg.value` | `uint256` | `DISPUTE_STAKE` (1,000 META) 정확히 전송 |

**검증 조건**:
1. 마켓 존재 (`market.id != 0`)
2. `market.status == Resolved`
3. `block.timestamp <= market.disputeDeadline`
4. `msg.value == DISPUTE_STAKE`
5. `bets[_marketId][msg.sender].amount > 0` (베팅 참여자)
6. `disputes[_marketId][msg.sender].stake == 0` (중복 제출 방지)

**효과**:
- `disputes[_marketId][msg.sender]` 생성
- `market.disputeCount++`
- 임계값 초과 시 `market.underReview = true`, `MarketReviewTriggered` emit

**임계값 계산**:
```
threshold = (yesCount + noCount) * DISPUTE_THRESHOLD / FEE_DENOMINATOR
underReview = (disputeCount >= threshold) && (threshold > 0)
```

**Emits**: `DisputeSubmitted(marketId, disputant, stake, disputeCount)`

---

### resolveDispute

```solidity
function resolveDispute(
    uint256 _marketId,
    address _disputant,
    bool _accepted
) external onlyOwner nonReentrant
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_marketId` | `uint256` | 마켓 ID |
| `_disputant` | `address` | 이의 제출자 주소 |
| `_accepted` | `bool` | 이의 인정 여부 |

**검증 조건**:
1. 마켓 존재
2. `dispute.stake > 0` (이의 기록 존재)
3. `dispute.resolved == false` (이중 처리 방지)

**효과**:
- `dispute.resolved = true`, `dispute.accepted = _accepted`
- `_accepted == true`: 스테이킹 금액 `_disputant`에 반환
- `_accepted == false`: 스테이킹 금액 `accumulatedFees`에 추가

**Emits**: `DisputeResolved(marketId, disputant, accepted, stakeReturned)`

---

### resolveReview

```solidity
function resolveReview(
    uint256 _marketId,
    MarketOutcome _newOutcome
) external onlyOwner
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_marketId` | `uint256` | 마켓 ID |
| `_newOutcome` | `MarketOutcome` | 새 결과 (Yes/No/Void) |

**검증 조건**:
1. 마켓 존재
2. `market.underReview == true`
3. `_newOutcome != Undecided`

**효과**:
- `market.underReview = false`
- `market.disputeDeadline = 0` (즉시 클레임 가능)
- 결과 변경 시 수수료 재계산
- Void 전환 시 기존 수수료 차감, 상태 `Voided`로 변경

**Emits**: `MarketResolved(marketId, newOutcome, accumulatedFees)`

---

### getDispute (view)

```solidity
function getDispute(uint256 _marketId, address _user) external view returns (Dispute memory)
```

이의제기 기록 조회. `stake == 0`이면 이의 미제출.

---

## Events

| 이벤트 | 파라미터 | 발생 시점 |
|--------|----------|-----------|
| `DisputeSubmitted` | `uint256 indexed marketId, address indexed disputant, uint256 stake, uint256 disputeCount` | `submitDispute()` |
| `DisputeResolved` | `uint256 indexed marketId, address indexed disputant, bool accepted, uint256 stakeReturned` | `resolveDispute()` |
| `MarketReviewTriggered` | `uint256 indexed marketId, uint256 disputeCount, uint256 totalBettors` | `submitDispute()` 임계값 초과 시 |

---

## Custom Errors

| 에러 | 파라미터 | 발생 조건 |
|------|----------|-----------|
| `DisputePeriodActive` | `(uint256 marketId, uint256 deadline)` | 이의제기 기간 중 claimWinnings 호출 |
| `DisputePeriodEnded` | `(uint256 marketId)` | 이의제기 기간 종료 후 submitDispute 호출 |
| `InvalidDisputeStake` | `(uint256 sent, uint256 required)` | msg.value != DISPUTE_STAKE |
| `NotBettor` | `(uint256 marketId, address user)` | 베팅 기록 없는 사용자의 이의 제출 |
| `AlreadyDisputed` | `(uint256 marketId, address user)` | 중복 이의 제출 |
| `MarketUnderReview` | `(uint256 marketId)` | underReview 마켓에서 claimWinnings |
| `MarketNotUnderReview` | `(uint256 marketId)` | underReview 아닌 마켓에 resolveReview |
| `DisputeNotFound` | `(uint256 marketId, address user)` | 존재하지 않는 이의 처리 |
| `DisputeAlreadyResolved` | `(uint256 marketId, address user)` | 이미 처리된 이의 재처리 |

---

## 상태 흐름 (이의제기 기간)

```
resolveMarket(Yes/No)
    → status = Resolved
    → disputeDeadline = block.timestamp + 24h

이의제기 기간 중 (block.timestamp <= disputeDeadline):
    submitDispute() 가능
    claimWinnings() → DisputePeriodActive revert

이의제기 기간 종료 (block.timestamp > disputeDeadline):
    underReview == false → claimWinnings() 가능
    underReview == true  → claimWinnings() → MarketUnderReview revert

underReview == true:
    resolveReview() 호출 후 underReview = false, disputeDeadline = 0
    → claimWinnings() 즉시 가능
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-15 | F-09/F-10 초기 구현 확정 |
