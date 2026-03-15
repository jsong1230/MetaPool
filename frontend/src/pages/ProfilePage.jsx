/**
 * ProfilePage — 참여 이력 + 수익률 대시보드 (/profile)
 * F-24: 참여 이력, F-25: 수익률 대시보드
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../hooks/useWallet.js';
import { useProfile } from '../hooks/useProfile.js';
import { CategoryTag } from '../components/common/CategoryTag.jsx';
import { formatMeta } from '../lib/format.js';
import { getLocalizedQuestion } from '../lib/format.js';

const HISTORY_FILTERS = ['all', 'win', 'loss', 'void'];

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { account, isConnected, connectWallet } = useWallet();
  const { stats, bets, loading, error, refetch } = useProfile(account);
  const [historyFilter, setHistoryFilter] = useState('all');

  // 지갑 미연결
  if (!isConnected) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20">
        <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em] mb-6">
          {t('profile.title')}
        </h1>
        <div className="bg-bg-surface border border-border-default rounded-lg p-12 flex flex-col items-center gap-4">
          <Wallet className="w-10 h-10 text-text-muted" strokeWidth={1.5} />
          <p className="text-text-secondary font-medium">{t('profile.connectPrompt')}</p>
          <button
            onClick={connectWallet}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors duration-150"
          >
            {t('wallet.connect')}
          </button>
        </div>
      </main>
    );
  }

  // 히스토리 필터링
  const filteredBets = bets.filter(bet => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'win') return bet.result === 'win' || (bet.result === 'claimed' && bet.claimType === 'winnings');
    if (historyFilter === 'loss') return bet.result === 'loss';
    if (historyFilter === 'void') return bet.result === 'void' || (bet.result === 'claimed' && bet.claimType === 'refund');
    return true;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em]">
          {t('profile.title')}
        </h1>
        <p className="text-text-secondary text-sm mt-1">{t('profile.subtitle')}</p>
      </div>

      {/* 로딩 */}
      {loading && <ProfileSkeleton />}

      {/* 에러 */}
      {!loading && error && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-8 text-center">
          <p className="text-danger mb-2">{error}</p>
          <button onClick={refetch} className="text-sm text-brand-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* F-25 수익률 대시보드 — 요약 카운터 */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <SummaryBadge
              value={stats.wins}
              label={t('profile.stats.wins')}
              color="yes"
            />
            <SummaryBadge
              value={stats.losses}
              label={t('profile.stats.losses')}
              color="no"
            />
            <SummaryBadge
              value={stats.voids}
              label={t('profile.stats.voids')}
              color="void"
            />
          </div>

          {/* F-25 통계 카드 그리드 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            <StatsCard
              label={t('profile.stats.totalBets')}
              value={String(stats.totalBets)}
              unit=""
            />
            <StatsCard
              label={t('profile.stats.winRate')}
              value={`${stats.winRate}`}
              unit="%"
              highlight={stats.winRate >= 50 ? 'yes' : 'no'}
            />
            <StatsCard
              label={t('profile.stats.totalWagered')}
              value={formatMeta(stats.totalWagered)}
              unit="META"
            />
            <StatsCard
              label={t('profile.stats.totalWinnings')}
              value={formatMeta(stats.totalWinnings)}
              unit="META"
            />
            <StatsCard
              label={t('profile.stats.netProfit')}
              value={formatMeta(stats.netProfit < 0n ? -stats.netProfit : stats.netProfit)}
              unit="META"
              prefix={stats.netProfit < 0n ? '-' : stats.netProfit > 0n ? '+' : ''}
              highlight={stats.netProfit > 0n ? 'yes' : stats.netProfit < 0n ? 'no' : undefined}
            />
            <StatsCard
              label={t('profile.stats.avgBet')}
              value={formatMeta(stats.avgBet)}
              unit="META"
            />
            <StatsCard
              label={t('profile.stats.maxWin')}
              value={formatMeta(stats.maxSingleWin)}
              unit="META"
              highlight={stats.maxSingleWin > 0n ? 'accent' : undefined}
              className="lg:col-span-1"
            />
          </div>

          {/* F-24 참여 이력 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {t('profile.history.title')}
              </h2>
              {/* 필터 탭 */}
              <div className="flex items-center gap-1">
                {HISTORY_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`
                      px-2.5 py-1 rounded-sm text-xs font-medium
                      transition-colors duration-100
                      ${historyFilter === f
                        ? 'bg-brand-primary-muted text-brand-primary'
                        : 'text-text-muted hover:text-text-secondary'
                      }
                    `}
                  >
                    {t(`profile.history.filters.${f}`)}
                  </button>
                ))}
              </div>
            </div>

            {filteredBets.length === 0 ? (
              <div className="bg-bg-surface border border-border-default rounded-lg p-12 text-center">
                <BarChart2 className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1} />
                <p className="text-text-secondary">{t('profile.history.empty')}</p>
                <Link to="/" className="text-sm text-brand-primary hover:underline mt-2 inline-block">
                  {t('myBets.goToMarkets')}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBets.map(bet => (
                  <HistoryItem
                    key={bet.marketId}
                    bet={bet}
                    language={i18n.language}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

/**
 * 승/패/무효 요약 배지
 */
function SummaryBadge({ value, label, color }) {
  const colorMap = {
    yes:  { val: 'text-yes',  bg: 'bg-yes-muted',  border: 'border-yes' },
    no:   { val: 'text-no',   bg: 'bg-no-muted',   border: 'border-no' },
    void: { val: 'text-void', bg: 'bg-[rgba(100,116,139,0.1)]', border: 'border-[rgba(100,116,139,0.2)]' },
  };
  const { val, bg, border } = colorMap[color] || colorMap.void;

  return (
    <div className={`${bg} border ${border} rounded-lg p-3 text-center`}>
      <p className={`text-2xl font-bold tabular-nums ${val}`}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

/**
 * 통계 카드
 */
function StatsCard({ label, value, unit, highlight, prefix = '', className = '' }) {
  const highlightMap = {
    yes:    'text-yes',
    no:     'text-no',
    accent: 'text-brand-accent',
  };
  const valClass = highlight ? highlightMap[highlight] : 'text-text-primary';

  return (
    <div className={`bg-bg-surface border border-border-default rounded-lg p-4 ${className}`}>
      <p className="text-xs text-text-secondary mb-2">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${valClass}`}>
        {prefix}{value}
        {unit && <span className="text-sm text-text-muted font-normal ml-1">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * 참여 이력 항목
 */
function HistoryItem({ bet, language }) {
  const question = getLocalizedQuestion(bet, language);

  const resultConfig = {
    win:     { label: 'WIN',     cls: 'bg-yes-muted text-yes' },
    loss:    { label: 'LOSS',    cls: 'bg-no-muted text-no' },
    void:    { label: 'VOID',    cls: 'bg-[rgba(100,116,139,0.1)] text-void' },
    claimed: { label: 'CLAIMED', cls: 'bg-brand-primary-muted text-brand-primary' },
    pending: { label: 'PENDING', cls: 'bg-[rgba(99,102,241,0.1)] text-brand-primary' },
  };
  const result = resultConfig[bet.result] || resultConfig.pending;

  return (
    <div className="
      bg-bg-surface border border-border-default rounded-lg p-3
      flex items-center gap-3
      hover:border-border-strong transition-colors duration-150
    ">
      {/* 결과 배지 */}
      <span className={`shrink-0 px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide ${result.cls}`}>
        {result.label}
      </span>

      {/* 질문 */}
      <Link
        to={`/market/${bet.marketId}`}
        className="flex-1 text-sm text-text-primary hover:text-brand-primary transition-colors duration-150 line-clamp-1"
      >
        {question}
      </Link>

      {/* 방향 */}
      <span className={`shrink-0 text-xs font-bold tracking-[0.08em] ${bet.isYes ? 'text-yes' : 'text-no'}`}>
        {bet.isYes ? 'YES' : 'NO'}
      </span>

      {/* 금액 */}
      <span className="shrink-0 text-xs tabular-nums text-text-secondary">
        {formatMeta(bet.betAmount)}
      </span>

      {/* 카테고리 (데스크톱만) */}
      <span className="hidden md:block shrink-0">
        <CategoryTag categoryId={bet.category} />
      </span>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 요약 배지 */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-bg-surface rounded-lg" />
        ))}
      </div>
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-20 bg-bg-surface rounded-lg" />
        ))}
      </div>
      {/* 히스토리 */}
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-bg-surface rounded-lg" />
        ))}
      </div>
    </div>
  );
}
