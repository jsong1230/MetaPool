/**
 * useClaim 훅 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClaim } from '../useClaim.js';

vi.mock('../../lib/contract.js', () => ({
  getReadContract: vi.fn(),
  getWriteContract: vi.fn(),
  parseContractError: vi.fn((err) => ({ type: 'NETWORK_ERROR', message: err.message || 'error' })),
}));

describe('useClaim', () => {
  const defaultProps = { marketId: 1, account: '0xUser', onSuccess: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태: idle', () => {
    const { result } = renderHook(() => useClaim(defaultProps));
    expect(result.current.txState).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.txError).toBeNull();
  });

  it('claimWinnings 성공', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    const mockTx = { hash: '0xwin', wait: vi.fn().mockResolvedValue({}) };
    getWriteContract.mockResolvedValue({ claimWinnings: vi.fn().mockResolvedValue(mockTx) });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useClaim({ ...defaultProps, onSuccess }));

    await act(async () => { await result.current.claimWinnings(); });

    expect(result.current.txState).toBe('success');
    expect(result.current.txHash).toBe('0xwin');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('claimWinnings 실패', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    getWriteContract.mockRejectedValue(new Error('AlreadyClaimed'));

    const { result } = renderHook(() => useClaim(defaultProps));
    await act(async () => { await result.current.claimWinnings(); });

    expect(result.current.txState).toBe('error');
    expect(result.current.txError).toBeTruthy();
  });

  it('claimRefund 성공', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    const mockTx = { hash: '0xrefund', wait: vi.fn().mockResolvedValue({}) };
    getWriteContract.mockResolvedValue({ claimRefund: vi.fn().mockResolvedValue(mockTx) });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useClaim({ ...defaultProps, onSuccess }));

    await act(async () => { await result.current.claimRefund(); });

    expect(result.current.txState).toBe('success');
    expect(result.current.txHash).toBe('0xrefund');
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('claimRefund 실패', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    getWriteContract.mockRejectedValue(new Error('NoBetFound'));

    const { result } = renderHook(() => useClaim(defaultProps));
    await act(async () => { await result.current.claimRefund(); });

    expect(result.current.txState).toBe('error');
  });

  it('marketId 없으면 실행 안 함', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    const { result } = renderHook(() => useClaim({ ...defaultProps, marketId: null }));

    await act(async () => { await result.current.claimWinnings(); });
    expect(getWriteContract).not.toHaveBeenCalled();
    expect(result.current.txState).toBe('idle');
  });

  it('reset으로 상태 초기화', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    getWriteContract.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useClaim(defaultProps));
    await act(async () => { await result.current.claimWinnings(); });
    expect(result.current.txState).toBe('error');

    act(() => result.current.reset());
    expect(result.current.txState).toBe('idle');
    expect(result.current.txError).toBeNull();
    expect(result.current.txHash).toBeNull();
  });

  it('fetchWinnings: account 없으면 null 반환', async () => {
    const { result } = renderHook(() => useClaim({ ...defaultProps, account: null }));
    const winnings = await result.current.fetchWinnings();
    expect(winnings).toBeNull();
  });

  it('fetchWinnings 성공', async () => {
    const { getReadContract } = await import('../../lib/contract.js');
    getReadContract.mockReturnValue({
      calculateWinnings: vi.fn().mockResolvedValue(500n),
    });

    const { result } = renderHook(() => useClaim(defaultProps));
    const winnings = await result.current.fetchWinnings();
    expect(winnings).toBe(500n);
  });

  it('fetchUserBet: account 없으면 null 반환', async () => {
    const { result } = renderHook(() => useClaim({ ...defaultProps, account: null }));
    const bet = await result.current.fetchUserBet();
    expect(bet).toBeNull();
  });

  it('fetchUserBet 성공', async () => {
    const { getReadContract } = await import('../../lib/contract.js');
    getReadContract.mockReturnValue({
      getUserBet: vi.fn().mockResolvedValue({ amount: 100n, isYes: true, claimed: false }),
    });

    const { result } = renderHook(() => useClaim(defaultProps));
    const bet = await result.current.fetchUserBet();
    expect(bet).toEqual({ amount: 100n, isYes: true, claimed: false });
  });
});
