/**
 * Header — 로고 + 지갑 연결 버튼 + 연결 상태 (F-13)
 * navigation.md §4.1 헤더 구조 기준
 */
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConnectWallet } from '../common/ConnectWallet.jsx';
import { LanguageSelector } from '../common/LanguageSelector.jsx';
import { useWallet } from '../../hooks/useWallet.js';
import { useOwner } from '../../hooks/useOwner.js';

export function Header() {
  const { isConnected, isCorrectNetwork, switchNetwork } = useWallet();
  const { isOwner } = useOwner();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="
      sticky top-0 z-40
      glass
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
          <span>{t('wallet.wrongNetwork')}</span>
          <button
            onClick={switchNetwork}
            className="underline font-medium hover:no-underline"
          >
            {t('wallet.switchNetwork')}
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
              w-7 h-7 rounded-lg
              flex items-center justify-center
              font-bold text-sm
              bg-brand-primary text-text-inverse
            ">
              M
            </div>
            <span className="font-bold text-lg tracking-[-0.02em] text-brand-primary">
              MetaPool
            </span>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="주 네비게이션"
          >
            <NavLink to="/">{t('nav.markets')}</NavLink>
            <NavLink to="/history">{t('nav.history')}</NavLink>
            <NavLink to="/leaderboard">{t('nav.leaderboard')}</NavLink>
            {isOwner && (
              <Link
                to="/admin"
                className="
                  flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium
                  text-brand-primary hover:bg-brand-primary-muted
                  transition-colors duration-150
                "
              >
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
                {t('nav.admin')}
              </Link>
            )}
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
