/**
 * useProfile — 사용자 통계 집계 (F-24, F-25)
 * useUserBets 데이터 기반으로 수익률 대시보드 통계 계산
 */
import { useMemo } from 'react';
import { ethers } from 'ethers';
import { useUserBets } from './useUserBets.js';

/**
 * @param {string|null} account
 * @returns {{ stats, bets, loading, error, refetch }}
 */
export function useProfile(account) {
  const { bets, loading, error, refetch } = useUserBets(account);

  const stats = useMemo(() => {
    if (!bets || bets.length === 0) {
      return {
        totalBets: 0,
        wins: 0,
        losses: 0,
        voids: 0,
        totalWagered: 0n,
        totalWinnings: 0n,
        netProfit: 0n,
        winRate: 0,
        avgBet: 0n,
        maxSingleWin: 0n,
      };
    }

    let wins = 0;
    let losses = 0;
    let voids = 0;
    let totalWagered = 0n;
    let totalWinnings = 0n;
    let maxSingleWin = 0n;

    for (const bet of bets) {
      totalWagered += bet.betAmount || 0n;

      if (bet.result === 'win' || bet.result === 'claimed') {
        // claimed도 승리로 집계
        if (bet.result === 'claimed' && bet.claimType === 'winnings') {
          wins++;
          // winnings가 있으면 수익 집계
          if (bet.winnings && bet.winnings > 0n) {
            totalWinnings += bet.winnings;
            const profit = bet.winnings - (bet.betAmount || 0n);
            if (profit > maxSingleWin) maxSingleWin = profit;
          }
        } else if (bet.result === 'win') {
          wins++;
          if (bet.winnings && bet.winnings > 0n) {
            totalWinnings += bet.winnings;
            const profit = bet.winnings - (bet.betAmount || 0n);
            if (profit > maxSingleWin) maxSingleWin = profit;
          }
        }
      } else if (bet.result === 'loss') {
        losses++;
      } else if (bet.result === 'void') {
        voids++;
        // 무효는 원금 환불 → 수익/손실 없음
        totalWinnings += bet.betAmount || 0n;
      }
    }

    // 결과 확정된 베팅 수 (wins + losses)
    const settledCount = wins + losses;
    const winRate = settledCount > 0 ? Math.round((wins / settledCount) * 100) : 0;

    // 순이익 = 총 수령액 - 총 베팅액
    const netProfit = totalWinnings - totalWagered;

    // 평균 베팅 금액
    const avgBet = bets.length > 0
      ? totalWagered / BigInt(bets.length)
      : 0n;

    return {
      totalBets: bets.length,
      wins,
      losses,
      voids,
      totalWagered,
      totalWinnings,
      netProfit,
      winRate,
      avgBet,
      maxSingleWin,
    };
  }, [bets]);

  return { stats, bets, loading, error, refetch };
}
