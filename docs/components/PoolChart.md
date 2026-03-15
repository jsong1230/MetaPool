# PoolChart

## 개요

MarketDetailPage에서 BetPlaced 이벤트 로그 기반으로 Yes/No 풀 비율 변화를 시계열 SVG 차트로 시각화한다. F-31 구현.

## 파일 위치

`frontend/src/components/market/PoolChart.jsx`

## Props

| Prop | 타입 | 설명 |
|------|------|------|
| `marketId` | `number` | 마켓 ID (컨트랙트 인덱스) |

## 의존 훅

`usePoolHistory(marketId)` — BetPlaced 이벤트를 queryFilter로 조회, 누적 풀 변화 계산.

## usePoolHistory 반환값

```js
{
  points: Array<{
    blockNumber: number,
    time: number,        // x축 (blockNumber)
    yesPercent: number,  // 0-100
    noPercent: number,   // 0-100
  }>,
  loading: boolean,
  error: string | null,
}
```

## SVG 차트 스펙

- viewBox: `0 0 480 120`
- 패딩: x=8, y=12
- x축: 블록 번호 기반 균등 분포
- y축: 0% (하단) ~ 100% (상단)
- 50% 기준선: 점선 (`strokeDasharray="4,3"`)
- Yes 라인: `#10b981` (2px)
- No 라인: `#ef4444` (1.5px)
- 영역 채우기: 각 색상 그라디언트 (opacity 0.25 → 0.03)
- 마지막 Yes 포인트에 원형 도트

## 상태 처리

| 상태 | 표시 |
|------|------|
| 로딩 중 | Skeleton (animate-pulse) |
| 에러 / 데이터 없음 | "아직 베팅 내역이 없습니다" 텍스트 |
| 포인트 < 2 | 텍스트 안내 (라인 그릴 수 없음) |
| 정상 | SVG 차트 |

## i18n

`market.poolChart`, `market.noChartData` 키 사용.
