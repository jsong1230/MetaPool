/**
 * AdminMarketTable — 관리자 마켓 목록 테이블
 * 전체 상태(Active/Closed/Resolved/Voided/Paused) 일람
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Pause, Play, Check } from 'lucide-react';
import { CategoryTag } from '../common/CategoryTag.jsx';
import { ResolveModal } from './ResolveModal.jsx';
import { CATEGORIES, MARKET_STATUS, MARKET_OUTCOME } from '../../lib/constants.js';
import { formatMeta, formatDate, getLocalizedQuestion } from '../../lib/format.js';
import { parseContractError } from '../../lib/contract.js';
import { useToast } from '../common/Toast.jsx';
import { useTranslation } from 'react-i18next';
import { TX_STATUS } from '../../hooks/useCreateMarket.js';

// 상태 배지 스타일
const STATUS_BADGE = {
  Active:   'bg-yes-muted text-yes',
  Closed:   'bg-[rgba(245,158,11,0.1)] text-warning',
  Resolved: 'bg-brand-primary-muted text-brand-primary',
  Voided:   'bg-[rgba(100,116,139,0.1)] text-void',
  Paused:   'bg-[rgba(245,158,11,0.1)] text-warning',
};

const OUTCOME_LABEL = {
  0: '—',
  1: 'YES',
  2: 'NO',
  3: 'VOID',
};

const OUTCOME_COLOR = {
  1: 'text-yes font-bold',
  2: 'text-no font-bold',
  3: 'text-void font-medium',
};

/**
 * @param {{
 *   markets: object[],
 *   onPause: (id: number) => Promise<void>,
 *   onResume: (id: number, newBetting: number, newResolution: number) => Promise<void>,
 *   onResolve: (id: number, outcome: number) => Promise<void>,
 *   onRefetch: () => void
 * }} props
 */
export function AdminMarketTable({ markets, onPause, onResume, onResolve, onRefetch }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const [resolveTarget, setResolveTarget] = useState(null); // 결과 확정 모달 대상 마켓
  const [resolveTxStatus, setResolveTxStatus] = useState(TX_STATUS.IDLE);
  const [resolveTxError, setResolveTxError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null); // pause/resume 로딩

  // 결과 확정 처리
  const handleResolve = useCallback(async (marketId, outcome) => {
    setResolveTxStatus(TX_STATUS.PENDING);
    setResolveTxError(null);
    try {
      setResolveTxStatus(TX_STATUS.CONFIRMING);
      await onResolve(marketId, outcome);
      setResolveTxStatus(TX_STATUS.SUCCESS);
      toast.success(t('admin.toast.resolved', { id: marketId }));
      setResolveTarget(null);
      onRefetch();
    } catch (err) {
      const parsed = parseContractError(err);
      setResolveTxError(parsed.message);
      setResolveTxStatus(TX_STATUS.ERROR);
    }
  }, [onResolve, toast, onRefetch]);

  // Pause/Resume 처리
  const handlePause = useCallback(async (market) => {
    setActionLoadingId(market.id);
    try {
      await onPause(market.id);
      toast.success(t('admin.toast.paused', { id: market.id }));
      onRefetch();
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    } finally {
      setActionLoadingId(null);
    }
  }, [onPause, toast, onRefetch]);

  const handleResume = useCallback(async (market) => {
    // 새 마감 시간: 현재 시각 + 24시간 / + 48시간
    const now = Math.floor(Date.now() / 1000);
    const newBetting = now + 24 * 3600;
    const newResolution = now + 48 * 3600;
    setActionLoadingId(market.id);
    try {
      await onResume(market.id, newBetting, newResolution);
      toast.success(t('admin.toast.resumed', { id: market.id }));
      onRefetch();
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    } finally {
      setActionLoadingId(null);
    }
  }, [onResume, toast, onRefetch]);

  if (markets.length === 0) {
    return (
      <div className="
        bg-bg-surface border border-border-default rounded-lg
        p-8 text-center
      ">
        <p className="text-text-muted text-sm">{t('admin.table.empty')}</p>
      </div>
    );
  }

  return (
    <>
      {/* 테이블 (데스크톱) */}
      <div className="hidden lg:block overflow-x-auto rounded-lg border border-border-default">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-surface border-b border-border-default">
              <th className="text-left px-4 py-3 text-text-muted font-medium">ID</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">{t('admin.table.question')}</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">{t('admin.table.category')}</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">{t('admin.table.status')}</th>
              <th className="text-left px-4 py-3 text-text-muted font-medium">{t('admin.table.outcome')}</th>
              <th className="text-right px-4 py-3 text-text-muted font-medium">{t('admin.table.pool')}</th>
              <th className="text-center px-4 py-3 text-text-muted font-medium">{t('admin.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market, idx) => {
              const isLast = idx === markets.length - 1;
              const totalPool = (market.yesPool || 0n) + (market.noPool || 0n);
              const question = getLocalizedQuestion(market, i18n.language);
              const statusBadge = STATUS_BADGE[market.statusName] || 'bg-border-default text-text-muted';
              const isActive = market.status === 0;
              const isPaused = market.status === 4;
              const isResolvable = market.status === 0 || market.status === 1; // Active or Closed
              const isLoading = actionLoadingId === market.id;

              return (
                <tr
                  key={market.id}
                  className={`
                    bg-bg-primary hover:bg-bg-surface
                    transition-colors duration-150
                    cursor-pointer
                    ${!isLast ? 'border-b border-border-subtle' : ''}
                  `}
                  onClick={() => navigate(`/market/${market.id}`)}
                >
                  <td className="px-4 py-3 text-text-muted tabular-nums">#{market.id}</td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <p className="text-text-primary truncate">{question}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {formatDate(market.bettingDeadline)} {t('admin.table.deadline')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <CategoryTag category={market.category} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      inline-flex items-center gap-1
                      px-2 py-0.5 rounded-sm
                      text-xs font-semibold uppercase tracking-wide
                      ${statusBadge}
                    `}>
                      {market.status === 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yes animate-pulse-dot" />
                      )}
                      {market.statusName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`tabular-nums ${OUTCOME_COLOR[market.outcome] || 'text-text-muted'}`}>
                      {OUTCOME_LABEL[market.outcome]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-secondary">
                    {formatMeta(totalPool)} META
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {/* Pause 버튼 (Active 상태만) */}
                      {isActive && (
                        <button
                          onClick={() => handlePause(market)}
                          disabled={isLoading}
                          title={t('admin.actions.pauseTitle')}
                          className="
                            p-1.5 rounded-md
                            bg-[rgba(245,158,11,0.1)] text-warning
                            hover:bg-[rgba(245,158,11,0.2)]
                            transition-colors duration-150
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        >
                          {isLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                            : <Pause className="w-4 h-4" strokeWidth={2} />
                          }
                        </button>
                      )}

                      {/* Resume 버튼 (Paused 상태만) */}
                      {isPaused && (
                        <button
                          onClick={() => handleResume(market)}
                          disabled={isLoading}
                          title={t('admin.actions.resumeTitle')}
                          className="
                            p-1.5 rounded-md
                            bg-yes-muted text-yes
                            hover:bg-[rgba(16,185,129,0.2)]
                            transition-colors duration-150
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        >
                          {isLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                            : <Play className="w-4 h-4" strokeWidth={2} />
                          }
                        </button>
                      )}

                      {/* 결과 확정 버튼 (Active/Closed 상태만) */}
                      {isResolvable && (
                        <button
                          onClick={() => setResolveTarget(market)}
                          title={t('admin.actions.resolveTitle')}
                          className="
                            p-1.5 rounded-md
                            bg-brand-primary-muted text-brand-primary
                            hover:bg-[rgba(99,102,241,0.2)]
                            transition-colors duration-150
                          "
                        >
                          <Check className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 카드 리스트 (모바일) */}
      <div className="lg:hidden flex flex-col gap-3">
        {markets.map((market) => {
          const totalPool = (market.yesPool || 0n) + (market.noPool || 0n);
          const question = getLocalizedQuestion(market, i18n.language);
          const statusBadge = STATUS_BADGE[market.statusName] || 'bg-border-default text-text-muted';
          const isActive = market.status === 0;
          const isPaused = market.status === 4;
          const isResolvable = market.status === 0 || market.status === 1;
          const isLoading = actionLoadingId === market.id;

          return (
            <div
              key={market.id}
              className="
                bg-bg-surface border border-border-default rounded-lg
                p-4 cursor-pointer
                hover:border-border-strong
                transition-colors duration-200
              "
              onClick={() => navigate(`/market/${market.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-xs tabular-nums">#{market.id}</span>
                  <CategoryTag category={market.category} />
                </div>
                <span className={`
                  inline-flex items-center gap-1
                  px-2 py-0.5 rounded-sm
                  text-xs font-semibold uppercase tracking-wide
                  shrink-0
                  ${statusBadge}
                `}>
                  {market.statusName}
                </span>
              </div>

              <p className="text-sm text-text-primary line-clamp-2 mb-3">{question}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted tabular-nums">
                  {formatMeta(totalPool)} META
                </span>

                {/* 액션 버튼 */}
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isActive && (
                    <button
                      onClick={() => handlePause(market)}
                      disabled={isLoading}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-[rgba(245,158,11,0.1)] text-warning
                        hover:bg-[rgba(245,158,11,0.2)]
                        flex items-center gap-1
                        disabled:opacity-50
                      "
                    >
                      <Pause className="w-3 h-3" strokeWidth={2} />
                      {t('admin.actions.pause')}
                    </button>
                  )}
                  {isPaused && (
                    <button
                      onClick={() => handleResume(market)}
                      disabled={isLoading}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-yes-muted text-yes
                        hover:bg-[rgba(16,185,129,0.2)]
                        flex items-center gap-1
                        disabled:opacity-50
                      "
                    >
                      <Play className="w-3 h-3" strokeWidth={2} />
                      {t('admin.actions.resume')}
                    </button>
                  )}
                  {isResolvable && (
                    <button
                      onClick={() => setResolveTarget(market)}
                      className="
                        px-3 py-1.5 rounded-md text-xs font-medium
                        bg-brand-primary-muted text-brand-primary
                        hover:bg-[rgba(99,102,241,0.2)]
                        flex items-center gap-1
                      "
                    >
                      <Check className="w-3 h-3" strokeWidth={2} />
                      {t('admin.actions.resolve')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 결과 확정 모달 */}
      {resolveTarget && (
        <ResolveModal
          market={resolveTarget}
          onClose={() => {
            setResolveTarget(null);
            setResolveTxStatus(TX_STATUS.IDLE);
            setResolveTxError(null);
          }}
          onResolve={handleResolve}
          txStatus={resolveTxStatus}
          txError={resolveTxError}
        />
      )}
    </>
  );
}
