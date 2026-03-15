/**
 * LeaderboardPage — 수익률/정확도 기준 상위 예측자 랭킹 (/leaderboard)
 * F-26: 이벤트 로그 기반 온체인 데이터 집계
 */
import { useState } from 'react';
import { TrendingUp, Trophy, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../hooks/useWallet.js';
import { useLeaderboard } from '../hooks/useLeaderboard.js';
import { formatMeta } from '../lib/format.js';

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { account } = useWallet();
  const { rankings, loading, error } = useLeaderboard();
  const [activeTab, setActiveTab] = useState('profit');

  // 탭에 따른 정렬
  const sorted = [...rankings].sort((a, b) => {
    if (activeTab === 'profit') {
      // 순이익 내림차순
      if (b.netProfit > a.netProfit) return 1;
      if (b.netProfit < a.netProfit) return -1;
      return 0;
    } else {
      // 승률 내림차순, 동률이면 총 베팅 수 기준
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalBets - a.totalBets;
    }
  });

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em]">
          {t('leaderboard.title')}
        </h1>
        <p className="text-text-secondary text-sm mt-1">{t('leaderboard.subtitle')}</p>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 mb-5 border-b border-border-default">
        {['profit', 'winrate'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2.5 text-sm font-medium
              border-b-2 -mb-px transition-colors duration-150
              ${activeTab === tab
                ? 'text-brand-primary border-brand-primary'
                : 'text-text-muted border-transparent hover:text-text-secondary'
              }
            `}
          >
            {t(`leaderboard.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-10 bg-bg-surface rounded mb-3" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-bg-surface rounded-lg" />
          ))}
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-8 text-center">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && sorted.length === 0 && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-12 text-center">
          <Trophy className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-text-secondary">{t('leaderboard.empty')}</p>
        </div>
      )}

      {/* 랭킹 테이블 */}
      {!loading && !error && sorted.length > 0 && (
        <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="
            grid grid-cols-[40px_1fr_80px_100px_60px]
            px-4 py-2.5
            border-b border-border-subtle
            text-xs font-medium text-text-muted uppercase tracking-wide
          ">
            <span>{t('leaderboard.rank')}</span>
            <span>{t('leaderboard.address')}</span>
            <span className="text-right hidden sm:block">{t('leaderboard.winRate')}</span>
            <span className="text-right">{t('leaderboard.totalProfit')}</span>
            <span className="text-right hidden md:block">{t('leaderboard.markets')}</span>
          </div>

          {/* 랭킹 행 */}
          <div className="divide-y divide-border-subtle">
            {sorted.map((user, idx) => {
              const rank = idx + 1;
              const isMe = account && user.address.toLowerCase() === account.toLowerCase();
              const isPositive = user.netProfit >= 0n;

              return (
                <div
                  key={user.address}
                  className={`
                    grid grid-cols-[40px_1fr_80px_100px_60px]
                    px-4 py-3 items-center
                    transition-colors duration-100
                    ${isMe
                      ? 'bg-brand-primary-muted border-l-2 border-brand-primary'
                      : 'hover:bg-bg-elevated'
                    }
                  `}
                >
                  {/* 순위 */}
                  <div className="flex items-center">
                    {rank <= 3 ? (
                      <RankMedal rank={rank} />
                    ) : (
                      <span className="text-sm font-bold text-text-muted tabular-nums">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* 주소 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-mono text-text-primary truncate">
                      {user.shortAddress}
                    </span>
                    {isMe && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-sm text-xs font-bold bg-brand-primary-muted text-brand-primary">
                        {t('leaderboard.you')}
                      </span>
                    )}
                  </div>

                  {/* 승률 */}
                  <div className="text-right hidden sm:block">
                    <WinRateBar winRate={user.winRate} />
                  </div>

                  {/* 순이익 */}
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-yes' : 'text-no'}`}>
                      {isPositive ? '+' : '-'}{formatMeta(isPositive ? user.netProfit : -user.netProfit)}
                    </span>
                    <p className="text-xs text-text-muted">META</p>
                  </div>

                  {/* 마켓 수 */}
                  <div className="text-right hidden md:block">
                    <span className="text-sm text-text-secondary tabular-nums">
                      {user.marketCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * 상위 3위 메달
 */
function RankMedal({ rank }) {
  const medals = {
    1: { emoji: '🥇', cls: 'text-[#f59e0b]' },
    2: { emoji: '🥈', cls: 'text-[#94a3b8]' },
    3: { emoji: '🥉', cls: 'text-[#b45309]' },
  };
  const { emoji, cls } = medals[rank] || {};
  return <span className={`text-base ${cls}`}>{emoji}</span>;
}

/**
 * 승률 시각 바
 */
function WinRateBar({ winRate }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs font-semibold tabular-nums text-text-primary">{winRate}%</span>
      <div className="w-16 h-1.5 bg-bg-input rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-primary rounded-full transition-all duration-500"
          style={{ width: `${winRate}%` }}
        />
      </div>
    </div>
  );
}
