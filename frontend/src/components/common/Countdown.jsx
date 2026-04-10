/**
 * Countdown — 마감 카운트다운 타이머
 * design-system.md §7.8 기준
 */
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCountdown } from '../../lib/format.js';

/**
 * @param {{ deadline: number, showIcon?: boolean, className?: string }} props
 */
export function Countdown({ deadline, showIcon = true, className = '' }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(() => formatCountdown(deadline));

  useEffect(() => {
    // 즉시 갱신
    setCountdown(formatCountdown(deadline));

    // 마감된 경우 타이머 불필요
    if (formatCountdown(deadline).urgency === 'ended') return;

    const timer = setInterval(() => {
      const next = formatCountdown(deadline);
      setCountdown(next);
      if (next.urgency === 'ended') clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  // 긴급도별 색상 클래스
  const colorClass = {
    normal: 'text-text-secondary',
    warning: 'text-warning',
    danger: 'text-danger animate-pulse',
    ended: 'text-text-muted',
  }[countdown.urgency] || 'text-text-secondary';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && (
        <Clock
          className={`w-3.5 h-3.5 shrink-0 ${colorClass}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <span
        className={`text-sm font-semibold tabular-nums font-mono tracking-[0.04em] ${colorClass}`}
      >
        {countdown.urgency === 'ended' ? t('common.ended') : countdown.text}
      </span>
    </div>
  );
}
