# F-09 / F-10 이의제기 기간 & 이의제기 — 온체인 스토리지 스펙 (확정본)

## 개요

MetaPool은 DB가 없는 순수 온체인 아키텍처입니다. 이 문서는 F-09/F-10 기능에 추가된 Solidity storage 구조를 설명합니다.

---

## 신규 Storage

### disputes mapping

```solidity
mapping(uint256 => mapping(address => Dispute)) public disputes;
```

| 키 | 타입 | 설명 |
|----|------|------|
| `marketId` | `uint256` | 마켓 ID |
| `disputerAddress` | `address` | 이의 제출자 주소 |

접근 패턴: `disputes[marketId][disputerAddress]`로 O(1) 조회. `stake == 0`이면 이의 미제출.

---

## 신규 Struct

### Dispute

```solidity
struct Dispute {
    uint256 stake;    // 스테이킹 금액 (wei). stake == 0이면 이의 미제출
    bool resolved;    // 이의 처리 완료 여부 (resolveDispute() 호출 후 true)
    bool accepted;    // 이의 인정 여부 (true: 스테이킹 반환, false: 몰수)
}
```

**Storage slot 분석**: stake(1 slot) + resolved+accepted(bool packing 가능, 1 slot). 총 2 slots per dispute.

---

## 신규 State Variables

```solidity
uint256 public constant DISPUTE_PERIOD = 24 hours;   // 86400 (constant, 가스 절약)
uint256 public constant DISPUTE_STAKE = 1000 ether;  // 1,000 META (constant)
uint256 public constant DISPUTE_THRESHOLD = 1000;    // 10% in basis points (constant)
```

---

## Market Struct 변경 필드

이미 Market struct에 존재했던 필드들이 F-09/F-10 구현으로 실제 사용됩니다.

| 필드 | 타입 | 기본값 | 변경 시점 | 설명 |
|------|------|--------|-----------|------|
| `disputeDeadline` | `uint256` | `0` | `resolveMarket(Yes/No)` 시 `block.timestamp + 86400` 설정 | 이의제기 마감 timestamp |
| `disputeCount` | `uint256` | `0` | `submitDispute()` 시 증가 | 이의 제출 건수 |
| `underReview` | `bool` | `false` | 임계값 초과 시 `true`, `resolveReview()` 후 `false` | 재심 상태 |

---

## Storage Layout (변경 후)

```
storage
├── markets: mapping(uint256 => Market)
│   ├── markets[1] => Market {
│   │   ...
│   │   disputeDeadline: block.timestamp + 86400,  ← resolveMarket(Yes/No) 시 설정
│   │   disputeCount: uint256,                     ← submitDispute() 마다 증가
│   │   underReview: bool                          ← 임계값 초과 시 true
│   │ }
│   └── ...
├── bets: mapping(uint256 => mapping(address => Bet))       (기존)
├── disputes: mapping(uint256 => mapping(address => Dispute))  ← 신규
│   ├── disputes[1][0xAlice] => Dispute { stake: 1000e18, resolved: false, accepted: false }
│   └── ...
├── marketCount: uint256     (기존)
├── minBet: uint256          (기존)
├── maxBet: uint256          (기존)
├── platformFeeRate: uint256 (기존)
├── accumulatedFees: uint256 (기존)
├── DISPUTE_PERIOD: constant  ← 신규 (storage 슬롯 없음, bytecode에 인라인)
├── DISPUTE_STAKE: constant   ← 신규
└── DISPUTE_THRESHOLD: constant ← 신규
```

---

## 이의 스테이킹 자금 흐름

```
submitDispute()
    → msg.value (1,000 META) → 컨트랙트 보관

resolveDispute(_accepted=true)
    → 스테이킹 → 이의제출자 반환

resolveDispute(_accepted=false)
    → 스테이킹 → accumulatedFees 추가 (관리자 withdrawFees()로 인출 가능)
```

---

## 임계값 계산 공식

```
totalBettors = market.yesCount + market.noCount
threshold = totalBettors * DISPUTE_THRESHOLD / FEE_DENOMINATOR
           = totalBettors * 1000 / 10000
           = totalBettors / 10  (floor)

underReview 전환 조건:
    market.disputeCount >= threshold  AND  threshold > 0

주의: totalBettors < 10이면 threshold = 0 → underReview 전환 불가
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-15 | F-09/F-10 스토리지 스펙 확정 |
