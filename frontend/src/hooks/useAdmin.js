/**
 * useAdmin — 관리자(owner) 검증 + 전체 마켓 조회
 * 모든 상태(Active/Closed/Resolved/Voided/Paused) 포함
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getReadContract, getWriteContract, parseContractError } from '../lib/contract.js';
import { MARKET_STATUS, RPC_URL } from '../lib/constants.js';
import { useWallet } from './useWallet.js';

export function useAdmin() {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [accumulatedFees, setAccumulatedFees] = useState(0n);
  const [settings, setSettings] = useState({ minBet: 0n, maxBet: 0n, platformFeeRate: 0n });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 마켓 정규화
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
      creator: rawMarket.creator,
      disputeDeadline: Number(rawMarket.disputeDeadline),
      disputeCount: Number(rawMarket.disputeCount),
      underReview: rawMarket.underReview,
    };
  }, []);

  // 전체 데이터 로드
  const loadData = useCallback(async () => {
    try {
      let contract;
      try {
        contract = getReadContract();
      } catch {
        setLoading(false);
        return;
      }

      // owner 주소 조회
      const owner = await contract.owner();
      setOwnerAddress(owner);

      // 현재 계정과 비교 (IS_LOCAL_DEV에서는 Hardhat Account #0 주소로 비교)
      let currentAccount = account;
      if (!currentAccount) {
        // 로컬 개발: JsonRpcProvider에서 Account #0 가져오기
        const isLocalDev = RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost');
        if (isLocalDev) {
          try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const signer = await provider.getSigner(0);
            currentAccount = await signer.getAddress();
          } catch {
            // 무시
          }
        }
      }

      const ownerMatch = currentAccount &&
        owner.toLowerCase() === currentAccount.toLowerCase();
      setIsOwner(ownerMatch);

      // 전체 마켓 로드 (모든 상태)
      const count = await contract.marketCount();
      const total = Number(count);

      if (total > 0) {
        const promises = [];
        for (let i = 1; i <= total; i++) {
          promises.push(contract.getMarket(i));
        }
        const rawMarkets = await Promise.all(promises);
        setMarkets(rawMarkets.map(normalizeMarket));
      } else {
        setMarkets([]);
      }

      // 누적 수수료 조회
      const fees = await contract.accumulatedFees();
      setAccumulatedFees(fees);

      // 설정값 조회
      const [minBet, maxBet, platformFeeRate] = await Promise.all([
        contract.minBet(),
        contract.maxBet(),
        contract.platformFeeRate(),
      ]);
      setSettings({ minBet, maxBet, platformFeeRate });

      setError(null);
    } catch (err) {
      setError('데이터 로드 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [account, normalizeMarket]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 마켓 Pause
  const pauseMarket = useCallback(async (marketId) => {
    const contract = await getWriteContract();
    const tx = await contract.pauseMarket(marketId);
    await tx.wait();
    await loadData();
  }, [loadData]);

  // 마켓 Resume
  const resumeMarket = useCallback(async (marketId, newBettingDeadline, newResolutionDeadline) => {
    const contract = await getWriteContract();
    const tx = await contract.resumeMarket(marketId, newBettingDeadline, newResolutionDeadline);
    await tx.wait();
    await loadData();
  }, [loadData]);

  // 마켓 결과 확정
  const resolveMarket = useCallback(async (marketId, outcome) => {
    // outcome: 1=Yes, 2=No, 3=Void
    const contract = await getWriteContract();
    const tx = await contract.resolveMarket(marketId, outcome);
    await tx.wait();
    await loadData();
  }, [loadData]);

  // 수수료 인출
  const withdrawFees = useCallback(async () => {
    const contract = await getWriteContract();
    const tx = await contract.withdrawFees();
    await tx.wait();
    await loadData();
  }, [loadData]);

  return {
    isOwner,
    ownerAddress,
    markets,
    accumulatedFees,
    settings,
    loading,
    error,
    refetch: loadData,
    pauseMarket,
    resumeMarket,
    resolveMarket,
    withdrawFees,
  };
}
