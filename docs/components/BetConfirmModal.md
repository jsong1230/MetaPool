# BetConfirmModal 컴포넌트

## 경로
`frontend/src/components/betting/BetConfirmModal.jsx`

## 개요
F-20(베팅 확인 모달) 구현.
BetPanel에서 확인 버튼 클릭 시 표시. 마켓 정보, 선택 방향, 금액, 배당률, 예상 수익을 최종 확인하고 MetaMask 서명을 요청.

## Props

| Prop | 타입 | 설명 |
|------|------|------|
| `isOpen` | `boolean` | 모달 표시 여부 |
| `market` | `object` | 마켓 데이터 |
| `selectedSide` | `'yes' \| 'no'` | 베팅 방향 |
| `amountMeta` | `number` | 베팅 금액 META |
| `amountWei` | `bigint` | 베팅 금액 wei |
| `yesOdds` | `bigint \| null` | YES 배당률 |
| `noOdds` | `bigint \| null` | NO 배당률 |
| `potentialWinnings` | `object \| null` | 예상 수익 |
| `txState` | `string` | `idle \| pending \| confirming \| success \| error` |
| `txError` | `string \| null` | 에러 메시지 |
| `onConfirm` | `() => void` | "서명 & 베팅" 클릭 |
| `onClose` | `() => void` | 모달 닫기 |

## 레이아웃 구조
- 오버레이: `bg-black/60 backdrop-blur-sm`
- 모달 패널: 모바일 = 하단 `rounded-t-xl`, 데스크톱 = 센터 `max-w-md`
- 확인 정보 2×2 그리드: 방향 / 금액 / 배당률 / 예상 수령액

## 트랜잭션 상태 처리
- `pending`: "서명 대기..." 스피너
- `confirming`: "처리 중..." 스피너
- 성공 시 onSuccess 콜백 (부모 컴포넌트에서 처리)
- 에러 시 빨간 경고 박스 표시
