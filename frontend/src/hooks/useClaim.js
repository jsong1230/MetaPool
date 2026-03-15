/**
 * useClaim — 클레임/환불 트랜잭션 훅 (F-21)
 * claimWinnings / claimRefund 트랜잭션 처리
 */
import { useState, useCallback } from 'react';
import { getWriteContract, getReadContract, parseContractError } from '../lib/contract.js';

/**
 * @param {{
 *   marketId: number,
 *   account: string|null,
 *   onSuccess?: () => void
 * }} props
 */
export function useClaim({ marketId, account, onSuccess }) {
  const [txState, setTxState] = useState('idle'); // idle | pending | confirming | success | error
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);

  // 클레임 가능 금액 조회 (calculateWinnings)
  const fetchWinnings = useCallback(async () => {
    if (!marketId || !account) return null;
    try {
      const contract = getReadContract();
      const winnings = await contract.calculateWinnings(marketId, account);
      return winnings;
    } catch {
      return null;
    }
  }, [marketId, account]);

  // 사용자 베팅 정보 조회
  const fetchUserBet = useCallback(async () => {
    if (!marketId || !account) return null;
    try {
      const contract = getReadContract();
      const bet = await contract.getUserBet(marketId, account);
      return {
        amount: bet.amount,     // bigint
        isYes: bet.isYes,       // bool
        claimed: bet.claimed,   // bool
      };
    } catch {
      return null;
    }
  }, [marketId, account]);

  // 보상 클레임 (Resolved 마켓)
  const claimWinnings = useCallback(async () => {
    if (!marketId) return;

    setTxState('pending');
    setTxError(null);

    try {
      const contract = await getWriteContract();
      const tx = await contract.claimWinnings(marketId);
      setTxState('confirming');
      setTxHash(tx.hash);

      await tx.wait();
      setTxState('success');
      onSuccess?.();
    } catch (err) {
      const parsed = parseContractError(err);
      setTxError(parsed.message);
      setTxState('error');
    }
  }, [marketId, onSuccess]);

  // 환불 클레임 (Voided 마켓)
  const claimRefund = useCallback(async () => {
    if (!marketId) return;

    setTxState('pending');
    setTxError(null);

    try {
      const contract = await getWriteContract();
      const tx = await contract.claimRefund(marketId);
      setTxState('confirming');
      setTxHash(tx.hash);

      await tx.wait();
      setTxState('success');
      onSuccess?.();
    } catch (err) {
      const parsed = parseContractError(err);
      setTxError(parsed.message);
      setTxState('error');
    }
  }, [marketId, onSuccess]);

  const reset = useCallback(() => {
    setTxState('idle');
    setTxError(null);
    setTxHash(null);
  }, []);

  return {
    txState,
    txHash,
    txError,
    fetchWinnings,
    fetchUserBet,
    claimWinnings,
    claimRefund,
    reset,
  };
}
