/**
 * BetPanel — 베팅 수량 입력 패널 (F-18, F-19)
 * 모바일: 하단 슬라이드업 bottom sheet
 * 데스크톱: 우측 사이드 패널
 * design-system.md §9.1 반응형 패턴 기준
 */
import { useRef, useEffect } from 'react';
import { X, AlertTriangle, TrendingUp } from 'lucide-react';
import { ethers } from 'ethers';
import { QUICK_AMOUNTS } from '../../hooks/useBetting.js';
import { formatMeta, formatOdds } from '../../lib/format.js';

/**
 * @param {{
 *   isOpen: boolean,
 *   selectedSide: 'yes'|'no'|null,
 *   amountMeta: number,
 *   amountWei: bigint,
 *   isOverBalance: boolean,
 *   isAmountValid: boolean,
 *   potentialWinnings: object|null,
 *   yesOdds: bigint|null,
 *   noOdds: bigint|null,
 *   balance: bigint|null,
 *   txState: string,
 *   txError: string|null,
 *   minBet: number,
 *   maxBet: number,
 *   onClose: () => void,
 *   onAmountChange: (value: number) => void,
 *   onQuickAmount: (value: number) => void,
 *   onConfirm: () => void,    // 베팅 확인 모달 열기
 *   market: object,
 * }} props
 */
export function BetPanel({
  isOpen,
  selectedSide,
  amountMeta,
  amountWei,
  isOverBalance,
  isAmountValid,
  potentialWinnings,
  yesOdds,
  noOdds,
  balance,
  txState,
  txError,
  minBet,
  maxBet,
  onClose,
  onAmountChange,
  onQuickAmount,
  onConfirm,
  market,
}) {
  const panelRef = useRef(null);

  // ESC 키 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 배경 스크롤 방지 (모바일 bottom sheet 열릴 때만)
  useEffect(() => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !selectedSide) return null;

  const isYes = selectedSide === 'yes';
  const odds = isYes ? yesOdds : noOdds;
  const isPending = txState === 'pending' || txState === 'confirming';

  // 슬라이더 진행률 (%)
  const sliderPercent = Math.round(((amountMeta - minBet) / (maxBet - minBet)) * 100);

  return (
    <>
      {/* 오버레이 (모바일) */}
      <div
        className="fixed inset-0 bg-black/60 z-50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 패널 본체 */}
      <div
        ref={panelRef}
        className="
          fixed z-50
          bottom-0 left-0 right-0
          md:relative md:bottom-auto md:left-auto md:right-auto
          bg-bg-elevated border border-border-default
          rounded-t-xl md:rounded-xl
          p-5 shadow-elevation-3
          animate-slide-up md:animate-none
          max-h-[85vh] md:max-h-none
          overflow-y-auto
        "
        role="dialog"
        aria-label={`${isYes ? 'YES' : 'NO'} 베팅 패널`}
        aria-modal="true"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`
                text-lg font-black tracking-[0.08em]
                ${isYes ? 'text-yes' : 'text-no'}
              `}
            >
              {isYes ? 'YES' : 'NO'}
            </span>
            <span className="text-text-secondary text-sm">베팅</span>
          </div>
          <button
            onClick={onClose}
            className="
              text-text-muted hover:text-text-secondary
              transition-colors duration-150 p-1 rounded-md hover:bg-bg-surface
            "
            aria-label="패널 닫기"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 마켓 질문 요약 */}
        {market && (
          <p className="text-xs text-text-muted mb-4 line-clamp-2 leading-relaxed">
            {market.question}
          </p>
        )}

        {/* 금액 입력 필드 */}
        <div className="mb-4">
          <label className="text-xs text-text-secondary mb-1.5 block">
            베팅 금액
          </label>
          <div className="relative">
            <input
              type="number"
              value={amountMeta}
              onChange={(e) => onAmountChange(e.target.value)}
              min={minBet}
              max={maxBet}
              className={`
                w-full
                bg-bg-input border rounded-md
                px-4 py-3 pr-16
                text-text-primary text-xl font-semibold tabular-nums
                focus:outline-none transition-all duration-150
                ${isOverBalance
                  ? 'border-danger focus:border-danger'
                  : 'border-border-default focus:border-border-brand focus:shadow-brand'
                }
              `}
              aria-label="베팅 금액 입력 (META)"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium select-none">
              META
            </span>
          </div>

          {/* 잔액 초과 경고 */}
          {isOverBalance && (
            <div className="flex items-center gap-1.5 mt-1.5 text-danger text-xs">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>잔액 부족</span>
              {balance !== null && (
                <span className="text-text-muted">
                  (보유: {formatMeta(balance)} META)
                </span>
              )}
            </div>
          )}
        </div>

        {/* 슬라이더 */}
        <div className="mb-4">
          <input
            type="range"
            min={minBet}
            max={maxBet}
            step={100}
            value={amountMeta}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-full h-1 rounded-full cursor-pointer appearance-none"
            style={{
              background: `linear-gradient(to right, var(--color-brand-primary) 0%, var(--color-brand-primary) ${sliderPercent}%, var(--color-border-default) ${sliderPercent}%, var(--color-border-default) 100%)`,
            }}
            aria-label="베팅 금액 슬라이더"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1 tabular-nums">
            <span>{minBet.toLocaleString()}</span>
            <span>{maxBet.toLocaleString()}</span>
          </div>
        </div>

        {/* 퀵 버튼 */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {QUICK_AMOUNTS.map(amt => (
            <button
              key={amt}
              onClick={() => onQuickAmount(amt)}
              className={`
                px-3 py-1.5 text-sm font-medium
                border rounded-sm
                transition-colors duration-100
                ${amountMeta === amt
                  ? 'border-border-brand text-brand-primary bg-brand-primary-muted'
                  : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-brand hover:text-brand-primary active:bg-brand-primary-muted'
                }
              `}
            >
              {amt >= 1000 ? `${amt / 1000}K` : amt}
            </button>
          ))}
        </div>

        {/* 배당률 + 예상 수익 */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 mb-4 space-y-2">
          {/* 배당률 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-muted flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              현재 배당률
            </span>
            <span className="text-brand-accent font-semibold tabular-nums">
              {odds ? formatOdds(odds) : '--'}
            </span>
          </div>

          {/* 예상 수익 */}
          {potentialWinnings && amountWei > 0n && (
            <>
              <div className="border-t border-border-subtle" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted">예상 수령액</span>
                <span className="text-text-primary font-semibold tabular-nums">
                  {formatMeta(potentialWinnings.winnings)} META
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">예상 수익</span>
                <span className={`font-medium tabular-nums ${
                  potentialWinnings.profit > 0n ? 'text-yes' : 'text-text-muted'
                }`}>
                  +{formatMeta(potentialWinnings.profit)} META
                  {' '}
                  <span className="text-brand-accent">({potentialWinnings.multiplier}x)</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* 에러 메시지 */}
        {txError && (
          <div className="flex items-start gap-2 mb-3 p-3 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-danger text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{txError}</span>
          </div>
        )}

        {/* 수수료 안내 */}
        <p className="text-xs text-text-muted mb-4">
          * 플랫폼 수수료 2%가 패배 풀에서 차감됩니다
        </p>

        {/* 확인 버튼 */}
        <button
          onClick={onConfirm}
          disabled={!isAmountValid || isPending}
          className={`
            w-full px-6 py-3 rounded-md
            text-base font-semibold tracking-[0.08em] uppercase
            transition-all duration-150
            ${!isAmountValid || isPending
              ? 'opacity-50 cursor-not-allowed bg-border-default text-text-muted'
              : isYes
                ? 'bg-yes hover:bg-yes-hover text-white active:shadow-yes'
                : 'bg-no hover:bg-no-hover text-white active:shadow-no'
            }
          `}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              처리 중...
            </span>
          ) : (
            `${isYes ? 'YES' : 'NO'} 베팅 확인`
          )}
        </button>
      </div>
    </>
  );
}
