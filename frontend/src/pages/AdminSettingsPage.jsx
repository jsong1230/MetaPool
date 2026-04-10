/**
 * AdminSettingsPage — 설정 관리 (/admin/settings)
 * F-12: minBet / maxBet / platformFeeRate 변경 + 수수료 인출
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldAlert, Save, DollarSign, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ethers } from 'ethers';
import { getWriteContract, parseContractError } from '../lib/contract.js';
import { useAdmin } from '../hooks/useAdmin.js';
import { useToast } from '../components/common/Toast.jsx';
import { formatMeta } from '../lib/format.js';

// META → wei 변환 (단순 입력값 → parseEther)
function toWei(value) {
  try {
    return ethers.parseEther(String(value));
  } catch {
    return null;
  }
}

// wei → META 문자열 (소수점 없는 정수 표시용)
function fromWeiToMeta(weiValue) {
  if (!weiValue && weiValue !== 0n) return '';
  return ethers.formatEther(weiValue);
}

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    isOwner,
    settings,
    accumulatedFees,
    loading: adminLoading,
    refetch,
    withdrawFees,
  } = useAdmin();

  const [minBetInput, setMinBetInput] = useState('');
  const [maxBetInput, setMaxBetInput] = useState('');
  const [feeRateInput, setFeeRateInput] = useState('');

  const [savingMin, setSavingMin] = useState(false);
  const [savingMax, setSavingMax] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // 설정값이 로드되면 입력란 초기화
  useEffect(() => {
    if (settings) {
      setMinBetInput(fromWeiToMeta(settings.minBet));
      setMaxBetInput(fromWeiToMeta(settings.maxBet));
      setFeeRateInput(settings.platformFeeRate ? String(Number(settings.platformFeeRate)) : '0');
    }
  }, [settings]);

  // minBet 저장
  const handleSaveMinBet = async () => {
    const wei = toWei(minBetInput);
    if (!wei || wei <= 0n) {
      toast.error(t('admin.settings.errors.invalidValue'));
      return;
    }
    setSavingMin(true);
    try {
      const contract = await getWriteContract();
      const tx = await contract.setMinBet(wei);
      await tx.wait();
      toast.success(t('admin.toast.minBetSaved'));
      refetch();
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    } finally {
      setSavingMin(false);
    }
  };

  // maxBet 저장
  const handleSaveMaxBet = async () => {
    const wei = toWei(maxBetInput);
    if (!wei || wei <= 0n) {
      toast.error(t('admin.settings.errors.invalidValue'));
      return;
    }
    setSavingMax(true);
    try {
      const contract = await getWriteContract();
      const tx = await contract.setMaxBet(wei);
      await tx.wait();
      toast.success(t('admin.toast.maxBetSaved'));
      refetch();
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    } finally {
      setSavingMax(false);
    }
  };

  // platformFeeRate 저장 (basis points 단위)
  const handleSaveFeeRate = async () => {
    const rate = parseInt(feeRateInput, 10);
    if (isNaN(rate) || rate < 0 || rate > 1000) {
      toast.error(t('admin.settings.errors.feeRateRange'));
      return;
    }
    setSavingFee(true);
    try {
      const contract = await getWriteContract();
      const tx = await contract.setPlatformFeeRate(rate);
      await tx.wait();
      toast.success(t('admin.toast.feeRateSaved'));
      refetch();
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    } finally {
      setSavingFee(false);
    }
  };

  // 수수료 인출
  const handleWithdrawFees = async () => {
    if (accumulatedFees === 0n) {
      toast.info(t('admin.noFeesToWithdraw'));
      return;
    }
    if (!window.confirm(t('admin.withdrawConfirm', { amount: formatMeta(accumulatedFees) }))) return;
    setWithdrawing(true);
    try {
      await withdrawFees();
      toast.success(t('admin.toast.feesWithdrawn'));
    } catch (err) {
      const parsed = parseContractError(err);
      toast.error(parsed.message);
    } finally {
      setWithdrawing(false);
    }
  };

  // 로딩
  if (adminLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" strokeWidth={1.5} />
        </div>
      </main>
    );
  }

  // owner 아님
  if (!isOwner) {
    return (
      <main className="max-w-2xl mx-auto px-4 lg:px-6 py-8">
        <div className="
          bg-bg-surface border border-border-default rounded-lg
          p-10 flex flex-col items-center text-center min-h-[300px]
        ">
          <ShieldAlert className="w-12 h-12 text-danger mb-4" strokeWidth={1} />
          <h2 className="text-xl font-bold text-text-primary mb-2">{t('admin.accessDenied')}</h2>
          <Link to="/" className="mt-4 text-sm text-brand-primary hover:underline">
            {t('admin.backToMain')} →
          </Link>
        </div>
      </main>
    );
  }

  const feePercent = settings?.platformFeeRate
    ? (Number(settings.platformFeeRate) / 100).toFixed(2)
    : '0.00';

  return (
    <main className="max-w-2xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin"
          className="
            p-1.5 rounded-md
            text-text-muted hover:text-text-secondary hover:bg-bg-surface
            transition-colors duration-150
          "
          aria-label="관리자 패널로"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-[-0.02em]">
            {t('admin.settings.title')}
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{t('admin.settings.subtitle')}</p>
        </div>
      </div>

      {/* 현재 설정값 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-surface border border-border-default rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">{t('admin.settings.minBet')}</p>
          <p className="text-base font-bold text-text-primary tabular-nums">
            {formatMeta(settings?.minBet)}
          </p>
          <p className="text-xs text-text-muted">META</p>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">{t('admin.settings.maxBet')}</p>
          <p className="text-base font-bold text-text-primary tabular-nums">
            {formatMeta(settings?.maxBet)}
          </p>
          <p className="text-xs text-text-muted">META</p>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">{t('admin.settings.feeRate')}</p>
          <p className="text-base font-bold text-brand-accent tabular-nums">
            {feePercent}%
          </p>
          <p className="text-xs text-text-muted">{settings?.platformFeeRate?.toString()} bp</p>
        </div>
      </div>

      {/* 설정 폼 */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-5">
        <h2 className="text-sm font-semibold text-text-primary">{t('admin.settings.paramsSection')}</h2>

        {/* 최소 베팅 금액 */}
        <SettingRow
          label={t('admin.settings.minBetLabel')}
          description={t('admin.settings.minBetDesc')}
          unit="META"
        >
          <div className="flex gap-2">
            <input
              type="number"
              value={minBetInput}
              onChange={(e) => setMinBetInput(e.target.value)}
              min="0"
              step="any"
              className="
                flex-1 bg-bg-input border border-border-default rounded-md
                px-3 py-2 text-sm text-text-primary tabular-nums
                focus:outline-none focus:border-border-brand
                transition-colors duration-150
              "
            />
            <button
              onClick={handleSaveMinBet}
              disabled={savingMin}
              className="
                px-4 py-2 rounded-md
                bg-brand-primary hover:bg-brand-primary-hover
                text-white font-medium text-sm
                flex items-center gap-1.5
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              {savingMin
                ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                : <Save className="w-4 h-4" strokeWidth={2} />
              }
              {t('admin.settings.save')}
            </button>
          </div>
        </SettingRow>

        {/* 최대 베팅 금액 */}
        <SettingRow
          label={t('admin.settings.maxBetLabel')}
          description={t('admin.settings.maxBetDesc')}
          unit="META"
        >
          <div className="flex gap-2">
            <input
              type="number"
              value={maxBetInput}
              onChange={(e) => setMaxBetInput(e.target.value)}
              min="0"
              step="any"
              className="
                flex-1 bg-bg-input border border-border-default rounded-md
                px-3 py-2 text-sm text-text-primary tabular-nums
                focus:outline-none focus:border-border-brand
                transition-colors duration-150
              "
            />
            <button
              onClick={handleSaveMaxBet}
              disabled={savingMax}
              className="
                px-4 py-2 rounded-md
                bg-brand-primary hover:bg-brand-primary-hover
                text-white font-medium text-sm
                flex items-center gap-1.5
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              {savingMax
                ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                : <Save className="w-4 h-4" strokeWidth={2} />
              }
              {t('admin.settings.save')}
            </button>
          </div>
        </SettingRow>

        {/* 수수료율 */}
        <SettingRow
          label={t('admin.settings.feeRateLabel')}
          description={t('admin.settings.feeRateDesc')}
          unit="bp"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={feeRateInput}
                onChange={(e) => setFeeRateInput(e.target.value)}
                min="0"
                max="1000"
                step="1"
                className="
                  w-full bg-bg-input border border-border-default rounded-md
                  px-3 py-2 pr-16 text-sm text-text-primary tabular-nums
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                "
              />
              <span className="
                absolute right-3 top-1/2 -translate-y-1/2
                text-xs text-text-muted
              ">
                = {feeRateInput ? (Number(feeRateInput) / 100).toFixed(2) : '0.00'}%
              </span>
            </div>
            <button
              onClick={handleSaveFeeRate}
              disabled={savingFee}
              className="
                px-4 py-2 rounded-md
                bg-brand-primary hover:bg-brand-primary-hover
                text-white font-medium text-sm
                flex items-center gap-1.5
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              {savingFee
                ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                : <Save className="w-4 h-4" strokeWidth={2} />
              }
              {t('admin.settings.save')}
            </button>
          </div>
        </SettingRow>
      </section>

      {/* 수수료 인출 섹션 */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">{t('admin.settings.withdrawSection')}</h2>

        <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-brand-accent/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-brand-accent" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-text-muted">{t('admin.accumulatedFees')}</p>
              <p className="text-xl font-bold text-brand-accent tabular-nums">
                {formatMeta(accumulatedFees)}
                <span className="text-sm font-normal text-text-muted ml-1">META</span>
              </p>
            </div>
          </div>
        </div>

        {accumulatedFees > 0n && (
          <div className="
            bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)]
            rounded-md p-3 mb-4 flex gap-2
          ">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-xs text-warning">
              {t('admin.settings.withdrawWarning')}
            </p>
          </div>
        )}

        <button
          onClick={handleWithdrawFees}
          disabled={withdrawing || accumulatedFees === 0n}
          className="
            w-full py-2.5 px-4 rounded-md
            bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]
            text-danger font-medium text-sm
            hover:bg-[rgba(239,68,68,0.2)]
            flex items-center justify-center gap-2
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        >
          {withdrawing && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
          {accumulatedFees === 0n ? t('admin.settings.noFees') : t('admin.withdrawFees')}
        </button>
      </section>
    </main>
  );
}

/**
 * 설정 항목 레이아웃
 */
function SettingRow({ label, description, unit, children }) {
  return (
    <div className="space-y-2 pb-5 border-b border-border-subtle last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
