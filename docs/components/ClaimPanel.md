# ClaimPanel 컴포넌트

## 경로
`frontend/src/components/claim/ClaimPanel.jsx`

## 개요
F-21(결과 표시) 구현.
Resolved/Voided 마켓에서 결과 시각화 + 클레임/환불 버튼 표시.

## Props

| Prop | 타입 | 설명 |
|------|------|------|
| `market` | `object` | 마켓 데이터 (status, outcome, yesPool, noPool 포함) |
| `account` | `string \| null` | 사용자 지갑 주소 |
| `txState` | `string` | 트랜잭션 상태 |
| `txHash` | `string \| null` | 트랜잭션 해시 |
| `txError` | `string \| null` | 에러 메시지 |
| `onClaimWinnings` | `() => void` | 보상 클레임 실행 |
| `onClaimRefund` | `() => void` | 환불 실행 |

## 상태별 동작

| 마켓 상태 | 표시 내용 |
|-----------|----------|
| Resolved (Yes 승) | YES 풀 강조 (그린 테두리), YES 클레임 버튼 |
| Resolved (No 승) | NO 풀 강조 (레드 테두리), YES 베터에게 버튼 숨김 |
| Voided | "무효 처리됨" 배지, 환불 버튼 (모든 베터) |
| 이미 claimed | "이미 클레임 완료" 표시, 버튼 숨김 |

## 내부 데이터 조회
컴포넌트 내부에서 `getUserBet`, `calculateWinnings`를 직접 호출하여 사용자별 베팅/수령액 표시.

## 연관 훅
- `useClaim` — 트랜잭션 처리
