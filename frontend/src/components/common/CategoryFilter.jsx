/**
 * CategoryFilter — 카테고리 필터 탭 (F-15)
 * 전체 + 6개 카테고리 탭, 선택 시 해당 카테고리 마켓만 표시
 * design-system.md §7.5 CategoryTag 스타일 기준
 */
import { CATEGORIES } from '../../lib/constants.js';

// 전체 탭 포함 필터 항목
const ALL_FILTER = { id: -1, name: 'All', label: '전체' };
const FILTER_ITEMS = [ALL_FILTER, ...CATEGORIES];

// 카테고리별 활성 색상 클래스
const ACTIVE_STYLES = {
  '-1': 'bg-brand-primary text-white border-brand-primary',
  '0':  'bg-brand-primary-muted text-brand-primary border-brand-primary',
  '1':  'bg-[rgba(14,165,233,0.15)] text-[#0ea5e9] border-[#0ea5e9]',
  '2':  'bg-[rgba(245,158,11,0.15)] text-warning border-warning',
  '3':  'bg-[rgba(139,92,246,0.15)] text-brand-secondary border-brand-secondary',
  '4':  'bg-[rgba(236,72,153,0.15)] text-[#ec4899] border-[#ec4899]',
  '5':  'bg-border-default text-text-muted border-border-strong',
};

const INACTIVE_STYLE =
  'bg-transparent text-text-muted border-border-default hover:border-border-strong hover:text-text-secondary';

/**
 * @param {{
 *   selectedCategory: number,          // -1 = 전체, 0~5 = 카테고리 ID
 *   onChange: (categoryId: number) => void,
 *   className?: string
 * }} props
 */
export function CategoryFilter({ selectedCategory, onChange, className = '' }) {
  return (
    <div
      className={`
        flex items-center gap-1.5
        overflow-x-auto scrollbar-hide
        pb-0.5
        ${className}
      `}
      role="tablist"
      aria-label="카테고리 필터"
    >
      {FILTER_ITEMS.map(item => {
        const isActive = selectedCategory === item.id;
        const activeStyle = ACTIVE_STYLES[String(item.id)] ?? INACTIVE_STYLE;

        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`
              shrink-0
              px-3 py-1.5
              rounded-sm
              text-sm font-medium
              border
              transition-colors duration-150
              whitespace-nowrap
              ${isActive ? activeStyle : INACTIVE_STYLE}
            `}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
