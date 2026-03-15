# API 스펙 확정본 — F-03/F-04/F-07/F-08 결과 확정 및 클레임

> 스마트 컨트랙트 함수 인터페이스 명세 (온체인 전용 DApp)
> 구현 파일: `/contracts/MetaPool.sol`

---

## 1. Custom Errors

| 에러 이름 | 파라미터 | 발생 조건 |
|-----------|----------|-----------|
| `MarketNotResolvable(uint256 marketId, MarketStatus currentStatus)` | marketId, currentStatus | resolveMarket 시 Active/Closed가 아닌 상태 |
| `BettingNotClosed(uint256 marketId, uint256 deadline)` | marketId, deadline | bettingDeadline 이전에 resolveMarket 호출 |
| `InvalidOutcome()` | - | Undecided(0)로 resolveMarket 호출 |
| `MarketNotResolved(uint256 marketId, MarketStatus currentStatus)` | marketId, currentStatus | Resolved가 아닌 마켓에서 claimWinnings 호출 |
| `MarketNotVoided(uint256 marketId, MarketStatus currentStatus)` | marketId, currentStatus | Voided가 아닌 마켓에서 claimRefund 호출 |
| `NotWinner(uint256 marketId, address user)` | marketId, user | 패배 방향으로 베팅한 사용자의 claimWinnings 호출 |
| `AlreadyClaimed(uint256 marketId, address user)` | marketId, user | 이미 클레임/환불 완료한 사용자의 재호출 |
| `NoBetFound(uint256 marketId, address user)` | marketId, user | 베팅 기록 없는 사용자의 클레임/환불 호출 |
| `TransferFailed()` | - | META 전송 실패 (call 반환값 false) |

---

## 2. Events

### MarketResolved
```solidity
event MarketResolved(
    uint256 indexed marketId,
    MarketOutcome outcome,
    uint256 platformFee
);
```
- emit 시점: `resolveMarket()` 성공 후
- `outcome`: Yes(1), No(2), Void(3)
- `platformFee`: 수수료 금액 (wei). Void 확정 시 0

### WinningsClaimed
```solidity
event WinningsClaimed(
    uint256 indexed marketId,
    address indexed user,
    uint256 amount
);
```
- emit 시점: `claimWinnings()` 성공 후 META 전송 전
- `amount`: 전송된 보상 총액 (원금 + 배분 보상, wei)

### RefundClaimed
```solidity
event RefundClaimed(
    uint256 indexed marketId,
    address indexed user,
    uint256 amount
);
```
- emit 시점: `claimRefund()` 성공 후 META 전송 전
- `amount`: 환불된 원금 (wei)

---

## 3. 함수 명세

### 3.1 resolveMarket

```solidity
function resolveMarket(uint256 _marketId, MarketOutcome _outcome) external onlyOwner
```

**권한**: `onlyOwner` (배포자 계정만)

**파라미터**:
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `_marketId` | uint256 | 결과 확정할 마켓 ID |
| `_outcome` | MarketOutcome | Yes(1) / No(2) / Void(3) |

**검증 순서**:
1. `market.id != 0` — 마켓 존재 여부 (없으면 `MarketNotFound`)
2. `status == Active || status == Closed` — 확정 가능 상태 (아니면 `MarketNotResolvable`)
3. `block.timestamp >= bettingDeadline` — 베팅 마감 후 (아니면 `BettingNotClosed`)
4. `_outcome != Undecided` — 유효한 결과값 (Undecided면 `InvalidOutcome`)

**상태 변경**:
- Yes/No 확정: `status = Resolved`, `accumulatedFees += losingPool * 2% `
- Void 확정: `status = Voided`, 수수료 없음
- `outcome = _outcome`, `resolvedAt = block.timestamp`

**수수료 계산**:
```
losingPool = (outcome == Yes) ? noPool : yesPool
platformFee = losingPool * platformFeeRate / FEE_DENOMINATOR
accumulatedFees += platformFee
```

---

### 3.2 claimWinnings

```solidity
function claimWinnings(uint256 _marketId) external nonReentrant
```

**권한**: 누구나 (승리 방향 베팅자만 실질적 클레임 가능)

**파라미터**:
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `_marketId` | uint256 | 클레임할 마켓 ID |

**검증 순서**:
1. `status == Resolved` — 확정 완료 마켓 (`MarketNotResolved`)
2. `bet.amount > 0` — 베팅 기록 존재 (`NoBetFound`)
3. 승리 방향 일치 (`NotWinner`)
4. `bet.claimed == false` — 미클레임 상태 (`AlreadyClaimed`)

**CEI 패턴**:
```
bet.claimed = true  ← 상태 변경 먼저
reward 계산
call{value: reward}  ← 전송 나중
```

**보상 계산**:
```
losingPool    = (outcome == Yes) ? noPool : yesPool
winPool       = (outcome == Yes) ? yesPool : noPool
platformFee   = losingPool * platformFeeRate / FEE_DENOMINATOR
distributable = losingPool - platformFee
reward        = bet.amount + (distributable * bet.amount / winPool)
```

---

### 3.3 claimRefund

```solidity
function claimRefund(uint256 _marketId) external nonReentrant
```

**권한**: 누구나 (해당 마켓 베팅자만 실질적 환불 가능)

**파라미터**:
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `_marketId` | uint256 | 환불할 마켓 ID |

**검증 순서**:
1. `status == Voided` — Void 확정 마켓 (`MarketNotVoided`)
2. `bet.amount > 0` — 베팅 기록 존재 (`NoBetFound`)
3. `bet.claimed == false` — 미환불 상태 (`AlreadyClaimed`)

**CEI 패턴**:
```
bet.claimed = true  ← 상태 변경 먼저
refundAmount = bet.amount
call{value: refundAmount}  ← 전송 나중
```

---

### 3.4 calculateWinnings (View)

```solidity
function calculateWinnings(uint256 _marketId, address _user) external view returns (uint256)
```

**권한**: 누구나 (읽기 전용)

**반환값**: 클레임 가능 보상액 (wei). 아래 조건 중 하나라도 해당하면 `0` 반환:
- 마켓이 Resolved 상태가 아님
- 베팅 기록 없음
- 이미 클레임 완료
- 패배 방향 베팅

---

### 3.5 withdrawFees

```solidity
function withdrawFees() external onlyOwner nonReentrant
```

**권한**: `onlyOwner`

**동작**:
- `accumulatedFees == 0`이면 즉시 반환 (revert 없음)
- `accumulatedFees = 0` 먼저 설정 (CEI 패턴)
- owner 주소로 META 전송

---

## 4. 보상 계산 시나리오 (PRD 기준)

### 시나리오: Yes풀 1,000 META, No풀 1,500 META, 수수료율 2%

**Yes 확정 시**:
```
losingPool    = 1,500 META (No풀)
platformFee   = 1,500 * 200 / 10,000 = 30 META
distributable = 1,500 - 30 = 1,470 META
winPool       = 1,000 META (Yes풀)

user1 보상 (Yes 1,000 META 베팅):
  = 1,000 + 1,470 * 1,000/1,000
  = 1,000 + 1,470
  = 2,470 META
```

**No 확정 시**:
```
losingPool    = 1,000 META (Yes풀)
platformFee   = 1,000 * 200 / 10,000 = 20 META
distributable = 1,000 - 20 = 980 META
winPool       = 1,500 META (No풀)

user2 보상 (No 1,500 META 베팅):
  = 1,500 + 980 * 1,500/1,500
  = 1,500 + 980
  = 2,480 META
```

**Void 확정 시**:
- user1 환불: 1,000 META (원금 100%)
- user2 환불: 1,500 META (원금 100%)
- 수수료: 0 META

---

## 5. 상태 전이 요약

| 현재 상태 | 호출 함수 | outcome | 전이 상태 |
|-----------|-----------|---------|-----------|
| Active | resolveMarket | Yes/No | Resolved |
| Active | resolveMarket | Void | Voided |
| Closed | resolveMarket | Yes/No | Resolved |
| Closed | resolveMarket | Void | Voided |
| Resolved | claimWinnings | - | 상태 변경 없음 (bet.claimed=true) |
| Voided | claimRefund | - | 상태 변경 없음 (bet.claimed=true) |

---

## 6. 보안 고려사항

| 위협 | 방어 패턴 |
|------|-----------|
| 재진입 공격 | `nonReentrant` modifier + CEI 패턴 |
| 이중 클레임 | `bet.claimed = true` 전송 전 설정 |
| 권한 남용 | `onlyOwner` modifier (resolveMarket, withdrawFees) |
| 전송 실패 | `(bool success, ) = call{value}("")` 반환값 검증 + `TransferFailed()` |
