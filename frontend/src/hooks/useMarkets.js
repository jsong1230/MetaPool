/**
 * useMarkets — 마켓 목록 조회 + 실시간 이벤트 리스닝
 * F-14: marketCount → 순차 getMarket(i), BetPlaced/MarketCreated 이벤트 구독
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getReadContract } from '../lib/contract.js';
import { MARKET_STATUS, POLL_INTERVAL_MARKETS } from '../lib/constants.js';

export function useMarkets() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const contractRef = useRef(null);
  const pollRef = useRef(null);

  // 단일 마켓 데이터 정규화
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
      yesPool: rawMarket.yesPool, // bigint
      noPool: rawMarket.noPool,   // bigint
      yesCount: Number(rawMarket.yesCount),
      noCount: Number(rawMarket.noCount),
      createdAt: Number(rawMarket.createdAt),
      resolvedAt: Number(rawMarket.resolvedAt),
      creator: rawMarket.creator,
      disputeDeadline: Number(rawMarket.disputeDeadline),
      disputeCount: Number(rawMarket.disputeCount),
      underReview: rawMarket.underReview,
    };
  }, []);

  // 마켓 목록 전체 로드
  const loadMarkets = useCallback(async () => {
    try {
      let contract;
      try {
        contract = getReadContract();
        contractRef.current = contract;
      } catch (contractErr) {
        // CONTRACT_ADDRESS 미설정 시 빈 목록으로 처리
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

      // 1부터 total까지 순차 로드 (컨트랙트 ID는 1 시작)
      const promises = [];
      for (let i = 1; i <= total; i++) {
        promises.push(contract.getMarket(i));
      }

      const rawMarkets = await Promise.all(promises);
      const normalized = rawMarkets.map(normalizeMarket);

      // Active 마켓만 표시 (status === 0)
      const activeMarkets = normalized.filter(m => m.status === 0);
      setMarkets(activeMarkets);
      setError(null);
    } catch (err) {
      setError('마켓 목록을 불러오는 데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [normalizeMarket]);

  // 특정 마켓의 풀 업데이트 (BetPlaced 이벤트 수신 시)
  const updateMarketPool = useCallback((marketIdBn, newYesPool, newNoPool) => {
    const marketId = Number(marketIdBn);
    setMarkets(prev =>
      prev.map(m =>
        m.id === marketId
          ? { ...m, yesPool: newYesPool, noPool: newNoPool }
          : m
      )
    );
  }, []);

  // 새 마켓 추가 (MarketCreated 이벤트 수신 시)
  const addMarket = useCallback(async (marketIdBn) => {
    const contract = contractRef.current;
    if (!contract) return;
    try {
      const raw = await contract.getMarket(marketIdBn);
      const market = normalizeMarket(raw);
      if (market.status === 0) {
        setMarkets(prev => {
          const exists = prev.some(m => m.id === market.id);
          if (exists) return prev;
          return [...prev, market];
        });
      }
    } catch {
      // 새 마켓 추가 실패는 무시 (폴링으로 갱신됨)
    }
  }, [normalizeMarket]);

  // 이벤트 리스닝 설정
  useEffect(() => {
    let contract;

    const setupListeners = async () => {
      await loadMarkets();

      try {
        contract = getReadContract();
        contractRef.current = contract;
      } catch {
        // CONTRACT_ADDRESS 미설정 시 이벤트 리스닝 불가
        return;
      }

      // BetPlaced: 풀/배당률 실시간 갱신
      const onBetPlaced = (marketId, _bettor, _isYes, _amount, newYesPool, newNoPool) => {
        updateMarketPool(marketId, newYesPool, newNoPool);
      };

      // MarketCreated: 새 마켓 목록 추가
      const onMarketCreated = (marketId) => {
        addMarket(marketId);
      };

      contract.on('BetPlaced', onBetPlaced);
      contract.on('MarketCreated', onMarketCreated);

      // 이벤트가 지원되지 않는 RPC의 경우 폴링으로 대체
      pollRef.current = setInterval(loadMarkets, POLL_INTERVAL_MARKETS);

      return () => {
        try {
          contract.off('BetPlaced', onBetPlaced);
          contract.off('MarketCreated', onMarketCreated);
        } catch {
          // 리스너 제거 실패 무시
        }
        if (pollRef.current) clearInterval(pollRef.current);
      };
    };

    const cleanup = setupListeners();

    return () => {
      cleanup.then(fn => fn && fn());
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // 마운트 시 1회 설정

  const refetch = useCallback(() => {
    setLoading(true);
    loadMarkets();
  }, [loadMarkets]);

  return { markets, loading, error, refetch };
}
