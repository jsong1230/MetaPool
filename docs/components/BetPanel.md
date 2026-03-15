# BetPanel 컴포넌트

## 경로
`frontend/src/components/betting/BetPanel.jsx`

## 개요
F-18(베팅 수량 입력), F-19(예상 수익 표시) 구현.
사용자가 베팅 금액을 설정하는 패널. 모바일에서는 하단 bottom sheet, 데스크톱에서는 overlay 패널로 렌더링.

## Props

| Prop | 타입 | 설명 |
|------|------|------|
| `isOpen` | `boolean` | 패널 표시 여부 |
| `selectedSide` | `'yes' \| 'no' \| null` | 선택 방향 |
| `amountMeta` | `number` | 현재 베팅 금액 (META 정수) |
| `amountWei` | `bigint` | 베팅 금액 wei 변환값 |
| `isOverBalance` | `boolean` | 잔액 초과 여부 |
| `isAmountValid` | `boolean` | 금액 유효성 |
| `potentialWinnings` | `{ winnings: bigint, profit: bigint, multiplier: string } \| null` | 예상 수익 |
| `yesOdds` | `bigint \| null` | YES 배당률 (basis points) |
| `noOdds` | `bigint \| null` | NO 배당률 |
| `balance` | `bigint \| null` | 지갑 잔액 |
| `txState` | `string` | 트랜잭션 상태 |
| `txError` | `string \| null` | 에러 메시지 |
| `minBet` | `number` | 최소 베팅 META |
| `maxBet` | `number` | 최대 베팅 META |
| `market` | `object` | 마켓 데이터 |
| `onClose` | `() => void` | 패널 닫기 |
| `onAmountChange` | `(value: number) => void` | 금액 변경 |
| `onQuickAmount` | `(value: number) => void` | 퀵 버튼 선택 |
| `onConfirm` | `() => void` | 확인 버튼 (모달 열기) |

## 주요 기능
- 슬라이더로 100~100,000 META 범위 설정
- 퀵 버튼: 100 / 500 / 1K / 5K / 10K META
- 직접 입력 필드
- 잔액 초과 시 경고 표시
- 현재 배당률 + 예상 수익 실시간 표시
- 모바일: 오버레이 + `animate-slide-up` 애니메이션, 배경 클릭 닫기
- ESC 키로 닫기, body scroll lock

## 연관 훅
- `useBetting` — 금액 상태, 트랜잭션 처리
- `useOdds` — 배당률 조회
