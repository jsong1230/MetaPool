/**
 * ConnectWallet — 지갑 연결 버튼 (F-13)
 * MetaMask 미설치 / 미연결 / 연결됨 상태 처리
 */
import { Wallet, AlertTriangle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet.js';
import { shortenAddress, formatMeta } from '../../lib/format.js';

/**
 * @param {{ size?: 'sm' | 'md' | 'lg', className?: string }} props
 */
export function ConnectWallet({ size = 'md', className = '' }) {
  const { t } = useTranslation();
  const {
    account,
    balance,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
  } = useWallet();

  const isMetaMaskInstalled = typeof window !== 'undefined' && !!window.ethereum;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-base font-semibold',
  }[size];

  // MetaMask 미설치
  if (!isMetaMaskInstalled) {
    return (
      <a
        href="https://metamask.io"
        target="_blank"
        rel="noopener noreferrer"
        className={`
          inline-flex items-center gap-2
          bg-transparent border border-border-default
          text-text-secondary hover:text-text-primary hover:border-border-strong
          rounded-xl transition-colors duration-150
          ${sizeClasses} ${className}
        `}
      >
        <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
        {t('wallet.install')}
      </a>
    );
  }

  // 연결됨 + 잘못된 네트워크
  if (isConnected && !isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className={`
          inline-flex items-center gap-2
          bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)]
          text-warning hover:bg-[rgba(245,158,11,0.15)]
          rounded-xl transition-colors duration-150
          ${sizeClasses} ${className}
        `}
      >
        <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
        {t('wallet.switchNetwork')}
      </button>
    );
  }

  // 연결됨 + 올바른 네트워크
  if (isConnected && account) {
    return (
      <div
        className={`
          inline-flex items-center gap-2
          bg-bg-surface border border-border-default
          text-text-primary rounded-xl
          ${sizeClasses} ${className}
        `}
      >
        <div className="w-2 h-2 rounded-full bg-yes animate-pulse-dot shrink-0" />
        <span className="font-mono text-sm tabular-nums">
          {shortenAddress(account)}
        </span>
        {balance !== null && (
          <span className="text-brand-accent font-semibold tabular-nums text-sm ml-1">
            {formatMeta(balance)} META
          </span>
        )}
      </div>
    );
  }

  // 연결 중
  if (isConnecting) {
    return (
      <button
        disabled
        className={`
          inline-flex items-center gap-2
          bg-brand-primary opacity-70 cursor-not-allowed
          text-white rounded-xl
          ${sizeClasses} ${className}
        `}
      >
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {t('wallet.connecting')}
      </button>
    );
  }

  // 미연결
  return (
    <button
      onClick={connectWallet}
      className={`
        inline-flex items-center gap-2
        bg-brand-primary hover:bg-brand-primary-hover
        text-white rounded-xl transition-colors duration-150
        font-medium
        ${sizeClasses} ${className}
      `}
    >
      <Wallet className="w-4 h-4" strokeWidth={1.5} />
      {t('wallet.connect')}
    </button>
  );
}
