/**
 * WalletContext — 지갑 연결 상태 전역 공유
 * F-13: MetaMask 연결, 네트워크 감지, 잔액 표시, 이벤트 리스닝
 */
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { ACTIVE_NETWORK, ALLOWED_CHAIN_IDS, POLL_INTERVAL_BALANCE } from '../lib/constants.js';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null); // wei bigint
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const balancePollRef = useRef(null);

  // 현재 체인이 허용된 네트워크인지 확인
  const isCorrectNetwork = chainId !== null && ALLOWED_CHAIN_IDS.includes(chainId);

  // 잔액 조회
  const fetchBalance = useCallback(async (address) => {
    if (!address || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(address);
      setBalance(bal);
    } catch {
      // 잔액 조회 실패는 무시 (네트워크 변경 중일 수 있음)
    }
  }, []);

  // 주기적 잔액 폴링 시작
  const startBalancePoll = useCallback((address) => {
    if (balancePollRef.current) clearInterval(balancePollRef.current);
    fetchBalance(address);
    balancePollRef.current = setInterval(() => fetchBalance(address), POLL_INTERVAL_BALANCE);
  }, [fetchBalance]);

  // 잔액 폴링 중지
  const stopBalancePoll = useCallback(() => {
    if (balancePollRef.current) {
      clearInterval(balancePollRef.current);
      balancePollRef.current = null;
    }
  }, []);

  // 지갑 연결
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask가 설치되어 있지 않습니다. MetaMask를 설치해 주세요.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);

      if (accounts.length === 0) {
        setError('연결된 계정이 없습니다');
        return;
      }

      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      setAccount(accounts[0]);
      setChainId(currentChainId);
      setIsConnected(true);

      startBalancePoll(accounts[0]);

      // 잘못된 네트워크면 전환 요청
      if (!ALLOWED_CHAIN_IDS.includes(currentChainId)) {
        await switchNetwork();
      }
    } catch (err) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setError('연결 요청이 거부되었습니다');
      } else {
        setError(err.message || '지갑 연결에 실패했습니다');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [startBalancePoll]);

  // 지갑 연결 해제 (로컬 상태만 초기화, MetaMask 실제 해제는 불가)
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setBalance(null);
    setChainId(null);
    setIsConnected(false);
    setError(null);
    stopBalancePoll();
  }, [stopBalancePoll]);

  // 네트워크 전환 요청
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ACTIVE_NETWORK.chainId }],
      });
    } catch (switchErr) {
      // 네트워크가 MetaMask에 등록되어 있지 않은 경우 추가 시도
      if (switchErr.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ACTIVE_NETWORK],
          });
        } catch (addErr) {
          setError('네트워크 추가에 실패했습니다: ' + addErr.message);
        }
      } else if (switchErr.code !== 4001 && switchErr.code !== 'ACTION_REJECTED') {
        setError('네트워크 전환에 실패했습니다: ' + switchErr.message);
      }
    }
  }, []);

  // MetaMask 이벤트 리스닝 설정
  useEffect(() => {
    if (!window.ethereum) return;

    // 계정 변경 감지
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // MetaMask에서 연결 해제
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        startBalancePoll(accounts[0]);
      }
    };

    // 체인 변경 감지
    const handleChainChanged = (chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      // 체인 변경 후 잔액 갱신
      if (account) fetchBalance(account);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // 이미 연결된 계정 감지 (페이지 새로고침 후 복원)
    const checkExistingConnection = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          setAccount(accounts[0]);
          setChainId(Number(network.chainId));
          setIsConnected(true);
          startBalancePoll(accounts[0]);
        }
      } catch {
        // 무시
      }
    };

    checkExistingConnection();

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      stopBalancePoll();
    };
  }, []); // 초기 마운트 시 1회 실행

  const value = {
    account,
    balance,
    chainId,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    setError,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
