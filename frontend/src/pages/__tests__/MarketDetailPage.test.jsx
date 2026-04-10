/**
 * MarketDetailPage 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// constants mock (import.meta.env 우회)
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
  getReadContract: vi.fn(),
  getWriteContract: vi.fn(),
  parseContractError: vi.fn(),
}));

vi.mock('../../hooks/useMarket.js', () => ({ useMarket: vi.fn() }));
vi.mock('../../hooks/useOdds.js', () => ({
  useOdds: vi.fn(() => ({ yesOdds: 15000n, noOdds: 20000n, isFirstBetter: false, flashing: false })),
}));
vi.mock('../../hooks/useBetting.js', () => ({
  useBetting: vi.fn(() => ({
    isOpen: false, selectedSide: null, amountMeta: 100, amountWei: 0n,
    isOverBalance: false, isAmountValid: true, potentialWinnings: null,
    txState: 'idle', txHash: null, txError: null, minBet: 100, maxBet: 100000,
    openPanel: vi.fn(), closePanel: vi.fn(), setAmount: vi.fn(),
    setQuickAmount: vi.fn(), placeBet: vi.fn(),
  })),
}));
vi.mock('../../hooks/useClaim.js', () => ({
  useClaim: vi.fn(() => ({
    txState: 'idle', txHash: null, txError: null,
    claimWinnings: vi.fn(), claimRefund: vi.fn(), fetchWinnings: vi.fn(), fetchUserBet: vi.fn(), reset: vi.fn(),
  })),
}));

// PoolChart mock
vi.mock('../../components/market/PoolChart.jsx', () => ({
  PoolChart: () => <div data-testid="pool-chart">PoolChart</div>,
}));

import { WalletContext } from '../../contexts/WalletContext.jsx';
import { ToastProvider } from '../../components/common/Toast.jsx';
import { MarketDetailPage } from '../MarketDetailPage.jsx';
import { useMarket } from '../../hooks/useMarket.js';

const walletDefaults = {
  account: '0xUser', balance: 1000000000000000000000n, chainId: 31337,
  isConnected: true, isConnecting: false, isCorrectNetwork: true,
  error: null, connectWallet: vi.fn(), disconnectWallet: vi.fn(),
  switchNetwork: vi.fn(), setError: vi.fn(),
};

function renderMarketPage(marketReturn) {
  useMarket.mockReturnValue(marketReturn);

  return render(
    <MemoryRouter initialEntries={['/market/1']}>
      <WalletContext.Provider value={walletDefaults}>
        <ToastProvider>
          <Routes>
            <Route path="/market/:id" element={<MarketDetailPage />} />
          </Routes>
        </ToastProvider>
      </WalletContext.Provider>
    </MemoryRouter>
  );
}

const activeMarket = {
  id: 1, question: 'Will BTC reach 100k?', questionKo: 'BTC 10만?',
  questionZh: '', questionJa: '', category: 0,
  bettingDeadline: Math.floor(Date.now() / 1000) + 86400,
  resolutionDeadline: Math.floor(Date.now() / 1000) + 172800,
  status: 0, statusName: 'Active', outcome: 0, outcomeName: 'Undecided',
  yesPool: 10000000000000000000n, noPool: 5000000000000000000n,
  yesCount: 3, noCount: 2,
  createdAt: Math.floor(Date.now() / 1000) - 86400, resolvedAt: 0,
  creator: '0xOwner', disputeDeadline: 0, disputeCount: 0, underReview: false,
};

describe('MarketDetailPage', () => {
  it('로딩 중 스켈레톤', () => {
    renderMarketPage({ market: null, loading: true, error: null, refetch: vi.fn() });
    expect(document.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('에러 시 메시지와 재시도', () => {
    renderMarketPage({ market: null, loading: false, error: '로드 실패', refetch: vi.fn() });
    expect(screen.getByText('로드 실패')).toBeInTheDocument();
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  it('마켓 없으면 "찾을 수 없습니다"', () => {
    renderMarketPage({ market: null, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('마켓을 찾을 수 없습니다')).toBeInTheDocument();
  });

  it('Active 마켓 렌더링', () => {
    renderMarketPage({ market: activeMarket, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('Will BTC reach 100k?')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getAllByText('YES').length).toBeGreaterThanOrEqual(1);
  });

  it('마켓 메타 정보', () => {
    renderMarketPage({ market: activeMarket, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('마켓 정보')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('뒤로 가기 링크', () => {
    renderMarketPage({ market: activeMarket, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('마켓 목록으로')).toBeInTheDocument();
  });

  it('PoolChart 렌더링', () => {
    renderMarketPage({ market: activeMarket, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByTestId('pool-chart')).toBeInTheDocument();
  });

  it('Closed 마켓: 베팅 마감', () => {
    renderMarketPage({ market: { ...activeMarket, status: 1 }, loading: false, error: null, refetch: vi.fn() });
    const elements = screen.getAllByText('베팅 마감');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('Paused 마켓: 일시 중단', () => {
    renderMarketPage({ market: { ...activeMarket, status: 4 }, loading: false, error: null, refetch: vi.fn() });
    expect(screen.getByText('마켓 일시 중단')).toBeInTheDocument();
  });
});
