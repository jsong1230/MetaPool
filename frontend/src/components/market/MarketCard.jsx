/**
 * MarketCard — 개별 마켓 카드 (F-14)
 * design-system.md §7.2 MarketCard 구조 기준
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CategoryTag } from '../common/CategoryTag.jsx';
import { PoolBar } from '../common/PoolBar.jsx';
import { Countdown } from '../common/Countdown.jsx';
import { formatMeta, formatOdds, getLocalizedQuestion } from '../../lib/format.js';
import { getReadContract } from '../../lib/contract.js';

/**
 * @param {{ market: object }} props
 */
export function MarketCard({ market }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [yesOdds, setYesOdds] = useState(null);
  const [noOdds, setNoOdds] = useState(null);
  const [oddsFlashing, setOddsFlashing] = useState(false);

  const totalParticipants = market.yesCount + market.noCount;
  const totalPool = (market.yesPool ?? 0n) + (market.noPool ?? 0n);
  // F-29: 현재 언어에 맞는 질문
  const localizedQuestion = getLocalizedQuestion(market, i18n.language);

  // 배당률 조회
  useEffect(() => {
    const fetchOdds = async () => {
      try {
        const contract = getReadContract();
        const [yes, no] = await contract.getOdds(market.id);
        setYesOdds(yes);
        setNoOdds(no);
      } catch {
        // 풀이 비어있는 경우 배당률 조회 실패 가능
      }
    };
    fetchOdds();
  }, [market.id]);

  // 풀 변경 시 배당률 재조회 + flash 효과
  useEffect(() => {
    const fetchAndFlash = async () => {
      try {
        const contract = getReadContract();
        const [yes, no] = await contract.getOdds(market.id);

        const prevYes = yesOdds;
        setYesOdds(yes);
        setNoOdds(no);

        // 이전 값과 달라진 경우 flash
        if (prevYes !== null && prevYes !== yes) {
          setOddsFlashing(true);
          setTimeout(() => setOddsFlashing(false), 400);
        }
      } catch {
        // 조회 실패 무시
      }
    };
    if (yesOdds !== null) fetchAndFlash();
  }, [market.yesPool, market.noPool]);

  const handleClick = () => {
    navigate(`/market/${market.id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className="
        bg-bg-surface border border-border-default rounded-lg
        p-4 shadow-elevation-1
        hover:border-border-strong hover:shadow-elevation-2
        transition-all duration-200 cursor-pointer
        flex flex-col gap-3
      "
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`마켓: ${localizedQuestion}`}
    >
      {/* 상단: 카테고리 태그 + 카운트다운 */}
      <div className="flex items-center justify-between gap-2">
        <CategoryTag categoryId={market.category} />
        <Countdown deadline={market.bettingDeadline} showIcon />
      </div>

      {/* 마켓 질문 (F-29: 현재 언어 표시) */}
      <h3 className="
        text-lg font-semibold text-text-primary leading-snug
        overflow-hidden
        display-[-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]
        line-clamp-2
      ">
        {localizedQuestion}
      </h3>

      {/* PoolBar */}
      <PoolBar yesPool={market.yesPool} noPool={market.noPool} />

      {/* 메타 정보 3컬럼 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* 총 풀 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-muted">총 풀</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums">
            {formatMeta(totalPool)}
          </span>
          <span className="text-xs text-text-muted">META</span>
        </div>

        {/* 참여자 수 */}
        <div className="flex flex-col gap-0.5 items-center">
          <span className="text-xs text-text-muted">참여자</span>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-text-primary tabular-nums">
              {totalParticipants}
            </span>
          </div>
          <span className="text-xs text-text-muted">명</span>
        </div>

        {/* 배당률 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-muted">배당률</span>
          <div
            className={`flex items-center justify-center gap-1 ${oddsFlashing ? 'animate-value-flash rounded' : ''}`}
            aria-live="polite"
          >
            <TrendingUp className="w-3.5 h-3.5 text-brand-accent" strokeWidth={1.5} />
            {yesOdds ? (
              <span className="text-sm font-semibold text-brand-accent tabular-nums">
                {formatOdds(yesOdds)}
              </span>
            ) : (
              <span className="text-sm text-text-muted">--</span>
            )}
          </div>
          <span className="text-xs text-text-muted">YES</span>
        </div>
      </div>

      {/* 하단 Yes/No 버튼 */}
      <div
        className="grid grid-cols-2 gap-2 mt-1"
        onClick={(e) => e.stopPropagation()} // 카드 클릭과 분리
      >
        <button
          className="
            bg-yes hover:bg-yes-hover
            text-white font-semibold
            px-3 py-2 rounded-md
            text-sm tracking-[0.08em] uppercase
            transition-all duration-150
            active:shadow-yes
            min-h-[36px]
          "
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/market/${market.id}?bet=yes`);
          }}
          aria-label={`${localizedQuestion} YES에 베팅`}
        >
          YES
        </button>
        <button
          className="
            bg-no hover:bg-no-hover
            text-white font-semibold
            px-3 py-2 rounded-md
            text-sm tracking-[0.08em] uppercase
            transition-all duration-150
            active:shadow-no
            min-h-[36px]
          "
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/market/${market.id}?bet=no`);
          }}
          aria-label={`${localizedQuestion} NO에 베팅`}
        >
          NO
        </button>
      </div>
    </article>
  );
}
