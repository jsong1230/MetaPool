/**
 * HomePage 테스트
 * 하위 컴포넌트를 mock하여 페이지 로직만 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// constants를 먼저 mock (import.meta.env 우회)
vi.mock('../../lib/constants.js', () => ({
  NETWORKS: { localhost: { chainId: '0x7a69' } },
  ACTIVE_NETWORK: { chainId: '0x7a69' },
  ALLOWED_CHAIN_IDS: [31337],
  CONTRACT_ADDRESS: '0xtest',
  RPC_URL: 'http://127.0.0.1:8545',
  CATEGORIES: [
    { id: 0, name: 'Crypto', labelKey: 'categories.crypto', color: 'brand-primary' },
    { id: 1, name: 'Sports', labelKey: 'categories.sports', color: 'sky' },
    { id: 2, name: 'Weather', labelKey: 'categories.weather', color: 'warning' },
    { id: 3, name: 'Politics', labelKey: 'categories.politics', color: 'brand-secondary' },
    { id: 4, name: 'Entertainment', labelKey: 'categories.entertainment', color: 'pink' },
    { id: 5, name: 'Other', labelKey: 'categories.other', color: 'muted' },
  ],
  CATEGORY_NAMES: ['Crypto', 'Sports', 'Weather', 'Politics', 'Entertainment', 'Other'],
  MARKET_STATUS: { 0: 'Active', 1: 'Closed', 2: 'Resolved', 3: 'Voided', 4: 'Paused' },
  MARKET_OUTCOME: { 0: 'Undecided', 1: 'Yes', 2: 'No', 3: 'Void' },
  DEFAULT_MIN_BET_ETH: '100',
  DEFAULT_MAX_BET_ETH: '100000',
  POLL_INTERVAL_MARKETS: 30000,
  POLL_INTERVAL_BALANCE: 15000,
}));

vi.mock('../../lib/contract.js', () => ({
  getReadContract: vi.fn(() => ({ getOdds: vi.fn().mockResolvedValue([15000n, 20000n]) })),
  getWriteContract: vi.fn(),
  parseContractError: vi.fn(),
}));

vi.mock('../../hooks/useMarkets.js', () => ({
  useMarkets: vi.fn(),
}));

import { WalletContext } from '../../contexts/WalletContext.jsx';
import { HomePage } from '../HomePage.jsx';
import { useMarkets } from '../../hooks/useMarkets.js';

const walletDefaults = {
  account: null, balance: null, chainId: null,
  isConnected: false, isConnecting: false, isCorrectNetwork: true,
  error: null, connectWallet: vi.fn(), disconnectWallet: vi.fn(),
  switchNetwork: vi.fn(), setError: vi.fn(),
};

function renderHomePage(marketsReturn) {
  useMarkets.mockReturnValue(marketsReturn);

  return render(
    <MemoryRouter>
      <WalletContext.Provider value={walletDefaults}>
        <HomePage />
      </WalletContext.Provider>
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('제목 표시', () => {
    renderHomePage({ markets: [], loading: true, error: null, refetch: vi.fn() });
    expect(screen.getByText('markets.title')).toBeInTheDocument();
  });

  it('카테고리 필터 탭 표시', () => {
    renderHomePage({ markets: [], loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('전체')).toBeInTheDocument();
    expect(screen.getByText('가상자산')).toBeInTheDocument();
  });

  it('검색 입력 표시', () => {
    renderHomePage({ markets: [], loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByPlaceholderText('markets.searchPlaceholder')).toBeInTheDocument();
  });

  it('마켓 카드 렌더링', () => {
    const markets = [{
      id: 1, question: 'Will BTC reach 100k?', questionKo: '', questionZh: '', questionJa: '',
      category: 0, bettingDeadline: Math.floor(Date.now() / 1000) + 86400, status: 0,
      yesPool: 10000000000000000000n, noPool: 5000000000000000000n, yesCount: 3, noCount: 2,
    }];
    renderHomePage({ markets, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('Will BTC reach 100k?')).toBeInTheDocument();
  });

  it('검색 필터링', () => {
    const markets = [
      { id: 1, question: 'BTC question', questionKo: '', questionZh: '', questionJa: '',
        category: 0, bettingDeadline: Math.floor(Date.now() / 1000) + 86400, status: 0,
        yesPool: 0n, noPool: 0n, yesCount: 0, noCount: 0 },
      { id: 2, question: 'ETH question', questionKo: '', questionZh: '', questionJa: '',
        category: 0, bettingDeadline: Math.floor(Date.now() / 1000) + 86400, status: 0,
        yesPool: 0n, noPool: 0n, yesCount: 0, noCount: 0 },
    ];
    renderHomePage({ markets, loading: false, error: null, refetch: vi.fn() });
    fireEvent.change(screen.getByPlaceholderText('markets.searchPlaceholder'), { target: { value: 'BTC' } });
    expect(screen.getByText('BTC question')).toBeInTheDocument();
    expect(screen.queryByText('ETH question')).not.toBeInTheDocument();
  });

  it('카테고리 필터 클릭', () => {
    const markets = [
      { id: 1, question: 'Crypto?', questionKo: '', questionZh: '', questionJa: '',
        category: 0, bettingDeadline: Math.floor(Date.now() / 1000) + 86400, status: 0,
        yesPool: 0n, noPool: 0n, yesCount: 0, noCount: 0 },
      { id: 2, question: 'Sports?', questionKo: '', questionZh: '', questionJa: '',
        category: 1, bettingDeadline: Math.floor(Date.now() / 1000) + 86400, status: 0,
        yesPool: 0n, noPool: 0n, yesCount: 0, noCount: 0 },
    ];
    renderHomePage({ markets, loading: false, error: null, refetch: vi.fn() });
    fireEvent.click(screen.getByText('스포츠'));
    expect(screen.getByText('Sports?')).toBeInTheDocument();
    expect(screen.queryByText('Crypto?')).not.toBeInTheDocument();
  });
});
