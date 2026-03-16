# MetaPool 보안 체크리스트

컨트랙트: `contracts/MetaPool.sol`
컴파일러: Solidity ^0.8.20
라이브러리: OpenZeppelin v5.x (Ownable, ReentrancyGuard, Pausable)

---

## 1. 재진입 공격 방어 (Reentrancy)

### 1.1 ReentrancyGuard 적용 함수

| 함수 | `nonReentrant` 적용 | 비고 |
|------|---------------------|------|
| `claimWinnings(uint256)` | 적용 | ETH 전송 발생 |
| `claimRefund(uint256)` | 적용 | ETH 전송 발생 |
| `withdrawFees()` | 적용 | ETH 전송 발생 |
| `submitDispute(uint256)` | 적용 | ETH 수신 발생 |
| `resolveDispute(uint256, address, bool)` | 적용 | ETH 전송 발생 (이의 인정 시) |

결과: ETH 송수신이 발생하는 모든 외부 함수에 `nonReentrant` modifier 적용 완료.

### 1.2 CEI 패턴 검증 (Checks-Effects-Interactions)

**claimWinnings()**
```
[Checks]   market.status == Resolved
           !market.underReview
           block.timestamp > market.disputeDeadline
           bet.amount > 0
           isWinner
           !bet.claimed
[Effects]  bet.claimed = true          ← 상태 먼저 변경
[Interactions] payable(msg.sender).call{value: reward}("")
```

**claimRefund()**
```
[Checks]   market.status == Voided
           bet.amount > 0
           !bet.claimed
[Effects]  bet.claimed = true          ← 상태 먼저 변경
           uint256 refundAmount = bet.amount
[Interactions] payable(msg.sender).call{value: refundAmount}("")
```

**withdrawFees()**
```
[Checks]   onlyOwner
           amount > 0
[Effects]  accumulatedFees = 0         ← 상태 먼저 초기화
[Interactions] payable(owner()).call{value: amount}("")
```

**resolveDispute()**
```
[Checks]   onlyOwner
           dispute.stake > 0
           !dispute.resolved
[Effects]  dispute.resolved = true
           dispute.accepted = _accepted
[Interactions] payable(_disputant).call{value: stakeReturned}("") (인정 시)
```

결과: 모든 ETH 전송 함수에서 CEI 패턴 준수 확인.

---

## 2. 접근 제어 (Access Control)

### 2.1 onlyOwner 적용 관리자 함수 목록

| 함수 | 설명 |
|------|------|
| `createMarket(...)` | 마켓 생성 |
| `resolveMarket(uint256, MarketOutcome)` | 결과 확정 |
| `resolveReview(uint256, MarketOutcome)` | 재심 결과 처리 |
| `resolveDispute(uint256, address, bool)` | 이의제기 처리 |
| `pauseMarket(uint256)` | 마켓 긴급 중단 |
| `resumeMarket(uint256, uint256, uint256)` | 마켓 재개 |
| `setMinBet(uint256)` | 최소 베팅 변경 |
| `setMaxBet(uint256)` | 최대 베팅 변경 |
| `setPlatformFeeRate(uint256)` | 수수료율 변경 |
| `withdrawFees()` | 수수료 인출 |
| `pause()` | 글로벌 Pause |
| `unpause()` | 글로벌 Unpause |

결과: 모든 상태 변경 관리 함수에 `onlyOwner` 적용 완료.

### 2.2 Ownable v5.x 특이사항

- OZv5에서 `transferOwnership(address(0))` 호출 시 `OwnableInvalidOwner` 에러 발생 (의도치 않은 소유권 포기 방지).
- `renounceOwnership()`은 여전히 가능하므로 운영 환경에서 호출 금지.

---

## 3. 정수 오버플로우 / 언더플로우

Solidity 0.8+ 컴파일러는 산술 연산에서 오버플로우/언더플로우 발생 시 자동으로 `revert`한다.

| 계산 위치 | 수식 | 위험 여부 |
|-----------|------|----------|
| 수수료 계산 | `losingPool * platformFeeRate / FEE_DENOMINATOR` | 안전 (0.8+ 내장) |
| 보상 계산 | `distributable * bet.amount / winPool` | 안전 (0.8+ 내장) |
| 누적 수수료 | `accumulatedFees += platformFee` | 안전 (0.8+ 내장) |
| 풀 갱신 | `yesPool += msg.value` | 안전 (0.8+ 내장) |
| 재심 수수료 차감 | `accumulatedFees -= oldFee` | 조건 체크 포함: `if (accumulatedFees >= oldFee)` |

결과: 외부 라이브러리(SafeMath) 없이 0.8+ 내장 보호로 충분.

---

## 4. 먼지 공격 방어 (Dust Attack / Spam Bet)

**위협**: 극소액 베팅을 대량으로 제출하여 가스비 소모 및 상태 오염 유발.

**방어**:
```solidity
if (msg.value < minBet) revert BetAmountTooLow(msg.value, minBet);
```

| 네트워크 | minBet 설정값 |
|----------|--------------|
| Testnet  | 1 META       |
| Mainnet  | 100 META     |

결과: `minBet` 제한으로 스팸 베팅 원천 차단.

---

## 5. 대규모 풀 조작 방어 (Whale Manipulation)

**위협**: 단일 대규모 베팅으로 풀 비율 조작 → 배당률 조작 → 이익 취득.

**방어**:
```solidity
if (msg.value > maxBet) revert BetAmountTooHigh(msg.value, maxBet);
```

| 네트워크 | maxBet 설정값  |
|----------|---------------|
| Testnet  | 1,000 META    |
| Mainnet  | 100,000 META  |

**추가 제한**: 동일 사용자가 반대 방향으로 추가 베팅 불가 (`OppositeBetExists` 에러).

결과: `maxBet` + 방향 제한으로 단일 계정 풀 조작 최소화.

---

## 6. Pausable 긴급 중단

### 6.1 글로벌 Pause

```solidity
function placeBet(...) external payable whenNotPaused { ... }
```

- `pause()` 호출 시 전체 베팅 즉시 차단.
- `unpause()` 호출 시 정상 재개.
- 관리 함수(resolve, claim 등)는 글로벌 Pause 영향 없음 → 이미 베팅된 마켓의 정산 유지.

### 6.2 마켓별 Pause

```solidity
function pauseMarket(uint256 _marketId) external onlyOwner
function resumeMarket(uint256 _marketId, uint256 newBettingDeadline, uint256 newResolutionDeadline) external onlyOwner
```

- 개별 마켓 단위 긴급 중단 가능.
- `resumeMarket()` 시 새 마감시간 설정 필수 → 유효하지 않은 마감시간 방지.

결과: 2단계 긴급 중단 체계(글로벌/마켓별) 구현 완료.

---

## 7. 프론트러닝 제한

**위협**: 다른 사용자의 베팅 트랜잭션이 mempool에서 보인 직후 높은 가스비로 먼저 끼어들어 배당률 조작.

**현재 방어 수준**:
- `maxBet` 제한: 단일 베팅으로 배당률에 미치는 영향 상한 설정.
- 마켓 질문 결과 예측 특성상 프론트러닝의 경제적 이점이 제한적.

**v2 개선 제안**: Commit-Reveal 방식 도입으로 베팅 내용 사전 은닉.

---

## 8. 수수료 계산 정확성

### 8.1 수식 검증

```
losingPool  = outcome == Yes ? noPool : yesPool
fee         = losingPool * platformFeeRate / FEE_DENOMINATOR
distributable = losingPool - fee
각 승리자 보상 = bet.amount + (distributable * bet.amount / winPool)
```

### 8.2 PRD 예시 시나리오 검증

| 항목 | 값 |
|------|-----|
| Yes 풀 | 10,000 META |
| No 풀  | 15,000 META |
| 수수료율 | 2% (200 bps) |
| Yes 확정 시 수수료 | 15,000 × 2% = 300 META |
| 분배 가능 금액 | 15,000 - 300 = 14,700 META |
| Yes 베팅 1,000 META 승리자 보상 | 1,000 + 14,700 × 1,000/10,000 = 2,470 META |

### 8.3 정수 나눗셈 손실

- Solidity 정수 나눗셈 특성상 소수점 이하 버림 발생.
- 손실 크기: 전체 클레임 후 컨트랙트에 수 wei 잔존 가능 (먼지).
- 이 잔존분은 withdrawFees로 회수 불가 → 의도적 설계 허용 범위.

---

## 9. 이벤트 Emit 완전성

| 이벤트 | emit 위치 | indexed 필드 |
|--------|-----------|--------------|
| `MarketCreated` | `createMarket()` | marketId, category |
| `BetPlaced` | `placeBet()` | marketId, bettor |
| `MarketResolved` | `resolveMarket()`, `resolveReview()` | marketId |
| `WinningsClaimed` | `claimWinnings()` | marketId, user |
| `RefundClaimed` | `claimRefund()` | marketId, user |
| `MarketPaused` | `pauseMarket()` | marketId |
| `MarketResumed` | `resumeMarket()` | marketId |
| `SettingsUpdated` | `setMinBet()`, `setMaxBet()`, `setPlatformFeeRate()` | — |
| `FeesWithdrawn` | `withdrawFees()` | recipient |
| `DisputeSubmitted` | `submitDispute()` | marketId, disputant |
| `DisputeResolved` | `resolveDispute()` | marketId, disputant |
| `MarketReviewTriggered` | `submitDispute()` (임계값 초과 시) | marketId |

결과: 상태 변경 함수마다 이벤트 emit 완료. 프론트엔드 실시간 갱신 지원.

---

## 10. 타임스탬프 조작 위험

**위협**: 마이너가 `block.timestamp`를 최대 ±15초 조작 가능.

**평가**: MetaPool의 베팅 마감 단위는 시간~일 단위이므로 ±15초 조작은 무의미.

결과: 현재 구현 수준에서 허용 가능한 위험.

---

## 11. 이의제기 스테이킹 보안

| 항목 | 검증 |
|------|------|
| 스테이킹 금액 고정 | `msg.value != DISPUTE_STAKE` → revert |
| 베팅자만 이의 가능 | `bets[_marketId][msg.sender].amount == 0` → revert |
| 중복 이의 방지 | `disputes[_marketId][msg.sender].stake > 0` → revert |
| 이의제기 기간 제한 | `block.timestamp > market.disputeDeadline` → revert |
| 이의 기각 시 스테이크 몰수 | `accumulatedFees += dispute.stake` |

---

## 12. 컨트랙트 잔액 불변식 (Invariant)

모든 클레임 + 수수료 인출 완료 후:

```
컨트랙트 잔액 = Σ(미클레임 베팅 원금) + accumulatedFees + 정수나눗셈 먼지
```

E2E 테스트(`test/E2E-Lifecycle.test.js`)에서 시나리오별로 `잔액 = 0` 검증 수행.

---

## 13. 체크리스트 요약

| # | 항목 | 상태 |
|---|------|------|
| 1 | ReentrancyGuard 전체 ETH 함수 적용 | 완료 |
| 2 | CEI 패턴 (claimed=true 후 전송) | 완료 |
| 3 | onlyOwner 모든 관리자 함수 | 완료 |
| 4 | Solidity 0.8+ 오버플로우 내장 보호 | 완료 |
| 5 | minBet으로 먼지 공격 방어 | 완료 |
| 6 | maxBet으로 대규모 풀 조작 방어 | 완료 |
| 7 | Pausable 글로벌 + 마켓별 긴급 중단 | 완료 |
| 8 | maxBet으로 프론트러닝 영향 최소화 | 부분 완료 (v2에 Commit-Reveal 개선 예정) |
| 9 | 수수료 계산 PRD 시나리오 검증 | 완료 |
| 10 | 모든 상태 변경 함수 이벤트 emit | 완료 |
| 11 | 타임스탬프 조작 위험 평가 | 허용 범위 |
| 12 | 이의제기 스테이킹 보안 | 완료 |
| 13 | E2E 잔액 불변식 테스트 | 완료 |
