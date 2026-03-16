/**
 * useOwner — 현재 계정이 컨트랙트 owner인지 확인하는 경량 훅
 * Header에서 Admin 링크 노출 여부에 사용
 */
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getReadContract } from '../lib/contract.js';
import { RPC_URL } from '../lib/constants.js';
import { useWallet } from './useWallet.js';

export function useOwner() {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        let contract;
        try {
          contract = getReadContract();
        } catch {
          return;
        }

        const owner = await contract.owner();

        let currentAccount = account;
        // 로컬 개발: Account #0 사용
        if (!currentAccount) {
          const isLocal = RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost');
          if (isLocal) {
            try {
              const provider = new ethers.JsonRpcProvider(RPC_URL);
              const signer = await provider.getSigner(0);
              currentAccount = await signer.getAddress();
            } catch {
              return;
            }
          }
        }

        if (!cancelled && currentAccount) {
          setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase());
        }
      } catch {
        // 무시
      }
    };

    check();
    return () => { cancelled = true; };
  }, [account]);

  return { isOwner };
}
