# 시스템 설계서

## 1. 시스템 개요

### 1.1 아키텍처 패턴
- **DApp (Decentralized Application)**: 온체인 전용 아키텍처
- 별도 백엔드 서버/DB 없음 -- 모든 데이터와 비즈니스 로직이 스마트 컨트랙트에 존재
- 프론트엔드는 정적 SPA로, MetaMask + ethers.js를 통해 Metadium RPC에 직접 연결

### 1.2 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                       사용자 브라우저                          │
│                                                             │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │   React Frontend     │    │      MetaMask Wallet       │ │
│  │   (정적 SPA)          │◄──►│  - 계정 관리               │ │
│  │                      │    │  - 트랜잭션 서명            │ │
│  │  - 마켓 탐색/필터     │    │  - Metadium 네트워크 설정   │ │
│  │  - 베팅 UI           │    └──────────┬─────────────────┘ │
│  │  - 클레임 UI         │               │                   │
│  │  - 관리자 패널       │               │                   │
│  │  - i18n (4개 언어)   │               │                   │
│  └──────────┬───────────┘               │                   │
│             │ ethers.js                  │ JSON-RPC          │
└─────────────┼───────────────────────────┼───────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Metadium Blockchain                         │
│                                                             │
│  Mainnet (Chain ID: 11)  │  Testnet (Chain ID: 12)         │
│  RPC: api.metadium.com/prod  RPC: api.metadium.com/dev     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MetaPool.sol (단일 컨트랙트)              │   │
│  │                                                      │   │
│  │  Ownable + ReentrancyGuard + Pausable               │   │
│  │                                                      │   │
│  │  [마켓 관리] [베팅] [결과 확정] [클레임] [수수료]      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 데이터 흐름

```
읽기 (View): Frontend → ethers.js → Metadium RPC → SmartContract (가스비 없음)
쓰기 (Tx):   Frontend → ethers.js → MetaMask 서명 → Metadium RPC → SmartContract (가스비 발생)
이벤트:      SmartContract emit → Metadium RPC → ethers.js listener → Frontend UI 갱신
```

### 1.4 배포 전략
- **스마트 컨트랙트**: Hardhat을 통한 Testnet 검증 후 Mainnet 배포 (불변 배포)
- **프론트엔드**: Vercel 또는 Netlify 정적 호스팅 (CI/CD 연동)

---

## 2. 스마트 컨트랙트 아키텍처

### 2.1 컨트랙트 구조

MetaPool은 **단일 컨트랙트** 패턴으로, OpenZeppelin v5.x 라이브러리를 상속한다.

```
MetaPool.sol
├── is Ownable          // 관리자 접근 제어
├── is ReentrancyGuard  // 재진입 공격 방지
└── is Pausable         // 글로벌 긴급 중단
```

**설계 근거**: 예측 마켓의 모든 로직(마켓 관리, 베팅, 정산)이 긴밀하게 결합되어 있고, 컨트랙트 간 호출 비용과 복잡성을 줄이기 위해 단일 컨트랙트를 채택한다. v2에서 업그레이더블 프록시(UUPS) 전환을 검토한다.

### 2.2 데이터 모델

#### Enums

| Enum | 값 | 용도 |
|------|-----|------|
| `MarketStatus` | Active(0), Closed(1), Resolved(2), Voided(3), Paused(4) | 마켓 상태 머신 |
| `MarketOutcome` | Undecided(0), Yes(1), No(2), Void(3) | 결과 유형 |
| `MarketCategory` | Crypto(0), Sports(1), Weather(2), Politics(3), Entertainment(4), Other(5) | 6개 카테고리 |

#### Structs

**Market**: 마켓 전체 정보를 담는 구조체

| 필드 | 타입 | 설명 |
|------|------|------|
| id | uint256 | 마켓 고유 ID (1부터 순차 증가) |
| question | string | 영어 질문 텍스트 |
| questionKo / questionZh / questionJa | string | 다국어 질문 (한/중/일) |
| category | MarketCategory | 카테고리 |
| bettingDeadline | uint256 | 베팅 마감 timestamp |
| resolutionDeadline | uint256 | 결과 확정 예정 timestamp |
| status | MarketStatus | 현재 상태 |
| outcome | MarketOutcome | 확정된 결과 |
| yesPool / noPool | uint256 | Yes/No 풀 총액 (wei) |
| yesCount / noCount | uint256 | Yes/No 참여자 수 |
| createdAt / resolvedAt | uint256 | 생성/확정 시간 |
| creator | address | 마켓 생성자 (관리자) |

**Bet**: 개별 베팅 기록

| 필드 | 타입 | 설명 |
|------|------|------|
| amount | uint256 | 베팅 금액 (wei) |
| isYes | bool | true=Yes, false=No |
| claimed | bool | 클레임 완료 여부 |

#### State Variables

```
markets:          mapping(uint256 => Market)                    // 마켓 저장소
bets:             mapping(uint256 => mapping(address => Bet))   // 마켓별 사용자 베팅
marketCount:      uint256                                       // 총 마켓 수 (ID 카운터)
minBet / maxBet:  uint256                                       // 베팅 한도 (wei)
platformFeeRate:  uint256                                       // 수수료율 (basis points, 200 = 2%)
FEE_DENOMINATOR:  uint256 constant = 10000                      // 수수료 분모
accumulatedFees:  uint256                                       // 미인출 수수료 누적
```

### 2.3 마켓 상태 머신

```
                ┌──────────┐
                │  Active  │ ◄── createMarket()
                └────┬─────┘
                     │
          ┌──────────┼──────────┬──────────────┐
          │          │          │              │
          ▼          ▼          ▼              ▼
    ┌──────────┐ ┌────────┐ ┌────────┐  ┌──────────┐
    │  Closed  │ │ Paused │ │Resolved│  │  Voided  │
    │ (수동마감)│ │(긴급중단)│ │(결과확정)│  │ (무효화) │
    └────┬─────┘ └───┬────┘ └────────┘  └──────────┘
         │           │
         │           ▼
         │     ┌──────────┐
         │     │  Active  │ ◄── resumeMarket()
         │     └──────────┘
         │
         ▼
   ┌──────────┐    ┌──────────┐
   │ Resolved │ 또는│  Voided  │  ◄── resolveMarket()
   └──────────┘    └──────────┘
```

**전이 규칙:**
- `Active` -> `Closed`: closeMarket() (수동 조기 마감)
- `Active` -> `Paused`: pauseMarket() (긴급 중단)
- `Active` -> `Resolved`: resolveMarket(Yes/No) (베팅 마감 이후)
- `Active` -> `Voided`: resolveMarket(Void)
- `Closed` -> `Resolved` / `Voided`: resolveMarket()
- `Paused` -> `Active`: resumeMarket() (재개, 새 마감 시간 설정)

### 2.4 핵심 함수 흐름

#### 마켓 생성 -> 베팅 -> 결과 확정 -> 클레임 (정상 흐름)

```
1. createMarket()        [관리자]
   - 질문(4개 언어), 카테고리, 마감 시간 설정
   - MarketCreated 이벤트 emit
   - 마켓 ID 반환

2. placeBet()            [사용자, payable]
   - Active 상태 + 마감 전 검증
   - msg.value로 META 전송 (minBet <= amount <= maxBet)
   - 첫 베팅 또는 같은 방향 추가 베팅만 허용
   - yesPool/noPool 갱신
   - BetPlaced 이벤트 emit

3. resolveMarket()       [관리자]
   - 베팅 마감 이후만 가능
   - outcome = Yes/No/Void 설정
   - Void인 경우 status = Voided
   - Yes/No인 경우 status = Resolved, 수수료 계산/누적
   - MarketResolved 이벤트 emit

4. claimWinnings()       [승리 사용자]
   - Resolved 상태 + 승리 방향 일치 검증
   - 보상 = 원금 + (분배 가능 금액 * 내 베팅 / 승리 풀)
   - claimed = true (상태 먼저 변경 -- CEI 패턴)
   - META 전송
   - WinningsClaimed 이벤트 emit
```

#### Void 환불 흐름

```
resolveMarket(Void) -> claimRefund()
- Voided 상태 검증
- 원금 전액 반환
- RefundClaimed 이벤트 emit
```

### 2.5 수수료 계산 로직

```
패배 풀 (losingPool) = outcome이 Yes이면 noPool, No이면 yesPool
플랫폼 수수료 = losingPool * platformFeeRate / FEE_DENOMINATOR
                = losingPool * 200 / 10000
                = losingPool * 2%

분배 가능 금액 (distributable) = losingPool - 수수료

각 승리자 보상 = 본인 베팅 원금 + (distributable * 본인 베팅 / 승리 풀 총액)
```

**특징:**
- 수수료는 패배 풀에서만 차감 (승리자 원금 보장)
- `resolveMarket()` 시점에 `accumulatedFees`에 누적
- `withdrawFees()`로 관리자가 별도 인출

### 2.6 보안 패턴

| 보안 위협 | 방어 패턴 | 적용 위치 |
|----------|----------|----------|
| 재진입 공격 | CEI 패턴 + `nonReentrant` modifier | claimWinnings(), claimRefund(), withdrawFees() |
| 권한 탈취 | `onlyOwner` modifier (Ownable) | 모든 관리자 함수 |
| 정수 오버플로우 | Solidity 0.8+ 내장 체크 | 전역 |
| 먼지 공격 (스팸 베팅) | minBet = 100 META | placeBet() |
| 대규모 풀 조작 | maxBet = 100,000 META | placeBet() |
| 긴급 상황 | Pausable (글로벌) + pauseMarket (마켓별) | placeBet(), 마켓 관리 |
| 프론트러닝 | maxBet 제한으로 영향 최소화 | placeBet() |
| 타임스탬프 조작 | 마켓 마감 단위가 시간~일 -> block.timestamp +-15초 무시 가능 | 마감 검증 |

---

## 3. 디렉토리 구조

```
MetaPool/
├── contracts/                    # Solidity 스마트 컨트랙트
│   └── MetaPool.sol              #   메인 컨트랙트 (단일)
├── test/                         # Hardhat 테스트 (Mocha + Chai)
│   └── MetaPool.test.js          #   전체 테스트 스위트
├── scripts/                      # 배포 및 운영 스크립트
│   ├── deploy.js                 #   컨트랙트 배포
│   ├── deploy-testnet.js         #   테스트넷 배포
│   └── verify.js                 #   컨트랙트 검증 (선택)
├── frontend/                     # React SPA
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.jsx               #   루트 컴포넌트 + 라우팅
│       ├── main.jsx              #   엔트리포인트
│       ├── components/           #   UI 컴포넌트
│       │   ├── layout/           #     Header, Footer, LanguageSelector
│       │   ├── market/           #     MarketCard, MarketList, MarketDetail
│       │   ├── betting/          #     BetPanel, BetConfirmModal, QuickButtons
│       │   ├── claim/            #     ClaimPanel, ClaimHistory
│       │   ├── profile/          #     UserStats, BetHistory
│       │   ├── admin/            #     CreateMarketForm, ResolvePanel, AdminDashboard
│       │   └── common/           #     ConnectWallet, CategoryFilter, Countdown, PoolBar
│       ├── hooks/                #   커스텀 훅
│       │   ├── useContract.js    #     ethers.js 컨트랙트 인스턴스
│       │   ├── useWallet.js      #     MetaMask 연결 상태
│       │   ├── useMarkets.js     #     마켓 목록/상세 조회
│       │   ├── useBetting.js     #     베팅 트랜잭션
│       │   └── useClaim.js       #     클레임 트랜잭션
│       ├── lib/                  #   유틸리티
│       │   ├── contract.js       #     ABI + 주소 + Provider 설정
│       │   ├── constants.js      #     체인 설정, 카테고리, 한도
│       │   ├── format.js         #     META 포맷팅, 배당률 변환
│       │   └── i18n.js           #     다국어 설정
│       ├── locales/              #   번역 파일
│       │   ├── en.json
│       │   ├── ko.json
│       │   ├── zh.json
│       │   └── ja.json
│       ├── contexts/             #   React Context
│       │   └── WalletContext.jsx  #     지갑 연결 상태 공유
│       └── styles/               #   스타일시트 (Tailwind 또는 CSS Modules)
├── docs/                         # 프로젝트 문서
│   ├── project/                  #   기획 문서
│   ├── system/                   #   시스템 설계
│   │   └── system-design.md      #   본 문서
│   ├── specs/                    #   PRD, 기술 스펙
│   │   ├── MetaPool_PRD.md
│   │   └── MetaPool_TechnicalSpec.md
│   └── tests/                    #   테스트 결과
├── hardhat.config.js             # Hardhat 설정 (네트워크, 컴파일러)
├── package.json                  # 루트 의존성 (Hardhat, OZ)
├── CLAUDE.md
└── CHANGELOG.md
```

---

## 4. 프론트엔드 아키텍처

### 4.1 기술 스택

| 항목 | 기술 | 버전 |
|------|------|------|
| UI 프레임워크 | React | 18+ |
| 빌드 도구 | Vite | 5+ |
| 블록체인 통신 | ethers.js | v6 |
| 스타일링 | Tailwind CSS | 3+ |
| 다국어 | react-i18next | - |
| 상태 관리 | React Context + 커스텀 훅 | - |

### 4.2 컴포넌트 트리

```
App
├── WalletContext.Provider              // 지갑 연결 상태 전역 공유
│   ├── Header
│   │   ├── Logo
│   │   ├── CategoryFilter             // 6개 카테고리 탭
│   │   ├── ConnectWallet              // MetaMask 연결 버튼
│   │   └── LanguageSelector           // EN/KO/ZH/JA
│   │
│   ├── MarketList                     // 마켓 목록 (메인 영역)
│   │   └── MarketCard[]               // 개별 마켓 카드
│   │       ├── CategoryTag
│   │       ├── QuestionText           // 현재 언어에 맞는 질문
│   │       ├── PoolBar                // Yes/No 비율 프로그레스 바
│   │       ├── MarketMeta             // 풀 규모, 참여자, 카운트다운
│   │       └── BetButtons             // [Yes 베팅] [No 베팅]
│   │
│   ├── BetPanel (슬라이드)             // 베팅 입력 패널
│   │   ├── DirectionDisplay           // 선택한 방향 (Yes/No)
│   │   ├── AmountInput                // 금액 입력 + 슬라이더
│   │   ├── QuickButtons              // 100/500/1K/5K/10K META
│   │   ├── OddsDisplay               // 현재 배당률
│   │   ├── ExpectedReturn            // 예상 수익 실시간 계산
│   │   └── ConfirmButton
│   │
│   ├── BetConfirmModal               // 최종 확인 모달
│   │   └── [서명 & 베팅] [취소]
│   │
│   ├── Tabs                           // 하단 탭 네비게이션
│   │   ├── ActiveMarkets              // 활성 마켓
│   │   ├── MyBets                     // 내 베팅 목록
│   │   ├── History                    // 종료 마켓 히스토리
│   │   └── Leaderboard (P1)          // 리더보드
│   │
│   ├── ClaimPanel                     // 보상 클레임 UI
│   │
│   ├── AdminPanel (관리자만)           // 관리자 전용 패널
│   │   ├── CreateMarketForm
│   │   ├── ResolvePanel
│   │   └── FeesDashboard
│   │
│   └── Footer
```

### 4.3 ethers.js 컨트랙트 통신 레이어

프론트엔드와 스마트 컨트랙트 간 통신은 3개 레이어로 구성한다.

```
[컴포넌트] → [커스텀 훅] → [lib/contract.js] → [ethers.js] → [Metadium RPC]
```

#### lib/contract.js -- 컨트랙트 인스턴스 팩토리

```javascript
// Provider (읽기 전용)
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Signer (쓰기, MetaMask 연결 시)
const signer = await provider.getSigner();

// 컨트랙트 인스턴스
const readContract  = new ethers.Contract(ADDRESS, ABI, provider);  // view 호출
const writeContract = new ethers.Contract(ADDRESS, ABI, signer);    // tx 전송
```

#### 커스텀 훅 패턴

| 훅 | 역할 | 읽기/쓰기 |
|----|------|----------|
| `useWallet()` | MetaMask 연결, 계정, 잔액, 네트워크 체크 | 읽기 |
| `useContract()` | read/write 컨트랙트 인스턴스 관리 | 인프라 |
| `useMarkets()` | 마켓 목록 조회, 필터, 정렬, 이벤트 구독 | 읽기 |
| `useBetting()` | placeBet 트랜잭션 + 상태 관리 (pending/success/error) | 쓰기 |
| `useClaim()` | claimWinnings/claimRefund 트랜잭션 | 쓰기 |
| `useOdds(marketId)` | 배당률/예상 수익 실시간 계산 | 읽기 |
| `useUserBets()` | 사용자 베팅 내역 조회 | 읽기 |

### 4.4 상태 관리 전략

외부 상태 관리 라이브러리 없이 React Context + 커스텀 훅으로 구성한다. 블록체인이 single source of truth이므로 클라이언트 캐시는 최소화한다.

| 상태 카테고리 | 관리 방식 | 갱신 트리거 |
|-------------|----------|------------|
| 지갑 연결 | WalletContext | MetaMask 이벤트 (accountsChanged, chainChanged) |
| 마켓 목록 | useMarkets 훅 (polling + event) | BetPlaced/MarketCreated 이벤트, 30초 폴링 |
| 베팅 트랜잭션 | useBetting 훅 (로컬 상태) | tx.wait() 완료 |
| 현재 언어 | i18next | 사용자 선택 (localStorage 저장) |

**이벤트 기반 실시간 갱신:**
- `BetPlaced` 이벤트 수신 시: 해당 마켓 카드의 풀 비율, 배당률 즉시 갱신
- `MarketResolved` 이벤트 수신 시: 마켓 상태 변경 + 클레임 버튼 활성화
- `MarketCreated` 이벤트 수신 시: 마켓 목록에 새 카드 추가

### 4.5 i18n 구조

4개 언어를 지원하며, UI 텍스트와 마켓 질문을 분리 관리한다.

```
UI 텍스트:  locales/{lang}.json     → react-i18next
마켓 질문:  온체인 저장 (Market struct의 question/questionKo/questionZh/questionJa)
            → 현재 언어에 따라 해당 필드 선택 표시
```

| 언어 | 코드 | UI 파일 | 마켓 질문 필드 |
|------|------|---------|--------------|
| English | en | en.json | question |
| 한국어 | ko | ko.json | questionKo |
| 中文 | zh | zh.json | questionZh |
| 日本語 | ja | ja.json | questionJa |

### 4.6 MetaMask 통합

```
연결 흐름:
1. "Connect Wallet" 클릭
2. window.ethereum 존재 확인 (없으면 MetaMask 설치 안내)
3. eth_requestAccounts 요청
4. chainId 확인 (Mainnet: 11, Testnet: 12)
5. 틀린 네트워크면 wallet_switchEthereumChain 또는 wallet_addEthereumChain 호출
6. 연결 완료 -> WalletContext에 account, balance 저장

네트워크 설정 (자동 추가):
{
  chainId: '0xb',                          // 11 (Mainnet)
  chainName: 'Metadium Mainnet',
  rpcUrls: ['https://api.metadium.com/prod'],
  nativeCurrency: { name: 'META', symbol: 'META', decimals: 18 }
}
```

### 4.7 디자인 톤

MetaLotto와 차별화된 다크 + 인디고/퍼플 테마를 적용한다.

| 토큰 | 값 | 용도 |
|------|-----|------|
| bg-primary | #0b0d1a | 메인 배경 |
| color-primary | #6366f1 | 주 색상 (인디고) |
| color-secondary | #8b5cf6 | 보조 색상 (퍼플) |
| color-accent | #06b6d4 | 포인트 (시안) |
| color-yes | #10b981 | Yes 방향 (그린) |
| color-no | #ef4444 | No 방향 (레드) |
| color-success | #10b981 | 성공 상태 |
| color-danger | #ef4444 | 위험/에러 |

---

## 5. 배포 아키텍처

### 5.1 Hardhat 설정

```javascript
// hardhat.config.js 핵심 구조
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    metadiumTestnet: {
      url: "https://api.metadium.com/dev",
      chainId: 12,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    },
    metadiumMainnet: {
      url: "https://api.metadium.com/prod",
      chainId: 11,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
```

### 5.2 배포 스크립트 구조

```
scripts/
├── deploy-testnet.js    # 테스트넷 배포 (소액 파라미터)
│                        #   minBet: 1 META, maxBet: 1,000 META, fee: 2%
├── deploy.js            # 메인넷 배포 (운영 파라미터)
│                        #   minBet: 100 META, maxBet: 100,000 META, fee: 2%
└── verify.js            # 배포 후 소스 검증 (선택)
```

### 5.3 Testnet -> Mainnet 배포 플로우

```
1. 개발 & 단위 테스트
   $ npx hardhat test                          # 로컬 Hardhat 네트워크

2. 테스트넷 배포
   $ npx hardhat run scripts/deploy-testnet.js --network metadiumTestnet
   → 컨트랙트 주소 기록
   → 프론트엔드에서 테스트넷 연결하여 E2E 검증

3. 테스트넷 검증 항목
   - 마켓 생성/베팅/결과확정/클레임 전체 흐름
   - 수수료 계산 정확성
   - 엣지 케이스 (마감 시간, Void, Pause/Resume)
   - 가스비 측정

4. 메인넷 배포
   $ npx hardhat run scripts/deploy.js --network metadiumMainnet
   → 컨트랙트 주소를 frontend/src/lib/constants.js에 반영
   → 프론트엔드 빌드 & 배포

5. 배포 후 검증
   - owner 확인
   - minBet/maxBet/platformFeeRate 확인
   - 테스트 마켓 생성 및 삭제(Void)
```

### 5.4 프론트엔드 배포

```
프론트엔드 (정적 SPA):
├── 빌드: Vite → dist/
├── 호스팅: Vercel 또는 Netlify
├── 환경 분리:
│   ├── .env.development   → Testnet RPC + 테스트넷 컨트랙트 주소
│   └── .env.production    → Mainnet RPC + 메인넷 컨트랙트 주소
└── CI/CD: GitHub Actions → 자동 빌드 & 배포
```

### 5.5 환경변수

#### 스마트 컨트랙트 (배포 시)

| 변수 | 설명 | 예시 |
|------|------|------|
| DEPLOYER_PRIVATE_KEY | 배포자 개인키 | 0x... (.env, 절대 커밋 금지) |

#### 프론트엔드

| 변수 | 설명 | Testnet | Mainnet |
|------|------|---------|---------|
| VITE_RPC_URL | Metadium RPC | https://api.metadium.com/dev | https://api.metadium.com/prod |
| VITE_CHAIN_ID | Chain ID | 12 | 11 |
| VITE_CONTRACT_ADDRESS | MetaPool 컨트랙트 주소 | 0x... | 0x... |

---

## 6. 테스트 전략

### 6.1 스마트 컨트랙트 테스트

| 레벨 | 도구 | 대상 | 목표 커버리지 |
|------|------|------|-------------|
| 단위 테스트 | Hardhat + Chai + ethers.js | 모든 함수, 경계값, revert 조건 | 95%+ |
| 시나리오 테스트 | Hardhat | 전체 라이프사이클 (생성->베팅->확정->클레임) | 전 시나리오 |
| 가스 측정 | hardhat-gas-reporter | 주요 함수 가스 소모 | 스펙 대비 검증 |
| 보안 분석 | Slither (선택) | 취약점 정적 분석 | 0 high/medium |

**핵심 테스트 시나리오 (기술 스펙 10장 기반):**
- 마켓 생성: 정상 생성, 비관리자 revert, 과거 시간 revert, 빈 질문 revert
- 베팅: 정상 베팅, 최소/최대 미달/초과 revert, 마감 후 revert, 반대 방향 revert, 추가 베팅
- 결과/클레임: 승리자 클레임, 패배자 클레임 revert, 이중 클레임 revert, Void 환불
- 보상 계산: PRD 예시 시나리오 수치 검증 (Yes 풀 10K, No 풀 15K, 수수료 2%)

### 6.2 프론트엔드 테스트

| 레벨 | 도구 | 대상 |
|------|------|------|
| 컴포넌트 테스트 | Vitest + React Testing Library | 주요 컴포넌트 렌더링, 상호작용 |
| 통합 테스트 | Vitest | 훅 + 컨트랙트 mock 연동 |
| E2E | 수동 테스트 (v1) | 테스트넷 상 전체 흐름 |

---

## 7. 개발 환경 구성

### 7.1 사전 요구사항

- Node.js 18+
- MetaMask 브라우저 확장
- Metadium Testnet META (테스트용)

### 7.2 로컬 실행

```bash
# 의존성 설치
npm install

# 스마트 컨트랙트 컴파일
npx hardhat compile

# 테스트 실행
npx hardhat test

# 로컬 노드에서 배포 & 프론트엔드 개발
npx hardhat node                                    # 터미널 1
npx hardhat run scripts/deploy-testnet.js --network localhost  # 터미널 2

# 프론트엔드 개발 서버
cd frontend && npm install && npm run dev           # 터미널 3
```

### 7.3 주요 의존성

**루트 (Hardhat):**
- hardhat
- @nomicfoundation/hardhat-toolbox (ethers, chai, mocha)
- @openzeppelin/contracts v5.x
- dotenv

**프론트엔드:**
- react, react-dom
- ethers v6
- react-i18next, i18next
- tailwindcss
- vite
