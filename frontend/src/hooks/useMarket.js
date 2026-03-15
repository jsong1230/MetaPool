/**
 * useMarket — 단일 마켓 조회 + 실시간 이벤트 리스닝 (F-16)
 * BetPlaced / MarketResolved 이벤트 구독하여 실시간 갱신
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getReadContract } from '../lib/contract.js';
import { MARKET_STATUS, MARKET_OUTCOME, POLL_INTERVAL_MARKETS } from '../lib/constants.js';

/**
 * 컨트랙트 raw 마켓 데이터 정규화
 */
function normalizeMarket(raw) {
  return {
    id: Number(raw.id),
    question: raw.question,
    questionKo: raw.questionKo,
    questionZh: raw.questionZh,
    questionJa: raw.questionJa,
    category: Number(raw.category),
    bettingDeadline: Number(raw.bettingDeadline),
    resolutionDeadline: Number(raw.resolutionDeadline),
    status: Number(raw.status),
    statusName: MARKET_STATUS[Number(raw.status)] || 'Unknown',
    outcome: Number(raw.outcome),
    outcomeName: MARKET_OUTCOME[Number(raw.outcome)] || 'Undecided',
    yesPool: raw.yesPool,   // bigint
    noPool: raw.noPool,     // bigint
    yesCount: Number(raw.yesCount),
    noCount: Number(raw.noCount),
    createdAt: Number(raw.createdAt),
    resolvedAt: Number(raw.resolvedAt),
    creator: raw.creator,
    disputeDeadline: Number(raw.disputeDeadline),
    disputeCount: Number(raw.disputeCount),
    underReview: raw.underReview,
  };
}

/**
 * @param {number|string} marketId
 */
export function useMarket(marketId) {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const contractRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMarket = useCallback(async () => {
    if (!marketId) return;

    try {
      let contract;
      try {
        contract = getReadContract();
        contractRef.current = contract;
      } catch {
        setLoading(false);
        return;
      }

      const raw = await contract.getMarket(marketId);
      setMarket(normalizeMarket(raw));
      setError(null);
    } catch (err) {
      setError('마켓 정보를 불러오는 데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    if (!marketId) return;

    setLoading(true);

    let contract;

    const setupListeners = async () => {
      await fetchMarket();

      try {
        contract = getReadContract();
        contractRef.current = contract;
      } catch {
        return;
      }

      // BetPlaced 이벤트: 해당 마켓의 풀/카운트 갱신
      const onBetPlaced = (mId, bettor, isYes, amount, newYesPool, newNoPool) => {
        if (Number(mId) !== Number(marketId)) return;
        setMarket(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            yesPool: newYesPool,
            noPool: newNoPool,
            yesCount: isYes ? prev.yesCount + 1 : prev.yesCount,
            noCount: !isYes ? prev.noCount + 1 : prev.noCount,
          };
        });
      };

      // MarketResolved 이벤트: 마켓 상태/결과 갱신
      const onMarketResolved = (mId) => {
        if (Number(mId) !== Number(marketId)) return;
        fetchMarket();
      };

      contract.on('BetPlaced', onBetPlaced);
      contract.on('MarketResolved', onMarketResolved);

      // 폴링 백업
      pollRef.current = setInterval(fetchMarket, POLL_INTERVAL_MARKETS);

      return () => {
        try {
          contract.off('BetPlaced', onBetPlaced);
          contract.off('MarketResolved', onMarketResolved);
        } catch {
          // 제거 실패 무시
        }
        if (pollRef.current) clearInterval(pollRef.current);
      };
    };

    const cleanup = setupListeners();

    return () => {
      cleanup.then(fn => fn && fn());
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [marketId, fetchMarket]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchMarket();
  }, [fetchMarket]);

  return { market, loading, error, refetch };
}
