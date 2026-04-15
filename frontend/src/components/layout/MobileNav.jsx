/**
 * MobileNav — 모바일 하단 탭바
 */
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Wallet, History, Trophy, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet.js';

export function MobileNav() {
  const { isConnected, connectWallet } = useWallet();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { to: '/markets',    labelKey: 'nav.markets',     icon: LayoutGrid, requiresWallet: false },
    { to: '/my-bets',    labelKey: 'nav.myBets',      icon: Wallet,     requiresWallet: true  },
    { to: '/history',    labelKey: 'nav.history',     icon: History,    requiresWallet: false },
    { to: '/leaderboard',labelKey: 'nav.leaderboard', icon: Trophy,     requiresWallet: false },
    { to: '/profile',    labelKey: 'nav.profile',     icon: User,       requiresWallet: true  },
  ];

  const handleProtectedClick = (e, item) => {
    if (item.requiresWallet && !isConnected) {
      e.preventDefault();
      connectWallet();
    }
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-bg-primary border-t border-border-default
        flex md:hidden
        safe-area-inset-bottom
      "
      aria-label="mobile navigation"
    >
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const label = t(item.labelKey);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={(e) => handleProtectedClick(e, item)}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center
              py-2 gap-0.5 min-h-[56px]
              transition-colors duration-150
              ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-text-secondary'}
            `}
            aria-label={label}
          >
            <Icon className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
