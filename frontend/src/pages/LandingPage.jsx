/**
 * LandingPage — 랜딩 페이지 (/)
 * 히어로 + 통계 + 추천 마켓 + CTA
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMarkets } from '../hooks/useMarkets.js';
import { MarketCard } from '../components/market/MarketCard.jsx';
import { formatMeta } from '../lib/format.js';

export function LandingPage() {
  const { t } = useTranslation();
  const { markets, loading } = useMarkets();

  // 통계 계산
  const stats = useMemo(() => {
    const activeMarkets = markets.filter(m => m.statusName === 'Active');
    const totalPool = markets.reduce((sum, m) => sum + (m.yesPool ?? 0n) + (m.noPool ?? 0n), 0n);
    const totalParticipants = markets.reduce((sum, m) => sum + m.yesCount + m.noCount, 0);
    return { total: markets.length, active: activeMarkets.length, totalPool, totalParticipants };
  }, [markets]);

  // 추천 마켓: 풀 큰 순 상위 3개
  const featured = useMemo(() => {
    return [...markets]
      .filter(m => m.statusName === 'Active')
      .sort((a, b) => {
        const poolA = (a.yesPool ?? 0n) + (a.noPool ?? 0n);
        const poolB = (b.yesPool ?? 0n) + (b.noPool ?? 0n);
        if (poolB > poolA) return 1;
        if (poolB < poolA) return -1;
        return b.yesCount + b.noCount - (a.yesCount + a.noCount);
      })
      .slice(0, 3);
  }, [markets]);

  return (
    <main className="pb-20 md:pb-0">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(94,106,210,0.06)] to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 lg:px-6 pt-20 pb-16 text-center relative">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-text-primary tracking-[-0.035em] leading-[1.05] whitespace-pre-line">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/markets"
              className="
                inline-flex items-center gap-2
                bg-brand-primary hover:bg-brand-primary-hover
                text-white font-medium text-sm
                px-6 py-3 rounded-md
                transition-colors duration-150
              "
            >
              {t('landing.exploreMarkets')}
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-4xl mx-auto px-4 lg:px-6 pb-16">
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-brand-primary" strokeWidth={1.5} />}
            value={loading ? '--' : String(stats.active)}
            label={t('landing.statMarkets')}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-yes" strokeWidth={1.5} />}
            value={loading ? '--' : formatMeta(stats.totalPool)}
            unit="META"
            label={t('landing.statPool')}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-text-secondary" strokeWidth={1.5} />}
            value={loading ? '--' : String(stats.totalParticipants)}
            label={t('landing.statParticipants')}
          />
        </div>
      </section>

      {/* ── Featured Markets ── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-6 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary tracking-[-0.02em]">
              {t('landing.featuredTitle')}
            </h2>
            <Link
              to="/markets"
              className="text-sm text-brand-primary hover:text-brand-primary-hover transition-colors flex items-center gap-1"
            >
              {t('landing.viewAll')}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(market => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom CTA ── */}
      <section className="max-w-4xl mx-auto px-4 lg:px-6 pb-20">
        <div className="
          border border-border-default rounded-2xl
          bg-bg-surface p-10 text-center
        ">
          <h2 className="text-2xl font-semibold text-text-primary tracking-[-0.02em]">
            {t('landing.ctaTitle')}
          </h2>
          <p className="mt-2 text-text-secondary text-sm max-w-md mx-auto">
            {t('landing.ctaSubtitle')}
          </p>
          <Link
            to="/markets"
            className="
              inline-flex items-center gap-2 mt-6
              bg-brand-primary hover:bg-brand-primary-hover
              text-white font-medium text-sm
              px-6 py-3 rounded-md
              transition-colors duration-150
            "
          >
            {t('landing.startPredicting')}
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon, value, unit, label }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-xl p-5 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-semibold text-text-primary tabular-nums">
        {value}
        {unit && <span className="text-sm font-normal text-text-muted ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}
