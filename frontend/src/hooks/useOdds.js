/**
 * useOdds — 마켓 배당률 조회 + 실시간 갱신 (F-17)
 * getOdds(marketId) 호출 + BetPlaced 이벤트 시 재조회
 * 배당률은 basis points (10000 = 1.00x)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getReadContract } from '../lib/contract.js';

/**
 * @param {number|string} marketId
 * @param {bigint|null} yesPool  — 풀 변경 감지용 (변경 시 재조회 트리거)
 * @param {bigint|null} noPool
 */
export function useOdds(marketId, yesPool, noPool) {
  const [yesOdds, setYesOdds] = useState(null);   // bigint (basis points)
  const [noOdds, setNoOdds] = useState(null);
  const [isFirstBetter, setIsFirstBetter] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const prevYesOddsRef = useRef(null);

  const fetchOdds = useCallback(async () => {
    if (!marketId) return;

    try {
      const contract = getReadContract();
      const [yes, no] = await contract.getOdds(marketId);

      const totalPool = (yesPool ?? 0n) + (noPool ?? 0n);
      setIsFirstBetter(totalPool === 0n);

      // 이전 값과 비교하여 flash 트리거
      if (prevYesOddsRef.current !== null && prevYesOddsRef.current !== yes) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 400);
      }

      prevYesOddsRef.current = yes;
      setYesOdds(yes);
      setNoOdds(no);
    } catch {
      // 풀이 비어있을 때 배당률 조회 실패 가능 — isFirstBetter로 처리
      const totalPool = (yesPool ?? 0n) + (noPool ?? 0n);
      setIsFirstBetter(totalPool === 0n);
    }
  }, [marketId, yesPool, noPool]);

  // 풀 변경 시마다 재조회
  useEffect(() => {
    fetchOdds();
  }, [fetchOdds]);

  return { yesOdds, noOdds, isFirstBetter, flashing };
}
