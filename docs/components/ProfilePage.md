# ProfilePage

## 개요

`/profile` 경로에 렌더링되는 사용자 프로필 페이지. F-24 (참여 이력)와 F-25 (수익률 대시보드)를 구현한다.

## 파일 위치

`frontend/src/pages/ProfilePage.jsx`

## 의존 훅

| 훅 | 역할 |
|----|------|
| `useProfile` | `useUserBets` 래퍼 — 베팅 목록 + 통계 집계 |
| `useWallet` | 지갑 연결 상태 확인 |

## useProfile 반환값

```js
{
  stats: {
    totalBets: number,         // 총 베팅 횟수
    wins: number,              // 승리 수
    losses: number,            // 패배 수
    voids: number,             // 무효 수
    totalWagered: bigint,      // 총 베팅 금액 (wei)
    totalWinnings: bigint,     // 총 수령액 (wei)
    netProfit: bigint,         // 순이익 = 수령액 - 베팅액 (wei, 음수 가능)
    winRate: number,           // 승률 % (0-100)
    avgBet: bigint,            // 평균 베팅 금액 (wei)
    maxSingleWin: bigint,      // 최대 단일 수익 (wei)
  },
  bets: BetItem[],
  loading: boolean,
  error: string | null,
  refetch: () => void,
}
```

## 화면 구조

```
ProfilePage
├── 헤더 (제목 + 설명)
├── [지갑 미연결 시] ConnectPrompt
└── [연결 시]
    ├── SummaryBadges (승 / 패 / 무효 카운터)
    ├── StatsGrid (6개 통계 카드)
    │   ├── 총 베팅 횟수
    │   ├── 승률 (%)
    │   ├── 총 베팅 금액 (META)
    │   ├── 총 수익 (META)
    │   ├── 순이익 (META, 색상 표시)
    │   ├── 평균 베팅 (META)
    │   └── 최대 단일 수익 (META)
    └── HistoryList
        ├── 필터 탭 (전체/승리/패배/무효)
        └── HistoryItem 목록 (시간 역순)
```

## 접근 제어

지갑 미연결 시 ConnectPrompt 표시. 연결 시 `/profile` 정상 렌더링.

## i18n

모든 텍스트는 `t()` 함수 사용. `profile.*` 키 참조.

## 히스토리 다국어 질문

`getLocalizedQuestion(bet, i18n.language)` 로 현재 언어 질문 표시.
