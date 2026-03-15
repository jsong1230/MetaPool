/**
 * PoolBar — Yes/No 비율 프로그레스 바
 * design-system.md §7.6 기준
 */
import { calcPoolRatio } from '../../lib/format.js';

/**
 * @param {{ yesPool: bigint, noPool: bigint, className?: string }} props
 */
export function PoolBar({ yesPool, noPool, className = '' }) {
  const { yesPercent, noPercent } = calcPoolRatio(yesPool ?? 0n, noPool ?? 0n);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* 비율 레이블 */}
      <div className="flex justify-between text-xs font-medium tabular-nums">
        <span className="text-yes">YES {yesPercent}%</span>
        <span className="text-no">NO {noPercent}%</span>
      </div>

      {/* 프로그레스 바 */}
      <div
        className="flex h-2 rounded-full overflow-hidden bg-bg-input"
        role="progressbar"
        aria-valuenow={yesPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`YES ${yesPercent}% / NO ${noPercent}%`}
      >
        <div
          className="bg-yes transition-all duration-500 ease-out"
          style={{ width: `${yesPercent}%` }}
        />
        <div className="flex-1 bg-no" />
      </div>
    </div>
  );
}
