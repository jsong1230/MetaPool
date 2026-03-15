/**
 * Header — 로고 + 지갑 연결 버튼 + 연결 상태 (F-13)
 * navigation.md §4.1 헤더 구조 기준
 */
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { ConnectWallet } from '../common/ConnectWallet.jsx';
import { LanguageSelector } from '../common/LanguageSelector.jsx';
import { useWallet } from '../../hooks/useWallet.js';

export function Header() {
  const { isConnected, isCorrectNetwork, switchNetwork } = useWallet();
  const navigate = useNavigate();

  return (
    <header className="
      sticky top-0 z-40
      bg-bg-secondary border-b border-border-default
      shadow-elevation-1
    ">
      {/* 잘못된 네트워크 배너 */}
      {isConnected && !isCorrectNetwork && (
        <div className="
          bg-[rgba(245,158,11,0.1)] border-b border-[rgba(245,158,11,0.2)]
          px-4 py-2
          flex items-center justify-center gap-2
          text-warning text-sm
        ">
          <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>잘못된 네트워크에 연결되어 있습니다.</span>
          <button
            onClick={switchNetwork}
            className="underline font-medium hover:no-underline"
          >
            네트워크 전환
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* 로고 */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
            aria-label="MetaPool 홈으로"
          >
            <div className="
              w-7 h-7 rounded-md
              bg-brand-primary
              flex items-center justify-center
              text-white font-bold text-sm
            ">
              M
            </div>
            <span className="font-bold text-text-primary text-lg tracking-[-0.02em]">
              MetaPool
            </span>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="주 네비게이션"
          >
            <NavLink to="/">마켓</NavLink>
            <NavLink to="/history">히스토리</NavLink>
            <NavLink to="/leaderboard">리더보드</NavLink>
          </nav>

          {/* 우측: 언어 선택 + 지갑 연결 */}
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ConnectWallet size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * 헤더 내비게이션 링크
 */
function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="
        px-3 py-2 rounded-md text-sm font-medium
        text-text-secondary hover:text-text-primary hover:bg-bg-surface
        transition-colors duration-150
      "
    >
      {children}
    </Link>
  );
}
