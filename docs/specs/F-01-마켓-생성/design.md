# F-01 마켓 생성 -- 기술 설계서

## 1. 참조
- 인수조건: docs/project/features.md #F-01
- 시스템 설계: docs/system/system-design.md (섹션 2: 스마트 컨트랙트 아키텍처)
- 데이터 모델: docs/system/erd.md (Market struct, Enums, State Variables)
- 인터페이스 컨벤션: docs/system/api-conventions.md (함수/에러/이벤트)

## 2. 개요

관리자(owner)가 Binary(Yes/No) 예측 마켓을 생성하는 기능이다. 마켓은 MetaPool.sol 단일 컨트랙트의 `markets` mapping에 저장되며, 4개 언어(영어/한국어/중국어/일본어) 질문, 카테고리, 베팅 마감 시간, 결과 확정 예정 시간을 포함한다. 마켓 ID는 1부터 순차 증가하며, 생성 즉시 Active 상태로 전환된다.

## 3. 아키텍처 결정

### 결정 1: ID 생성 방식
- **선택지**: A) marketCount를 pre-increment (++marketCount) / B) post-increment (marketCount++)
- **결정**: A) pre-increment (`++marketCount`)
- **근거**: 마켓 ID가 1부터 시작해야 하는 요구사항 충족. `marketCount`는 0에서 시작하고 `++marketCount`로 먼저 1로 증가시킨 후 ID로 사용한다. 이렇게 하면 `marketCount`는 항상 "마지막으로 생성된 마켓의 ID"이자 "총 마켓 수"를 동시에 의미한다.

### 결정 2: 다국어 질문의 빈 값 허용
- **선택지**: A) 영어 질문만 필수, 나머지 빈 문자열 허용 / B) 4개 언어 모두 필수
- **결정**: A) 영어 질문만 필수
- **근거**: F-29 인수조건에 "해당 언어 질문이 없으면 영어(기본)로 폴백"이 명시되어 있으므로, 한국어/중국어/일본어 질문은 선택적이다. 가스 비용 절감에도 유리하다.

### 결정 3: createMarket 반환값
- **선택지**: A) 반환값 없음 (이벤트로만 ID 전달) / B) uint256 marketId 반환
- **결정**: B) `uint256` 반환
- **근거**: 프론트엔드에서 `tx.wait()` 후 반환값을 통해 생성된 마켓 ID를 즉시 참조할 수 있다. 이벤트 파싱 없이도 ID를 얻을 수 있어 개발 편의성이 높다.

## 4. 데이터 모델

### 4.1 Enums (erd.md 참조)

```solidity
enum MarketStatus { Active, Closed, Resolved, Voided, Paused }
enum MarketOutcome { Undecided, Yes, No, Void }
enum MarketCategory { Crypto, Sports, Weather, Politics, Entertainment, Other }
```

### 4.2 Market Struct

```solidity
struct Market {
    uint256 id;                  // 마켓 고유 ID (1부터 순차 증가)
    string question;             // 영어 질문 텍스트 (필수)
    string questionKo;           // 한국어 질문 (선택)
    string questionZh;           // 중국어 질문 (선택)
    string questionJa;           // 일본어 질문 (선택)
    MarketCategory category;     // 카테고리 (6종)
    uint256 bettingDeadline;     // 베팅 마감 timestamp
    uint256 resolutionDeadline;  // 결과 확정 예정 timestamp
    MarketStatus status;         // 현재 상태 (생성 시 Active)
    MarketOutcome outcome;       // 확정된 결과 (생성 시 Undecided)
    uint256 yesPool;             // Yes 풀 총액 (생성 시 0)
    uint256 noPool;              // No 풀 총액 (생성 시 0)
    uint256 yesCount;            // Yes 참여자 수 (생성 시 0)
    uint256 noCount;             // No 참여자 수 (생성 시 0)
    uint256 createdAt;           // 생성 timestamp (block.timestamp)
    uint256 resolvedAt;          // 결과 확정 timestamp (생성 시 0)
    address creator;             // 마켓 생성자 (msg.sender, 관리자)
    uint256 disputeDeadline;     // 이의제기 마감 timestamp (생성 시 0)
    uint256 disputeCount;        // 이의 제출 건수 (생성 시 0)
    bool underReview;            // 재심 상태 (생성 시 false)
}
```

### 4.3 State Variables (F-01 관련)

| 변수 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `markets` | `mapping(uint256 => Market)` | - | 마켓 저장소 |
| `marketCount` | `uint256` | 0 | 마켓 ID 카운터 (마지막 생성 ID = 총 마켓 수) |
| `minBet` | `uint256` | `100 ether` | 최소 베팅 금액 (100 META). constructor에서 설정 |
| `maxBet` | `uint256` | `100_000 ether` | 최대 베팅 금액 (100,000 META). constructor에서 설정 |
| `platformFeeRate` | `uint256` | `200` | 수수료율 (2%). constructor에서 설정 |
| `FEE_DENOMINATOR` | `uint256 constant` | `10000` | 수수료 분모 |

## 5. 함수 설계

### 5.1 createMarket

```solidity
/// @notice 새로운 예측 마켓을 생성한다 (관리자 전용)
/// @param _question 영어 질문 텍스트 (필수, 비어있으면 revert)
/// @param _questionKo 한국어 질문 (빈 문자열 허용)
/// @param _questionZh 중국어 질문 (빈 문자열 허용)
/// @param _questionJa 일본어 질문 (빈 문자열 허용)
/// @param _category 마켓 카테고리 (MarketCategory enum)
/// @param _bettingDeadline 베팅 마감 Unix timestamp (미래 시간이어야 함)
/// @param _resolutionDeadline 결과 확정 예정 Unix timestamp (bettingDeadline보다 이후)
/// @return marketId 생성된 마켓 ID (1부터 순차 증가)
function createMarket(
    string calldata _question,
    string calldata _questionKo,
    string calldata _questionZh,
    string calldata _questionJa,
    MarketCategory _category,
    uint256 _bettingDeadline,
    uint256 _resolutionDeadline
) external onlyOwner returns (uint256 marketId)
```

**Modifier**: `onlyOwner` (OpenZeppelin Ownable)

**검증 로직 (순서대로)**:
1. `bytes(_question).length == 0` -> revert `EmptyQuestion()`
2. `_bettingDeadline <= block.timestamp` -> revert `InvalidDeadline(_bettingDeadline, _resolutionDeadline)`
3. `_resolutionDeadline <= _bettingDeadline` -> revert `InvalidDeadline(_bettingDeadline, _resolutionDeadline)`

**실행 로직**:
1. `marketCount`를 pre-increment (`++marketCount`)
2. `marketId = marketCount`
3. `markets[marketId]`에 Market struct 저장:
   - `id = marketId`
   - `question = _question`
   - `questionKo = _questionKo`, `questionZh = _questionZh`, `questionJa = _questionJa`
   - `category = _category`
   - `bettingDeadline = _bettingDeadline`
   - `resolutionDeadline = _resolutionDeadline`
   - `status = MarketStatus.Active`
   - `outcome = MarketOutcome.Undecided`
   - `createdAt = block.timestamp`
   - `creator = msg.sender`
   - 나머지 필드는 기본값 (0, false)
4. `MarketCreated` 이벤트 emit
5. `marketId` 반환

### 5.2 View 함수

#### getMarket

```solidity
/// @notice 마켓 전체 정보를 조회한다
/// @param _marketId 조회할 마켓 ID
/// @return Market struct (메모리 복사본)
function getMarket(uint256 _marketId) external view returns (Market memory)
```

- 존재하지 않는 마켓 ID 조회 시 기본값(모든 필드 0/false/빈문자열)의 Market struct를 반환한다
- revert하지 않는다 (프론트엔드에서 `market.id == 0`으로 존재 여부 판별)

#### marketCount (public state variable)

```solidity
uint256 public marketCount;
```

- Solidity 컴파일러가 자동으로 getter 함수 `marketCount()` 생성
- 총 마켓 수이자 마지막 생성 마켓 ID를 반환

#### getMarketsByStatus (편의 함수, 선택적)

이 함수는 가스 비용이 높을 수 있으므로 v1에서는 구현하지 않는다. 프론트엔드에서 `marketCount()`로 총 수를 읽고, 순차적으로 `getMarket(i)`를 호출한 후 클라이언트 사이드에서 status를 필터링한다.

## 6. Custom Errors

```solidity
/// @notice 영어 질문이 비어있을 때 발생
error EmptyQuestion();

/// @notice 베팅 마감 시간이 현재보다 과거이거나, 결과 확정 시간이 마감 시간 이전일 때 발생
/// @param bettingDeadline 입력된 베팅 마감 시간
/// @param resolutionDeadline 입력된 결과 확정 예정 시간
error InvalidDeadline(uint256 bettingDeadline, uint256 resolutionDeadline);
```

- `onlyOwner`에 의한 권한 검증 실패 시 OpenZeppelin의 `OwnableUnauthorizedAccount(address)` 에러가 발생한다 (v5.x 표준)

## 7. 이벤트

```solidity
event MarketCreated(
    uint256 indexed marketId,
    string question,
    MarketCategory indexed category,
    uint256 bettingDeadline,
    uint256 resolutionDeadline
);
```

- `marketId`: indexed (마켓별 이벤트 필터링)
- `category`: indexed (카테고리별 마켓 필터링)
- `question`: non-indexed (string은 indexed 시 keccak256 해시로 저장되어 원문 조회 불가)
- `bettingDeadline`, `resolutionDeadline`: non-indexed (필터링 불필요)

**api-conventions.md 대비 차이**: erd.md의 MarketCreated 이벤트에 `address indexed creator`가 포함되어 있으나, api-conventions.md 정의에는 없다. 관리자만 마켓을 생성하므로 `creator` 파라미터의 indexed 필터링 가치가 낮다. 기본 api-conventions.md 정의를 따르되, 필요 시 추후 추가를 검토한다.

## 8. 컨트랙트 상속 및 Constructor

### 8.1 상속 구조

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract MetaPool is Ownable, ReentrancyGuard, Pausable {
    // ...
}
```

- **Ownable** (v5.x): constructor에 `Ownable(initialOwner)` 호출 필요. `onlyOwner` modifier 제공
- **ReentrancyGuard** (v5.x): F-01에서는 사용하지 않으나 F-07/F-08 claimWinnings/claimRefund에서 사용
- **Pausable** (v5.x): F-01에서는 사용하지 않으나 F-05 placeBet에서 `whenNotPaused` 사용

### 8.2 Constructor

```solidity
/// @param _initialOwner 관리자 주소 (Ownable)
/// @param _minBet 최소 베팅 금액 (wei)
/// @param _maxBet 최대 베팅 금액 (wei)
/// @param _platformFeeRate 수수료율 (basis points, 200 = 2%)
constructor(
    address _initialOwner,
    uint256 _minBet,
    uint256 _maxBet,
    uint256 _platformFeeRate
) Ownable(_initialOwner) {
    // 검증
    require(_minBet > 0, "minBet must be > 0");
    require(_maxBet > _minBet, "maxBet must be > minBet");
    require(_platformFeeRate <= 1000, "feeRate must be <= 10%");

    minBet = _minBet;
    maxBet = _maxBet;
    platformFeeRate = _platformFeeRate;
}
```

**배포 파라미터 (Testnet)**:
- `_initialOwner`: 배포자 주소
- `_minBet`: `1 ether` (1 META)
- `_maxBet`: `1000 ether` (1,000 META)
- `_platformFeeRate`: `200` (2%)

**배포 파라미터 (Mainnet)**:
- `_initialOwner`: 배포자 주소
- `_minBet`: `100 ether` (100 META)
- `_maxBet`: `100000 ether` (100,000 META)
- `_platformFeeRate`: `200` (2%)

## 9. 시퀀스 흐름

### 9.1 마켓 생성 (정상 흐름)

```
관리자 → Frontend(CreateMarketForm)
         → ethers.js writeContract.createMarket(args)
         → MetaMask 서명 확인
         → Metadium RPC
         → MetaPool.sol.createMarket()
              1. onlyOwner 검증 (msg.sender == owner)
              2. EmptyQuestion 검증
              3. InvalidDeadline 검증 (bettingDeadline > block.timestamp)
              4. InvalidDeadline 검증 (resolutionDeadline > bettingDeadline)
              5. ++marketCount
              6. markets[marketCount] = Market{...}
              7. emit MarketCreated(marketId, question, category, ...)
              8. return marketId
         ← tx receipt (success)
         → Frontend: 성공 토스트 + 마켓 목록 갱신
```

### 9.2 마켓 생성 실패 (비관리자)

```
비관리자 → Frontend → ethers.js → MetaMask 서명
         → Metadium RPC → MetaPool.sol
              1. onlyOwner 검증 실패
              → revert OwnableUnauthorizedAccount(msg.sender)
         ← tx revert
         → Frontend: CONTRACT_ERROR 파싱 → "권한이 없습니다" 에러 토스트
```

## 10. 영향 범위

### 신규 생성 파일
- `contracts/MetaPool.sol` -- 메인 컨트랙트 (F-01 기능 포함)
- `test/MetaPool.test.js` -- 테스트 스위트
- `scripts/deploy.js` -- 메인넷 배포 스크립트
- `scripts/deploy-testnet.js` -- 테스트넷 배포 스크립트

### 수정 필요 파일
- 없음 (Greenfield, 최초 구현)

## 11. 가스 최적화

- `string calldata` 사용: memory 대비 calldata가 가스 절약 (외부 함수 파라미터)
- struct storage 직접 기록: 메모리에 struct를 만들어 복사하는 대신, `markets[marketId].field = value` 형식으로 개별 필드를 직접 storage에 기록하면 더 효율적일 수 있으나, 가독성을 위해 한 번에 할당하는 방식도 허용. 구현 시 가스 측정 후 결정
- `MarketCategory`는 uint8로 저장되므로 struct packing에 유리

---

## 변경 이력

| 날짜 | 변경 내용 | 이유 |
|------|----------|------|
| 2026-03-15 | 최초 작성 | F-01 마켓 생성 기능 설계 |
