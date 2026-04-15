# MetaPool Design System — Inspired by Superhuman

## 1. Visual Theme

Premium dark UI inspired by Superhuman. Deep purple (Mysteria) backgrounds, Lavender Glow as the singular accent, minimal shadows, border-based depth. Confidence through restraint.

**Key Characteristics:**
- Mysteria Purple (`#1b1938`) base background
- Lavender Glow (`#cbb7fb`) as the sole brand accent
- Warm Cream (`#e9e5dd`) for primary CTA buttons
- Minimal shadows, border-first depth
- Only 8px (`rounded-lg`) and 16px (`rounded-2xl`) radius
- Softer semantic colors: YES `#34d399`, NO `#f87171`

## 2. Color Palette

### Background (Deep Purple Twilight)
| Token | Value | Use |
|-------|-------|-----|
| `bg-primary` | `#1b1938` | App background |
| `bg-secondary` | `#161331` | Subtle sections |
| `bg-surface` | `#231f45` | Cards, panels |
| `bg-elevated` | `#2c2750` | Modals, popovers |
| `bg-input` | `#1e1a3d` | Input fields |

### Text (White Hierarchy)
| Token | Value | Use |
|-------|-------|-----|
| `text-primary` | `#f0eef6` | Main text |
| `text-secondary` | `#8e8a9e` | Supporting text |
| `text-muted` | `#5a5670` | Placeholder, labels |

### Brand
| Token | Value | Use |
|-------|-------|-----|
| `brand-primary` | `#cbb7fb` | Lavender Glow accent |
| `brand-secondary` | `#714cb6` | Amethyst links |
| `brand-accent` | `#e9e5dd` | Warm Cream CTA |

### Semantic
| Token | Value |
|-------|-------|
| `yes` | `#34d399` (soft emerald) |
| `no` | `#f87171` (soft red) |
| `warning` | `#fbbf24` |
| `danger` | `#f87171` |

### Border
| Token | Value | Use |
|-------|-------|-----|
| `border-default` | `#2d2952` | Default dividers |
| `border-subtle` | `#242048` | Hairline |
| `border-strong` | `#3d3865` | Emphasized |
| `border-brand` | `#cbb7fb` | Focus, hover |

## 3. Depth & Elevation

Superhuman philosophy: border containment over shadows.

| Level | Treatment |
|-------|-----------|
| Level 0 | No shadow, border only (`border-default`) |
| Level 1 | `border-brand` on hover (card highlight) |
| Level 2 | `0 4px 24px rgba(0,0,0,0.3)` (modals) |
| Level 3 | `0 8px 40px rgba(0,0,0,0.4)` (elevated) |

## 4. Component Patterns

### Cards
- `bg-bg-surface`, `border-border-default`, `rounded-2xl`
- Hover: `border-border-brand` (lavender outline, no glow)

### Header
- `glass` (solid dark purple, no backdrop-blur)
- Logo: `bg-brand-primary` icon + `text-brand-primary` wordmark

### Buttons
- YES/NO: flat color (`btn-yes` / `btn-no`), `rounded-lg`, no gradients
- Primary CTA: `btn-cream` (Warm Cream `#e9e5dd`, dark text)
- Brand: `bg-brand-primary` (Lavender), dark text

### Border Radius
- `rounded-lg` (8px): buttons, inputs, small elements
- `rounded-2xl` (16px): cards, containers
- No other radii

## 5. Reference
- [Superhuman Design System](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/superhuman)
- [Design Catalog](https://cp-khs.github.io/awesome-design-md-catalog/catalog.html)
