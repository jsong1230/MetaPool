/**
 * usePoolHistory — BetPlaced 이벤트 로그로 시간대별 풀 변화 계산 (F-31)
 * 외부 라이브러리 없이 SVG 차트용 데이터 생성
 */
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getReadContract } from '../lib/contract.js';

/**
 * @param {number|null} marketId
 * @returns {{ points: Array<{time, yesPercent, noPercent}>, loading, error }}
 */
export function usePoolHistory(marketId) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!marketId) return;

    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const contract = getReadContract();

        // BetPlaced 이벤트 필터: marketId 기준
        const filter = contract.filters.BetPlaced(marketId);
        const events = await contract.queryFilter(filter, 0, 'latest');

        if (cancelled) return;

        if (events.length === 0) {
          setPoints([]);
          setLoading(false);
          return;
        }

        // 이벤트를 시간순으로 정렬 (blockNumber asc)
        const sorted = [...events].sort((a, b) => a.blockNumber - b.blockNumber);

        // 누적 풀 계산
        let cumYes = 0n;
        let cumNo = 0n;

        const result = sorted.map(ev => {
          const { isYes, amount } = ev.args;
          if (isYes) {
            cumYes += amount;
          } else {
            cumNo += amount;
          }

          const totalMeta = Number(ethers.formatEther(cumYes + cumNo));
          const yesMeta = Number(ethers.formatEther(cumYes));
          const yesPercent = totalMeta > 0 ? Math.round((yesMeta / totalMeta) * 100) : 50;

          return {
            blockNumber: ev.blockNumber,
            time: ev.blockNumber, // 블록 번호를 x축으로 활용
            yesPercent,
            noPercent: 100 - yesPercent,
          };
        });

        if (!cancelled) {
          setPoints(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => { cancelled = true; };
  }, [marketId]);

  return { points, loading, error };
}
