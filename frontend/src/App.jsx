/**
 * App — BrowserRouter + Routes 설정
 * navigation.md URL 구조 기준
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import { Header } from './components/layout/Header.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { MobileNav } from './components/layout/MobileNav.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { MarketDetailPage } from './pages/MarketDetailPage.jsx';
import { MyBetsPage } from './pages/MyBetsPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { LeaderboardPage } from './pages/LeaderboardPage.jsx';

// 아직 미구현 페이지 placeholder
function PlaceholderPage({ title }) {
  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="
        bg-bg-surface border border-border-default rounded-lg p-8
        flex flex-col items-center justify-center text-center
        min-h-[300px]
      ">
        <p className="text-text-secondary text-lg font-medium">{title}</p>
        <p className="text-text-muted text-sm mt-2">추후 구현 예정</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <ToastProvider>
          <div className="flex flex-col min-h-screen bg-bg-primary">
            <Header />

            <div className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/market/:id" element={<MarketDetailPage />} />
                <Route path="/my-bets" element={<MyBetsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route
                  path="/history"
                  element={<PlaceholderPage title="히스토리 (F-21)" />}
                />
                <Route
                  path="/admin"
                  element={<PlaceholderPage title="관리자 패널" />}
                />
                <Route
                  path="/admin/create"
                  element={<PlaceholderPage title="마켓 생성 (F-01)" />}
                />
                <Route
                  path="/admin/resolve/:id"
                  element={<PlaceholderPage title="결과 확정 (F-03)" />}
                />
                <Route
                  path="/admin/settings"
                  element={<PlaceholderPage title="설정 관리 (F-12)" />}
                />
                <Route
                  path="*"
                  element={<PlaceholderPage title="페이지를 찾을 수 없습니다" />}
                />
              </Routes>
            </div>

            <Footer />
            <MobileNav />
          </div>
        </ToastProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
