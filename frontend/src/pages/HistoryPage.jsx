/**
 * HistoryPage — 히스토리 페이지 (/history)
 * 종료된 마켓 목록 (Resolved + Voided)
 * F-21: 결과 표시, F-29: 다국어 질문
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useMarkets } from '../hooks/useMarkets.js';
import { getReadContract } from '../lib/contract.js';
import { CategoryFilter } from '../components/common/CategoryFilter.jsx';
import { CategoryTag } from '../components/common/CategoryTag.jsx';
import { PoolBar } from '../components/common/PoolBar.jsx';
import { formatMeta, formatDate, getLocalizedQuestion, calcPoolRatio } from '../lib/format.js';
import { MARKET_STATUS, MARKET_OUTCOME } from '../lib/constants.js';
import { useTranslation } from 'react-i18next';
import { useState as useStateAll, useEffect } from 'react';

// Resolved/Voided 마켓을 모두 로드하는 전용 훅
import { useCallback, useRef } from 'react';
import { POLL_INTERVAL_MARKETS } from '../lib/constants.js';

function useHistoryMarkets() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeMarket = useCallback((rawMarket) => {
    return {
      id: Number(rawMarket.id),
      question: rawMarket.question,
      questionKo: rawMarket.questionKo,
      questionZh: rawMarket.questionZh,
      questionJa: rawMarket.questionJa,
      category: Number(rawMarket.category),
      bettingDeadline: Number(rawMarket.bettingDeadline),
      resolutionDeadline: Number(rawMarket.resolutionDeadline),
      status: Number(rawMarket.status),
      statusName: MARKET_STATUS[Number(rawMarket.status)] || 'Unknown',
      outcome: Number(rawMarket.outcome),
      yesPool: rawMarket.yesPool,
      noPool: rawMarket.noPool,
      yesCount: Number(rawMarket.yesCount),
      noCount: Number(rawMarket.noCount),
      createdAt: Number(rawMarket.createdAt),
      resolvedAt: Number(rawMarket.resolvedAt),
    };
  }, []);

  const loadMarkets = useCallback(async () => {
    try {
      let contract;
      try {
        contract = getReadContract();
      } catch {
        setMarkets([]);
        setLoading(false);
        return;
      }

      const count = await contract.marketCount();
      const total = Number(count);

      if (total === 0) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      const promises = [];
      for (let i = 1; i <= total; i++) {
        promises.push(contract.getMarket(i));
      }

      const rawMarkets = await Promise.all(promises);
      const normalized = rawMarkets.map(normalizeMarket);

      // Resolved(2) + Voided(3) 상태만 필터
      const ended = normalized.filter(m => m.status === 2 || m.status === 3);
      // 최신 확정 순 정렬
      ended.sort((a, b) => b.resolvedAt - a.resolvedAt);

      setMarkets(ended);
      setError(null);
    } catch (err) {
      setError('히스토리를 불러오는 데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [normalizeMarket]);

  useEffect(() => {
    loadMarkets();
    const poll = setInterval(loadMarkets, POLL_INTERVAL_MARKETS);
    return () => clearInterval(poll);
  }, [loadMarkets]);

  return { markets, loading, error, refetch: loadMarkets };
}

// 결과 배지
function OutcomeBadge({ outcome }) {
  if (outcome === 1) {
    return (
      <span className="
        inline-flex items-center gap-1 px-2 py-0.5 rounded-sm
        text-xs font-bold uppercase tracking-wide
        bg-yes-muted text-yes
      ">
        <CheckCircle className="w-3 h-3" strokeWidth={2} />
        YES
      </span>
    );
  }
  if (outcome === 2) {
    return (
      <span className="
        inline-flex items-center gap-1 px-2 py-0.5 rounded-sm
        text-xs font-bold uppercase tracking-wide
        bg-no-muted text-no
      ">
        <XCircle className="w-3 h-3" strokeWidth={2} />
        NO
      </span>
    );
  }
  // Void
  return (
    <span className="
      inline-flex items-center gap-1 px-2 py-0.5 rounded-sm
      text-xs font-semibold uppercase tracking-wide
      bg-[rgba(100,116,139,0.1)] text-void
    ">
      <AlertTriangle className="w-3 h-3" strokeWidth={2} />
      VOID
    </span>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { markets, loading, error, refetch } = useHistoryMarkets();
  const [selectedCategory, setSelectedCategory] = useState(-1); // -1 = 전체
  const [statusFilter, setStatusFilter] = useState('all'); // all | resolved | voided

  // 필터 적용
  const filtered = useMemo(() => {
    let result = markets;
    if (selectedCategory !== -1) {
      result = result.filter(m => m.category === selectedCategory);
    }
    if (statusFilter === 'resolved') {
      result = result.filter(m => m.status === 2);
    } else if (statusFilter === 'voided') {
      result = result.filter(m => m.status === 3);
    }
    return result;
  }, [markets, selectedCategory, statusFilter]);

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-brand-primary" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-[-0.02em]">
            히스토리
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            종료된 마켓의 결과를 확인하세요
          </p>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* 카테고리 필터 */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onChange={setSelectedCategory}
          className="flex-1"
        />

        {/* 상태 필터 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { value: 'all', label: '전체' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'voided', label: 'Voided' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`
                px-3 py-1.5 rounded-sm text-sm font-medium border
                transition-colors duration-150 whitespace-nowrap
                ${statusFilter === opt.value
                  ? 'bg-brand-primary-muted text-brand-primary border-brand-primary'
                  : 'bg-transparent text-text-muted border-border-default hover:border-border-strong hover:text-text-secondary'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" strokeWidth={1.5} />
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="
          bg-bg-surface border border-border-default rounded-lg
          p-8 text-center
        ">
          <p className="text-danger text-sm mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-md bg-bg-elevated text-text-secondary text-sm hover:text-text-primary"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && filtered.length === 0 && (
        <div className="
          bg-bg-surface border border-border-default rounded-lg
          p-10 text-center
        ">
          <History className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-text-secondary text-sm font-medium">종료된 마켓이 없습니다</p>
          <p className="text-text-muted text-xs mt-1">
            {selectedCategory !== -1 || statusFilter !== 'all'
              ? '필터 조건에 맞는 마켓이 없습니다'
              : '마켓이 종료되면 여기에 표시됩니다'
            }
          </p>
        </div>
      )}

      {/* 마켓 카드 그리드 */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="text-xs text-text-muted">
            {filtered.length}개의 종료된 마켓
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(market => (
              <HistoryCard
                key={market.id}
                market={market}
                language={i18n.language}
                onClick={() => navigate(`/market/${market.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

/**
 * 히스토리 마켓 카드
 */
function HistoryCard({ market, language, onClick }) {
  const question = getLocalizedQuestion(market, language);
  const { yesPercent, noPercent } = calcPoolRatio(market.yesPool, market.noPool);
  const totalPool = (market.yesPool || 0n) + (market.noPool || 0n);
  const isVoided = market.status === 3;

  return (
    <div
      onClick={onClick}
      className="
        bg-bg-surface border border-border-default rounded-lg
        p-4 cursor-pointer
        hover:border-border-strong hover:shadow-elevation-2
        transition-all duration-200
        flex flex-col gap-3
      "
    >
      {/* 헤더: 카테고리 + 결과 배지 */}
      <div className="flex items-center justify-between gap-2">
        <CategoryTag category={market.category} />
        <OutcomeBadge outcome={market.outcome} />
      </div>

      {/* 질문 */}
      <p className="text-sm font-semibold text-text-primary leading-relaxed line-clamp-2">
        {question}
      </p>

      {/* 풀 바 (Voided가 아닌 경우만) */}
      {!isVoided && (
        <PoolBar yesPercent={yesPercent} noPercent={noPercent} />
      )}

      {/* Voided 안내 */}
      {isVoided && (
        <div className="
          bg-[rgba(100,116,139,0.08)] border border-[rgba(100,116,139,0.2)]
          rounded-md px-3 py-2
        ">
          <p className="text-xs text-void text-center">무효 처리 — 원금 환불</p>
        </div>
      )}

      {/* 메타 정보 */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="tabular-nums">
          {formatMeta(totalPool)} META
        </span>
        <span>
          {market.resolvedAt ? formatDate(market.resolvedAt) : '—'}
        </span>
      </div>
    </div>
  );
}
