/**
 * HomePage — 마켓 목록 페이지 (/)
 * F-14: 활성 마켓 카드 그리드
 * F-15: 카테고리 필터
 * F-30: 정렬 옵션 (마감 임박순/풀 규모순/최신순/인기순)
 * F-32: 마켓 검색 (프론트엔드 필터링)
 */
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ethers } from 'ethers';
import { useMarkets } from '../hooks/useMarkets.js';
import { MarketList } from '../components/market/MarketList.jsx';
import { CategoryFilter } from '../components/common/CategoryFilter.jsx';
import { SortSelector } from '../components/common/SortSelector.jsx';
import { getLocalizedQuestion } from '../lib/format.js';

/**
 * 마켓 목록 정렬
 * @param {Array} markets
 * @param {string} sortBy — 'deadline' | 'pool' | 'recent' | 'popular'
 * @returns {Array}
 */
function sortMarkets(markets, sortBy) {
  const list = [...markets];
  switch (sortBy) {
    case 'deadline':
      // 마감 임박순: 마감 시간 오름차순 (작을수록 임박)
      return list.sort((a, b) => a.bettingDeadline - b.bettingDeadline);
    case 'pool':
      // 풀 규모순: 총 풀 내림차순
      return list.sort((a, b) => {
        const poolA = (a.yesPool || 0n) + (a.noPool || 0n);
        const poolB = (b.yesPool || 0n) + (b.noPool || 0n);
        if (poolB > poolA) return 1;
        if (poolB < poolA) return -1;
        return 0;
      });
    case 'recent':
      // 최신순: 생성 시간 내림차순
      return list.sort((a, b) => b.createdAt - a.createdAt);
    case 'popular':
      // 인기순: 참여자 수(yesCount + noCount) 내림차순
      return list.sort((a, b) => (b.yesCount + b.noCount) - (a.yesCount + a.noCount));
    default:
      return list;
  }
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { markets, loading, error, refetch } = useMarkets();

  // URL 쿼리에서 카테고리 복원 (기본값: -1 = 전체)
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort');

  const [selectedCategory, setSelectedCategory] = useState(
    categoryParam !== null ? parseInt(categoryParam) : -1
  );
  const [sortBy, setSortBy] = useState(sortParam || 'deadline');
  const [searchQuery, setSearchQuery] = useState('');

  // 카테고리 필터 변경 핸들러 (URL 동기화)
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    const params = {};
    if (categoryId !== -1) params.category = String(categoryId);
    if (sortBy !== 'deadline') params.sort = sortBy;
    setSearchParams(params);
  };

  // 정렬 변경 핸들러 (URL 동기화)
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    const params = {};
    if (selectedCategory !== -1) params.category = String(selectedCategory);
    if (newSort !== 'deadline') params.sort = newSort;
    setSearchParams(params);
  };

  // 카테고리 필터 + 검색 + 정렬 적용
  const processedMarkets = useMemo(() => {
    let result = markets;

    // 카테고리 필터
    if (selectedCategory !== -1) {
      result = result.filter(m => m.category === selectedCategory);
    }

    // 검색 필터 (현재 언어 질문 기준)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(m => {
        const localizedQ = getLocalizedQuestion(m, i18n.language).toLowerCase();
        const defaultQ = (m.question || '').toLowerCase();
        return localizedQ.includes(query) || defaultQ.includes(query);
      });
    }

    // 정렬
    return sortMarkets(result, sortBy);
  }, [markets, selectedCategory, searchQuery, sortBy, i18n.language]);

  const hasSearch = searchQuery.trim().length > 0;
  const noResults = !loading && !error && processedMarkets.length === 0;

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20 md:pb-6">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em]">
          {t('markets.title')}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {t('markets.subtitle')}
        </p>
      </div>

      {/* 카테고리 필터 (F-15) */}
      <div className="mb-4">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onChange={handleCategoryChange}
        />
      </div>

      {/* 검색 + 정렬 툴바 (F-30, F-32) */}
      <div className="flex items-center gap-2 mb-4">
        {/* 검색 입력 (F-32) */}
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('markets.searchPlaceholder')}
            className="
              w-full pl-9 pr-8 py-2 rounded-md
              bg-bg-input border border-border-default
              text-text-primary text-sm
              placeholder:text-text-muted
              focus:border-border-brand focus:outline-none focus:shadow-brand
              transition-all duration-150
            "
          />
          {hasSearch && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              aria-label="검색 초기화"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* 정렬 드롭다운 (F-30) */}
        <SortSelector value={sortBy} onChange={handleSortChange} />
      </div>

      {/* 결과 안내 */}
      {!loading && !error && (selectedCategory !== -1 || hasSearch) && (
        <p className="text-xs text-text-muted mb-3">
          {hasSearch
            ? processedMarkets.length === 0
              ? t('markets.noSearchResults', { query: searchQuery })
              : t('markets.count', { count: processedMarkets.length })
            : t('markets.count', { count: processedMarkets.length })
          }
        </p>
      )}

      {/* 검색 결과 없음 안내 */}
      {noResults && hasSearch && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-8 text-center">
          <p className="text-text-secondary text-sm">
            {t('markets.noSearchResults', { query: searchQuery })}
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-brand-primary hover:underline mt-2"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* 마켓 목록 (검색 결과 없음이 아닐 때) */}
      {!(noResults && hasSearch) && (
        <MarketList
          markets={processedMarkets}
          loading={loading}
          error={error}
          onRetry={refetch}
        />
      )}
    </main>
  );
}
