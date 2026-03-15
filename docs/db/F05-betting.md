# F-05/F-06 Yes/No 베팅 -- DB 스키마 확정본

> 구현 완료: 2026-03-15
> 기준 파일: contracts/MetaPool.sol (F-05 구현 완료 상태)
> 참조: docs/system/erd.md

---

## 1. 변경 요약

F-05/F-06은 신규 struct/storage를 추가하지 않습니다. 기존 `Market` struct와 `Bet` struct, 그리고 `bets` mapping을 활용하여 구현합니다.

| 엔티티 | 변경 내용 |
|--------|-----------|
| `Market` struct | `yesPool`, `noPool`, `yesCount`, `noCount` 필드 갱신 로직 추가 (기존 필드 정의 그대로) |
| `Bet` struct | `amount`, `isYes` 필드 write 로직 추가 (기존 필드 정의 그대로) |
| `bets` mapping | `placeBet` 호출 시 write |

---

## 2. Bet Struct

```solidity
struct Bet {
    uint256 amount;   // 누적 베팅 금액 (wei). 0이면 미베팅
    bool isYes;       // 베팅 방향: true=Yes, false=No
    bool claimed;     // 보상 수령 여부 (F-09에서 갱신)
}
```

### Storage 구조

```solidity
mapping(uint256 => mapping(address => Bet)) public bets;
// bets[marketId][userAddress] = Bet
```

- 키: `(marketId, userAddress)` 쌍
- 기본값: `{ amount: 0, isYes: false, claimed: false }`
- `amount == 0`이면 해당 마켓에 베팅 기록 없음을 의미

### 갱신 규칙

| 조건 | `bet.isYes` | `bet.amount` | `bet.claimed` |
|------|------------|--------------|---------------|
| 첫 베팅 | `_isYes`로 설정 | `+= msg.value` | 변경 없음 (false 유지) |
| 추가 베팅 (같은 방향) | 변경 없음 | `+= msg.value` | 변경 없음 |

---

## 3. Market Struct (F-05 관련 필드)

```solidity
struct Market {
    // ... 기타 필드 (F-01에서 정의)
    uint256 yesPool;    // Yes 방향 총 베팅 금액 (wei)
    uint256 noPool;     // No 방향 총 베팅 금액 (wei)
    uint256 yesCount;   // Yes 방향 참여자 수 (고유 사용자)
    uint256 noCount;    // No 방향 참여자 수 (고유 사용자)
    // ...
}
```

### 갱신 규칙

| 조건 | `yesPool` / `noPool` | `yesCount` / `noCount` |
|------|---------------------|------------------------|
| 첫 Yes 베팅 | `yesPool += msg.value` | `yesCount++` |
| 추가 Yes 베팅 | `yesPool += msg.value` | 변경 없음 |
| 첫 No 베팅 | `noPool += msg.value` | `noCount++` |
| 추가 No 베팅 | `noPool += msg.value` | 변경 없음 |

---

## 4. 이벤트 로그 (on-chain 인덱싱)

```solidity
event BetPlaced(
    uint256 indexed marketId,   // 마켓별 필터링
    address indexed bettor,     // 사용자별 필터링
    bool isYes,
    uint256 amount,             // 이번 트랜잭션 금액 (증분)
    uint256 newYesPool,
    uint256 newNoPool
);
```

- `indexed` 파라미터: `marketId`, `bettor` (2개로 제한, 가스 절약)
- 프론트엔드는 이 이벤트로 풀 상태를 별도 view 호출 없이 갱신 가능

---

## 5. 가스 소모 특성

| 시나리오 | Storage 변경 | 예상 가스 |
|---------|-------------|----------|
| 첫 베팅 (cold SSTORE) | bet.isYes, bet.amount + market.yesPool/noPool + market.yesCount/noCount | ~80,000–100,000 |
| 추가 베팅 (warm SSTORE) | bet.amount + market.yesPool/noPool | ~50,000–70,000 |

Storage 포인터 패턴으로 중복 SLOAD 방지:
```solidity
Market storage market = markets[_marketId];  // 1회 SLOAD
Bet storage bet = bets[_marketId][msg.sender]; // 1회 SLOAD
```
