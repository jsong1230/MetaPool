/**
 * MarketDetailPage — 마켓 상세 (/market/:id)
 * F-16: 마켓 상세, F-17: 실시간 배당률, F-18: 베팅 수량 입력
 * F-19: 예상 수익, F-20: 베팅 확인 모달, F-21: 결과 표시
 * F-29: 마켓 질문 다국어, F-31: 풀 비율 차트
 */
import { useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMarket } from '../hooks/useMarket.js';
import { useOdds } from '../hooks/useOdds.js';
import { useBetting } from '../hooks/useBetting.js';
import { useClaim } from '../hooks/useClaim.js';
import { useWallet } from '../hooks/useWallet.js';
import { CategoryTag } from '../components/common/CategoryTag.jsx';
import { PoolBar } from '../components/common/PoolBar.jsx';
import { Countdown } from '../components/common/Countdown.jsx';
import { BetPanel } from '../components/betting/BetPanel.jsx';
import { BetConfirmModal } from '../components/betting/BetConfirmModal.jsx';
import { ClaimPanel } from '../components/claim/ClaimPanel.jsx';
import { PoolChart } from '../components/market/PoolChart.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { formatMeta, formatOdds, formatDate, getLocalizedQuestion } from '../lib/format.js';

export function MarketDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { account, balance, isConnected, connectWallet } = useWallet();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { market, loading, error, refetch } = useMarket(id);

  // 배당률 (마켓 풀 변경 시 재계산)
  const { yesOdds, noOdds, isFirstBetter, flashing } = useOdds(
    id,
    market?.yesPool ?? null,
    market?.noPool ?? null,
  );

  // 베팅 훅
  const betting = useBetting({
    marketId: id,
    market,
    balance,
    onSuccess: () => {
      toast.success('베팅이 완료되었습니다!');
      setShowConfirmModal(false);
      betting.closePanel();
      refetch();
    },
  });

  // 클레임 훅
  const claim = useClaim({
    marketId: id,
    account,
    onSuccess: () => {
      toast.success('클레임이 완료되었습니다!');
      refetch();
    },
  });

  // URL 쿼리에서 초기 베팅 방향 설정 (마켓 목록 카드에서 버튼 클릭 시)
  const initBetSide = searchParams.get('bet');

  // 베팅 버튼 클릭
  const handleBetClick = useCallback((side) => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    betting.openPanel(side);
  }, [isConnected, connectWallet, betting]);

  // 마켓 목록 카드 YES/NO 버튼에서 넘어온 경우 자동 오픈
  // (단, market 로드 완료 후 1회만)
  const [didAutoOpen, setDidAutoOpen] = useState(false);
  if (market && !didAutoOpen && initBetSide && (initBetSide === 'yes' || initBetSide === 'no')) {
    setDidAutoOpen(true);
    if (isConnected && market.status === 0) {
      handleBetClick(initBetSide);
    }
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-bg-surface rounded" />
          <div className="h-8 w-3/4 bg-bg-surface rounded" />
          <div className="h-2 w-full bg-bg-surface rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-bg-surface rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !market) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-text-primary transition-colors duration-150 text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          마켓 목록으로
        </Link>
        <div className="bg-bg-surface border border-border-default rounded-lg p-8 text-center">
          <p className="text-danger mb-2">{error || '마켓을 찾을 수 없습니다'}</p>
          <button
            onClick={refetch}
            className="text-sm text-brand-primary hover:underline"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const isActive = market.status === 0;
  const isClosed = market.status === 1;
  const isResolved = market.status === 2;
  const isVoided = market.status === 3;
  const isPaused = market.status === 4;
  const isBettable = isActive && !isPaused;
  const totalPool = (market.yesPool ?? 0n) + (market.noPool ?? 0n);
  const totalParticipants = market.yesCount + market.noCount;

  // F-29: 현재 언어에 맞는 질문 (없으면 영어 폴백)
  const localizedQuestion = getLocalizedQuestion(market, i18n.language);

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20 md:pb-6">
      {/* 뒤로 가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 mb-6 text-text-secondary hover:text-text-primary transition-colors duration-150 text-sm"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        마켓 목록으로
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 마켓 메인 정보 */}
        <div className="lg:col-span-2 space-y-4">

          {/* 마켓 헤더 카드 */}
          <div className="bg-bg-surface border border-border-default rounded-lg p-5">
            {/* 카테고리 + 상태 + 카운트다운 */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CategoryTag categoryId={market.category} />
                <StatusBadge market={market} />
              </div>
              {(isActive || isClosed) && (
                <Countdown deadline={market.bettingDeadline} showIcon />
              )}
            </div>

            {/* 질문 (F-29: 현재 언어 표시) */}
            <h1 className="text-xl font-bold text-text-primary leading-snug tracking-[-0.02em] mb-4">
              {localizedQuestion}
            </h1>

            {/* 풀 바 (큰 버전) */}
            <PoolBar yesPool={market.yesPool} noPool={market.noPool} className="mb-4" />

            {/* 통계 3컬럼 */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-bg-elevated rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">총 풀</p>
                <p className="text-lg font-bold tabular-nums text-text-primary">
                  {formatMeta(totalPool)}
                </p>
                <p className="text-xs text-text-muted">META</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">참여자</p>
                <div className="flex items-center justify-center gap-1 my-0.5">
                  <Users className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                  <p className="text-lg font-bold tabular-nums text-text-primary">{totalParticipants}</p>
                </div>
                <p className="text-xs text-text-muted">명</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">배당률</p>
                <div
                  className={`flex items-center justify-center gap-1 my-0.5 ${flashing ? 'animate-value-flash rounded' : ''}`}
                  aria-live="polite"
                >
                  <TrendingUp className="w-4 h-4 text-brand-accent" strokeWidth={1.5} />
                  <p className="text-lg font-bold tabular-nums text-brand-accent">
                    {isFirstBetter ? '--' : (yesOdds ? formatOdds(yesOdds) : '--')}
                  </p>
                </div>
                <p className="text-xs text-text-muted">YES</p>
              </div>
            </div>
          </div>

          {/* 배당률 상세 카드 */}
          <div className="bg-bg-surface border border-border-default rounded-lg p-5">
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
              YES / NO 배당률
            </h2>

            {isFirstBetter ? (
              <div className="py-4 text-center">
                <p className="text-brand-primary font-medium">첫 번째 베터가 되세요!</p>
                <p className="text-text-muted text-sm mt-1">현재 풀이 없습니다. 베팅하면 배당률이 형성됩니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-4 border ${
                  isResolved && market.outcome === 1
                    ? 'bg-yes-muted border-yes'
                    : 'bg-bg-elevated border-border-subtle'
                }`}>
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-[0.08em]">YES</p>
                  <p className="text-2xl font-bold tabular-nums text-yes">
                    {yesOdds ? formatOdds(yesOdds) : '--'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {formatMeta(market.yesPool)} META · {market.yesCount}명
                  </p>
                </div>
                <div className={`rounded-lg p-4 border ${
                  isResolved && market.outcome === 2
                    ? 'bg-no-muted border-no'
                    : 'bg-bg-elevated border-border-subtle'
                }`}>
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-[0.08em]">NO</p>
                  <p className="text-2xl font-bold tabular-nums text-no">
                    {noOdds ? formatOdds(noOdds) : '--'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {formatMeta(market.noPool)} META · {market.noCount}명
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* F-31: 풀 비율 차트 */}
          <PoolChart marketId={market.id} />

          {/* 마켓 메타 정보 */}
          <div className="bg-bg-surface border border-border-default rounded-lg p-5">
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
              마켓 정보
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">베팅 마감</dt>
                <dd className="text-text-primary tabular-nums">{formatDate(market.bettingDeadline)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">결과 확정 예정</dt>
                <dd className="text-text-primary tabular-nums">{formatDate(market.resolutionDeadline)}</dd>
              </div>
              {isResolved && market.resolvedAt > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">확정일</dt>
                  <dd className="text-text-primary tabular-nums">{formatDate(market.resolvedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-text-muted">마켓 ID</dt>
                <dd className="text-text-muted font-mono">#{market.id}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 오른쪽: 베팅 / 클레임 */}
        <div className="lg:col-span-1">

          {/* 결과 표시 (Resolved / Voided) */}
          {(isResolved || isVoided) && (
            <ClaimPanel
              market={market}
              account={account}
              txState={claim.txState}
              txHash={claim.txHash}
              txError={claim.txError}
              onClaimWinnings={claim.claimWinnings}
              onClaimRefund={claim.claimRefund}
            />
          )}

          {/* 베팅 버튼 (Active 마켓) */}
          {isBettable && (
            <div className="bg-bg-surface border border-border-default rounded-lg p-5 hidden lg:block">
              <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">
                베팅
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleBetClick('yes')}
                  className="
                    bg-yes hover:bg-yes-hover
                    text-white font-semibold
                    px-5 py-3 rounded-md
                    text-base tracking-[0.08em] uppercase
                    transition-all duration-150
                    active:shadow-yes
                    min-h-[48px]
                  "
                >
                  YES
                </button>
                <button
                  onClick={() => handleBetClick('no')}
                  className="
                    bg-no hover:bg-no-hover
                    text-white font-semibold
                    px-5 py-3 rounded-md
                    text-base tracking-[0.08em] uppercase
                    transition-all duration-150
                    active:shadow-no
                    min-h-[48px]
                  "
                >
                  NO
                </button>
              </div>
              {!isConnected && (
                <p className="text-xs text-text-muted mt-3 text-center">
                  베팅하려면 지갑을 연결해 주세요
                </p>
              )}
            </div>
          )}

          {/* 베팅 마감 상태 */}
          {(isClosed || isPaused) && (
            <div className="bg-bg-surface border border-border-default rounded-lg p-5 flex flex-col items-center gap-2">
              <Lock className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
              <p className="text-text-muted text-sm font-medium">
                {isClosed ? '베팅 마감' : '마켓 일시 중단'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 베팅 버튼 (하단 고정) */}
      {isBettable && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-bg-secondary border-t border-border-default lg:hidden z-30">
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
            <button
              onClick={() => handleBetClick('yes')}
              className="
                bg-yes hover:bg-yes-hover
                text-white font-semibold
                px-5 py-3 rounded-md
                text-base tracking-[0.08em] uppercase
                transition-all duration-150
                active:shadow-yes
                min-h-[48px]
              "
            >
              YES
            </button>
            <button
              onClick={() => handleBetClick('no')}
              className="
                bg-no hover:bg-no-hover
                text-white font-semibold
                px-5 py-3 rounded-md
                text-base tracking-[0.08em] uppercase
                transition-all duration-150
                active:shadow-no
                min-h-[48px]
              "
            >
              NO
            </button>
          </div>
        </div>
      )}

      {/* BetPanel (모바일 bottom sheet / 데스크톱 인라인) */}
      <BetPanel
        isOpen={betting.isOpen && !showConfirmModal}
        selectedSide={betting.selectedSide}
        amountMeta={betting.amountMeta}
        amountWei={betting.amountWei}
        isOverBalance={betting.isOverBalance}
        isAmountValid={betting.isAmountValid}
        potentialWinnings={betting.potentialWinnings}
        yesOdds={yesOdds}
        noOdds={noOdds}
        balance={balance}
        txState={betting.txState}
        txError={betting.txError}
        minBet={betting.minBet}
        maxBet={betting.maxBet}
        market={market}
        onClose={betting.closePanel}
        onAmountChange={betting.setAmount}
        onQuickAmount={betting.setQuickAmount}
        onConfirm={() => setShowConfirmModal(true)}
      />

      {/* BetConfirmModal */}
      <BetConfirmModal
        isOpen={showConfirmModal}
        market={market}
        selectedSide={betting.selectedSide}
        amountMeta={betting.amountMeta}
        amountWei={betting.amountWei}
        yesOdds={yesOdds}
        noOdds={noOdds}
        potentialWinnings={betting.potentialWinnings}
        txState={betting.txState}
        txError={betting.txError}
        onConfirm={betting.placeBet}
        onClose={() => setShowConfirmModal(false)}
      />
    </main>
  );
}

/**
 * 마켓 상태 배지
 */
function StatusBadge({ market }) {
  const styles = {
    0: 'bg-yes-muted text-yes',   // Active
    1: 'bg-[rgba(245,158,11,0.1)] text-warning', // Closed
    2: 'bg-[rgba(99,102,241,0.1)] text-brand-primary', // Resolved
    3: 'bg-[rgba(100,116,139,0.1)] text-void', // Voided
    4: 'bg-[rgba(245,158,11,0.1)] text-warning', // Paused
  };
  const labels = {
    0: 'Active',
    1: 'Closed',
    2: 'Resolved',
    3: 'Voided',
    4: 'Paused',
  };

  const style = styles[market.status] ?? styles[1];
  const label = labels[market.status] ?? 'Unknown';

  return (
    <span className={`
      inline-flex items-center gap-1
      px-2.5 py-1 rounded-sm
      text-xs font-semibold uppercase tracking-wide
      ${style}
    `}>
      {market.status === 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {label}
    </span>
  );
}
