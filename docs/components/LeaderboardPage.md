# LeaderboardPage

## 개요

`/leaderboard` 경로에 렌더링되는 리더보드 페이지. F-26 온체인 이벤트 집계 기반 상위 예측자 랭킹.

## 파일 위치

`frontend/src/pages/LeaderboardPage.jsx`

## 의존 훅

| 훅 | 역할 |
|----|------|
| `useLeaderboard` | BetPlaced + WinningsClaimed 이벤트 집계 |
| `useWallet` | 현재 사용자 하이라이트 |

## useLeaderboard 데이터 흐름

```
BetPlaced 이벤트 (queryFilter)
  → 주소별 totalWagered, totalBets, marketIds 집계

WinningsClaimed 이벤트 (queryFilter)
  → 주소별 totalWinnings, wins 집계

→ netProfit = totalWinnings - totalWagered
→ winRate = wins / totalBets * 100
→ netProfit 기준 내림차순 정렬 → 상위 50명
```

## 탭

| 탭 | 정렬 기준 |
|----|-----------|
| 수익률 기준 | netProfit 내림차순 |
| 정확도 기준 | winRate 내림차순, 동률 → totalBets 내림차순 |

## 테이블 컬럼

| 컬럼 | 데이터 |
|------|--------|
| 순위 | 1-3위 메달 이모지, 나머지 숫자 |
| 주소 | shortenAddress (0x1234...abcd) |
| 승률 | % + 프로그레스 바 (데스크톱만) |
| 순이익 | META, 양수 text-yes / 음수 text-no |
| 마켓 수 | 참여 마켓 고유 수 (데스크톱만) |

## 현재 사용자 강조

`account.toLowerCase() === user.address.toLowerCase()` 조건으로 행 강조 + "나" 배지 표시.

## 공개 접근

지갑 연결 없이 접근 가능 (읽기 전용).
