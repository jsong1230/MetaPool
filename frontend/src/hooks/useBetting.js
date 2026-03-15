/**
 * useBetting — 베팅 패널 상태 + placeBet 트랜잭션 (F-18, F-19)
 * 트랜잭션 상태: idle → pending → confirming → success/error
 */
import { useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { getWriteContract, parseContractError } from '../lib/contract.js';
import { DEFAULT_MIN_BET_ETH, DEFAULT_MAX_BET_ETH } from '../lib/constants.js';

// 베팅 수량 퀵 버튼 값 (META 단위)
export const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

/**
 * 예상 수익 계산 (클라이언트 사이드 근사값)
 * formula: (betAmount / (winPool + betAmount)) * (totalPool + betAmount) * (1 - feeRate)
 * 여기서는 단순화: 배당률 × 베팅 금액
 * @param {bigint} betAmountWei
 * @param {boolean} isYes
 * @param {bigint} yesPool
 * @param {bigint} noPool
 * @param {number} feeRateBps — 수수료 basis points (기본 200 = 2%)
 * @returns {{ winnings: bigint, profit: bigint, multiplier: string }}
 */
export function calculatePotentialWinnings(betAmountWei, isYes, yesPool, noPool, feeRateBps = 200) {
  if (!betAmountWei || betAmountWei === 0n) {
    return { winnings: 0n, profit: 0n, multiplier: '0.00' };
  }

  const winPool = isYes ? yesPool : noPool;
  const losePool = isYes ? noPool : yesPool;

  // 풀이 비어있는 경우 (첫 베터): 임시로 1.00x 반환
  if (winPool === 0n && losePool === 0n) {
    return { winnings: betAmountWei, profit: 0n, multiplier: '1.00' };
  }

  const totalPool = yesPool + noPool + betAmountWei;
  const newWinPool = winPool + betAmountWei;

  // 분배 가능 금액 = 패배 풀 × (1 - feeRate)
  const distributable = (losePool * BigInt(10000 - feeRateBps)) / 10000n;

  // 예상 수익 = 원금 + (distributable × 내 베팅 / 새 승리 풀)
  const earnings = (distributable * betAmountWei) / newWinPool;
  const winnings = betAmountWei + earnings;
  const profit = earnings;

  const multiplierNum = newWinPool > 0n
    ? Number((winnings * 10000n) / betAmountWei) / 10000
    : 1;

  return {
    winnings,
    profit,
    multiplier: multiplierNum.toFixed(2),
  };
}

/**
 * @param {{
 *   marketId: number,
 *   market: object,
 *   balance: bigint|null,
 *   onSuccess?: () => void
 * }} props
 */
export function useBetting({ marketId, market, balance, onSuccess }) {
  // 패널 열림 상태
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState(null); // 'yes' | 'no'

  // 베팅 금액 (META 정수)
  const [amountMeta, setAmountMeta] = useState(100);

  // 트랜잭션 상태
  const [txState, setTxState] = useState('idle'); // idle | pending | confirming | success | error
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);

  const minBet = parseInt(DEFAULT_MIN_BET_ETH);
  const maxBet = parseInt(DEFAULT_MAX_BET_ETH);

  // 베팅 금액 wei 변환
  const amountWei = useMemo(() => {
    try {
      return ethers.parseEther(String(amountMeta));
    } catch {
      return 0n;
    }
  }, [amountMeta]);

  // 잔액 초과 여부
  const isOverBalance = balance !== null && amountWei > balance;

  // 입력값 유효성
  const isAmountValid = amountMeta >= minBet && amountMeta <= maxBet && !isOverBalance;

  // 예상 수익 계산
  const potentialWinnings = useMemo(() => {
    if (!market || !selectedSide) return null;
    return calculatePotentialWinnings(
      amountWei,
      selectedSide === 'yes',
      market.yesPool ?? 0n,
      market.noPool ?? 0n,
    );
  }, [amountWei, selectedSide, market]);

  // 패널 열기
  const openPanel = useCallback((side) => {
    setSelectedSide(side);
    setAmountMeta(100);
    setTxState('idle');
    setTxError(null);
    setTxHash(null);
    setIsOpen(true);
  }, []);

  // 패널 닫기
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setTxState('idle');
    setTxError(null);
  }, []);

  // 금액 변경 (슬라이더 / 직접 입력)
  const setAmount = useCallback((value) => {
    const num = Math.max(minBet, Math.min(maxBet, Number(value) || minBet));
    setAmountMeta(num);
  }, [minBet, maxBet]);

  // 퀵 버튼 클릭
  const setQuickAmount = useCallback((meta) => {
    setAmountMeta(meta);
  }, []);

  // 베팅 실행 (MetaMask 서명)
  const placeBet = useCallback(async () => {
    if (!marketId || !selectedSide || !isAmountValid) return;

    setTxState('pending');
    setTxError(null);

    try {
      const contract = await getWriteContract();
      const isYes = selectedSide === 'yes';

      const tx = await contract.placeBet(marketId, isYes, { value: amountWei });
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
  }, [marketId, selectedSide, amountWei, isAmountValid, onSuccess]);

  return {
    isOpen,
    selectedSide,
    amountMeta,
    amountWei,
    isOverBalance,
    isAmountValid,
    potentialWinnings,
    txState,
    txHash,
    txError,
    minBet,
    maxBet,
    openPanel,
    closePanel,
    setAmount,
    setQuickAmount,
    placeBet,
  };
}
