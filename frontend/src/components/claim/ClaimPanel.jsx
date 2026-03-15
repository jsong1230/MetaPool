/**
 * ClaimPanel — 결과 표시 + 클레임/환불 버튼 (F-21)
 * Resolved: 승리 방향 시각화 + claimWinnings
 * Voided: 무효 표시 + claimRefund
 */
import { useState, useEffect } from 'react';
import { Gift, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatMeta } from '../../lib/format.js';
import { getReadContract } from '../../lib/contract.js';
import { PoolBar } from '../common/PoolBar.jsx';

/**
 * @param {{
 *   market: object,
 *   account: string|null,
 *   txState: string,
 *   txHash: string|null,
 *   txError: string|null,
 *   onClaimWinnings: () => void,
 *   onClaimRefund: () => void,
 * }} props
 */
export function ClaimPanel({
  market,
  account,
  txState,
  txHash,
  txError,
  onClaimWinnings,
  onClaimRefund,
}) {
  const [userBet, setUserBet] = useState(null);
  const [winnings, setWinnings] = useState(null);

  const isPending = txState === 'pending' || txState === 'confirming';
  const isSuccess = txState === 'success';

  // 사용자 베팅 + 예상 수령액 조회
  useEffect(() => {
    if (!account || !market) return;

    const fetchData = async () => {
      try {
        const contract = getReadContract();

        const [betRaw, winningsRaw] = await Promise.allSettled([
          contract.getUserBet(market.id, account),
          market.status === 2 ? contract.calculateWinnings(market.id, account) : Promise.resolve(0n),
        ]);

        if (betRaw.status === 'fulfilled') {
          setUserBet({
            amount: betRaw.value.amount,
            isYes: betRaw.value.isYes,
            claimed: betRaw.value.claimed,
          });
        }

        if (winningsRaw.status === 'fulfilled') {
          setWinnings(winningsRaw.value);
        }
      } catch {
        // 데이터 조회 실패 무시
      }
    };

    fetchData();
  }, [account, market, txState]);

  if (!market) return null;

  const isResolved = market.status === 2;
  const isVoided = market.status === 3;

  if (!isResolved && !isVoided) return null;

  const outcomeIsYes = market.outcome === 1; // 1 = Yes 승리
  const outcomeIsNo = market.outcome === 2;  // 2 = No 승리

  // 클레임 가능 여부
  const canClaim = account && userBet && !userBet.claimed;
  const isWinner = isResolved && userBet &&
    ((outcomeIsYes && userBet.isYes) || (outcomeIsNo && !userBet.isYes));
  const canRefund = isVoided && canClaim;

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-4">
      {/* 결과 헤더 */}
      {isResolved && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            확정 결과
          </h3>
          <div className={`
            px-3 py-1 rounded-sm text-sm font-bold uppercase tracking-[0.08em]
            ${outcomeIsYes ? 'bg-yes-muted text-yes' : outcomeIsNo ? 'bg-no-muted text-no' : 'bg-border-default text-text-muted'}
          `}>
            {outcomeIsYes ? 'YES 승리' : outcomeIsNo ? 'NO 승리' : '결과 없음'}
          </div>
        </div>
      )}

      {isVoided && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            마켓 상태
          </h3>
          <div className="px-3 py-1 rounded-sm text-sm font-bold bg-[rgba(100,116,139,0.1)] text-void uppercase tracking-[0.08em]">
            무효 처리됨
          </div>
        </div>
      )}

      {/* 최종 풀 비율 */}
      <PoolBar yesPool={market.yesPool} noPool={market.noPool} />

      {/* 승리/패배 하이라이트 */}
      {isResolved && (
        <div className="grid grid-cols-2 gap-3">
          {/* Yes 풀 */}
          <div className={`
            rounded-lg p-3 border
            ${outcomeIsYes
              ? 'bg-yes-muted border-yes'
              : 'bg-bg-elevated border-border-subtle opacity-60'
            }
          `}>
            <p className="text-xs text-text-muted mb-1">YES 풀</p>
            <p className={`text-base font-bold tabular-nums ${outcomeIsYes ? 'text-yes' : 'text-text-secondary'}`}>
              {formatMeta(market.yesPool)} META
            </p>
            <p className="text-xs text-text-muted">{market.yesCount}명 참여</p>
          </div>

          {/* No 풀 */}
          <div className={`
            rounded-lg p-3 border
            ${outcomeIsNo
              ? 'bg-no-muted border-no'
              : 'bg-bg-elevated border-border-subtle opacity-60'
            }
          `}>
            <p className="text-xs text-text-muted mb-1">NO 풀</p>
            <p className={`text-base font-bold tabular-nums ${outcomeIsNo ? 'text-no' : 'text-text-secondary'}`}>
              {formatMeta(market.noPool)} META
            </p>
            <p className="text-xs text-text-muted">{market.noCount}명 참여</p>
          </div>
        </div>
      )}

      {/* 사용자 베팅 정보 */}
      {account && userBet && userBet.amount > 0n && (
        <div className="bg-bg-elevated rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">내 베팅</p>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">베팅 방향</span>
            <span className={`font-bold tracking-[0.04em] ${userBet.isYes ? 'text-yes' : 'text-no'}`}>
              {userBet.isYes ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">베팅 금액</span>
            <span className="tabular-nums font-medium text-text-primary">
              {formatMeta(userBet.amount)} META
            </span>
          </div>
          {isResolved && winnings !== null && winnings > 0n && isWinner && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">예상 수령액</span>
              <span className="tabular-nums font-bold text-yes">
                {formatMeta(winnings)} META
              </span>
            </div>
          )}
        </div>
      )}

      {/* 에러 */}
      {txError && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-danger text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{txError}</span>
        </div>
      )}

      {/* 클레임 성공 */}
      {isSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-success text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>{txState === 'success' ? '클레임 완료!' : '처리 완료!'}</span>
          {txHash && (
            <a
              href={`#tx-${txHash}`}
              className="ml-auto text-xs text-brand-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tx 확인
            </a>
          )}
        </div>
      )}

      {/* 클레임 버튼 영역 */}
      {!account && (
        <p className="text-sm text-text-muted text-center py-2">
          클레임하려면 지갑을 연결해 주세요
        </p>
      )}

      {account && isResolved && isWinner && !userBet?.claimed && !isSuccess && (
        <button
          onClick={onClaimWinnings}
          disabled={isPending}
          className="
            w-full flex items-center justify-center gap-2
            bg-yes hover:bg-yes-hover
            text-white font-semibold
            px-6 py-3 rounded-md
            text-base uppercase tracking-[0.04em]
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            active:shadow-yes
          "
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {txState === 'pending' ? '서명 대기...' : '처리 중...'}
            </>
          ) : (
            <>
              <Gift className="w-4 h-4" strokeWidth={1.5} />
              보상 클레임
            </>
          )}
        </button>
      )}

      {account && canRefund && !isSuccess && (
        <button
          onClick={onClaimRefund}
          disabled={isPending}
          className="
            w-full flex items-center justify-center gap-2
            bg-transparent border border-border-strong
            text-text-secondary hover:text-text-primary hover:border-brand-primary
            font-medium
            px-6 py-3 rounded-md
            text-base
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
              원금 환불
            </>
          )}
        </button>
      )}

      {/* 이미 클레임 완료 */}
      {account && userBet?.claimed && (
        <div className="flex items-center justify-center gap-2 py-2 text-success text-sm">
          <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
          <span>이미 클레임 완료</span>
        </div>
      )}
    </div>
  );
}
