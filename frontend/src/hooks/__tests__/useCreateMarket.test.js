/**
 * useCreateMarket 훅 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateMarket, TX_STATUS } from '../useCreateMarket.js';

vi.mock('../../lib/contract.js', () => ({
  getWriteContract: vi.fn(),
  parseContractError: vi.fn((err) => ({ type: 'NETWORK_ERROR', message: err.message || 'error' })),
}));

describe('TX_STATUS', () => {
  it('5개 상태 상수', () => {
    expect(TX_STATUS.IDLE).toBe('idle');
    expect(TX_STATUS.PENDING).toBe('pending');
    expect(TX_STATUS.CONFIRMING).toBe('confirming');
    expect(TX_STATUS.SUCCESS).toBe('success');
    expect(TX_STATUS.ERROR).toBe('error');
  });
});

describe('useCreateMarket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const marketParams = {
    question: 'Will BTC reach 100k?',
    questionKo: 'BTC가 10만?',
    questionZh: '',
    questionJa: '',
    category: 0,
    bettingDeadline: Math.floor(Date.now() / 1000) + 86400,
    resolutionDeadline: Math.floor(Date.now() / 1000) + 172800,
  };

  it('초기 상태', () => {
    const { result } = renderHook(() => useCreateMarket());
    expect(result.current.txStatus).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.createdMarketId).toBeNull();
    expect(result.current.txError).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('createMarket 성공 + MarketCreated 이벤트 파싱', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');

    const mockInterface = {
      parseLog: vi.fn((log) => {
        if (log.data === 'MarketCreated') {
          return { name: 'MarketCreated', args: { marketId: 5n } };
        }
        return null;
      }),
    };

    const mockTx = {
      hash: '0xcreate',
      wait: vi.fn().mockResolvedValue({
        logs: [{ data: 'MarketCreated' }],
      }),
    };

    getWriteContract.mockResolvedValue({
      createMarket: vi.fn().mockResolvedValue(mockTx),
      interface: mockInterface,
    });

    const { result } = renderHook(() => useCreateMarket());

    let returnValue;
    await act(async () => {
      returnValue = await result.current.createMarket(marketParams);
    });

    expect(result.current.txStatus).toBe('success');
    expect(result.current.txHash).toBe('0xcreate');
    expect(result.current.createdMarketId).toBe(5);
    expect(returnValue.success).toBe(true);
    expect(returnValue.marketId).toBe(5);
  });

  it('createMarket 실패', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    getWriteContract.mockRejectedValue(new Error('not owner'));

    const { result } = renderHook(() => useCreateMarket());

    let returnValue;
    await act(async () => {
      returnValue = await result.current.createMarket(marketParams);
    });

    expect(result.current.txStatus).toBe('error');
    expect(result.current.txError).toBeTruthy();
    expect(returnValue.success).toBe(false);
  });

  it('isLoading: 성공 완료 후 false', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');

    const mockTx = {
      hash: '0x123',
      wait: vi.fn().mockResolvedValue({ logs: [] }),
    };

    getWriteContract.mockResolvedValue({
      createMarket: vi.fn().mockResolvedValue(mockTx),
      interface: { parseLog: vi.fn() },
    });

    const { result } = renderHook(() => useCreateMarket());

    await act(async () => {
      await result.current.createMarket(marketParams);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.txStatus).toBe('success');
  });

  it('reset으로 상태 초기화', async () => {
    const { getWriteContract } = await import('../../lib/contract.js');
    getWriteContract.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useCreateMarket());
    await act(async () => { await result.current.createMarket(marketParams); });
    expect(result.current.txStatus).toBe('error');

    act(() => result.current.reset());
    expect(result.current.txStatus).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.createdMarketId).toBeNull();
    expect(result.current.txError).toBeNull();
  });
});
