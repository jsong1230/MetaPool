/**
 * MarketList — 마켓 카드 그리드 (F-14)
 * 로딩, 에러, 빈 상태 처리 포함
 */
import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MarketCard } from './MarketCard.jsx';

/**
 * 로딩 스켈레톤 카드
 */
function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-16 bg-bg-elevated rounded-sm" />
        <div className="h-4 w-20 bg-bg-elevated rounded" />
      </div>
      <div className="h-5 w-full bg-bg-elevated rounded mb-1" />
      <div className="h-5 w-3/4 bg-bg-elevated rounded mb-4" />
      <div className="h-2 w-full bg-bg-elevated rounded-full mb-4" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-12 bg-bg-elevated rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-9 bg-bg-elevated rounded-md" />
        <div className="h-9 bg-bg-elevated rounded-md" />
      </div>
    </div>
  );
}

/**
 * 빈 상태 메시지
 */
function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
      <LayoutGrid className="w-12 h-12 text-text-muted" strokeWidth={1} />
      <div className="text-center">
        <p className="text-text-secondary text-lg font-medium mb-1">
          {t('markets.noActive')}
        </p>
        <p className="text-text-muted text-sm">
          {t('markets.noActiveDesc')}
        </p>
      </div>
    </div>
  );
}

/**
 * 에러 상태
 */
function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-center">
        <p className="text-danger text-lg font-medium mb-1">
          {t('markets.loadFailed')}
        </p>
        <p className="text-text-muted text-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="
              bg-brand-primary hover:bg-brand-primary-hover
              text-white px-4 py-2.5 rounded-md text-sm font-medium
              transition-colors duration-150
            "
          >
            {t('common.retry')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * @param {{ markets: object[], loading: boolean, error: string|null, onRetry?: Function }} props
 */
export function MarketList({ markets, loading, error, onRetry }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('markets.title')}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <ErrorState error={error} onRetry={onRetry} />
        )}

        {!loading && !error && markets.length === 0 && (
          <EmptyState />
        )}

        {!loading && !error && markets.map(market => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </section>
  );
}
