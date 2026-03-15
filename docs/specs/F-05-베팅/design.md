# F-05 Yes/No 베팅 + F-06 추가 베팅 -- 기술 설계서

## 1. 참조
- 인수조건: docs/project/features.md #F-05, #F-06
- 시스템 설계: docs/system/system-design.md (섹션 2.4 핵심 함수 흐름)
- ERD: docs/system/erd.md (Bet struct, Market struct)
- API 컨벤션: docs/system/api-conventions.md (섹션 4 에러 처리, 섹션 8 보안)
- 현재 구현: contracts/MetaPool.sol (F-01 완료 상태)

## 2. 아키텍처 결정

### 결정 1: 단일 함수로 첫 베팅/추가 베팅 통합
- **선택지**: A) placeBet + addBet 분리 / B) placeBet 하나로 통합
- **결정**: B) placeBet 단일 함수
- **근거**: Bet struct에서 `amount == 0`이면 첫 베팅, `amount > 0`이면 추가 베팅으로 판별 가능. 프론트엔드 인터페이스가 단순해지고, 사용자 경험상 "베팅"이라는 동일 행위를 별도 함수로 분리할 필요 없음. api-conventions.md에서도 `placeBet(uint256, bool)` 단일 함수로 정의됨.

### 결정 2: msg.value 검증 대상
- **선택지**: A) msg.value 단독 검증 / B) 누적 금액(기존 + msg.value) 검증
- **결정**: A) msg.value 단독 검증
- **근거**: 인수조건 F-06에 "추가 베팅도 min/max 범위를 검증한다"로 되어 있으나, 이는 각 트랜잭션의 msg.value에 대한 검증을 의미. 누적 합산에 대한 max 제한은 인수조건에 없고, 사용자가 여러 번 나눠 베팅하는 것을 허용하는 것이 예측 마켓의 일반적 패턴.

### 결정 3: nonReentrant 적용 여부
- **선택지**: A) nonReentrant 적용 / B) 미적용
- **결정**: B) 미적용
- **근거**: api-conventions.md 섹션 8.2에서 placeBet은 "payable receive만, 외부 call 없음"으로 nonReentrant 불필요로 명시. 다만 whenNotPaused는 글로벌 pause 방어를 위해 적용.

## 3. 컨트랙트 함수 설계

### 3.1 State-Changing 함수: placeBet

```solidity
function placeBet(uint256 _marketId, bool _isYes) external payable whenNotPaused
```

- **목적**: 사용자가 Active 마켓에 Yes/No 방향으로 META를 베팅
- **payable**: msg.value로 META 수신
- **modifier**: `whenNotPaused` (글로벌 pause 방어)

#### 검증 로직 순서

검증은 가스 소모가 적은 순서(storage 읽기 최소화)로 배치한다.

```
1. 마켓 존재 검증:    market.id == 0 이면 revert (marketCount 이하인지)
2. Active 상태 검증:  market.status != Active 이면 revert
3. 마감 전 검증:      block.timestamp >= market.bettingDeadline 이면 revert
4. 최소 금액 검증:    msg.value < minBet 이면 revert
5. 최대 금액 검증:    msg.value > maxBet 이면 revert
6. 반대 방향 차단:    bet.amount > 0 && bet.isYes != _isYes 이면 revert
```

**참고**: 마켓 존재 검증은 `_marketId == 0 || _marketId > marketCount` 대신, `market.id == 0`으로 검증한다. Market struct의 id 필드는 createMarket에서 1 이상으로 설정되므로, 미존재 마켓은 기본값 0이다.

#### 상태 변경 로직

```
1. 첫 베팅 판별:  bet.amount == 0 이면 첫 베팅
   - bet.isYes = _isYes (방향 설정)
   - _isYes ? market.yesCount++ : market.noCount++ (참여자 수 증가)
2. 금액 합산:     bet.amount += msg.value
3. 풀 갱신:       _isYes ? market.yesPool += msg.value : market.noPool += msg.value
4. 이벤트 emit:   BetPlaced(marketId, msg.sender, _isYes, msg.value, market.yesPool, market.noPool)
```

#### 전체 의사코드

```solidity
function placeBet(uint256 _marketId, bool _isYes) external payable whenNotPaused {
    Market storage market = markets[_marketId];

    // Checks
    if (market.id == 0) revert MarketNotFound(_marketId);
    if (market.status != MarketStatus.Active) revert MarketNotActive(_marketId, market.status);
    if (block.timestamp >= market.bettingDeadline) revert BettingDeadlinePassed(_marketId, market.bettingDeadline);
    if (msg.value < minBet) revert BetAmountTooLow(msg.value, minBet);
    if (msg.value > maxBet) revert BetAmountTooHigh(msg.value, maxBet);

    Bet storage bet = bets[_marketId][msg.sender];

    // 반대 방향 차단 (추가 베팅 시에만 해당)
    if (bet.amount > 0 && bet.isYes != _isYes) revert OppositeBetExists(_marketId, msg.sender);

    // Effects
    if (bet.amount == 0) {
        // 첫 베팅: 방향 설정 + 참여자 수 증가
        bet.isYes = _isYes;
        if (_isYes) {
            market.yesCount++;
        } else {
            market.noCount++;
        }
    }

    bet.amount += msg.value;

    if (_isYes) {
        market.yesPool += msg.value;
    } else {
        market.noPool += msg.value;
    }

    emit BetPlaced(_marketId, msg.sender, _isYes, msg.value, market.yesPool, market.noPool);
}
```

### 3.2 Custom Errors (신규 추가)

기존 MetaPool.sol에 아래 Custom Error를 추가한다. api-conventions.md에 정의된 에러 목록과 일치.

```solidity
error MarketNotFound(uint256 marketId);
error MarketNotActive(uint256 marketId, MarketStatus currentStatus);
error BettingDeadlinePassed(uint256 marketId, uint256 deadline);
error BetAmountTooLow(uint256 amount, uint256 minBet);
error BetAmountTooHigh(uint256 amount, uint256 maxBet);
error OppositeBetExists(uint256 marketId, address user);
```

**참고**: `MarketNotFound`는 api-conventions.md에 없는 신규 에러. `MarketNotActive`가 미존재 마켓에서도 발동되지만, 의미적으로 "마켓이 존재하지 않음"을 명확히 구분하기 위해 별도 에러를 정의한다. api-conventions.md에 반영 필요.

### 3.3 이벤트: BetPlaced (신규 추가)

api-conventions.md 섹션 5.2에 정의된 이벤트와 동일:

```solidity
event BetPlaced(
    uint256 indexed marketId,
    address indexed bettor,
    bool isYes,
    uint256 amount,
    uint256 newYesPool,
    uint256 newNoPool
);
```

| 파라미터 | indexed | 설명 |
|----------|---------|------|
| marketId | Yes | 마켓별 필터링 (프론트엔드 실시간 갱신) |
| bettor | Yes | 사용자별 필터링 (내 베팅 조회 F-22) |
| isYes | No | Yes/No 방향 |
| amount | No | 이번 베팅 금액 (wei). 추가 베팅 시 이번 트랜잭션 금액만 포함 |
| newYesPool | No | 베팅 후 마켓 전체 Yes 풀 (프론트엔드 풀 비율 갱신) |
| newNoPool | No | 베팅 후 마켓 전체 No 풀 (프론트엔드 풀 비율 갱신) |

### 3.4 View 함수: getUserBet (신규 추가)

```solidity
function getUserBet(uint256 _marketId, address _user) external view returns (Bet memory) {
    return bets[_marketId][_user];
}
```

- **목적**: 특정 마켓에서 특정 사용자의 베팅 정보 조회
- **반환**: `Bet memory` (amount, isYes, claimed)
- **베팅 미존재 시**: amount == 0, isYes == false (기본값), claimed == false (기본값)
- **반환값 계약**: `amount == 0`이면 해당 마켓에 베팅 기록 없음을 의미

### 3.5 View 함수: getOdds (신규 추가)

```solidity
function getOdds(uint256 _marketId) external view returns (uint256 yesOdds, uint256 noOdds) {
    Market storage market = markets[_marketId];
    uint256 totalPool = market.yesPool + market.noPool;

    if (totalPool == 0 || market.yesPool == 0 || market.noPool == 0) {
        return (0, 0);
    }

    // 수수료 차감 반영 배당률 (basis points)
    // yesOdds = totalPool * (FEE_DENOMINATOR - platformFeeRate) / yesPool
    uint256 feeAdjusted = FEE_DENOMINATOR - platformFeeRate;
    yesOdds = (totalPool * feeAdjusted) / market.yesPool;
    noOdds = (totalPool * feeAdjusted) / market.noPool;
}
```

- **목적**: 현재 풀 비율 기반 Yes/No 배당률 조회
- **반환 단위**: basis points (10000 = 1.00x, 15000 = 1.50x)
- **풀이 0인 경우**: (0, 0) 반환. 프론트엔드에서 "첫 번째 베터가 되세요" 표시
- **한쪽 풀만 0인 경우**: (0, 0) 반환. 한쪽에만 베팅이 있으면 배당률 계산 무의미 (반대쪽이 없으면 보상 없음)
- **반환값 계약**: `yesOdds == 0 && noOdds == 0`이면 배당률 계산 불가 상태

## 4. DB 설계 (Storage 변경)

### 기존 엔티티 활용 -- 신규 테이블/struct 없음

F-05/F-06은 기존 Market struct와 Bet struct만 활용한다. erd.md에 이미 정의된 구조와 완전히 일치.

| 엔티티 | 변경 필드 | 변경 내용 |
|--------|-----------|-----------|
| Market | yesPool, noPool, yesCount, noCount | placeBet에서 갱신 (기존 정의, 구현만 추가) |
| Bet | amount, isYes | placeBet에서 생성/갱신 (기존 정의, 구현만 추가) |

## 5. 시퀀스 흐름

### 5.1 첫 베팅 (정상)

```
사용자 → MetaMask 서명 → Metadium RPC → MetaPool.placeBet(marketId, true/false)
                                            │
                                            ├─ Checks: market.id != 0
                                            ├─ Checks: status == Active
                                            ├─ Checks: block.timestamp < bettingDeadline
                                            ├─ Checks: minBet <= msg.value <= maxBet
                                            ├─ Checks: (첫 베팅이므로 반대방향 체크 skip)
                                            │
                                            ├─ Effects: bet.isYes = _isYes
                                            ├─ Effects: market.yesCount++ (또는 noCount++)
                                            ├─ Effects: bet.amount += msg.value
                                            ├─ Effects: market.yesPool += msg.value (또는 noPool)
                                            │
                                            └─ emit BetPlaced(...)
                                                    │
Frontend ← ethers.js listener ← BetPlaced 이벤트 ◄──┘
  └─ UI 갱신: 풀 비율, 배당률, 참여자 수
```

### 5.2 추가 베팅 (같은 방향)

```
사용자 → MetaMask 서명 → MetaPool.placeBet(marketId, 같은방향)
                            │
                            ├─ Checks: 동일 (마켓 존재/Active/마감 전/금액 범위)
                            ├─ Checks: bet.amount > 0 && bet.isYes == _isYes (통과)
                            │
                            ├─ Effects: bet.amount += msg.value (기존에 합산)
                            ├─ Effects: market.yesPool/noPool += msg.value
                            ├─ Effects: yesCount/noCount 변경 없음 (첫 베팅 아님)
                            │
                            └─ emit BetPlaced(...)
```

### 5.3 반대 방향 베팅 (revert)

```
사용자 → MetaMask 서명 → MetaPool.placeBet(marketId, 반대방향)
                            │
                            ├─ Checks: bet.amount > 0 && bet.isYes != _isYes
                            └─ revert OppositeBetExists(marketId, msg.sender)
```

## 6. 영향 범위

### 수정 필요 파일
| 파일 | 변경 내용 |
|------|-----------|
| `contracts/MetaPool.sol` | Custom Errors 6개 추가, BetPlaced 이벤트 추가, placeBet 함수 추가, getUserBet 함수 추가, getOdds 함수 추가 |

### 신규 생성 파일
| 파일 | 내용 |
|------|------|
| `test/F05-Betting.test.js` | F-05/F-06 베팅 테스트 스위트 |

### 기존 테스트 영향
| 파일 | 영향 |
|------|------|
| `test/MetaPool.test.js` | 기존 F-01 테스트에 영향 없음. deployFixture 재사용 가능. 다만 F-05 테스트를 별도 파일로 분리하되, fixture 패턴은 동일하게 유지 |

## 7. 가스 최적화

### Storage 접근 패턴
- `Market storage market = markets[_marketId]`: storage 포인터 1회 조회 후 재사용
- `Bet storage bet = bets[_marketId][msg.sender]`: storage 포인터 1회 조회 후 재사용
- 조건 검증 시 `market`과 `bet` 변수를 재사용하여 중복 SLOAD 방지

### 이벤트 데이터
- `newYesPool`, `newNoPool`을 이벤트에 포함하여 프론트엔드가 별도 view 호출 없이 풀 상태를 갱신 가능
- indexed 파라미터는 2개(marketId, bettor)로 제한하여 가스 절약

### 예상 가스 소모
| 시나리오 | 예상 가스 | 근거 |
|---------|----------|------|
| 첫 베팅 (cold storage) | ~80,000-100,000 | SSTORE 3회 (bet 3필드) + Market 2필드 갱신 + 이벤트 |
| 추가 베팅 (warm storage) | ~50,000-70,000 | SSTORE 1회 (bet.amount) + Market 1필드 갱신 + 이벤트 |

## 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|----------|------|
| 2026-03-15 | 최초 작성 | F-05 Yes/No 베팅 + F-06 추가 베팅 기능 상세 설계 |
