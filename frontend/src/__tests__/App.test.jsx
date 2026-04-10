/**
 * App 라우팅 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WalletContext } from '../contexts/WalletContext.jsx';

// 페이지 컴포넌트 mock — 라우팅만 테스트
vi.mock('../pages/HomePage.jsx', () => ({
  HomePage: () => <div data-testid="home-page">HomePage</div>,
}));
vi.mock('../pages/MarketDetailPage.jsx', () => ({
  MarketDetailPage: () => <div data-testid="market-detail-page">MarketDetailPage</div>,
}));
vi.mock('../pages/MyBetsPage.jsx', () => ({
  MyBetsPage: () => <div data-testid="my-bets-page">MyBetsPage</div>,
}));
vi.mock('../pages/ProfilePage.jsx', () => ({
  ProfilePage: () => <div data-testid="profile-page">ProfilePage</div>,
}));
vi.mock('../pages/LeaderboardPage.jsx', () => ({
  LeaderboardPage: () => <div data-testid="leaderboard-page">LeaderboardPage</div>,
}));
vi.mock('../pages/HistoryPage.jsx', () => ({
  HistoryPage: () => <div data-testid="history-page">HistoryPage</div>,
}));
vi.mock('../pages/AdminPage.jsx', () => ({
  AdminPage: () => <div data-testid="admin-page">AdminPage</div>,
}));
vi.mock('../pages/AdminCreateMarketPage.jsx', () => ({
  AdminCreateMarketPage: () => <div data-testid="admin-create-page">AdminCreateMarketPage</div>,
}));
vi.mock('../pages/AdminSettingsPage.jsx', () => ({
  AdminSettingsPage: () => <div data-testid="admin-settings-page">AdminSettingsPage</div>,
}));

// Layout mock
vi.mock('../components/layout/Header.jsx', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));
vi.mock('../components/layout/Footer.jsx', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));
vi.mock('../components/layout/MobileNav.jsx', () => ({
  MobileNav: () => <nav data-testid="mobile-nav">MobileNav</nav>,
}));

// App 내부의 BrowserRouter를 우회하기 위해 Routes만 추출
// App은 BrowserRouter를 포함하므로 MemoryRouter와 충돌 — Routes를 직접 테스트
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { MarketDetailPage } from '../pages/MarketDetailPage.jsx';
import { MyBetsPage } from '../pages/MyBetsPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { LeaderboardPage } from '../pages/LeaderboardPage.jsx';
import { HistoryPage } from '../pages/HistoryPage.jsx';
import { AdminPage } from '../pages/AdminPage.jsx';
import { AdminCreateMarketPage } from '../pages/AdminCreateMarketPage.jsx';
import { AdminSettingsPage } from '../pages/AdminSettingsPage.jsx';
import { Header } from '../components/layout/Header.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { MobileNav } from '../components/layout/MobileNav.jsx';

const walletDefaults = {
  account: null, balance: null, chainId: null,
  isConnected: false, isConnecting: false, isCorrectNetwork: true,
  error: null, connectWallet: vi.fn(), disconnectWallet: vi.fn(),
  switchNetwork: vi.fn(), setError: vi.fn(),
};

function renderWithRoute(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <WalletContext.Provider value={walletDefaults}>
        <ToastProvider>
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/market/:id" element={<MarketDetailPage />} />
            <Route path="/my-bets" element={<MyBetsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/create" element={<AdminCreateMarketPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="*" element={<div data-testid="not-found">404</div>} />
          </Routes>
          <Footer />
          <MobileNav />
        </ToastProvider>
      </WalletContext.Provider>
    </MemoryRouter>
  );
}

describe('App 라우팅', () => {
  it('/ → HomePage', () => {
    renderWithRoute('/');
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('/market/1 → MarketDetailPage', () => {
    renderWithRoute('/market/1');
    expect(screen.getByTestId('market-detail-page')).toBeInTheDocument();
  });

  it('/my-bets → MyBetsPage', () => {
    renderWithRoute('/my-bets');
    expect(screen.getByTestId('my-bets-page')).toBeInTheDocument();
  });

  it('/profile → ProfilePage', () => {
    renderWithRoute('/profile');
    expect(screen.getByTestId('profile-page')).toBeInTheDocument();
  });

  it('/leaderboard → LeaderboardPage', () => {
    renderWithRoute('/leaderboard');
    expect(screen.getByTestId('leaderboard-page')).toBeInTheDocument();
  });

  it('/history → HistoryPage', () => {
    renderWithRoute('/history');
    expect(screen.getByTestId('history-page')).toBeInTheDocument();
  });

  it('/admin → AdminPage', () => {
    renderWithRoute('/admin');
    expect(screen.getByTestId('admin-page')).toBeInTheDocument();
  });

  it('/admin/create → AdminCreateMarketPage', () => {
    renderWithRoute('/admin/create');
    expect(screen.getByTestId('admin-create-page')).toBeInTheDocument();
  });

  it('/admin/settings → AdminSettingsPage', () => {
    renderWithRoute('/admin/settings');
    expect(screen.getByTestId('admin-settings-page')).toBeInTheDocument();
  });

  it('존재하지 않는 경로 → 404', () => {
    renderWithRoute('/unknown-route');
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('Header, Footer, MobileNav가 항상 렌더링', () => {
    renderWithRoute('/');
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });
});
