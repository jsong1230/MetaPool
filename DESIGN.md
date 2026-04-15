# MetaPool Design System — Inspired by Linear

## 1. Visual Theme

Dark-mode-native design where content emerges from near-black. Extreme precision, achromatic palette with a single indigo-violet accent. Depth through luminance stacking, not shadows.

**Key Characteristics:**
- Near-black canvas (`#08090a`) — darkness as the native medium
- Inter font with OpenType features `"cv01", "ss03"`
- Brand Indigo (`#5e6ad2` / `#7170ff`) as the only chromatic color
- Semi-transparent white borders (`#23252a` / `#34343a`)
- Near-transparent button backgrounds
- Luminance stacking for depth (darker = deeper)

## 2. Color Palette

### Background (Luminance Stacking)
| Token | Value | Use |
|-------|-------|-----|
| `bg-primary` | `#08090a` | App canvas |
| `bg-secondary` | `#0f1011` | Panels, header |
| `bg-surface` | `#191a1b` | Cards |
| `bg-elevated` | `#28282c` | Modals, dropdowns |

### Text (Cool Gray Hierarchy)
| Token | Value | Use |
|-------|-------|-----|
| `text-primary` | `#f7f8f8` | Headings, main text |
| `text-secondary` | `#8a8f98` | Body, descriptions |
| `text-muted` | `#62666d` | Placeholders, metadata |

### Brand
| Token | Value | Use |
|-------|-------|-----|
| `brand-primary` | `#5e6ad2` | CTA, brand elements |
| `brand-secondary` | `#7170ff` | Links, active states |
| `brand-primary-hover` | `#828fff` | Hover |

### Semantic
| Token | Value |
|-------|-------|
| `yes` | `#10b981` |
| `no` | `#ef4444` |

### Border
| Token | Value |
|-------|-------|
| `border-default` | `#23252a` |
| `border-subtle` | `#18191a` |
| `border-strong` | `#34343a` |
| `border-brand` | `#5e6ad2` |

## 3. Typography

- **Font**: Inter (Google Fonts, weight 300-700)
- **OpenType**: `font-feature-settings: "cv01", "ss03"` globally
- **Korean**: Noto Sans KR fallback
- **Mono**: IBM Plex Mono

## 4. Depth & Elevation

Luminance stacking — no traditional shadows on dark surfaces.

| Level | Treatment |
|-------|-----------|
| Level 0 | `#08090a` bg, no shadow |
| Level 1 | `#0f1011` bg, `border-default` |
| Level 2 | `#191a1b` bg, `border-default` |
| Level 3 | `#28282c` bg, multi-layer shadow stack |

## 5. Buttons

- **YES**: `rgba(16,185,129,0.15)` bg + `#10b981` text + border
- **NO**: `rgba(239,68,68,0.15)` bg + `#ef4444` text + border
- **Brand CTA**: `#5e6ad2` bg, white text, `rounded-md`
- **Ghost**: `rgba(255,255,255,0.02)` bg, `border-default`

## 6. Reference
- [Linear Design System](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app)
- [Design Catalog](https://cp-khs.github.io/awesome-design-md-catalog/catalog.html)
