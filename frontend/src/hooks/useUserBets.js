/**
 * useUserBets — 사용자 베팅 내역 조회 (F-22, F-23)
 * BetPlaced 이벤트 로그 기반으로 참여 마켓 목록 조회
 * 각 마켓의 상태, 베팅 방향, 클레임 여부 포함
 */
import { useState, useEffect, useCallback } from 'react';
import { getReadContract } from '../lib/contract.js';
import { MARKET_STATUS, MARKET_OUTCOME } from '../lib/constants.js';

/**
 * 사용자 베팅 아이템 정규화
 */
function normalizeBetItem(market, bet, winnings) {
  const status = Number(market.status);
  const outcome = Number(market.outcome);
  const isYes = bet.isYes;
  const claimed = bet.claimed;

  // 클레임 가능 여부 판단
  let claimable = false;
  let claimType = null; // 'winnings' | 'refund' | null

  if (status === 2) {
    // Resolved
    const winSide = outcome === 1; // true = Yes 승리
    if (isYes === winSide && !claimed) {
      claimable = true;
      claimType = 'winnings';
    }
  } else if (status === 3) {
    // Voided
    if (!claimed) {
      claimable = true;
      claimType = 'refund';
    }
  }

  // 결과 판정
  let result = 'pending'; // pending | win | loss | void | claimed
  if (status === 2) {
    const winSide = outcome === 1;
    if (claimed) {
      result = 'claimed';
    } else if (isYes === winSide) {
      result = 'win';
    } else {
      result = 'loss';
    }
  } else if (status === 3) {
    result = claimed ? 'claimed' : 'void';
  }

  return {
    marketId: Number(market.id),
    question: market.question,
    questionKo: market.questionKo,
    category: Number(market.category),
    bettingDeadline: Number(market.bettingDeadline),
    status,
    statusName: MARKET_STATUS[status] || 'Unknown',
    outcome,
    outcomeName: MARKET_OUTCOME[outcome] || 'Undecided',
    yesPool: market.yesPool,
    noPool: market.noPool,
    betAmount: bet.amount,        // bigint
    isYes,
    claimed,
    claimable,
    claimType,
    result,
    winnings: winnings || 0n,     // bigint (예상 수령액)
  };
}

/**
 * @param {string|null} account — 조회할 지갑 주소
 */
export function useUserBets(account) {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserBets = useCallback(async () => {
    if (!account) {
      setBets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let contract;
      try {
        contract = getReadContract();
      } catch {
        setLoading(false);
        setBets([]);
        return;
      }

      // 마켓 전체 개수 조회
      const countBn = await contract.marketCount();
      const total = Number(countBn);

      if (total === 0) {
        setBets([]);
        setLoading(false);
        return;
      }

      // 모든 마켓에 대해 사용자 베팅 정보 조회
      const marketIds = Array.from({ length: total }, (_, i) => i + 1);

      const results = await Promise.allSettled(
        marketIds.map(async (id) => {
          const [market, betRaw] = await Promise.all([
            contract.getMarket(id),
            contract.getUserBet(id, account),
          ]);

          // 베팅 금액이 0이면 참여하지 않은 마켓
          if (betRaw.amount === 0n) return null;

          // Resolved 마켓이면 예상 수령액도 조회
          let winnings = 0n;
          if (Number(market.status) === 2) {
            try {
              winnings = await contract.calculateWinnings(id, account);
            } catch {
              winnings = 0n;
            }
          }

          return normalizeBetItem(market, betRaw, winnings);
        })
      );

      const items = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      // 최신 마켓이 먼저 오도록 역순 정렬
      items.sort((a, b) => b.marketId - a.marketId);

      setBets(items);
    } catch (err) {
      setError('베팅 내역을 불러오는 데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchUserBets();
  }, [fetchUserBets]);

  return { bets, loading, error, refetch: fetchUserBets };
}
