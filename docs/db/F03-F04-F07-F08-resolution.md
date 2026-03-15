# DB 스키마 확정본 — F-03/F-04/F-07/F-08 결과 확정 및 클레임

> 온체인 스토리지 설계 (별도 DB 없음, Solidity 스토리지 = DB)
> 구현 파일: `/contracts/MetaPool.sol`

---

## 1. 변경된 Enum 값 활용

### MarketStatus (기존 enum 확장 없음, 기존 값 사용)

```solidity
enum MarketStatus {
    Active,    // 0 — 베팅 진행 중
    Closed,    // 1 — 베팅 마감 (수동)
    Resolved,  // 2 — 결과 확정 (Yes/No) ← F-03 결과
    Voided,    // 3 — 무효화 (Void) ← F-03 결과
    Paused     // 4 — 긴급 중단
}
```

### MarketOutcome (기존 enum, F-03에서 실제 사용)

```solidity
enum MarketOutcome {
    Undecided, // 0 — 미확정 (초기값)
    Yes,       // 1 — Yes 확정
    No,        // 2 — No 확정
    Void       // 3 — 무효화 확정
}
```

---

## 2. Market Struct 필드 변경사항

### 기존 필드 (F-01 구현)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | uint256 | 마켓 고유 ID |
| question | string | 영어 질문 |
| questionKo / questionZh / questionJa | string | 다국어 질문 |
| category | MarketCategory | 카테고리 |
| bettingDeadline | uint256 | 베팅 마감 timestamp |
| resolutionDeadline | uint256 | 결과 확정 예정 timestamp |
| status | MarketStatus | 마켓 상태 |
| outcome | MarketOutcome | 확정 결과 (초기값: Undecided) |
| yesPool / noPool | uint256 | Yes/No 풀 총액 (wei) |
| yesCount / noCount | uint256 | Yes/No 참여자 수 |
| createdAt | uint256 | 생성 시간 |
| creator | address | 마켓 생성자 |

### F-03 이후 실제 값이 채워지는 필드

| 필드 | 타입 | 이전 값 | F-03 이후 값 |
|------|------|---------|-------------|
| `status` | MarketStatus | Active(0) | Resolved(2) 또는 Voided(3) |
| `outcome` | MarketOutcome | Undecided(0) | Yes(1), No(2), Void(3) |
| `resolvedAt` | uint256 | 0 | `block.timestamp` (확정 시점) |

---

## 3. Bet Struct 필드 변경사항

```solidity
struct Bet {
    uint256 amount;  // 베팅 금액 (wei)
    bool isYes;      // true=Yes, false=No
    bool claimed;    // 클레임/환불 완료 여부 ← F-07/F-08에서 실제 변경
}
```

| 필드 | 이전 값 | F-07/F-08 이후 값 |
|------|---------|-----------------|
| `claimed` | false | true (클레임/환불 완료 후) |

---

## 4. State Variables 변경사항

### accumulatedFees (기존 변수, F-03에서 실제 누적)

```solidity
uint256 public accumulatedFees;
```

- F-03 `resolveMarket(Yes/No)` 호출 시 `losingPool * platformFeeRate / FEE_DENOMINATOR` 누적
- F-12 `withdrawFees()` 호출 시 0으로 초기화
- Void 확정 시 변화 없음

### 수수료 계산 공식

```
losingPool  = (outcome == Yes) ? noPool : yesPool
platformFee = losingPool * platformFeeRate / FEE_DENOMINATOR
            = losingPool * 200 / 10000   (feeRate=200 기준)
            = losingPool * 2%
accumulatedFees += platformFee
```

---

## 5. 스토리지 맵핑

### markets (기존 맵핑)
```solidity
mapping(uint256 => Market) public markets;
```
- 키: marketId (1부터 시작)
- 값: Market struct
- F-03에서 `status`, `outcome`, `resolvedAt` 필드 업데이트

### bets (기존 맵핑)
```solidity
mapping(uint256 => mapping(address => Bet)) public bets;
```
- 키: (marketId, userAddress)
- 값: Bet struct
- F-07/F-08에서 `claimed` 필드 업데이트

---

## 6. 이벤트 인덱스 (조회 최적화)

### MarketResolved
```
indexed: marketId
비인덱스: outcome, platformFee
```
- 프론트엔드에서 특정 마켓의 확정 이벤트 필터링 가능

### WinningsClaimed
```
indexed: marketId, user
비인덱스: amount
```
- 특정 마켓 또는 특정 사용자의 클레임 이력 조회 가능

### RefundClaimed
```
indexed: marketId, user
비인덱스: amount
```
- 특정 마켓 또는 특정 사용자의 환불 이력 조회 가능

---

## 7. 데이터 라이프사이클

```
마켓 생성 (F-01)
  └─ markets[id].status = Active
  └─ markets[id].outcome = Undecided
  └─ markets[id].resolvedAt = 0

베팅 (F-05)
  └─ bets[id][user].amount += value
  └─ bets[id][user].isYes = direction
  └─ bets[id][user].claimed = false
  └─ markets[id].yesPool/noPool 증가

결과 확정 (F-03)
  └─ markets[id].status = Resolved / Voided
  └─ markets[id].outcome = Yes / No / Void
  └─ markets[id].resolvedAt = block.timestamp
  └─ accumulatedFees += fee (Yes/No 시)

보상 클레임 (F-07)
  └─ bets[id][user].claimed = true
  └─ user 계정으로 META 전송

환불 클레임 (F-08)
  └─ bets[id][user].claimed = true
  └─ user 계정으로 META 전송

수수료 인출 (withdrawFees)
  └─ accumulatedFees = 0
  └─ owner 계정으로 META 전송
```

---

## 8. 가스 사용량 참고

| 함수 | 예상 가스 | 비고 |
|------|-----------|------|
| resolveMarket | ~40,000 | 상태 변경 2개 필드 |
| claimWinnings | ~50,000 | 상태 변경 + ETH 전송 |
| claimRefund | ~45,000 | 상태 변경 + ETH 전송 |
| calculateWinnings | ~5,000 | View 함수 (가스비 없음) |
| withdrawFees | ~35,000 | 상태 초기화 + ETH 전송 |
