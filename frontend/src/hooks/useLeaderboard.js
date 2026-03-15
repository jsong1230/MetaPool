/**
 * useLeaderboard — 온체인 이벤트 집계 리더보드 (F-26)
 * BetPlaced + WinningsClaimed 이벤트를 queryFilter로 수집하여 집계
 */
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getReadContract } from '../lib/contract.js';
import { shortenAddress } from '../lib/format.js';

/**
 * @returns {{ rankings, loading, error }}
 */
export function useLeaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        let contract;
        try {
          contract = getReadContract();
        } catch {
          setRankings([]);
          setLoading(false);
          return;
        }

        // BetPlaced 이벤트 전체 조회
        const betFilter = contract.filters.BetPlaced();
        const betEvents = await contract.queryFilter(betFilter, 0, 'latest');

        // WinningsClaimed 이벤트 전체 조회
        const claimFilter = contract.filters.WinningsClaimed();
        const claimEvents = await contract.queryFilter(claimFilter, 0, 'latest');

        if (cancelled) return;

        // 주소별 집계 맵
        // { address: { totalWagered, totalWinnings, wins, totalBets, marketIds: Set } }
        const userMap = new Map();

        // BetPlaced 집계
        for (const ev of betEvents) {
          const { bettor, amount } = ev.args;
          const addr = bettor.toLowerCase();

          if (!userMap.has(addr)) {
            userMap.set(addr, {
              address: bettor,
              totalWagered: 0n,
              totalWinnings: 0n,
              wins: 0,
              totalBets: 0,
              marketIds: new Set(),
            });
          }

          const user = userMap.get(addr);
          user.totalWagered += amount;
          user.totalBets += 1;
          user.marketIds.add(Number(ev.args.marketId));
        }

        // WinningsClaimed 집계
        for (const ev of claimEvents) {
          const { winner, amount } = ev.args;
          const addr = winner.toLowerCase();

          if (!userMap.has(addr)) {
            userMap.set(addr, {
              address: winner,
              totalWagered: 0n,
              totalWinnings: 0n,
              wins: 0,
              totalBets: 0,
              marketIds: new Set(),
            });
          }

          const user = userMap.get(addr);
          user.totalWinnings += amount;
          user.wins += 1;
        }

        // 집계 결과 변환
        const leaderboard = Array.from(userMap.values()).map(user => {
          const netProfit = user.totalWinnings - user.totalWagered;
          const settledBets = user.wins; // 클레임한 베팅 = 승리
          // 패배 수 = 총 베팅 - 승리 (클레임 없는 베팅 중 resolved된 것)
          const winRate = user.totalBets > 0
            ? Math.round((user.wins / user.totalBets) * 100)
            : 0;

          return {
            address: user.address,
            shortAddress: shortenAddress(user.address),
            totalWagered: user.totalWagered,
            totalWinnings: user.totalWinnings,
            netProfit,
            wins: user.wins,
            totalBets: user.totalBets,
            marketCount: user.marketIds.size,
            winRate,
          };
        });

        // 순이익 기준 내림차순 정렬
        leaderboard.sort((a, b) => {
          if (b.netProfit > a.netProfit) return 1;
          if (b.netProfit < a.netProfit) return -1;
          return 0;
        });

        if (!cancelled) {
          setRankings(leaderboard.slice(0, 50)); // 상위 50명
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

    fetchLeaderboard();

    return () => { cancelled = true; };
  }, []);

  return { rankings, loading, error };
}
