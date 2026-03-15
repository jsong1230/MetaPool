/**
 * useWallet — WalletContext 소비 편의 훅
 */
import { useContext } from 'react';
import { WalletContext } from '../contexts/WalletContext.jsx';

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet는 WalletProvider 내부에서 사용해야 합니다');
  }
  return ctx;
}
