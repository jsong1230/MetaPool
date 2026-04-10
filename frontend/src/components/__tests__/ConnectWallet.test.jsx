/**
 * ConnectWallet 컴포넌트 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletContext } from '../../contexts/WalletContext.jsx';
import { ConnectWallet } from '../common/ConnectWallet.jsx';

// WalletContext 값을 직접 주입하는 wrapper
function renderWithWallet(walletValues, props = {}) {
  const defaults = {
    account: null,
    balance: null,
    isConnected: false,
    isConnecting: false,
    isCorrectNetwork: true,
    connectWallet: vi.fn(),
    switchNetwork: vi.fn(),
    disconnectWallet: vi.fn(),
    error: null,
    chainId: null,
    setError: vi.fn(),
  };
  return render(
    <WalletContext.Provider value={{ ...defaults, ...walletValues }}>
      <ConnectWallet {...props} />
    </WalletContext.Provider>
  );
}

describe('ConnectWallet', () => {
  beforeEach(() => {
    // MetaMask 설치 mock
    globalThis.window.ethereum = {};
  });

  it('미연결 시 "지갑 연결" 버튼 표시', () => {
    renderWithWallet({});
    expect(screen.getByText('지갑 연결')).toBeInTheDocument();
  });

  it('연결 버튼 클릭 시 connectWallet 호출', () => {
    const connectWallet = vi.fn();
    renderWithWallet({ connectWallet });
    fireEvent.click(screen.getByText('지갑 연결'));
    expect(connectWallet).toHaveBeenCalledOnce();
  });

  it('연결 중이면 "연결 중..." 표시 + disabled', () => {
    renderWithWallet({ isConnecting: true });
    const btn = screen.getByText('연결 중...');
    expect(btn.closest('button')).toBeDisabled();
  });

  it('연결됨 + 올바른 네트워크이면 주소 표시', () => {
    renderWithWallet({
      isConnected: true,
      account: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      isCorrectNetwork: true,
    });
    expect(screen.getByText('0xAbCd...Ef12')).toBeInTheDocument();
  });

  it('연결됨 + 잔액 표시', () => {
    const { ethers } = require('ethers');
    renderWithWallet({
      isConnected: true,
      account: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      balance: 100000000000000000000n, // 100 META
      isCorrectNetwork: true,
    });
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/META/)).toBeInTheDocument();
  });

  it('연결됨 + 잘못된 네트워크이면 "네트워크 전환" 표시', () => {
    renderWithWallet({
      isConnected: true,
      account: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
      isCorrectNetwork: false,
    });
    expect(screen.getByText('네트워크 전환')).toBeInTheDocument();
  });

  it('네트워크 전환 클릭 시 switchNetwork 호출', () => {
    const switchNetwork = vi.fn();
    renderWithWallet({
      isConnected: true,
      account: '0x1234',
      isCorrectNetwork: false,
      switchNetwork,
    });
    fireEvent.click(screen.getByText('네트워크 전환'));
    expect(switchNetwork).toHaveBeenCalledOnce();
  });

  it('MetaMask 미설치 시 설치 링크 표시', () => {
    delete globalThis.window.ethereum;
    renderWithWallet({});
    expect(screen.getByText('MetaMask 설치')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://metamask.io');
  });

  it('size prop 적용', () => {
    renderWithWallet({}, { size: 'lg' });
    const btn = screen.getByText('지갑 연결');
    expect(btn.closest('button')).toBeInTheDocument();
  });
});
