/**
 * useCreateMarket — 마켓 생성 트랜잭션 훅 (F-01)
 * createMarket 컨트랙트 함수 호출
 */
import { useState, useCallback } from 'react';
import { getWriteContract, parseContractError } from '../lib/contract.js';

// 트랜잭션 상태 단계
export const TX_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',       // 서명 대기
  CONFIRMING: 'confirming', // 블록 확인 대기
  SUCCESS: 'success',
  ERROR: 'error',
};

export function useCreateMarket() {
  const [txStatus, setTxStatus] = useState(TX_STATUS.IDLE);
  const [txHash, setTxHash] = useState(null);
  const [createdMarketId, setCreatedMarketId] = useState(null);
  const [txError, setTxError] = useState(null);

  const createMarket = useCallback(async ({
    question,
    questionKo,
    questionZh,
    questionJa,
    category,       // 0~5 숫자
    bettingDeadline,    // Unix timestamp (초)
    resolutionDeadline, // Unix timestamp (초)
  }) => {
    setTxStatus(TX_STATUS.PENDING);
    setTxHash(null);
    setCreatedMarketId(null);
    setTxError(null);

    try {
      const contract = await getWriteContract();

      setTxStatus(TX_STATUS.PENDING);
      const tx = await contract.createMarket(
        question,
        questionKo || '',
        questionZh || '',
        questionJa || '',
        category,
        bettingDeadline,
        resolutionDeadline
      );

      setTxHash(tx.hash);
      setTxStatus(TX_STATUS.CONFIRMING);

      const receipt = await tx.wait();

      // MarketCreated 이벤트에서 marketId 추출
      let marketId = null;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed && parsed.name === 'MarketCreated') {
              marketId = Number(parsed.args.marketId);
              break;
            }
          } catch {
            // 파싱 실패 시 무시
          }
        }
      }

      setCreatedMarketId(marketId);
      setTxStatus(TX_STATUS.SUCCESS);
      return { success: true, marketId };
    } catch (err) {
      const parsed = parseContractError(err);
      setTxError(parsed.message);
      setTxStatus(TX_STATUS.ERROR);
      return { success: false, error: parsed.message };
    }
  }, []);

  const reset = useCallback(() => {
    setTxStatus(TX_STATUS.IDLE);
    setTxHash(null);
    setCreatedMarketId(null);
    setTxError(null);
  }, []);

  return {
    createMarket,
    txStatus,
    txHash,
    createdMarketId,
    txError,
    reset,
    isLoading: txStatus === TX_STATUS.PENDING || txStatus === TX_STATUS.CONFIRMING,
  };
}
