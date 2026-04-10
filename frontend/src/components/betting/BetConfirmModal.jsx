/**
 * BetConfirmModal — 베팅 최종 확인 모달 (F-20)
 * 마켓 질문, 방향, 금액, 배당률, 예상 수익 표시
 * "서명 & 베팅" → MetaMask 트랜잭션 서명
 * design-system.md §7.4 BetConfirmModal 구조 기준
 */
import { useEffect, useRef } from 'react';
import { X, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMeta, formatOdds } from '../../lib/format.js';

/**
 * @param {{
 *   isOpen: boolean,
 *   market: object,
 *   selectedSide: 'yes'|'no',
 *   amountMeta: number,
 *   amountWei: bigint,
 *   yesOdds: bigint|null,
 *   noOdds: bigint|null,
 *   potentialWinnings: object|null,
 *   txState: string,
 *   txError: string|null,
 *   onConfirm: () => void,
 *   onClose: () => void,
 * }} props
 */
export function BetConfirmModal({
  isOpen,
  market,
  selectedSide,
  amountMeta,
  amountWei,
  yesOdds,
  noOdds,
  potentialWinnings,
  txState,
  txError,
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation();
  const firstFocusableRef = useRef(null);

  // 포커스 트랩
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // ESC 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !market || !selectedSide) return null;

  const isYes = selectedSide === 'yes';
  const odds = isYes ? yesOdds : noOdds;
  const isPending = txState === 'pending' || txState === 'confirming';

  return (
    <>
      {/* 오버레이 + 모달 컨테이너 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center overflow-y-auto p-4 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-label="베팅 확인"
        aria-modal="true"
      >
      {/* 모달 패널 */}
      <div
        className="
          w-full sm:max-w-md
          bg-bg-elevated border border-border-default rounded-xl
          p-6 shadow-elevation-3
          animate-slide-up sm:animate-fade-scale
          my-auto
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text-primary">{t('betting.confirmTitle')}</h2>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            disabled={isPending}
            className="
              text-text-muted hover:text-text-secondary
              transition-colors duration-150 p-1 rounded-md hover:bg-bg-surface
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="모달 닫기"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 마켓 질문 */}
        <p className="text-sm text-text-secondary mb-4 line-clamp-2 leading-relaxed">
          {market.question}
        </p>

        {/* 구분선 */}
        <div className="border-t border-border-subtle mb-4" />

        {/* 확인 정보 그리드 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 방향 */}
          <div className="bg-bg-surface rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">{t('betting.direction')}</p>
            <p className={`text-2xl font-black tracking-[0.08em] ${isYes ? 'text-yes' : 'text-no'}`}>
              {isYes ? 'YES' : 'NO'}
            </p>
          </div>

          {/* 베팅 금액 */}
          <div className="bg-bg-surface rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">{t('betting.betAmount')}</p>
            <p className="text-xl font-bold tabular-nums text-text-primary">
              {amountMeta.toLocaleString()}
            </p>
            <p className="text-xs text-text-muted">META</p>
          </div>

          {/* 현재 배당률 */}
          <div className="bg-bg-surface rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" strokeWidth={1.5} />
              {t('betting.currentOdds')}
            </p>
            <p className="text-xl font-bold tabular-nums text-brand-accent">
              {odds ? formatOdds(odds) : '--'}
            </p>
          </div>

          {/* 예상 수익 */}
          <div className="bg-bg-surface rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">{t('betting.expectedPayout')}</p>
            {potentialWinnings && amountWei > 0n ? (
              <>
                <p className="text-xl font-bold tabular-nums text-yes">
                  {formatMeta(potentialWinnings.winnings)}
                </p>
                <p className="text-xs text-text-muted">
                  META ({potentialWinnings.multiplier}x)
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-text-muted">--</p>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {txError && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-danger text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{txError}</span>
          </div>
        )}

        {/* 수수료 안내 */}
        <p className="text-xs text-text-muted mb-5">
          * {t('betting.oddsNote')}
        </p>

        {/* 버튼 영역 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="
              flex-1 px-4 py-2.5 rounded-md
              bg-transparent border border-border-default
              text-text-secondary hover:text-text-primary hover:border-border-strong
              font-medium text-sm
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {t('betting.cancel')}
          </button>

          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`
              flex-[2] px-8 py-4 rounded-md
              text-lg font-bold tracking-[0.04em]
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isYes
                ? 'bg-yes hover:bg-yes-hover text-white active:shadow-yes'
                : 'bg-no hover:bg-no-hover text-white active:shadow-no'
              }
            `}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {txState === 'pending' ? t('betting.signPending') : t('betting.processing')}
              </span>
            ) : (
              t('betting.sign')
            )}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
