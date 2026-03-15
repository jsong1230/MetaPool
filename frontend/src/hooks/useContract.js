/**
 * useContract — read/write 컨트랙트 인스턴스 관리 훅
 */
import { useState, useEffect, useCallback } from 'react';
import { getReadContract, getWriteContract } from '../lib/contract.js';
import { useWallet } from './useWallet.js';

export function useContract() {
  const { isConnected, account } = useWallet();
  const [readContract, setReadContract] = useState(null);
  const [writeContract, setWriteContract] = useState(null);
  const [contractError, setContractError] = useState(null);

  // 읽기 전용 컨트랙트 초기화
  useEffect(() => {
    try {
      const contract = getReadContract();
      setReadContract(contract);
      setContractError(null);
    } catch (err) {
      setContractError(err.message);
    }
  }, []);

  // 쓰기 컨트랙트 초기화 (지갑 연결 시)
  const initWriteContract = useCallback(async () => {
    if (!isConnected || !account) {
      setWriteContract(null);
      return;
    }
    try {
      const contract = await getWriteContract();
      setWriteContract(contract);
    } catch (err) {
      setContractError(err.message);
    }
  }, [isConnected, account]);

  useEffect(() => {
    initWriteContract();
  }, [initWriteContract]);

  return { readContract, writeContract, contractError };
}
