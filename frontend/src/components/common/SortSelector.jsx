/**
 * SortSelector — 마켓 정렬 드롭다운 (F-30)
 * 마감 임박순 / 풀 규모순 / 최신순 / 인기순
 */
import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SORT_OPTIONS = [
  { id: 'deadline', labelKey: 'markets.sortOptions.deadline' },
  { id: 'pool',     labelKey: 'markets.sortOptions.pool' },
  { id: 'recent',   labelKey: 'markets.sortOptions.recent' },
  { id: 'popular',  labelKey: 'markets.sortOptions.popular' },
];

/**
 * @param {string} value — 현재 정렬 기준 id
 * @param {function} onChange — (sortId: string) => void
 */
export function SortSelector({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t('markets.sortLabel')}
        aria-expanded={open}
        className="
          flex items-center gap-1.5
          px-3 py-2 rounded-md
          bg-bg-surface border border-border-default
          hover:border-border-strong
          text-text-secondary hover:text-text-primary
          text-sm font-medium
          transition-colors duration-150
        "
      >
        <ArrowUpDown className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
        <span className="hidden sm:inline">{t('markets.sortLabel')}: </span>
        <span>{t(current.labelKey)}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-1 z-40
          bg-bg-elevated border border-border-default rounded-lg
          shadow-elevation-2 py-1 min-w-[160px]
          animate-fade-scale
        ">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`
                w-full text-left px-3 py-2 text-sm
                transition-colors duration-100
                ${opt.id === value
                  ? 'text-brand-primary bg-brand-primary-muted font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                }
              `}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
