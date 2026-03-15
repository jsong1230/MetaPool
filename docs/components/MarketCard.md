# MarketCard

## 개요

개별 마켓 카드 컴포넌트. F-14 인수조건의 카드 표시 요소를 구현한다.

**파일 위치:** `frontend/src/components/market/MarketCard.jsx`

---

## Props

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `market` | `object` | 필수 | useMarkets가 반환하는 정규화된 마켓 객체 |

### market 객체 구조

```js
{
  id: number,
  question: string,        // 영어 질문
  questionKo: string,      // 한국어 질문
  questionZh: string,      // 중국어 질문
  questionJa: string,      // 일본어 질문
  category: number,        // 0-5 (MarketCategory enum)
  bettingDeadline: number, // Unix timestamp (초)
  status: number,          // 0=Active, 1=Closed ...
  yesPool: bigint,         // wei 단위
  noPool: bigint,          // wei 단위
  yesCount: number,
  noCount: number,
}
```

---

## 표시 요소

1. **CategoryTag** — 카테고리 배지 (카테고리별 색상)
2. **Countdown** — 베팅 마감 카운트다운
3. **질문 텍스트** — 최대 2줄, ellipsis 처리
4. **PoolBar** — Yes/No 비율 프로그레스 바
5. **메타 3컬럼** — 총 풀 / 참여자 수 / YES 배당률
6. **YES/NO 버튼** — 클릭 시 `/market/:id?bet=yes|no`로 이동

---

## 배당률 갱신

- 마운트 시 `getOdds(marketId)` 호출
- `yesPool` / `noPool` props 변경 시 재조회 + `animate-value-flash` 적용

---

## 사용 예시

```jsx
import { MarketCard } from './components/market/MarketCard.jsx';

<MarketCard market={marketData} />
```

---

## 접근성

- `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Space 지원
- `aria-label` 포함
- YES/NO 버튼 각각 `aria-label` 제공
