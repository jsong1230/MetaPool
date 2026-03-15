# 스마트 컨트랙트 인터페이스 컨벤션

## 1. 개요

### 1.1 DApp 특성
MetaPool은 온체인 전용 DApp으로, 별도 REST API 백엔드가 존재하지 않는다. 모든 데이터와 비즈니스 로직은 Metadium 블록체인에 배포된 MetaPool.sol 단일 컨트랙트에 존재하며, 프론트엔드는 ethers.js를 통해 컨트랙트와 직접 통신한다.

### 1.2 통신 구조

```
읽기 (View):  Frontend → ethers.js → Metadium RPC → MetaPool.sol  (가스비 없음)
쓰기 (Tx):    Frontend → ethers.js → MetaMask 서명 → Metadium RPC → MetaPool.sol  (가스비 발생)
이벤트:       MetaPool.sol emit → Metadium RPC → ethers.js listener → Frontend UI 갱신
```

### 1.3 이 문서의 역할
- `/feat` 스킬에서 개별 기능의 컨트랙트 함수 설계 시 반드시 참조
- 함수 네이밍, 에러 메시지, 이벤트 구조, 데이터 포맷의 일관성 기준

---

## 2. 컨트랙트 함수 분류

### 2.1 View 함수 (가스비 없음, 읽기 전용)

온체인 상태를 읽기만 하는 함수. `view` 또는 `pure` modifier를 사용한다.

| 함수 | 반환 타입 | 용도 | 관련 기능 |
|------|-----------|------|-----------|
| `getMarket(uint256 marketId)` | `Market memory` | 마켓 전체 정보 조회 | F-14, F-16 |
| `getMarketCount()` | `uint256` | 총 마켓 수 | F-14 |
| `getUserBet(uint256 marketId, address user)` | `Bet memory` | 사용자별 베팅 정보 | F-22 |
| `getOdds(uint256 marketId)` | `(uint256 yesOdds, uint256 noOdds)` | Yes/No 배당률 (basis points) | F-17 |
| `calculatePotentialWinnings(uint256 marketId, bool isYes, uint256 amount)` | `uint256` | 예상 수익 계산 | F-19 |
| `getMinBet()` | `uint256` | 최소 베팅 금액 (wei) | F-18 |
| `getMaxBet()` | `uint256` | 최대 베팅 금액 (wei) | F-18 |
| `getPlatformFeeRate()` | `uint256` | 수수료율 (basis points) | F-12 |
| `getAccumulatedFees()` | `uint256` | 미인출 누적 수수료 (wei) | F-12 |

### 2.2 State-Changing 함수 (트랜잭션, 가스비 발생)

온체인 상태를 변경하는 함수. MetaMask 서명이 필요하다.

| 함수 | payable | 용도 | 관련 기능 |
|------|---------|------|-----------|
| `placeBet(uint256 marketId, bool isYes)` | Yes | 베팅 실행 | F-05, F-06 |
| `claimWinnings(uint256 marketId)` | No | 승리 보상 수령 | F-07 |
| `claimRefund(uint256 marketId)` | No | Void 환불 수령 | F-08 |

### 2.3 Admin 함수 (onlyOwner)

`Ownable.onlyOwner` modifier가 적용된 관리자 전용 함수.

| 함수 | payable | 용도 | 관련 기능 |
|------|---------|------|-----------|
| `createMarket(string, string, string, string, MarketCategory, uint256, uint256)` | No | 마켓 생성 | F-01 |
| `resolveMarket(uint256 marketId, MarketOutcome outcome)` | No | 결과 확정 | F-03, F-04 |
| `closeMarket(uint256 marketId)` | No | 수동 조기 마감 | F-03 |
| `pauseMarket(uint256 marketId)` | No | 마켓 긴급 중단 | F-11 |
| `resumeMarket(uint256 marketId, uint256 newDeadline)` | No | 마켓 재개 | F-11 |
| `setMinBet(uint256 newMinBet)` | No | 최소 베팅 변경 | F-12 |
| `setMaxBet(uint256 newMaxBet)` | No | 최대 베팅 변경 | F-12 |
| `setPlatformFeeRate(uint256 newRate)` | No | 수수료율 변경 | F-12 |
| `withdrawFees()` | No | 누적 수수료 인출 | F-12 |
| `pause()` | No | 글로벌 긴급 중단 (Pausable) | - |
| `unpause()` | No | 글로벌 재개 (Pausable) | - |

---

## 3. 함수 네이밍 컨벤션

### 3.1 접두사 규칙

| 접두사 | 의미 | 함수 유형 | 예시 |
|--------|------|-----------|------|
| `get*` | 데이터 조회 | view | `getMarket`, `getOdds`, `getUserBet` |
| `calculate*` | 계산 결과 반환 | view/pure | `calculatePotentialWinnings` |
| `place*` | 사용자 베팅 액션 | state-changing, payable | `placeBet` |
| `claim*` | 사용자 자금 인출 | state-changing | `claimWinnings`, `claimRefund` |
| `create*` | 새 엔티티 생성 | admin | `createMarket` |
| `resolve*` | 결과/상태 확정 | admin | `resolveMarket` |
| `close*` | 수동 마감 | admin | `closeMarket` |
| `pause*` / `resume*` | 중단/재개 | admin | `pauseMarket`, `resumeMarket` |
| `set*` | 설정값 변경 | admin | `setMinBet`, `setMaxBet`, `setPlatformFeeRate` |
| `withdraw*` | 관리자 자금 인출 | admin | `withdrawFees` |

### 3.2 네이밍 규칙
- camelCase 사용 (Solidity 표준)
- 동사 + 명사 구조 (예: `placeBet`, `claimWinnings`)
- 복수형은 컬렉션 반환 시에만 사용
- boolean 반환 함수는 `is*` / `has*` 접두사 (예: `isMarketActive`, `hasBet`)

---

## 4. 에러 처리 패턴

### 4.1 Solidity 에러 정의 방식

Custom Error를 사용한다 (Solidity 0.8.4+). `require` + 문자열 대비 가스 절약 효과가 있으며, 구조화된 에러 파싱이 가능하다.

```solidity
// Custom Error 정의 (권장)
error NotOwner();
error MarketNotActive(uint256 marketId, MarketStatus currentStatus);
error BettingDeadlinePassed(uint256 marketId, uint256 deadline);
error BetAmountTooLow(uint256 amount, uint256 minBet);
error BetAmountTooHigh(uint256 amount, uint256 maxBet);
error OppositeBetExists(uint256 marketId, address user);
error AlreadyClaimed(uint256 marketId, address user);
error NotWinner(uint256 marketId, address user);
error MarketNotResolved(uint256 marketId, MarketStatus currentStatus);
error MarketNotVoided(uint256 marketId, MarketStatus currentStatus);
error NoBetFound(uint256 marketId, address user);
error InvalidOutcome();
error EmptyQuestion();
error InvalidDeadline(uint256 bettingDeadline, uint256 resolutionDeadline);
error InvalidFeeRate(uint256 rate);
error InvalidBetLimits(uint256 minBet, uint256 maxBet);
error NoFeesToWithdraw();
error TransferFailed();
error ContractPaused();
error MarketPaused(uint256 marketId);
```

### 4.2 에러 코드 목록

| 에러 | 발생 함수 | 조건 | 관련 기능 |
|------|-----------|------|-----------|
| `NotOwner` | 모든 admin 함수 | msg.sender != owner | F-01, F-03, F-11, F-12 |
| `MarketNotActive` | `placeBet`, `closeMarket`, `pauseMarket` | status != Active | F-05, F-11 |
| `BettingDeadlinePassed` | `placeBet` | block.timestamp >= bettingDeadline | F-05 |
| `BetAmountTooLow` | `placeBet` | msg.value < minBet | F-05 |
| `BetAmountTooHigh` | `placeBet` | msg.value > maxBet | F-05 |
| `OppositeBetExists` | `placeBet` | 기존 베팅과 반대 방향 | F-06 |
| `AlreadyClaimed` | `claimWinnings`, `claimRefund` | bet.claimed == true | F-07, F-08 |
| `NotWinner` | `claimWinnings` | 베팅 방향 != outcome | F-07 |
| `MarketNotResolved` | `claimWinnings` | status != Resolved | F-07 |
| `MarketNotVoided` | `claimRefund` | status != Voided | F-08 |
| `NoBetFound` | `claimWinnings`, `claimRefund` | bet.amount == 0 | F-07, F-08 |
| `InvalidOutcome` | `resolveMarket` | outcome == Undecided | F-03 |
| `EmptyQuestion` | `createMarket` | bytes(question).length == 0 | F-01 |
| `InvalidDeadline` | `createMarket` | bettingDeadline <= now 또는 resolutionDeadline <= bettingDeadline | F-01 |
| `InvalidFeeRate` | `setPlatformFeeRate` | rate > 1000 (10%) | F-12 |
| `InvalidBetLimits` | `setMinBet`, `setMaxBet` | minBet == 0 또는 maxBet <= minBet | F-12 |
| `NoFeesToWithdraw` | `withdrawFees` | accumulatedFees == 0 | F-12 |
| `TransferFailed` | `claimWinnings`, `claimRefund`, `withdrawFees` | META 전송 실패 | F-07, F-08, F-12 |
| `ContractPaused` | `placeBet` | 글로벌 pause 상태 | F-05 |
| `MarketPaused` | `placeBet` | 해당 마켓 Paused 상태 | F-11 |

### 4.3 프론트엔드 에러 파싱 패턴

```javascript
// ethers.js v6에서 Custom Error 파싱
try {
  const tx = await contract.placeBet(marketId, isYes, { value: amount });
  await tx.wait();
} catch (err) {
  // MetaMask 사용자 거부
  if (err.code === "ACTION_REJECTED") {
    return { type: "USER_REJECTED" };
  }

  // 컨트랙트 revert (Custom Error)
  if (err.data) {
    const decodedError = contract.interface.parseError(err.data);
    // decodedError.name → "BetAmountTooLow"
    // decodedError.args → [amount, minBet]
    return { type: "CONTRACT_ERROR", name: decodedError.name, args: decodedError.args };
  }

  // 네트워크/RPC 에러
  return { type: "NETWORK_ERROR", message: err.message };
}
```

### 4.4 프론트엔드 에러 분류

| 에러 유형 | 코드/조건 | UI 처리 |
|-----------|-----------|---------|
| `USER_REJECTED` | `err.code === "ACTION_REJECTED"` | 무시 (사용자 의도) |
| `CONTRACT_ERROR` | `err.data` 존재 | Custom Error name 기반 i18n 메시지 표시 |
| `NETWORK_ERROR` | RPC 연결 실패 | "네트워크 연결을 확인해주세요" 토스트 |
| `INSUFFICIENT_FUNDS` | `err.code === "INSUFFICIENT_FUNDS"` | "잔액이 부족합니다" 토스트 |
| `UNPREDICTABLE_GAS_LIMIT` | 가스 추정 실패 | 컨트랙트 조건 미충족 가능성, 사전 검증 유도 |

---

## 5. 이벤트 컨벤션

### 5.1 이벤트 네이밍 규칙
- **과거 분사** 형태 사용: 동작이 완료되었음을 나타냄
- 형식: `{Entity}{Action}` (예: `MarketCreated`, `BetPlaced`, `WinningsClaimed`)
- 모든 state-changing 함수는 최소 1개의 이벤트를 emit해야 함

### 5.2 이벤트 정의

```solidity
// 마켓 라이프사이클
event MarketCreated(
    uint256 indexed marketId,
    string question,
    MarketCategory indexed category,
    uint256 bettingDeadline,
    uint256 resolutionDeadline
);

event MarketResolved(
    uint256 indexed marketId,
    MarketOutcome outcome,
    uint256 yesPool,
    uint256 noPool,
    uint256 platformFee
);

event MarketClosed(uint256 indexed marketId);
event MarketPaused(uint256 indexed marketId);
event MarketResumed(uint256 indexed marketId, uint256 newDeadline);

// 베팅
event BetPlaced(
    uint256 indexed marketId,
    address indexed bettor,
    bool isYes,
    uint256 amount,
    uint256 newYesPool,
    uint256 newNoPool
);

// 클레임
event WinningsClaimed(
    uint256 indexed marketId,
    address indexed claimer,
    uint256 payout
);

event RefundClaimed(
    uint256 indexed marketId,
    address indexed claimer,
    uint256 amount
);

// 관리
event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
event FeesWithdrawn(address indexed to, uint256 amount);
```

### 5.3 indexed 파라미터 기준

`indexed` 키워드는 이벤트 필터링에 사용된다. 최대 3개까지 indexed 가능 (Solidity 제한).

| 우선순위 | 대상 | 이유 |
|---------|------|------|
| 1순위 | `marketId` | 마켓별 이벤트 필터링 (가장 빈번한 쿼리) |
| 2순위 | `address` (bettor, claimer) | 사용자별 이벤트 필터링 (내 베팅 조회) |
| 3순위 | `category` | 카테고리별 마켓 필터링 |

### 5.4 프론트엔드 이벤트 리스닝 패턴

```javascript
// 1. 특정 마켓의 BetPlaced 이벤트 구독
const filter = contract.filters.BetPlaced(marketId);
contract.on(filter, (marketId, bettor, isYes, amount, newYesPool, newNoPool) => {
  // UI 갱신: 풀 비율, 배당률, 참여자 수
});

// 2. 현재 사용자의 모든 베팅 이벤트 조회 (과거 로그)
const filter = contract.filters.BetPlaced(null, userAddress);
const events = await contract.queryFilter(filter, fromBlock, "latest");

// 3. 새 마켓 생성 구독 (마켓 목록 갱신)
contract.on("MarketCreated", (marketId, question, category, deadline) => {
  // 마켓 목록에 새 카드 추가
});

// 4. 이벤트 구독 해제 (컴포넌트 언마운트 시)
return () => {
  contract.removeAllListeners("BetPlaced");
  contract.removeAllListeners("MarketCreated");
};
```

---

## 6. 데이터 포맷 컨벤션

### 6.1 금액 (wei 단위)

모든 금액은 온체인에서 **wei** 단위(uint256)로 저장/전송된다. 1 META = 10^18 wei.

| 상황 | 방향 | 함수 | 예시 |
|------|------|------|------|
| 사용자 입력 → 컨트랙트 | META → wei | `ethers.parseEther("100")` | 100 META → "100000000000000000000" |
| 컨트랙트 → 사용자 표시 | wei → META | `ethers.formatEther(weiValue)` | "100000000000000000000" → "100.0" |

**표시 규칙:**
- 정수 금액: 소수점 없이 표시 (예: "100 META")
- 소수 금액: 소수점 4자리까지 표시 (예: "1,234.5678 META")
- 천 단위 구분자 적용 (예: "100,000 META")

### 6.2 시간 (Unix Timestamp)

온체인 시간은 **Unix timestamp 초 단위** (`block.timestamp`)로 처리된다.

| 상황 | 변환 | 예시 |
|------|------|------|
| JS Date → 컨트랙트 | `Math.floor(Date.now() / 1000)` | 1710489600 |
| 컨트랙트 → JS Date | `new Date(timestamp * 1000)` | Date 객체 |
| 카운트다운 표시 | `deadline - Math.floor(Date.now() / 1000)` | 남은 초 → "2일 3시간" |

**검증 규칙 (프론트엔드 사전 검증):**
- `bettingDeadline > Math.floor(Date.now() / 1000)` (미래 시간)
- `resolutionDeadline > bettingDeadline`

### 6.3 주소 (Checksum Address)

모든 주소는 **EIP-55 checksum** 형식을 사용한다.

```javascript
// checksum 변환
const checksumAddress = ethers.getAddress(rawAddress);

// 표시용 축약 (프론트엔드)
const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
// 예: "0x1234...5678"
```

### 6.4 배당률 (Basis Points)

온체인 getOdds 함수는 basis points(만분율)로 반환한다. 프론트엔드에서 배수(x)로 변환하여 표시한다.

```
온체인 반환: yesOdds = 15000 (basis points)
프론트엔드 변환: 15000 / 10000 = 1.50x
표시: "1.50x"
```

| 값 | 의미 | 표시 |
|-----|------|------|
| 10000 | 원금 보전 (1.00x) | 1.00x |
| 15000 | 1.5배 | 1.50x |
| 20000 | 2배 | 2.00x |
| 0 | 풀이 비어있음 (계산 불가) | "- -" 또는 "첫 번째 베터가 되세요" |

**배당률 계산 공식:**
```
yesOdds = (totalPool * FEE_ADJUSTED) / yesPool  (basis points)
noOdds  = (totalPool * FEE_ADJUSTED) / noPool   (basis points)

여기서 FEE_ADJUSTED = (FEE_DENOMINATOR - platformFeeRate) / FEE_DENOMINATOR
     = (10000 - 200) / 10000 = 0.98 (수수료 차감 반영)
```

### 6.5 수수료율 (Basis Points)

| 값 | 의미 |
|-----|------|
| `platformFeeRate = 200` | 2% |
| `FEE_DENOMINATOR = 10000` | 분모 (상수) |
| 최대 허용: `1000` | 10% |

**수수료 계산:**
```
수수료 = losingPool * platformFeeRate / FEE_DENOMINATOR
       = losingPool * 200 / 10000
       = losingPool * 2%
```

### 6.6 Enum 값 매핑

프론트엔드에서 온체인 enum 정수값을 UI 텍스트로 변환하는 매핑 테이블.

**MarketStatus:**
| 값 | enum | UI 표시 (en) | UI 표시 (ko) |
|----|------|-------------|-------------|
| 0 | Active | Active | 진행중 |
| 1 | Closed | Closed | 마감 |
| 2 | Resolved | Resolved | 확정 |
| 3 | Voided | Voided | 무효 |
| 4 | Paused | Paused | 중단 |

**MarketOutcome:**
| 값 | enum | UI 표시 (en) | UI 표시 (ko) |
|----|------|-------------|-------------|
| 0 | Undecided | Pending | 미정 |
| 1 | Yes | Yes | Yes |
| 2 | No | No | No |
| 3 | Void | Voided | 무효 |

**MarketCategory:**
| 값 | enum | UI 표시 (en) | UI 표시 (ko) |
|----|------|-------------|-------------|
| 0 | Crypto | Crypto | 가상자산 |
| 1 | Sports | Sports | 스포츠 |
| 2 | Weather | Weather | 날씨 |
| 3 | Politics | Politics | 정치 |
| 4 | Entertainment | Entertainment | 엔터 |
| 5 | Other | Other | 기타 |

---

## 7. 프론트엔드 통신 레이어 패턴

### 7.1 Provider vs Signer 구분

```javascript
// lib/contract.js

// Provider: 읽기 전용 (지갑 연결 불필요)
export function getProvider() {
  return new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
}

// Signer: 쓰기 (MetaMask 연결 필수)
export async function getSigner() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

// Read Contract (view 함수용)
export function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, getProvider());
}

// Write Contract (state-changing 함수용)
export async function getWriteContract() {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}
```

### 7.2 커스텀 훅 패턴

모든 컨트랙트 통신은 커스텀 훅을 통해 이루어진다. 컴포넌트에서 직접 ethers.js를 호출하지 않는다.

| 훅 | 역할 | 내부 사용 | 반환값 |
|----|------|-----------|--------|
| `useContract()` | read/write 인스턴스 관리 | `getReadContract`, `getWriteContract` | `{ readContract, writeContract }` |
| `useWallet()` | 지갑 연결 상태 | WalletContext | `{ account, balance, chainId, connect, disconnect, isConnected }` |
| `useMarkets()` | 마켓 목록 조회 + 이벤트 구독 | `getReadContract` | `{ markets, loading, error, refetch }` |
| `useBetting()` | 베팅 트랜잭션 | `getWriteContract` | `{ placeBet, txState }` |
| `useClaim()` | 클레임 트랜잭션 | `getWriteContract` | `{ claimWinnings, claimRefund, txState }` |
| `useOdds(marketId)` | 배당률 실시간 계산 | `getReadContract` | `{ yesOdds, noOdds, loading }` |
| `useUserBets()` | 사용자 베팅 내역 | `getReadContract`, 이벤트 로그 | `{ bets, loading, error }` |

### 7.3 트랜잭션 상태 관리

모든 쓰기 훅은 통일된 트랜잭션 상태 머신을 따른다.

```
idle → pending → confirming → success
                            → error
```

| 상태 | 의미 | UI 표현 |
|------|------|---------|
| `idle` | 초기 상태 | 버튼 활성화 |
| `pending` | MetaMask 서명 대기 중 | 버튼 비활성 + "지갑 확인 중..." 스피너 |
| `confirming` | 트랜잭션 제출됨, 블록 확인 대기 | "트랜잭션 처리 중..." 스피너 + tx hash 링크 |
| `success` | 블록에 포함 완료 | 성공 토스트 + UI 갱신 |
| `error` | 서명 거부 또는 revert | 에러 토스트 (에러 유형별 메시지) |

```javascript
// 트랜잭션 상태 타입
const TxState = {
  status: "idle" | "pending" | "confirming" | "success" | "error",
  txHash: null | string,    // confirming/success 시 존재
  error: null | {            // error 시 존재
    type: "USER_REJECTED" | "CONTRACT_ERROR" | "NETWORK_ERROR" | "INSUFFICIENT_FUNDS",
    name: string,            // Custom Error name (CONTRACT_ERROR 시)
    args: any[],             // Custom Error args (CONTRACT_ERROR 시)
    message: string          // 사용자 표시 메시지
  }
};
```

### 7.4 이벤트 기반 실시간 갱신 패턴

```javascript
// useMarkets 훅 내부 이벤트 구독 패턴
useEffect(() => {
  const contract = getReadContract();

  // 1. 베팅 이벤트 → 풀/배당률 갱신
  const onBetPlaced = (marketId, bettor, isYes, amount, newYesPool, newNoPool) => {
    updateMarketPool(marketId, newYesPool, newNoPool);
  };

  // 2. 마켓 생성 → 목록 갱신
  const onMarketCreated = (marketId) => {
    refetchMarket(marketId);
  };

  // 3. 마켓 결과 확정 → 상태 갱신
  const onMarketResolved = (marketId, outcome) => {
    updateMarketStatus(marketId, outcome);
  };

  contract.on("BetPlaced", onBetPlaced);
  contract.on("MarketCreated", onMarketCreated);
  contract.on("MarketResolved", onMarketResolved);

  // 클린업
  return () => {
    contract.off("BetPlaced", onBetPlaced);
    contract.off("MarketCreated", onMarketCreated);
    contract.off("MarketResolved", onMarketResolved);
  };
}, []);
```

### 7.5 폴링 전략

이벤트 리스닝은 WebSocket이 필요하므로, Metadium RPC가 HTTP only인 경우 폴링으로 대체한다.

| 데이터 | 폴링 주기 | 조건 |
|--------|----------|------|
| 마켓 목록 | 30초 | 마켓 목록 페이지 표시 중 |
| 마켓 상세 (풀/배당률) | 10초 | 마켓 상세 페이지 표시 중 |
| 사용자 잔액 | 15초 | 지갑 연결 상태 |

---

## 8. 보안 컨벤션

### 8.1 CEI (Checks-Effects-Interactions) 패턴

자금 이동이 있는 모든 함수에서 반드시 적용한다.

```solidity
function claimWinnings(uint256 marketId) external nonReentrant {
    // 1. Checks: 조건 검증
    Market storage market = markets[marketId];
    if (market.status != MarketStatus.Resolved) revert MarketNotResolved(marketId, market.status);
    Bet storage bet = bets[marketId][msg.sender];
    if (bet.amount == 0) revert NoBetFound(marketId, msg.sender);
    if (bet.claimed) revert AlreadyClaimed(marketId, msg.sender);

    // 2. Effects: 상태 변경 (외부 호출 전!)
    bet.claimed = true;
    uint256 payout = _calculatePayout(marketId, msg.sender);

    // 3. Interactions: 외부 호출 (META 전송)
    (bool success, ) = payable(msg.sender).call{value: payout}("");
    if (!success) revert TransferFailed();

    emit WinningsClaimed(marketId, msg.sender, payout);
}
```

### 8.2 nonReentrant Modifier 사용 기준

| 함수 | nonReentrant 필요 | 이유 |
|------|-------------------|------|
| `claimWinnings` | 필수 | 외부 call로 META 전송 |
| `claimRefund` | 필수 | 외부 call로 META 전송 |
| `withdrawFees` | 필수 | 외부 call로 META 전송 |
| `placeBet` | 불필요 | payable receive만, 외부 call 없음 |
| `createMarket` | 불필요 | 상태 변경만, 자금 이동 없음 |
| `resolveMarket` | 불필요 | 상태 변경만, 자금 이동 없음 |

### 8.3 프론트엔드 입력값 사전 검증

컨트랙트 revert는 가스비를 소모하므로, 프론트엔드에서 가능한 모든 조건을 사전 검증하여 불필요한 트랜잭션을 방지한다.

| 검증 항목 | 프론트엔드 검증 | 컨트랙트 검증 (이중 안전장치) |
|-----------|----------------|---------------------------|
| 베팅 금액 범위 | `minBet <= amount <= maxBet` | `require` |
| 지갑 잔액 충분 | `balance >= amount + estimatedGas` | `INSUFFICIENT_FUNDS` |
| 마켓 마감 여부 | `Date.now() / 1000 < bettingDeadline` | `require` |
| 마켓 상태 Active | `market.status === 0` | `require` |
| 반대 방향 베팅 | 기존 베팅 방향 확인 | `require` |
| 이미 클레임 완료 | `bet.claimed === false` | `require` |
| 관리자 권한 | `account === owner` | `onlyOwner` |

### 8.4 프론트엔드 보안 규칙

- 개인키를 프론트엔드 코드에 절대 포함하지 않는다
- 컨트랙트 주소와 ABI만 포함한다 (공개 정보)
- MetaMask를 통해서만 트랜잭션 서명을 수행한다
- `window.ethereum` 직접 접근을 최소화하고, ethers.js 래퍼를 사용한다
- 사용자 입력값은 항상 sanitize 후 컨트랙트에 전달한다

---

## 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|-----------|------|
| 2026-03-15 | 최초 작성 | /design 스킬 산출물: 전체 프로젝트 스마트 컨트랙트 인터페이스 컨벤션 정의 |
