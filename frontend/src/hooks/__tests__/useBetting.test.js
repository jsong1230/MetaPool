/**
 * useBetting 훅 + calculatePotentialWinnings 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ethers } from 'ethers';
import { calculatePotentialWinnings, QUICK_AMOUNTS, useBetting } from '../useBetting.js';

// contract mock
vi.mock('../../lib/contract.js', () => ({
  getWriteContract: vi.fn(),
  parseContractError: vi.fn((err) => ({ type: 'NETWORK_ERROR', message: err.message || 'error' })),
}));

describe('calculatePotentialWinnings', () => {
  const oneEth = ethers.parseEther('1');
  const tenEth = ethers.parseEther('10');
  const hundredEth = ethers.parseEther('100');

  it('0 금액이면 0 반환', () => {
    const result = calculatePotentialWinnings(0n, true, tenEth, tenEth);
    expect(result.winnings).toBe(0n);
    expect(result.profit).toBe(0n);
    expect(result.multiplier).toBe('0.00');
  });

  it('null 금액이면 0 반환', () => {
    const result = calculatePotentialWinnings(null, true, tenEth, tenEth);
    expect(result.winnings).toBe(0n);
  });

  it('양쪽 풀이 0이면 1.00x', () => {
    const result = calculatePotentialWinnings(oneEth, true, 0n, 0n);
    expect(result.multiplier).toBe('1.00');
    expect(result.winnings).toBe(oneEth);
  });

  it('YES 베팅 시 수익 계산 (2% 수수료)', () => {
    // yesPool=10, noPool=10, bet=10 on YES
    // newWinPool = 20, distributable = 10 * 0.98 = 9.8
    // earnings = 9.8 * 10 / 20 = 4.9
    // winnings = 10 + 4.9 = 14.9
    const result = calculatePotentialWinnings(tenEth, true, tenEth, tenEth);
    expect(result.winnings).toBeGreaterThan(tenEth);
    expect(result.profit).toBeGreaterThan(0n);
    expect(parseFloat(result.multiplier)).toBeGreaterThan(1);
  });

  it('NO 베팅 시 수익 계산', () => {
    const result = calculatePotentialWinnings(tenEth, false, tenEth, tenEth);
    expect(result.winnings).toBeGreaterThan(tenEth);
    expect(result.profit).toBeGreaterThan(0n);
  });

  it('승리 풀이 크면 낮은 배당률', () => {
    // yesPool이 매우 크면 YES 베팅 배당률 낮음
    const bigResult = calculatePotentialWinnings(oneEth, true, hundredEth, tenEth);
    const smallResult = calculatePotentialWinnings(oneEth, true, tenEth, hundredEth);
    expect(parseFloat(bigResult.multiplier)).toBeLessThan(parseFloat(smallResult.multiplier));
  });
});

describe('QUICK_AMOUNTS', () => {
  it('5개 퀵 금액', () => {
    expect(QUICK_AMOUNTS).toHaveLength(5);
    expect(QUICK_AMOUNTS).toEqual([100, 500, 1000, 5000, 10000]);
  });
});

describe('useBetting', () => {
  const defaultProps = {
    marketId: 1,
    market: {
      yesPool: ethers.parseEther('10'),
      noPool: ethers.parseEther('10'),
      status: 0,
    },
    balance: ethers.parseEther('1000'),
    onSuccess: vi.fn(),
  };

  it('초기 상태: 패널 닫힘, idle', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.txState).toBe('idle');
    expect(result.current.selectedSide).toBeNull();
  });

  it('openPanel으로 패널 열기', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.openPanel('yes'));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.selectedSide).toBe('yes');
    expect(result.current.amountMeta).toBe(100); // 기본값
  });

  it('closePanel으로 패널 닫기', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.openPanel('no'));
    act(() => result.current.closePanel());
    expect(result.current.isOpen).toBe(false);
  });

  it('setAmount로 금액 변경', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.openPanel('yes'));
    act(() => result.current.setAmount(500));
    expect(result.current.amountMeta).toBe(500);
  });

  it('최소/최대 범위 제한', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.setAmount(1)); // 최소 100
    expect(result.current.amountMeta).toBe(100);
    act(() => result.current.setAmount(999999)); // 최대 100000
    expect(result.current.amountMeta).toBe(100000);
  });

  it('setQuickAmount로 퀵 금액 설정', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.setQuickAmount(5000));
    expect(result.current.amountMeta).toBe(5000);
  });

  it('amountWei가 올바르게 변환', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.setAmount(100));
    expect(result.current.amountWei).toBe(ethers.parseEther('100'));
  });

  it('잔액 초과 감지', () => {
    const { result } = renderHook(() => useBetting({
      ...defaultProps,
      balance: ethers.parseEther('50'), // 50 META
    }));
    act(() => result.current.openPanel('yes'));
    act(() => result.current.setAmount(100)); // 100 META > 50 META
    expect(result.current.isOverBalance).toBe(true);
    expect(result.current.isAmountValid).toBe(false);
  });

  it('potentialWinnings 계산', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.openPanel('yes'));
    act(() => result.current.setAmount(100));
    expect(result.current.potentialWinnings).not.toBeNull();
    expect(result.current.potentialWinnings.winnings).toBeGreaterThan(0n);
  });

  it('selectedSide 없으면 potentialWinnings null', () => {
    const { result } = renderHook(() => useBetting(defaultProps));
    expect(result.current.potentialWinnings).toBeNull();
  });

  it('placeBet: side/amount 미설정이면 실행 안 함', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    const { result } = renderHook(() => useBetting(defaultProps));
    // selectedSide가 null이므로 실행 안 됨
    await act(async () => { await result.current.placeBet(); });
    expect(getWriteContract).not.toHaveBeenCalled();
  });

  it('placeBet 성공 흐름', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    const mockTx = { hash: '0xabc', wait: vi.fn().mockResolvedValue({}) };
    const mockContract = { placeBet: vi.fn().mockResolvedValue(mockTx) };
    getWriteContract.mockResolvedValue(mockContract);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useBetting({ ...defaultProps, onSuccess }));

    act(() => result.current.openPanel('yes'));
    act(() => result.current.setAmount(100));

    await act(async () => { await result.current.placeBet(); });

    expect(mockContract.placeBet).toHaveBeenCalledWith(
      1,
      true,
      { value: ethers.parseEther('100') }
    );
    expect(result.current.txState).toBe('success');
    expect(result.current.txHash).toBe('0xabc');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('placeBet 실패 흐름', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    getWriteContract.mockRejectedValue(new Error('insufficient funds'));

    const { result } = renderHook(() => useBetting(defaultProps));
    act(() => result.current.openPanel('no'));
    act(() => result.current.setAmount(100));

    await act(async () => { await result.current.placeBet(); });

    expect(result.current.txState).toBe('error');
    expect(result.current.txError).toBeTruthy();
  });
});
