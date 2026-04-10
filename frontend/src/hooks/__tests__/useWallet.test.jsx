/**
 * useWallet 훅 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { WalletContext } from '../../contexts/WalletContext.jsx';
import { useWallet } from '../useWallet.js';

describe('useWallet', () => {
  it('WalletContext 값을 반환한다', () => {
    const mockValue = {
      account: '0x1234',
      balance: 100n,
      chainId: 31337,
      isConnected: true,
      isConnecting: false,
      isCorrectNetwork: true,
      error: null,
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      switchNetwork: vi.fn(),
      setError: vi.fn(),
    };

    const wrapper = ({ children }) => (
      <WalletContext.Provider value={mockValue}>
        {children}
      </WalletContext.Provider>
    );

    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.account).toBe('0x1234');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.chainId).toBe(31337);
  });

  it('WalletProvider 외부에서 사용하면 에러', () => {
    expect(() => {
      renderHook(() => useWallet());
    }).toThrow('useWallet는 WalletProvider 내부에서 사용해야 합니다');
  });
});
