/**
 * CategoryTag — 카테고리 배지
 * design-system.md §7.5 기준
 */
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../../lib/constants.js';

const CATEGORY_STYLES = {
  0: 'bg-brand-primary-muted text-brand-primary',
  1: 'bg-[rgba(14,165,233,0.1)] text-[#0ea5e9]',
  2: 'bg-[rgba(245,158,11,0.1)] text-warning',
  3: 'bg-[rgba(139,92,246,0.1)] text-brand-secondary',
  4: 'bg-[rgba(236,72,153,0.1)] text-[#ec4899]',
  5: 'bg-border-default text-text-muted',
};

export function CategoryTag({ categoryId, className = '' }) {
  const { t } = useTranslation();
  const category = CATEGORIES.find(c => c.id === categoryId);
  const label = category ? t(category.labelKey) : t('categories.other');
  const styleClass = CATEGORY_STYLES[categoryId] ?? CATEGORY_STYLES[5];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styleClass} ${className}`}
    >
      {label}
    </span>
  );
}
