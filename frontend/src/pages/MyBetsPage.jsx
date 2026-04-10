/**
 * MyBetsPage — 내 베팅 내역 (/my-bets)
 * F-22: 베팅 내역 조회, F-23: 정산 내역
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Gift, RefreshCw, CheckCircle, AlertTriangle, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserBets } from '../hooks/useUserBets.js';
import { useClaim } from '../hooks/useClaim.js';
import { useWallet } from '../hooks/useWallet.js';
import { useToast } from '../components/common/Toast.jsx';
import { CategoryTag } from '../components/common/CategoryTag.jsx';
import { Countdown } from '../components/common/Countdown.jsx';
import { formatMeta, formatOdds } from '../lib/format.js';

export function MyBetsPage() {
  const { account, isConnected, connectWallet } = useWallet();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');

  const STATUS_TABS = [
    { id: 'all',       label: t('myBets.tabs.all') },
    { id: 'active',    label: t('myBets.tabs.active') },
    { id: 'resolved',  label: t('myBets.tabs.resolved') },
    { id: 'claimable', label: t('myBets.tabs.claimable') },
  ];

  const { bets, loading, error, refetch } = useUserBets(account);

  // 클레임 처리 (개별 항목별)
  const [claimingMarketId, setClaimingMarketId] = useState(null);
  const claim = useClaim({
    marketId: claimingMarketId,
    account,
    onSuccess: () => {
      toast.success(t('myBets.claimed'));
      refetch();
      setClaimingMarketId(null);
    },
  });

  const handleClaim = (bet) => {
    setClaimingMarketId(bet.marketId);
    claim.reset();
    if (bet.claimType === 'winnings') {
      setTimeout(() => claim.claimWinnings(), 0);
    } else if (bet.claimType === 'refund') {
      setTimeout(() => claim.claimRefund(), 0);
    }
  };

  // 탭 필터링
  const filteredBets = bets.filter(bet => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return bet.status === 0 || bet.status === 1;
    if (activeTab === 'resolved') return bet.status === 2 || bet.status === 3;
    if (activeTab === 'claimable') return bet.claimable;
    return true;
  });

  // 지갑 미연결 상태
  if (!isConnected) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20">
        <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em] mb-6">{t('myBets.title')}</h1>
        <div className="bg-bg-surface border border-border-default rounded-lg p-12 flex flex-col items-center gap-4">
          <Wallet className="w-10 h-10 text-text-muted" strokeWidth={1.5} />
          <p className="text-text-secondary font-medium">{t('myBets.connectWallet')}</p>
          <button
            onClick={connectWallet}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors duration-150"
          >
            {t('wallet.connect')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-20">
      <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em] mb-2">{t('myBets.title')}</h1>
      <p className="text-text-secondary text-sm mb-5">{t('myBets.subtitle')}</p>

      {/* 상태 탭 */}
      <div className="flex items-center gap-1 mb-5 border-b border-border-default overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              shrink-0 px-4 py-2.5 text-sm font-medium
              border-b-2 -mb-px transition-colors duration-150
              ${activeTab === tab.id
                ? 'text-brand-primary border-brand-primary'
                : 'text-text-muted border-transparent hover:text-text-secondary'
              }
            `}
          >
            {tab.label}
            {tab.id === 'claimable' && bets.filter(b => b.claimable).length > 0 && (
              <span className="ml-1.5 text-xs bg-yes text-white rounded-full px-1.5 py-0.5 font-bold">
                {bets.filter(b => b.claimable).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-bg-surface border border-border-default rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-16 bg-bg-elevated rounded-sm" />
                <div className="h-4 w-32 bg-bg-elevated rounded flex-1" />
              </div>
              <div className="h-4 w-full bg-bg-elevated rounded mb-2" />
              <div className="flex gap-4">
                <div className="h-4 w-20 bg-bg-elevated rounded" />
                <div className="h-4 w-20 bg-bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-8 text-center">
          <p className="text-danger mb-2">{error}</p>
          <button onClick={refetch} className="text-sm text-brand-primary hover:underline">{t('common.retry')}</button>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && filteredBets.length === 0 && (
        <div className="bg-bg-surface border border-border-default rounded-lg p-12 text-center">
          <TrendingUp className="w-10 h-10 text-text-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-text-secondary font-medium mb-1">
            {activeTab === 'claimable' ? t('myBets.emptyClaimable') : t('myBets.empty')}
          </p>
          {activeTab === 'all' && (
            <Link to="/" className="text-sm text-brand-primary hover:underline">
              마켓 참여하기 →
            </Link>
          )}
        </div>
      )}

      {/* 베팅 목록 */}
      {!loading && !error && filteredBets.length > 0 && (
        <div className="space-y-3">
          {filteredBets.map(bet => (
            <BetItem
              key={bet.marketId}
              bet={bet}
              isClaimingThis={claimingMarketId === bet.marketId}
              claimTxState={claimingMarketId === bet.marketId ? claim.txState : 'idle'}
              claimTxError={claimingMarketId === bet.marketId ? claim.txError : null}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/**
 * 베팅 항목 카드
 */
function BetItem({ bet, isClaimingThis, claimTxState, claimTxError, onClaim }) {
  const { t } = useTranslation();
  const isPending = isClaimingThis && (claimTxState === 'pending' || claimTxState === 'confirming');
  const isClaimSuccess = isClaimingThis && claimTxState === 'success';

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryTag categoryId={bet.category} />
          <StatusBadge status={bet.status} />
        </div>
        <ResultBadge result={bet.result} />
      </div>

      {/* 마켓 질문 */}
      <Link
        to={`/market/${bet.marketId}`}
        className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors duration-150 line-clamp-2 block mb-3"
      >
        {bet.question}
      </Link>

      {/* 베팅 정보 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
        <div>
          <p className="text-text-muted mb-0.5">{t('myBets.direction')}</p>
          <p className={`font-bold tracking-[0.04em] ${bet.isYes ? 'text-yes' : 'text-no'}`}>
            {bet.isYes ? 'YES' : 'NO'}
          </p>
        </div>
        <div>
          <p className="text-text-muted mb-0.5">{t('myBets.amount')}</p>
          <p className="font-semibold tabular-nums text-text-primary">
            {formatMeta(bet.betAmount)} META
          </p>
        </div>
        {bet.status === 0 && (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-text-muted mb-0.5">{t('myBets.timeLeft')}</p>
            <Countdown deadline={bet.bettingDeadline} showIcon={false} />
          </div>
        )}
        {(bet.status === 2 || bet.status === 3) && bet.result === 'win' && bet.winnings > 0n && (
          <div>
            <p className="text-text-muted mb-0.5">{t('myBets.expectedPayout')}</p>
            <p className="font-bold tabular-nums text-yes">
              {formatMeta(bet.winnings)} META
            </p>
          </div>
        )}
        {bet.result === 'loss' && (
          <div>
            <p className="text-text-muted mb-0.5">{t('myBets.loss')}</p>
            <p className="font-semibold tabular-nums text-no">
              -{formatMeta(bet.betAmount)} META
            </p>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {claimTxError && isClaimingThis && (
        <div className="flex items-center gap-1.5 mb-2 text-danger text-xs">
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{claimTxError}</span>
        </div>
      )}

      {/* 클레임 성공 */}
      {isClaimSuccess && (
        <div className="flex items-center gap-1.5 mb-2 text-success text-xs">
          <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{t('myBets.claimed')}</span>
        </div>
      )}

      {/* 클레임 버튼 */}
      {bet.claimable && !isClaimSuccess && (
        <button
          onClick={() => onClaim(bet)}
          disabled={isPending}
          className={`
            w-full flex items-center justify-center gap-1.5
            px-4 py-2 rounded-md text-sm font-semibold
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            ${bet.claimType === 'winnings'
              ? 'bg-yes hover:bg-yes-hover text-white active:shadow-yes'
              : 'bg-transparent border border-border-strong text-text-secondary hover:text-text-primary hover:border-brand-primary'
            }
          `}
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              {t('myBets.claiming')}
            </>
          ) : bet.claimType === 'winnings' ? (
            <>
              <Gift className="w-3.5 h-3.5" strokeWidth={1.5} />
              {t('myBets.claim')}
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              {t('myBets.refund')}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * 마켓 상태 배지
 */
function StatusBadge({ status }) {
  const config = {
    0: { label: 'Active', cls: 'bg-yes-muted text-yes' },
    1: { label: 'Closed', cls: 'bg-[rgba(245,158,11,0.1)] text-warning' },
    2: { label: 'Resolved', cls: 'bg-brand-primary-muted text-brand-primary' },
    3: { label: 'Voided', cls: 'bg-[rgba(100,116,139,0.1)] text-void' },
    4: { label: 'Paused', cls: 'bg-[rgba(245,158,11,0.1)] text-warning' },
  };
  const { label, cls } = config[status] || config[1];
  return (
    <span className={`px-2 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

/**
 * 베팅 결과 배지 (WIN / LOSS / VOID / PENDING / CLAIMED)
 */
function ResultBadge({ result }) {
  if (result === 'pending') return null;
  const config = {
    win:     { label: 'WIN',     cls: 'bg-yes-muted text-yes' },
    loss:    { label: 'LOSS',    cls: 'bg-no-muted text-no' },
    void:    { label: 'VOID',    cls: 'bg-[rgba(100,116,139,0.1)] text-void' },
    claimed: { label: 'CLAIMED', cls: 'bg-brand-primary-muted text-brand-primary' },
  };
  const { label, cls } = config[result] || {};
  if (!label) return null;
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
