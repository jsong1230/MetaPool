/**
 * CategoryTag — 카테고리 배지
 * design-system.md §7.5 기준
 */
import { CATEGORIES } from '../../lib/constants.js';

// 카테고리별 Tailwind 클래스 (CSS 변수 기반 클래스)
const CATEGORY_STYLES = {
  0: 'bg-brand-primary-muted text-brand-primary',    // Crypto — 인디고
  1: 'bg-[rgba(14,165,233,0.1)] text-[#0ea5e9]',     // Sports — 스카이
  2: 'bg-[rgba(245,158,11,0.1)] text-warning',        // Weather — 옐로우
  3: 'bg-[rgba(139,92,246,0.1)] text-brand-secondary', // Politics — 퍼플
  4: 'bg-[rgba(236,72,153,0.1)] text-[#ec4899]',     // Entertainment — 핑크
  5: 'bg-border-default text-text-muted',             // Other — 그레이
};

/**
 * @param {{ categoryId: number, className?: string }} props
 */
export function CategoryTag({ categoryId, className = '' }) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  const label = category ? category.name : 'Unknown';
  const styleClass = CATEGORY_STYLES[categoryId] ?? CATEGORY_STYLES[5];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${styleClass} ${className}`}
    >
      {label}
    </span>
  );
}
