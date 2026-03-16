/**
 * ResolveModal — 마켓 결과 확정 모달 (F-03/F-04)
 * Yes / No / Void 선택 후 resolveMarket 트랜잭션
 */
import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { getLocalizedQuestion } from '../../lib/format.js';
import { useTranslation } from 'react-i18next';
import { TX_STATUS } from '../../hooks/useCreateMarket.js';

// MARKET_OUTCOME enum (컨트랙트 기준)
const OUTCOME = {
  YES: 1,
  NO: 2,
  VOID: 3,
};

/**
 * @param {{
 *   market: object,
 *   onClose: () => void,
 *   onResolve: (marketId: number, outcome: number) => Promise<void>,
 *   txStatus: string,
 *   txError: string | null
 * }} props
 */
export function ResolveModal({ market, onClose, onResolve, txStatus, txError }) {
  const { i18n } = useTranslation();
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  const isLoading = txStatus === TX_STATUS.PENDING || txStatus === TX_STATUS.CONFIRMING;
  const question = getLocalizedQuestion(market, i18n.language);

  const handleResolve = async () => {
    if (!selectedOutcome) return;
    if (selectedOutcome === OUTCOME.VOID && !showVoidConfirm) {
      setShowVoidConfirm(true);
      return;
    }
    await onResolve(market.id, selectedOutcome);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="
        bg-bg-elevated border border-border-default rounded-xl
        w-full max-w-md p-6
        shadow-elevation-3
        animate-fade-scale
      ">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary tracking-[-0.02em]">
            결과 확정
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="
              text-text-muted hover:text-text-secondary
              transition-colors duration-150
              disabled:opacity-50
            "
            aria-label="모달 닫기"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* 마켓 정보 */}
        <div className="
          bg-bg-surface border border-border-subtle rounded-md
          p-3 mb-5
        ">
          <p className="text-xs text-text-muted mb-1">마켓 #{market.id}</p>
          <p className="text-sm text-text-primary leading-relaxed line-clamp-2">
            {question}
          </p>
        </div>

        {/* Void 확인 경고 */}
        {showVoidConfirm && selectedOutcome === OUTCOME.VOID && (
          <div className="
            bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)]
            rounded-md p-3 mb-4
            flex gap-2
          ">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-warning">
              Void 처리 시 모든 베터에게 원금이 환불됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
        )}

        {/* 결과 선택 버튼 */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => { setSelectedOutcome(OUTCOME.YES); setShowVoidConfirm(false); }}
            disabled={isLoading}
            className={`
              flex-1 py-3 rounded-md font-semibold text-sm
              border transition-all duration-150
              flex items-center justify-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${selectedOutcome === OUTCOME.YES
                ? 'bg-yes text-white border-yes shadow-yes'
                : 'bg-yes-muted text-yes border-yes/30 hover:border-yes'
              }
            `}
          >
            <CheckCircle className="w-4 h-4" strokeWidth={2} />
            YES
          </button>

          <button
            onClick={() => { setSelectedOutcome(OUTCOME.NO); setShowVoidConfirm(false); }}
            disabled={isLoading}
            className={`
              flex-1 py-3 rounded-md font-semibold text-sm
              border transition-all duration-150
              flex items-center justify-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${selectedOutcome === OUTCOME.NO
                ? 'bg-no text-white border-no shadow-no'
                : 'bg-no-muted text-no border-no/30 hover:border-no'
              }
            `}
          >
            <XCircle className="w-4 h-4" strokeWidth={2} />
            NO
          </button>

          <button
            onClick={() => { setSelectedOutcome(OUTCOME.VOID); setShowVoidConfirm(false); }}
            disabled={isLoading}
            className={`
              flex-1 py-3 rounded-md font-semibold text-sm
              border transition-all duration-150
              flex items-center justify-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${selectedOutcome === OUTCOME.VOID
                ? 'bg-[rgba(100,116,139,0.3)] text-void border-void'
                : 'bg-[rgba(100,116,139,0.08)] text-void border-void/30 hover:border-void'
              }
            `}
          >
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
            VOID
          </button>
        </div>

        {/* 에러 메시지 */}
        {txError && (
          <div className="
            bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)]
            rounded-md p-3 mb-4
          ">
            <p className="text-sm text-danger">{txError}</p>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="
              flex-1 py-2.5 px-4 rounded-md
              bg-transparent border border-border-default
              text-text-secondary hover:text-text-primary hover:border-border-strong
              font-medium text-sm
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            취소
          </button>

          <button
            onClick={handleResolve}
            disabled={!selectedOutcome || isLoading}
            className={`
              flex-[2] py-2.5 px-4 rounded-md
              font-medium text-sm
              transition-colors duration-150
              flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${selectedOutcome === OUTCOME.VOID && showVoidConfirm
                ? 'bg-[rgba(239,68,68,0.15)] border border-danger/30 text-danger hover:bg-[rgba(239,68,68,0.25)]'
                : 'bg-brand-primary hover:bg-brand-primary-hover text-white'
              }
            `}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
            {isLoading
              ? (txStatus === TX_STATUS.CONFIRMING ? '확인 중...' : '서명 대기...')
              : selectedOutcome === OUTCOME.VOID && showVoidConfirm
                ? '⚠ Void 확정'
                : '결과 확정'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
