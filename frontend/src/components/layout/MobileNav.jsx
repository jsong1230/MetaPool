/**
 * MobileNav — 모바일 하단 탭바
 * navigation.md §4.2 기준 (모바일 768px 미만)
 */
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Wallet, History, Trophy, User } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet.js';

const NAV_ITEMS = [
  { to: '/', label: '마켓', icon: LayoutGrid, requiresWallet: false },
  { to: '/my-bets', label: '내 베팅', icon: Wallet, requiresWallet: true },
  { to: '/history', label: '히스토리', icon: History, requiresWallet: false },
  { to: '/leaderboard', label: '리더보드', icon: Trophy, requiresWallet: false },
  { to: '/profile', label: '프로필', icon: User, requiresWallet: true },
];

export function MobileNav() {
  const { isConnected, connectWallet } = useWallet();

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
        bg-bg-secondary border-t border-border-default
        flex md:hidden
        safe-area-inset-bottom
      "
      aria-label="모바일 탭 네비게이션"
    >
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={(e) => handleProtectedClick(e, item)}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center
              py-2 gap-0.5 min-h-[56px]
              transition-colors duration-150
              ${isActive
                ? 'text-brand-primary'
                : 'text-text-muted hover:text-text-secondary'
              }
            `}
            aria-label={item.label}
          >
            <Icon className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
