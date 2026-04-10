# MetaPool Design System

## 1. Visual Theme & Atmosphere

Dark trading terminal aesthetic. Deep blue-black backgrounds with violet as the primary brand color, emerald green for YES, red for NO. Designed to feel like a professional crypto platform — not a light-mode web app.

**Key Characteristics:**
- Deep dark backgrounds (`#080a12`) with subtle violet radial glow
- Violet (`#7c3aed`) as primary brand
- Emerald green (`#10b981`) for YES / Red (`#ef4444`) for NO
- Glass morphism header (`backdrop-filter: blur(16px)`)
- Gradient buttons with colored glow shadows
- IBM Plex Sans (Latin) + Noto Sans KR (Korean) font stack

## 2. Color Palette

### Background
| Token | Value | Use |
|-------|-------|-----|
| `bg-primary` | `#080a12` | App background |
| `bg-secondary` | `#0c0e1a` | Subtle sections |
| `bg-surface` | `#111425` | Cards, panels |
| `bg-elevated` | `#181c30` | Popovers, modals |
| `bg-input` | `#0f1220` | Input fields |

### Text
| Token | Value | Use |
|-------|-------|-----|
| `text-primary` | `#dde1f0` | Main text |
| `text-secondary` | `#666987` | Supporting text |
| `text-muted` | `#3e4158` | Placeholder, labels |

### Brand
| Token | Value | Use |
|-------|-------|-----|
| `brand-primary` | `#7c3aed` | CTA buttons, accents |
| `brand-primary-hover` | `#8b5cf6` | Hover state |
| `brand-secondary` | `#a78bfa` | Gradient endpoint |
| `brand-accent` | `#10b981` | Positive indicators |

### Semantic
| Token | Value | Use |
|-------|-------|-----|
| `yes` | `#10b981` | YES bet, bullish |
| `no` | `#ef4444` | NO bet, bearish |
| `warning` | `#f59e0b` | Caution states |
| `danger` | `#ef4444` | Errors, destructive |

### Border
| Token | Value | Use |
|-------|-------|-----|
| `border-default` | `#1c1f35` | Default dividers |
| `border-subtle` | `#13162a` | Hairline dividers |
| `border-strong` | `#2a2e4e` | Emphasized borders |
| `border-brand` | `#7c3aed` | Focus, hover brand border |

## 3. Typography

- **Font**: IBM Plex Sans (primary), Noto Sans KR (Korean fallback)
- **Mono**: IBM Plex Mono (numbers, addresses)
- **Tabular nums** on all financial values (`tabular-nums` / `font-numeric`)

## 4. Utility Classes

### Glass Morphism
```css
.glass {
  backdrop-filter: blur(16px) saturate(180%);
  background: rgba(8,10,18,0.82);
  border-bottom: 1px solid var(--color-border-default);
}
```
Used on: Header (sticky)

### Gradient Text
```css
.text-gradient-brand  /* violet gradient: #c4b5fd → #7c3aed */
.text-gradient-yes    /* green gradient:  #6ee7b7 → #10b981 */
.text-gradient-no     /* red gradient:    #fca5a5 → #ef4444 */
```

### Gradient Buttons
```css
.btn-yes  /* linear-gradient(160deg, #10b981, #059669) + glow shadow */
.btn-no   /* linear-gradient(160deg, #ef4444, #dc2626) + glow shadow */
```

### Shadows
```css
.shadow-elevation-1    /* 0 1px 4px rgba(0,0,0,0.4) */
.shadow-elevation-2    /* 0 4px 24px rgba(0,0,0,0.5) */
.shadow-elevation-3    /* 0 8px 40px rgba(0,0,0,0.6) */
.shadow-brand          /* violet outline + glow */
.shadow-yes            /* green outline + glow */
.shadow-no             /* red outline + glow */
.shadow-card-hover     /* violet border + 32px violet glow — card hover state */
```

## 5. Component Patterns

### Cards
- Background: `bg-bg-surface` (`#111425`)
- Default border: `border-border-default`
- Hover: `border-border-brand` + `shadow-card-hover`
- Radius: `rounded-2xl`

### Header
- `glass` class — sticky with backdrop blur
- Logo: gradient icon (`#a78bfa` → `#7c3aed`) + `text-gradient-brand` wordmark

### YES/NO Buttons (MarketCard)
- Use `.btn-yes` / `.btn-no` utility classes
- White text, gradient background, colored glow on hover
- Radius: `rounded-xl`

### Input Fields
- Background: `bg-bg-input`
- Border: `border-border-default`
- Focus: `border-border-brand`

## 6. Layout

- Max width: `max-w-7xl` (full) / `max-w-2xl` (forms, detail pages)
- Breakpoints: `sm:640` `md:768` `lg:1024` `xl:1280`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for market list
