# MetaPool — 전체 화면 흐름 + 라우팅

## 1. 화면 목록

| 화면명 | 경로 | 설명 | 접근 제어 |
|--------|------|------|----------|
| 마켓 목록 (메인) | `/` | 활성 마켓 카드 목록. 카테고리 필터, 정렬, 검색 포함 | 공개 |
| 마켓 상세 | `/market/:id` | 특정 마켓의 질문/풀 비율/배당률/카운트다운/베팅 UI | 공개 (베팅은 지갑 필요) |
| 내 베팅 | `/my-bets` | 참여 마켓 목록, 클레임/환불 버튼 | 지갑 연결 필요 |
| 프로필 | `/profile` | 참여 이력, 수익률 대시보드 (승률·순이익·통계) | 지갑 연결 필요 |
| 리더보드 | `/leaderboard` | 수익률·정확도 기준 상위 예측자 랭킹 | 공개 |
| 히스토리 | `/history` | 종료된 마켓 아카이브 (Resolved / Voided) | 공개 |
| 관리자 패널 | `/admin` | 대시보드: 마켓 현황·수수료 요약 | owner 전용 |
| 마켓 생성 | `/admin/create` | 4개 언어 질문·카테고리·마감시간 입력 폼 | owner 전용 |
| 결과 확정 | `/admin/resolve/:id` | 마켓별 Yes / No / Void 결과 확정 폼 | owner 전용 |
| 설정 관리 | `/admin/settings` | minBet / maxBet / 수수료율 변경 및 수수료 인출 | owner 전용 |

---

## 2. URL 구조

```
/                        → 마켓 목록 (메인, 기본 화면)
/market/:id              → 마켓 상세 (:id = 컨트랙트 marketId)
/my-bets                 → 내 베팅 (지갑 연결 필요)
/profile                 → 프로필 (지갑 연결 필요)
/leaderboard             → 리더보드
/history                 → 히스토리 (종료 마켓)
/admin                   → 관리자 패널 홈 (owner 전용)
/admin/create            → 마켓 생성 (owner 전용)
/admin/resolve/:id       → 결과 확정 (:id = marketId, owner 전용)
/admin/settings          → 설정 관리 (owner 전용)
```

### URL 파라미터 / 쿼리스트링

| 경로 | 파라미터 | 설명 |
|------|----------|------|
| `/market/:id` | `id` (path) | 마켓 ID (uint256, 컨트랙트 인덱스) |
| `/admin/resolve/:id` | `id` (path) | 마켓 ID |
| `/` | `?category=` (optional) | 카테고리 필터 상태 공유 (URL 유지) |
| `/` | `?sort=` (optional) | 정렬 상태 공유 (deadline / pool / recent / popular) |
| `/history` | `?status=` (optional) | Resolved / Voided 필터 |

---

## 3. 네비게이션 흐름도

```mermaid
flowchart TD
    START([앱 진입]) --> MAIN[마켓 목록 /]

    MAIN -->|카테고리 탭 / 정렬 / 검색| MAIN
    MAIN -->|마켓 카드 클릭| DETAIL[마켓 상세 /market/:id]
    MAIN -->|내 베팅 탭| MYBETS_GUARD{지갑 연결?}
    MAIN -->|프로필 탭| PROFILE_GUARD{지갑 연결?}
    MAIN -->|히스토리 탭| HISTORY[히스토리 /history]
    MAIN -->|리더보드 탭| LEADERBOARD[리더보드 /leaderboard]

    %% 지갑 가드
    MYBETS_GUARD -->|미연결| CONNECT_WALLET[지갑 연결 요청 모달]
    MYBETS_GUARD -->|연결됨| MYBETS[내 베팅 /my-bets]
    PROFILE_GUARD -->|미연결| CONNECT_WALLET
    PROFILE_GUARD -->|연결됨| PROFILE[프로필 /profile]
    CONNECT_WALLET -->|연결 완료| MYBETS
    CONNECT_WALLET -->|취소| MAIN

    %% 마켓 상세 플로우
    DETAIL -->|Yes / No 버튼 클릭| BET_GUARD{지갑 연결?}
    BET_GUARD -->|미연결| CONNECT_WALLET2[지갑 연결 요청 모달]
    BET_GUARD -->|연결됨| BET_PANEL[베팅 패널 슬라이드 오픈]
    CONNECT_WALLET2 -->|연결 완료| BET_PANEL
    BET_PANEL -->|금액 입력 + 확인| BET_MODAL[베팅 확인 모달 F-20]
    BET_MODAL -->|서명 & 베팅| METAMASK[MetaMask 트랜잭션 서명]
    METAMASK -->|tx 성공| BET_SUCCESS[성공 토스트 + 마켓 상세 갱신]
    METAMASK -->|tx 실패 / 거부| BET_ERROR[에러 메시지 표시]
    BET_SUCCESS --> DETAIL
    BET_MODAL -->|취소| BET_PANEL

    %% Resolved / Voided 상태
    DETAIL -->|마켓 Resolved| CLAIM_AREA[클레임 버튼 표시 F-21]
    DETAIL -->|마켓 Voided| REFUND_AREA[환불 버튼 표시 F-21]
    CLAIM_AREA -->|클레임 클릭| CLAIM_TX[claimWinnings 트랜잭션]
    REFUND_AREA -->|환불 클릭| REFUND_TX[claimRefund 트랜잭션]

    %% 내 베팅 플로우
    MYBETS -->|클레임 가능 항목| CLAIM_TX
    MYBETS -->|환불 가능 항목| REFUND_TX
    MYBETS -->|마켓 행 클릭| DETAIL

    %% 프로필 플로우
    PROFILE -->|참여 이력 항목 클릭| DETAIL

    %% 히스토리 플로우
    HISTORY -->|마켓 카드 클릭| DETAIL

    %% 관리자 플로우
    MAIN -->|관리자 메뉴 노출 (owner 감지)| ADMIN_GUARD{owner 주소 일치?}
    ADMIN_GUARD -->|불일치| MAIN
    ADMIN_GUARD -->|일치| ADMIN[관리자 패널 /admin]
    ADMIN -->|마켓 생성 버튼| ADMIN_CREATE[마켓 생성 /admin/create]
    ADMIN -->|마켓 행 > 결과 확정| ADMIN_RESOLVE[결과 확정 /admin/resolve/:id]
    ADMIN -->|설정 버튼| ADMIN_SETTINGS[설정 관리 /admin/settings]
    ADMIN_CREATE -->|createMarket tx 성공| ADMIN
    ADMIN_RESOLVE -->|resolveMarket tx 성공| ADMIN
    ADMIN_SETTINGS -->|저장 / 수수료 인출 tx 성공| ADMIN_SETTINGS
```

---

## 4. 네비게이션 구조

### 4.1 헤더 (전체 화면 공통)

```
[ MetaPool 로고 ]   [ Crypto | Sports | Weather | Politics | Entertainment | Other ]   [ 언어 EN▾ ]   [ 지갑 연결 / 0x1234…abcd  ▾ ]
```

| 영역 | 내용 | 구현 기능 |
|------|------|----------|
| 로고 | 클릭 시 `/` 이동 | - |
| 카테고리 탭 | 전체 + 6개 카테고리, 마켓 목록 화면에서만 활성 필터로 동작 | F-15 |
| 언어 선택 | EN / KO / ZH / JA 드롭다운, localStorage 저장 | F-27 |
| 지갑 연결 버튼 | 미연결: "Connect Wallet", 연결됨: 축약 주소 + META 잔액 + 드롭다운(프로필/로그아웃) | F-13 |
| 관리자 배지 | 지갑 주소가 owner일 때만 "Admin" 링크 노출 → `/admin` | F-01, F-11, F-12 |

### 4.2 하단 탭바 (모바일, 375px 기준)

```
[ 마켓 ]   [ 내 베팅 ]   [ 히스토리 ]   [ 리더보드 ]   [ 프로필 ]
```

| 탭 | 경로 | 접근 제어 |
|----|------|----------|
| 마켓 | `/` | 공개 |
| 내 베팅 | `/my-bets` | 지갑 연결 필요 (미연결 시 모달) |
| 히스토리 | `/history` | 공개 |
| 리더보드 | `/leaderboard` | 공개 |
| 프로필 | `/profile` | 지갑 연결 필요 (미연결 시 모달) |

### 4.3 사이드바 / 탑 메뉴 (데스크톱, 1280px 기준)

헤더 카테고리 탭과 연동. 별도 사이드바 없이 헤더 단일 네비게이션으로 처리하며,
페이지별 로컬 탭(예: 내 베팅의 "진행중 / 완료 / 환불") 은 컴포넌트 내부에서 처리.

### 4.4 관리자 메뉴 (owner 전용)

헤더 "Admin" 링크 → `/admin` 진입 후 내부 서브 네비게이션:

```
[ 대시보드 ]   [ 마켓 생성 ]   [ 설정 관리 ]
```

결과 확정(`/admin/resolve/:id`)은 대시보드 마켓 행의 "확정" 버튼에서 이동.

---

## 5. 화면별 기능 매핑

### 마켓 목록 (`/`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-13 | 지갑 연결 | 헤더 지갑 버튼, MetaMask 연결/잔액 표시 |
| F-14 | 마켓 목록 | 활성 마켓 카드 그리드, 실시간 BetPlaced 이벤트 갱신 |
| F-15 | 카테고리 필터 | 헤더 카테고리 탭 + URL `?category=` |
| F-17 | 실시간 배당률 | 마켓 카드 내 배당률 표시 |
| F-27 | 4개 언어 지원 | 헤더 언어 선택 드롭다운 |
| F-28 | 통화 로컬라이제이션 | 마켓 카드 내 META 금액 + 법정화폐 환산 |
| F-29 | 마켓 질문 다국어 | 카드 질문 텍스트를 현재 언어에 맞게 표시 |
| F-30 | 정렬 옵션 | 마감 임박순 / 풀 규모순 / 최신순 / 인기순 드롭다운 |
| F-32 | 마켓 검색 | 검색 입력창, 프론트엔드 필터링 |

### 마켓 상세 (`/market/:id`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-16 | 마켓 상세 | 질문/카테고리/카운트다운/풀 비율 프로그레스 바/참여자 수 |
| F-17 | 실시간 배당률 | Yes/No 각 배당률, BetPlaced 이벤트 실시간 갱신 |
| F-18 | 베팅 수량 입력 | 슬라이드 패널 — 슬라이더 + 직접입력 + 퀵버튼 |
| F-19 | 예상 수익 표시 | 베팅 패널 내 실시간 예상 수익 계산 |
| F-20 | 베팅 확인 모달 | 최종 확인 + MetaMask 서명 요청 |
| F-21 | 결과 표시 | Resolved: 승리 방향 + 최종 풀 / Voided: 무효 배지 |
| F-28 | 통화 로컬라이제이션 | META 금액 + 법정화폐 환산 표시 |
| F-29 | 마켓 질문 다국어 | 상세 질문을 현재 언어로 표시 |
| F-31 | 풀 비율 차트 | BetPlaced 이벤트 로그 기반 시계열 차트 |

### 내 베팅 (`/my-bets`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-22 | 베팅 내역 조회 | 참여 마켓 목록 (Active / Closed / Resolved / Voided 탭) |
| F-23 | 정산 내역 | 클레임 완료 항목의 보상/손실/환불 금액 |
| F-07 | 보상 클레임 | Resolved 항목의 "클레임" 버튼 → claimWinnings 트랜잭션 |
| F-08 | Void 환불 | Voided 항목의 "환불" 버튼 → claimRefund 트랜잭션 |

### 프로필 (`/profile`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-24 | 참여 이력 | 전체 베팅 이력 목록 (승/패/무효 필터) |
| F-25 | 수익률 대시보드 | 총 베팅/총 수익/순이익/승률/평균 베팅/최대 단일 수익 |

### 리더보드 (`/leaderboard`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-26 | 리더보드 | 수익률·정확도 기준 상위 예측자 테이블 (이벤트 로그 집계) |

### 히스토리 (`/history`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-21 | 결과 표시 | 종료된 마켓의 최종 결과 (Resolved / Voided) 카드 목록 |
| F-29 | 마켓 질문 다국어 | 현재 언어로 질문 표시 |

### 관리자 패널 (`/admin`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-14 | 마켓 목록 (관리자 뷰) | 전체 마켓 상태 일람표 (Active / Closed / Resolved / Voided) |
| F-11 | 긴급 마켓 중단 | 마켓 행에서 Pause / Resume 버튼 |
| F-12 | 설정 관리 (수수료 인출) | 누적 수수료 인출 버튼 |

### 마켓 생성 (`/admin/create`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-01 | 마켓 생성 | 질문(4개 언어) / 카테고리 / 베팅 마감 / 결과 확정 예정 시간 입력 폼 |
| F-02 | 마켓 카테고리 | 카테고리 선택 드롭다운 |

### 결과 확정 (`/admin/resolve/:id`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-03 | 결과 확정 | Yes / No / Void 선택 + resolveMarket 트랜잭션 |
| F-04 | 마켓 무효화 | Void 선택 시 Voided 상태 전환 안내 |

### 설정 관리 (`/admin/settings`)

| 기능 ID | 기능명 | 구현 내용 |
|---------|--------|----------|
| F-12 | 설정 관리 | minBet / maxBet / 수수료율 변경 폼 + 누적 수수료 인출 버튼 |

---

## 6. 접근 제어

### 6.1 접근 레벨 정의

| 레벨 | 조건 | 해당 화면 |
|------|------|----------|
| 공개 | 없음 | `/`, `/market/:id`, `/leaderboard`, `/history` |
| 지갑 연결 필요 | MetaMask 연결 + Metadium 네트워크 | `/my-bets`, `/profile` |
| 트랜잭션 권한 | 지갑 연결 + 충분한 잔액 | 베팅, 클레임, 환불 액션 |
| owner 전용 | 지갑 연결 + `address == owner` | `/admin`, `/admin/create`, `/admin/resolve/:id`, `/admin/settings` |

### 6.2 접근 제어 처리 방식

#### 지갑 미연결 상태에서 보호 경로 진입 시

```
1. React Router의 ProtectedRoute 컴포넌트가 WalletContext.account 확인
2. 미연결 → 현재 경로를 returnUrl로 저장 후 "Connect Wallet" 모달 표시
3. 연결 완료 → returnUrl로 리다이렉트
4. 모달 닫기(취소) → 메인(/) 이동
```

#### 잘못된 네트워크 (Metadium 외 체인)

```
1. WalletContext가 chainId를 감시
2. chainId !== 11 (메인넷) && chainId !== 12 (테스트넷) 감지 시
3. 전체 화면 오버레이: "Metadium 네트워크로 전환해 주세요" + [네트워크 전환] 버튼
4. wallet_switchEthereumChain 또는 wallet_addEthereumChain 호출
```

#### 관리자 경로 (`/admin/**`) 접근 시

```
1. ProtectedRoute에서 WalletContext.account와 컨트랙트 owner() 비교
2. 불일치 → / 리다이렉트 (조용히 처리, 404 미노출)
3. 일치 → 관리자 패널 렌더링
```

#### MetaMask 미설치 시

```
1. window.ethereum 존재 여부 확인
2. 없으면 "지갑 연결" 버튼 클릭 시 MetaMask 설치 안내 모달 표시
3. "MetaMask 설치" 버튼 → https://metamask.io 새 탭 오픈
```

### 6.3 베팅·클레임 트랜잭션 단위 접근 제어

트랜잭션 버튼 자체가 지갑 상태를 반영하여 렌더링:

| 상황 | 버튼 상태 |
|------|----------|
| 지갑 미연결 | "Connect Wallet" 버튼으로 대체 |
| Metadium 네트워크 아님 | "Wrong Network" 비활성 버튼 |
| 잔액 부족 | "잔액 부족" 비활성 버튼 |
| 마켓 마감됨 | "베팅 마감" 비활성 버튼 |
| 이미 베팅함 (반대 방향) | 해당 방향 버튼 비활성 |
| 이미 클레임함 | "클레임 완료" 비활성 버튼 |
| 트랜잭션 진행 중 | 로딩 스피너 + 비활성 |

---

## 7. 모바일 vs 데스크톱 네비게이션 패턴

| 항목 | 모바일 (< 768px) | 데스크톱 (≥ 1280px) |
|------|-----------------|---------------------|
| 주 네비게이션 | 하단 탭바 (5탭) | 헤더 내 텍스트 링크 |
| 카테고리 필터 | 헤더 아래 가로 스크롤 탭 | 헤더 인라인 탭 |
| 마켓 목록 레이아웃 | 1열 카드 리스트 | 2–3열 카드 그리드 |
| 베팅 패널 | 화면 하단 시트 (bottom sheet) | 마켓 상세 우측 고정 사이드패널 |
| 베팅 확인 모달 | 풀스크린 모달 | 센터 오버레이 모달 |
| 관리자 메뉴 | 헤더 햄버거 메뉴 내 "Admin" 항목 | 헤더 오른쪽 "Admin" 링크 |
| 언어 선택 | 하단 탭바 프로필 메뉴 또는 헤더 아이콘 | 헤더 드롭다운 |
