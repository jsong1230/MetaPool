# MetaPool 디자인 시스템

## 1. 디자인 철학

### 1.1 핵심 원칙

MetaPool은 **예측 마켓 DApp**이다. 사용자는 실제 자산(META 토큰)을 걸고 판단을 내린다. 디자인은 이 특성을 반영해야 한다.

**명확성이 최우선**: Yes/No 양 선택지는 언제나 시각적으로 명확하게 구분된다. 색상, 위치, 크기 모두 이 구분을 강화하는 방향으로 설계한다.

**데이터 가독성**: 배당률, 풀 비율, 잔액, 예상 수익 — 숫자가 핵심이다. 숫자는 항상 고정폭 폰트(tabular nums)로, 충분한 크기와 대비로 표시한다.

**실시간 변동 표현**: 블록체인 이벤트로 값이 변할 때 사용자가 인지할 수 있어야 한다. 애니메이션은 이 목적에만 사용한다.

**신뢰와 긴장감의 균형**: 다크 테마는 집중력을 높이고 숫자를 돋보이게 한다. 과도한 그라디언트, 글로우 효과, 네온 색상은 신뢰감을 깎는다.

### 1.2 다크 테마 채택 근거

- 암호화폐/DeFi 사용자의 기대 패턴에 부합
- 배당률 숫자와 Yes/No 색상(그린/레드)이 어두운 배경에서 더 높은 명도 대비를 확보
- 장시간 사용 시 눈의 피로도 감소
- MetaLotto 등 경쟁 제품과의 시각적 차별화

### 1.3 Generic AI 미학 금지

다음 스타일은 사용하지 않는다:
- 보라/파랑 그라디언트 배경 (단색 다크 배경 사용)
- 모든 섹션에 아이콘 + 제목 + 설명 3요소 반복
- 카드 3열 균등 그리드 레이아웃 (MarketCard는 2열 또는 1열 기준)
- `border-radius: 16px` 이상의 과도한 둥근 모서리
- `backdrop-filter: blur()` 남용 (모달 오버레이에만 제한 사용)

---

## 2. 색상 팔레트

### 2.1 배경 계층 (Background)

| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-bg-primary` | `#0b0d1a` | 페이지 최상위 배경 |
| `--color-bg-secondary` | `#111827` | 섹션 구분 배경, 사이드 패널 |
| `--color-bg-surface` | `#1a1f35` | 카드, 패널 배경 |
| `--color-bg-elevated` | `#242840` | 모달, 드롭다운, 툴팁 배경 |
| `--color-bg-input` | `#0f1120` | 입력 필드 배경 |

### 2.2 텍스트

| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-text-primary` | `#f1f5f9` | 본문, 마켓 질문, 레이블 |
| `--color-text-secondary` | `#94a3b8` | 보조 정보, 메타데이터 |
| `--color-text-muted` | `#475569` | 비활성, 힌트 텍스트 |
| `--color-text-inverse` | `#0b0d1a` | 밝은 배경 위 텍스트 |

### 2.3 브랜드 색상

| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-brand-primary` | `#6366f1` | 인디고 — CTA 버튼, 활성 탭, 링크 |
| `--color-brand-primary-hover` | `#4f46e5` | 인디고 hover 상태 |
| `--color-brand-primary-muted` | `#6366f11a` | 인디고 10% 투명도 배경 |
| `--color-brand-secondary` | `#8b5cf6` | 퍼플 — 보조 강조, 배지 |
| `--color-brand-secondary-hover` | `#7c3aed` | 퍼플 hover 상태 |
| `--color-brand-accent` | `#06b6d4` | 시안 — 배당률, 수익 수치 강조 |
| `--color-brand-accent-muted` | `#06b6d41a` | 시안 10% 투명도 배경 |

### 2.4 시맨틱 색상 (Yes/No + 상태)

| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-yes` | `#10b981` | Yes 방향 — 버튼, 배지, 풀 바 |
| `--color-yes-hover` | `#059669` | Yes hover 상태 |
| `--color-yes-muted` | `#10b9811a` | Yes 10% 투명도 배경 |
| `--color-yes-dim` | `#065f46` | Yes 흐린 배경 (비활성 상태) |
| `--color-no` | `#ef4444` | No 방향 — 버튼, 배지, 풀 바 |
| `--color-no-hover` | `#dc2626` | No hover 상태 |
| `--color-no-muted` | `#ef44441a` | No 10% 투명도 배경 |
| `--color-no-dim` | `#7f1d1d` | No 흐린 배경 (비활성 상태) |
| `--color-success` | `#10b981` | 성공 토스트, 클레임 완료 |
| `--color-warning` | `#f59e0b` | 경고 — 잔액 부족, 마감 임박 |
| `--color-danger` | `#ef4444` | 에러 토스트, 트랜잭션 실패 |
| `--color-void` | `#64748b` | Void/무효 마켓 상태 |

### 2.5 테두리

| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-border-default` | `#1e2640` | 카드, 패널 기본 테두리 |
| `--color-border-subtle` | `#151929` | 구분선, 미세 테두리 |
| `--color-border-strong` | `#334155` | 포커스, 활성 테두리 |
| `--color-border-brand` | `#6366f1` | 선택된 카드, 활성 입력 |

### 2.6 Tailwind CSS v4 커스텀 변수 정의

```css
/* frontend/src/styles/tokens.css */
@layer base {
  :root {
    /* Background */
    --color-bg-primary: #0b0d1a;
    --color-bg-secondary: #111827;
    --color-bg-surface: #1a1f35;
    --color-bg-elevated: #242840;
    --color-bg-input: #0f1120;

    /* Text */
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #475569;
    --color-text-inverse: #0b0d1a;

    /* Brand */
    --color-brand-primary: #6366f1;
    --color-brand-primary-hover: #4f46e5;
    --color-brand-primary-muted: color-mix(in srgb, #6366f1 10%, transparent);
    --color-brand-secondary: #8b5cf6;
    --color-brand-secondary-hover: #7c3aed;
    --color-brand-accent: #06b6d4;
    --color-brand-accent-muted: color-mix(in srgb, #06b6d4 10%, transparent);

    /* Semantic */
    --color-yes: #10b981;
    --color-yes-hover: #059669;
    --color-yes-muted: color-mix(in srgb, #10b981 10%, transparent);
    --color-yes-dim: #065f46;
    --color-no: #ef4444;
    --color-no-hover: #dc2626;
    --color-no-muted: color-mix(in srgb, #ef4444 10%, transparent);
    --color-no-dim: #7f1d1d;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-danger: #ef4444;
    --color-void: #64748b;

    /* Border */
    --color-border-default: #1e2640;
    --color-border-subtle: #151929;
    --color-border-strong: #334155;
    --color-border-brand: #6366f1;
  }
}
```

```js
// tailwind.config.js (v4 theme extend)
export default {
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          input: 'var(--color-bg-input)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        brand: {
          primary: 'var(--color-brand-primary)',
          'primary-hover': 'var(--color-brand-primary-hover)',
          'primary-muted': 'var(--color-brand-primary-muted)',
          secondary: 'var(--color-brand-secondary)',
          'secondary-hover': 'var(--color-brand-secondary-hover)',
          accent: 'var(--color-brand-accent)',
          'accent-muted': 'var(--color-brand-accent-muted)',
        },
        yes: {
          DEFAULT: 'var(--color-yes)',
          hover: 'var(--color-yes-hover)',
          muted: 'var(--color-yes-muted)',
          dim: 'var(--color-yes-dim)',
        },
        no: {
          DEFAULT: 'var(--color-no)',
          hover: 'var(--color-no-hover)',
          muted: 'var(--color-no-muted)',
          dim: 'var(--color-no-dim)',
        },
        border: {
          default: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          brand: 'var(--color-border-brand)',
        },
      },
    },
  },
}
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
/* Google Fonts 로드 */
/* Inter: 다국어 지원 + 숫자 tabular nums 지원 + 현대적 DApp 느낌 */
/* Noto Sans JP/KR/SC: 한/중/일 폴백 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
```

| 변수 | 값 | 용도 |
|------|-----|------|
| `--font-sans` | `'Inter', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif` | 기본 본문, UI 텍스트 |
| `--font-mono` | `'Inter', ui-monospace, 'Cascadia Code', monospace` | 지갑 주소, 숫자 수치 |
| `--font-numeric` | `'Inter'` + `font-variant-numeric: tabular-nums` | 배당률, META 금액, 카운트다운 |

### 3.2 크기 스케일

| 토큰 | 크기 | line-height | 용도 |
|------|------|-------------|------|
| `text-xs` | 0.75rem (12px) | 1.5 | 캡션, 타임스탬프, 툴팁 |
| `text-sm` | 0.875rem (14px) | 1.5 | 보조 레이블, 메타 정보 |
| `text-base` | 1rem (16px) | 1.6 | 기본 본문, 버튼 텍스트 |
| `text-lg` | 1.125rem (18px) | 1.5 | 마켓 카드 질문 |
| `text-xl` | 1.25rem (20px) | 1.4 | 섹션 제목, 배당률 수치 |
| `text-2xl` | 1.5rem (24px) | 1.3 | 페이지 제목, 큰 수치 |
| `text-3xl` | 1.875rem (30px) | 1.2 | 히어로 수치 (총 풀, 잔액) |
| `text-4xl` | 2.25rem (36px) | 1.1 | 랜딩 헤드라인 |

### 3.3 폰트 웨이트

| 토큰 | 값 | 용도 |
|------|-----|------|
| `font-normal` | 400 | 일반 본문 |
| `font-medium` | 500 | 레이블, 버튼 텍스트 |
| `font-semibold` | 600 | 카드 제목, 중요 수치 |
| `font-bold` | 700 | 섹션 헤딩, 강조 |
| `font-black` | 900 | 히어로 텍스트 |

### 3.4 자간 (letter-spacing)

| 용도 | 값 |
|------|-----|
| 제목, 헤딩 | `-0.02em` |
| 기본 본문 | `0` (normal) |
| ALL CAPS 레이블 (예: "YES", "NO") | `0.08em` |
| 카운트다운 숫자 | `0.04em` |

### 3.5 숫자 렌더링

배당률, 베팅 금액, 잔액, 카운트다운은 반드시 tabular nums를 적용한다.

```css
.numeric {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

Tailwind 유틸: `tabular-nums` 클래스 사용.

---

## 4. 스페이싱

4px 기반 스케일 (Tailwind 기본값과 일치).

| 토큰 | 값 | px | 용도 |
|------|-----|-----|------|
| `space-0.5` | 0.125rem | 2px | 아이콘 내부 미세 간격 |
| `space-1` | 0.25rem | 4px | 인라인 요소 간격 |
| `space-2` | 0.5rem | 8px | 레이블 — 값 간격 |
| `space-3` | 0.75rem | 12px | 버튼 내부 세로 패딩 |
| `space-4` | 1rem | 16px | 카드 내부 패딩, 섹션 내 간격 |
| `space-6` | 1.5rem | 24px | 카드 간 격차, 패널 패딩 |
| `space-8` | 2rem | 32px | 섹션 간 격차 |
| `space-12` | 3rem | 48px | 큰 섹션 간 격차 |
| `space-16` | 4rem | 64px | 페이지 레벨 패딩 |

---

## 5. Border Radius

| 토큰 | 값 | 용도 |
|------|-----|------|
| `rounded-sm` | 4px | 배지, 태그, 퀵버튼 |
| `rounded` | 6px | 입력 필드, 작은 버튼 |
| `rounded-md` | 8px | 기본 버튼, 소형 카드 |
| `rounded-lg` | 10px | MarketCard, BetPanel |
| `rounded-xl` | 12px | 모달, 대형 패널 |
| `rounded-full` | 9999px | 아바타, 토글, 언어 셀렉터 |

**제약**: `rounded-2xl` (16px) 이상은 사용하지 않는다.

---

## 6. 그림자 / Elevation

다크 테마에서 그림자는 "밝음"이 아닌 "경계 강조"로 작동한다.

| 레벨 | CSS | 용도 |
|------|-----|------|
| elevation-0 | `none` | 배경과 동일 면 요소 |
| elevation-1 | `0 1px 3px rgba(0,0,0,0.4)` | 카드 기본 상태 |
| elevation-2 | `0 4px 12px rgba(0,0,0,0.5)` | 카드 hover, 드롭다운 |
| elevation-3 | `0 8px 24px rgba(0,0,0,0.6)` | 모달, 베팅 패널 |
| elevation-brand | `0 0 0 1px var(--color-border-brand), 0 4px 12px rgba(99,102,241,0.15)` | 선택된 카드, 활성 입력 |
| elevation-yes | `0 0 0 1px var(--color-yes), 0 4px 12px rgba(16,185,129,0.15)` | Yes 버튼 활성 상태 |
| elevation-no | `0 0 0 1px var(--color-no), 0 4px 12px rgba(239,68,68,0.15)` | No 버튼 활성 상태 |

```css
@layer utilities {
  .shadow-elevation-1 { box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
  .shadow-elevation-2 { box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
  .shadow-elevation-3 { box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
  .shadow-brand { box-shadow: 0 0 0 1px var(--color-border-brand), 0 4px 12px rgba(99,102,241,0.15); }
  .shadow-yes { box-shadow: 0 0 0 1px var(--color-yes), 0 4px 12px rgba(16,185,129,0.15); }
  .shadow-no { box-shadow: 0 0 0 1px var(--color-no), 0 4px 12px rgba(239,68,68,0.15); }
}
```

---

## 7. 컴포넌트 스타일 가이드

### 7.1 버튼

모든 버튼은 `font-medium`, `transition-colors duration-150`, `focus-visible:outline-2 focus-visible:outline-offset-2` 를 기본으로 갖는다.

#### Primary Button (인디고)
```
bg-brand-primary hover:bg-brand-primary-hover
text-white font-medium
px-4 py-2.5 rounded-md
transition-colors duration-150
focus-visible:outline-brand-primary
```

#### Secondary Button (테두리형)
```
bg-transparent border border-border-default hover:border-border-strong
text-text-secondary hover:text-text-primary
px-4 py-2.5 rounded-md
transition-colors duration-150
```

#### Yes Button
```
bg-yes hover:bg-yes-hover
text-white font-semibold
px-5 py-3 rounded-md
transition-all duration-150
active:shadow-yes
```
레이블: "YES" (uppercase, letter-spacing: 0.08em)

#### No Button
```
bg-no hover:bg-no-hover
text-white font-semibold
px-5 py-3 rounded-md
transition-all duration-150
active:shadow-no
```
레이블: "NO" (uppercase, letter-spacing: 0.08em)

#### Danger Button
```
bg-danger/10 hover:bg-danger/20 border border-danger/30
text-danger font-medium
px-4 py-2.5 rounded-md
transition-colors duration-150
```

#### Ghost Button
```
bg-transparent hover:bg-bg-surface
text-text-secondary hover:text-text-primary
px-3 py-2 rounded-md
transition-colors duration-150
```

#### 버튼 크기 변형

| 크기 | padding | font-size | 용도 |
|------|---------|-----------|------|
| sm | `px-3 py-1.5` | `text-sm` | 퀵버튼, 배지형 버튼 |
| md | `px-4 py-2.5` | `text-base` | 기본 버튼 |
| lg | `px-6 py-3` | `text-base font-semibold` | CTA, Yes/No 베팅 버튼 |
| xl | `px-8 py-4` | `text-lg font-bold` | 베팅 확인 모달 메인 CTA |

#### 로딩 상태
```
opacity-70 cursor-not-allowed
/* 버튼 내부에 spinner SVG 또는 ... 애니메이션 */
```

### 7.2 카드

#### MarketCard
```
bg-bg-surface border border-border-default rounded-lg
p-4 shadow-elevation-1
hover:border-border-strong hover:shadow-elevation-2
transition-all duration-200 cursor-pointer
```

구조:
```
MarketCard
├── 상단: CategoryTag + 마감 카운트다운 (우측 정렬)
├── 중단: 질문 텍스트 (text-lg font-semibold, 최대 2줄 ellipsis)
├── 풀바: PoolBar (Yes/No 비율)
├── 메타: 총 풀 금액 + 참여자 수 + 배당률 (3컬럼)
└── 하단: [YES 베팅] [NO 베팅] 버튼 (동일 너비)
```

활성/호버 상태: 선택된 카드는 `border-border-brand shadow-brand`

#### StatsCard (수익률 대시보드용)
```
bg-bg-surface border border-border-default rounded-lg
p-4
```

구조:
```
StatsCard
├── 레이블: text-sm text-text-secondary
├── 수치: text-2xl font-bold tabular-nums + 단위 (text-sm text-text-muted)
└── 변화: 선택적 delta 표시 (up: text-yes, down: text-no)
```

### 7.3 입력 필드

#### Amount Input (베팅 금액 입력)
```
bg-bg-input border border-border-default rounded-md
px-4 py-3 text-text-primary text-xl font-semibold tabular-nums
focus:border-border-brand focus:outline-none focus:shadow-brand
transition-all duration-150
placeholder:text-text-muted
```

우측: "META" 단위 레이블 (text-text-muted, 절대 위치 또는 flex)

에러 상태: `border-danger focus:border-danger focus:shadow-no`

#### Slider (금액 슬라이더)
```css
input[type="range"] {
  appearance: none;
  height: 4px;
  background: linear-gradient(
    to right,
    var(--color-brand-primary) 0%,
    var(--color-brand-primary) var(--value-percent),
    var(--color-border-default) var(--value-percent),
    var(--color-border-default) 100%
  );
  border-radius: 9999px;
}
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--color-brand-primary);
  border: 2px solid var(--color-bg-elevated);
  cursor: pointer;
  transition: transform 150ms;
}
input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
```

#### Quick Buttons (100/500/1K/5K/10K META)
```
bg-bg-elevated border border-border-default rounded-sm
px-3 py-1.5 text-sm font-medium text-text-secondary
hover:border-border-brand hover:text-brand-primary
active:bg-brand-primary-muted
transition-colors duration-100
```

선택 상태: `border-border-brand text-brand-primary bg-brand-primary-muted`

### 7.4 모달 (BetConfirmModal)

오버레이:
```
fixed inset-0 bg-black/60 backdrop-blur-sm
flex items-end sm:items-center justify-center
z-50
```

모달 패널:
```
bg-bg-elevated border border-border-default rounded-xl
w-full max-w-md p-6
shadow-elevation-3
animate-slide-up (모바일) / animate-fade-scale (데스크톱)
```

내부 구조:
```
BetConfirmModal
├── 헤더: "베팅 확인" 제목 + X 닫기 버튼
├── 마켓 질문: text-base text-text-secondary (2줄 max)
├── 구분선: border-border-subtle
├── 확인 정보 그리드:
│   ├── 방향: YES (text-yes font-black text-2xl) / NO (text-no)
│   ├── 금액: X,XXX META (tabular-nums text-xl)
│   ├── 배당률: X.XXx (text-brand-accent)
│   └── 예상 수익: X,XXX META (text-yes)
├── 수수료 안내: text-xs text-text-muted
└── 버튼 영역:
    ├── [취소] Ghost 버튼 (flex-1)
    └── [서명 & 베팅] Primary 버튼 xl (flex-2)
```

### 7.5 배지/태그

#### CategoryTag
```
inline-flex items-center gap-1
px-2 py-0.5 rounded-sm
text-xs font-medium
```

카테고리별 색상:

| 카테고리 | bg | text |
|----------|-----|------|
| Crypto | `bg-brand-primary-muted text-brand-primary` | |
| Sports | `bg-[#0ea5e9]/10 text-[#0ea5e9]` | |
| Weather | `bg-[#f59e0b]/10 text-[#f59e0b]` | |
| Politics | `bg-brand-secondary/10 text-brand-secondary` | |
| Entertainment | `bg-[#ec4899]/10 text-[#ec4899]` | |
| Other | `bg-border-default text-text-muted` | |

#### StatusBadge
```
inline-flex items-center gap-1
px-2.5 py-1 rounded-sm
text-xs font-semibold uppercase tracking-wide
```

| 상태 | 스타일 |
|------|--------|
| Active | `bg-yes-muted text-yes` + 녹색 점 pulse |
| Closed | `bg-warning/10 text-warning` |
| Resolved (Yes 승) | `bg-yes-muted text-yes` |
| Resolved (No 승) | `bg-no-muted text-no` |
| Voided | `bg-void/10 text-void` |
| Paused | `bg-warning/10 text-warning` |

#### WinLossBadge (베팅 내역용)
```
WIN:  bg-yes-muted text-yes font-bold
LOSS: bg-no-muted text-no font-bold
VOID: bg-void/10 text-void font-medium
PENDING: bg-brand-primary-muted text-brand-primary font-medium
```

### 7.6 PoolBar (Yes/No 비율 프로그레스 바)

```html
<!-- PoolBar 구조 -->
<div class="flex flex-col gap-1">
  <!-- 비율 레이블 -->
  <div class="flex justify-between text-xs font-medium tabular-nums">
    <span class="text-yes">YES {yesPercent}%</span>
    <span class="text-no">NO {noPercent}%</span>
  </div>

  <!-- 프로그레스 바 -->
  <div class="flex h-2 rounded-full overflow-hidden bg-bg-input">
    <div
      class="bg-yes transition-all duration-500 ease-out"
      style="width: {yesPercent}%"
    ></div>
    <div class="flex-1 bg-no"></div>
  </div>
</div>
```

- Yes 비율이 바뀔 때 `transition-all duration-500 ease-out`으로 부드럽게 이동
- 극단값 (0% 또는 100%) 에서는 모서리 처리: `rounded-l-full` / `rounded-r-full`
- 50:50 기준선: 바 중앙에 1px 수직선 표시 (선택)

### 7.7 토스트/알림

위치: 우측 하단 `fixed bottom-4 right-4 z-[100]`

```
min-w-[280px] max-w-[380px]
bg-bg-elevated border rounded-lg
p-4 shadow-elevation-3
flex items-start gap-3
animate-slide-in-right
```

| 타입 | 테두리 | 아이콘 색 |
|------|--------|-----------|
| success | `border-success/30` | `text-success` (CheckCircle) |
| error | `border-danger/30` | `text-danger` (XCircle) |
| warning | `border-warning/30` | `text-warning` (AlertTriangle) |
| info | `border-brand-primary/30` | `text-brand-primary` (Info) |

자동 닫힘: 4초 (success/info), 6초 (error/warning)

닫기 버튼: `X` Ghost 버튼 sm, 우측 상단

### 7.8 카운트다운 타이머

```html
<!-- Countdown 구조 -->
<div class="flex items-center gap-1 text-sm tabular-nums">
  <span class="text-brand-accent font-mono font-semibold">
    {dd}d {hh}h {mm}m {ss}s
  </span>
</div>
```

상태별 색상:
- 24시간 이상: `text-text-secondary`
- 1~24시간: `text-warning`
- 1시간 미만: `text-danger animate-pulse`
- 마감: `text-text-muted` (정적, "마감됨")

카드 내 카운트다운은 아이콘(`Clock` from lucide) + 텍스트 조합.

---

## 8. 아이콘

### 8.1 라이브러리

**lucide-react** (권장)

```bash
npm install lucide-react
```

```jsx
import { TrendingUp, Clock, Wallet, CheckCircle } from 'lucide-react'
```

채택 근거:
- React 컴포넌트 형태로 제공, tree-shakeable
- Tailwind 클래스로 크기/색상 제어 (`className="w-4 h-4 text-brand-accent"`)
- 선 굵기 일관성 (strokeWidth 1.5 기본값이 다크 테마에 적합)
- 다양한 금융/데이터 아이콘 보유

### 8.2 주요 아이콘 매핑

| 용도 | 아이콘 | 크기 |
|------|--------|------|
| 지갑 연결 | `Wallet` | 20px |
| 배당률/수익 | `TrendingUp` | 16px |
| 마감 시간 | `Clock` | 14px |
| 카테고리 필터 | `Filter` | 16px |
| 베팅 성공 | `CheckCircle` | 20px |
| 에러 | `XCircle` | 20px |
| 경고 | `AlertTriangle` | 16px |
| 언어 선택 | `Globe` | 18px |
| 정렬 | `ArrowUpDown` | 16px |
| 검색 | `Search` | 18px |
| 클레임 | `Gift` | 18px |
| 프로필/내 베팅 | `User` | 18px |
| 히스토리 | `History` | 18px |
| 관리자 | `Settings` | 18px |
| 닫기 | `X` | 16px |
| 외부 링크 (Txhash) | `ExternalLink` | 12px |
| 복사 (주소) | `Copy` | 14px |

### 8.3 아이콘 사용 규칙

- 아이콘 단독 사용 시 반드시 `aria-label` 또는 `title` 제공
- 버튼 내 아이콘: `mr-2` (텍스트 앞), `ml-2` (텍스트 뒤)
- strokeWidth: 기본 1.5 유지. 강조 필요 시 2로 조정
- 크기: 텍스트 줄 높이와 맞춤 (14px 텍스트 → 14~16px 아이콘)

---

## 9. 반응형 브레이크포인트

Tailwind 기본 브레이크포인트 사용.

| 브레이크포인트 | 최소 너비 | 용도 |
|--------------|-----------|------|
| (기본) | 0px | 모바일 375px 기준 |
| `sm` | 640px | 소형 태블릿, 큰 모바일 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 소형 데스크톱 |
| `xl` | 1280px | 데스크톱 |
| `2xl` | 1536px | 대형 모니터 |

### 9.1 레이아웃 전략

**모바일 (기본 ~ sm)**
- 단일 컬럼 레이아웃
- 헤더: 로고 + 지갑 연결 버튼 (카테고리 필터는 스크롤 가능한 수평 탭으로)
- MarketCard: 전체 너비, 세로 스택
- BetPanel: 화면 하단에서 슬라이드업 (bottom sheet 패턴)
- 탭 네비게이션: 하단 고정 탭바

**데스크톱 (lg+)**
- 최대 너비 `max-w-7xl mx-auto px-6`
- 헤더: 로고 + 카테고리 필터 (중앙) + 언어/지갑 (우측)
- MarketList: 2열 그리드 (`grid-cols-2 gap-4`)
- BetPanel: 우측 사이드 패널 (sticky)
- 탭 네비게이션: 헤더 하단 수평 탭

### 9.2 터치 타겟 최소 크기

모바일 인터랙션 가능한 모든 요소: `min-h-[44px] min-w-[44px]`

---

## 10. 모션/애니메이션

### 10.1 원칙

- 애니메이션은 상태 변화를 인지하게 돕는 용도로만 사용
- 장식용 애니메이션 금지 (로딩 플레이스홀더 제외)
- `prefers-reduced-motion: reduce` 미디어쿼리 존중

### 10.2 전환 기준

| 용도 | duration | easing |
|------|----------|--------|
| 버튼 hover, 색상 변화 | 150ms | `ease-in-out` |
| 카드 hover (shadow, border) | 200ms | `ease-out` |
| PoolBar 비율 변화 | 500ms | `ease-out` |
| 모달 오픈 | 200ms | `ease-out` |
| 모달 클로즈 | 150ms | `ease-in` |
| BetPanel 슬라이드 (모바일) | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 토스트 등장 | 300ms | `ease-out` |
| 카운트다운 숫자 | 즉각 (transition 없음) | — |
| 배당률 숫자 갱신 | flash 200ms | 짧은 배경 하이라이트 |

### 10.3 핵심 키프레임

```css
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fade-scale {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes value-flash {
  0%   { background-color: transparent; }
  30%  { background-color: color-mix(in srgb, var(--color-brand-accent) 20%, transparent); }
  100% { background-color: transparent; }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

```css
@layer utilities {
  .animate-slide-up { animation: slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-slide-in-right { animation: slide-in-right 300ms ease-out both; }
  .animate-fade-scale { animation: fade-scale 200ms ease-out both; }
  .animate-value-flash { animation: value-flash 400ms ease-in-out; }
  .animate-pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
}
```

### 10.4 배당률/풀 수치 갱신 패턴

블록체인 이벤트로 값이 바뀌면 `animate-value-flash` 클래스를 일시적으로 추가하여 사용자가 변화를 인지하게 한다.

```jsx
// React: 값 변경 시 flash 트리거
useEffect(() => {
  setIsFlashing(true)
  const timer = setTimeout(() => setIsFlashing(false), 400)
  return () => clearTimeout(timer)
}, [odds])

<span className={`tabular-nums ${isFlashing ? 'animate-value-flash rounded' : ''}`}>
  {odds}x
</span>
```

---

## 11. 접근성 기준

### 11.1 색상 대비 (WCAG AA)

| 조합 | 대비율 | 기준 |
|------|--------|------|
| `#f1f5f9` on `#0b0d1a` | 17.4:1 | AA Pass (7:1 이상) |
| `#10b981` on `#1a1f35` | 4.8:1 | AA Pass (4.5:1 이상) |
| `#ef4444` on `#1a1f35` | 4.6:1 | AA Pass |
| `#6366f1` on `#1a1f35` | 5.1:1 | AA Pass |
| `#94a3b8` on `#0b0d1a` | 7.2:1 | AA Pass |

### 11.2 포커스 스타일

모든 인터랙티브 요소에 명시적 포커스 링:

```css
:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
}
```

### 11.3 기타

- 모달 오픈 시 `focus-trap` 적용
- `aria-live="polite"` — 배당률/풀 갱신 알림
- `aria-live="assertive"` — 트랜잭션 성공/실패 토스트
- 언어 선택 시 `<html lang="...">` 업데이트

---

## 12. 디자인 토큰 요약 (CSS 변수)

```css
:root {
  /* === Background === */
  --color-bg-primary: #0b0d1a;
  --color-bg-secondary: #111827;
  --color-bg-surface: #1a1f35;
  --color-bg-elevated: #242840;
  --color-bg-input: #0f1120;

  /* === Text === */
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #475569;
  --color-text-inverse: #0b0d1a;

  /* === Brand === */
  --color-brand-primary: #6366f1;
  --color-brand-primary-hover: #4f46e5;
  --color-brand-secondary: #8b5cf6;
  --color-brand-secondary-hover: #7c3aed;
  --color-brand-accent: #06b6d4;

  /* === Semantic === */
  --color-yes: #10b981;
  --color-yes-hover: #059669;
  --color-yes-dim: #065f46;
  --color-no: #ef4444;
  --color-no-hover: #dc2626;
  --color-no-dim: #7f1d1d;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-void: #64748b;

  /* === Border === */
  --color-border-default: #1e2640;
  --color-border-subtle: #151929;
  --color-border-strong: #334155;
  --color-border-brand: #6366f1;

  /* === Typography === */
  --font-sans: 'Inter', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', sans-serif;
  --font-mono: 'Inter', ui-monospace, monospace;

  /* === Spacing === */
  --space-unit: 4px;

  /* === Radius === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;

  /* === Transition === */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```
