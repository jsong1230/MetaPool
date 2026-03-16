/**
 * AdminPage — 관리자 패널 홈 (/admin)
 * owner 검증 + 전체 마켓 목록 + 누적 수수료 표시
 */
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Settings, ShieldAlert, Loader2,
  DollarSign, LayoutDashboard, TrendingUp
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin.js';
import { useToast } from '../components/common/Toast.jsx';
import { AdminMarketTable } from '../components/admin/AdminMarketTable.jsx';
import { formatMeta } from '../lib/format.js';
import { parseContractError } from '../lib/contract.js';

export function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isOwner,
    markets,
    accumulatedFees,
    loading,
    error,
    refetch,
    pauseMarket,
    resumeMarket,
    resolveMarket,
    withdrawFees,
  } = useAdmin();

  // 수수료 인출 처리
  const handleWithdrawFees = async () => {
    if (accumulatedFees === 0n) {
      toast.info('인출할 수수료가 없습니다');
      return;
    }
    if (!window.confirm(`${formatMeta(accumulatedFees)} META를 인출하시겠습니까?`)) return;
    try {
      await withdrawFees();
      toast.success('수수료 인출 완료');
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" strokeWidth={1.5} />
        </div>
      </main>
    );
  }

  // owner 아님
  if (!isOwner) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="
          bg-bg-surface border border-border-default rounded-lg
          p-10 flex flex-col items-center justify-center text-center
          min-h-[300px]
        ">
          <ShieldAlert className="w-12 h-12 text-danger mb-4" strokeWidth={1} />
          <h2 className="text-xl font-bold text-text-primary mb-2">접근 권한 없음</h2>
          <p className="text-text-secondary text-sm mb-6">
            관리자 전용 페이지입니다. owner 지갑으로 연결해 주세요.
          </p>
          <Link
            to="/"
            className="
              px-4 py-2.5 rounded-md
              bg-brand-primary hover:bg-brand-primary-hover
              text-white font-medium text-sm
              transition-colors duration-150
            "
          >
            메인으로
          </Link>
        </div>
      </main>
    );
  }

  // 에러
  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="
          bg-bg-surface border border-border-default rounded-lg
          p-8 text-center
        ">
          <p className="text-danger text-sm">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 rounded-md bg-bg-elevated text-text-secondary text-sm hover:text-text-primary"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  // 통계
  const activeCount = markets.filter(m => m.status === 0).length;
  const pausedCount = markets.filter(m => m.status === 4).length;
  const resolvedCount = markets.filter(m => m.status === 2 || m.status === 3).length;
  const totalPool = markets.reduce((acc, m) => acc + (m.yesPool || 0n) + (m.noPool || 0n), 0n);

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-[-0.02em]">
            관리자 패널
          </h1>
          <p className="text-text-muted text-sm mt-1">MetaPool 마켓 관리</p>
        </div>

        {/* 서브 네비게이션 */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/create"
            className="
              flex items-center gap-1.5
              px-4 py-2 rounded-md
              bg-brand-primary hover:bg-brand-primary-hover
              text-white font-medium text-sm
              transition-colors duration-150
            "
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            마켓 생성
          </Link>
          <Link
            to="/admin/settings"
            className="
              flex items-center gap-1.5
              px-4 py-2 rounded-md
              bg-transparent border border-border-default
              text-text-secondary hover:text-text-primary hover:border-border-strong
              font-medium text-sm
              transition-colors duration-150
            "
          >
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            설정
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          label="전체 마켓"
          value={markets.length}
          unit="개"
          icon={<LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />}
        />
        <StatsCard
          label="활성 마켓"
          value={activeCount}
          unit="개"
          color="text-yes"
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
        />
        <StatsCard
          label="총 풀 규모"
          value={formatMeta(totalPool)}
          unit="META"
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.5} />}
        />
        <div className="
          bg-bg-surface border border-border-default rounded-lg p-4
          flex flex-col gap-2
        ">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs font-medium">누적 수수료</p>
            <DollarSign className="w-4 h-4 text-brand-accent" strokeWidth={1.5} />
          </div>
          <p className="text-xl font-bold text-brand-accent tabular-nums">
            {formatMeta(accumulatedFees)}
            <span className="text-sm font-normal text-text-muted ml-1">META</span>
          </p>
          <button
            onClick={handleWithdrawFees}
            disabled={accumulatedFees === 0n}
            className="
              mt-auto px-3 py-1.5 rounded-md
              bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]
              text-danger text-xs font-medium
              hover:bg-[rgba(239,68,68,0.2)]
              transition-colors duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            수수료 인출
          </button>
        </div>
      </div>

      {/* 마켓 테이블 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary">
            전체 마켓 ({markets.length})
          </h2>
          <button
            onClick={refetch}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            새로고침
          </button>
        </div>

        <AdminMarketTable
          markets={markets}
          onPause={pauseMarket}
          onResume={resumeMarket}
          onResolve={resolveMarket}
          onRefetch={refetch}
        />
      </section>
    </main>
  );
}

/**
 * 통계 카드 — 간단한 수치 표시
 */
function StatsCard({ label, value, unit, color = 'text-text-primary', icon }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-muted text-xs font-medium">{label}</p>
        <span className="text-text-muted">{icon}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>
        {value}
        {unit && <span className="text-sm font-normal text-text-muted ml-1">{unit}</span>}
      </p>
    </div>
  );
}
