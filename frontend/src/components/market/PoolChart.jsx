/**
 * PoolChart — Yes/No 풀 비율 시계열 SVG 차트 (F-31)
 * BetPlaced 이벤트 로그 기반 순수 SVG 구현 (외부 라이브러리 없음)
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePoolHistory } from '../../hooks/usePoolHistory.js';

const CHART_W = 480;
const CHART_H = 120;
const PAD_X = 8;
const PAD_Y = 12;

/**
 * @param {number} marketId
 */
export function PoolChart({ marketId }) {
  const { t } = useTranslation();
  const { points, loading, error } = usePoolHistory(marketId);

  // 차트 경로 계산
  const { yesPath, noPath, yesArea, noArea } = useMemo(() => {
    if (!points || points.length < 2) return {};

    const n = points.length;
    const innerW = CHART_W - PAD_X * 2;
    const innerH = CHART_H - PAD_Y * 2;

    // percent → Y 좌표 (위가 100%, 아래가 0%)
    const toY = (pct) => PAD_Y + innerH * (1 - pct / 100);
    const toX = (i) => PAD_X + (i / (n - 1)) * innerW;

    const yesPts = points.map((p, i) => `${toX(i)},${toY(p.yesPercent)}`);
    const noPts = points.map((p, i) => `${toX(i)},${toY(p.noPercent)}`);

    const yesPath = `M ${yesPts.join(' L ')}`;
    const noPath = `M ${noPts.join(' L ')}`;

    // 영역 채우기 (아래쪽 고정 선 연결)
    const bottom = PAD_Y + innerH;
    const yesArea = `M ${toX(0)},${bottom} L ${yesPts.join(' L ')} L ${toX(n - 1)},${bottom} Z`;
    const noArea  = `M ${toX(0)},${bottom} L ${noPts.join(' L ')} L ${toX(n - 1)},${bottom} Z`;

    return { yesPath, noPath, yesArea, noArea };
  }, [points]);

  if (loading) {
    return (
      <div className="bg-bg-surface border border-border-default rounded-lg p-4">
        <p className="text-xs text-text-muted mb-3">{t('market.poolChart')}</p>
        <div className="h-[120px] bg-bg-elevated rounded animate-pulse" />
      </div>
    );
  }

  if (error || !points || points.length < 2) {
    return (
      <div className="bg-bg-surface border border-border-default rounded-lg p-4">
        <p className="text-xs text-text-muted mb-2">{t('market.poolChart')}</p>
        <p className="text-xs text-text-muted">{t('market.noChartData')}</p>
      </div>
    );
  }

  const lastPoint = points[points.length - 1];

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-text-secondary">{t('market.poolChart')}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yes inline-block" />
            <span className="text-yes font-medium">YES {lastPoint.yesPercent}%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-no inline-block" />
            <span className="text-no font-medium">NO {lastPoint.noPercent}%</span>
          </span>
        </div>
      </div>

      {/* SVG 차트 */}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        aria-label="Pool ratio history chart"
        role="img"
      >
        <defs>
          <linearGradient id="yes-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="no-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* 50% 기준선 */}
        <line
          x1={PAD_X}
          y1={(CHART_H - PAD_Y * 2) / 2 + PAD_Y}
          x2={CHART_W - PAD_X}
          y2={(CHART_H - PAD_Y * 2) / 2 + PAD_Y}
          stroke="#1e2640"
          strokeWidth="1"
          strokeDasharray="4,3"
        />

        {/* No 영역 */}
        <path d={noArea} fill="url(#no-gradient)" />
        {/* Yes 영역 */}
        <path d={yesArea} fill="url(#yes-gradient)" />

        {/* No 라인 */}
        <path
          d={noPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Yes 라인 */}
        <path
          d={yesPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 마지막 포인트 도트 (Yes) */}
        {points.length > 0 && (() => {
          const n = points.length;
          const innerW = CHART_W - PAD_X * 2;
          const innerH = CHART_H - PAD_Y * 2;
          const x = PAD_X + innerW;
          const y = PAD_Y + innerH * (1 - lastPoint.yesPercent / 100);
          return (
            <circle cx={x} cy={y} r="3" fill="#10b981" />
          );
        })()}
      </svg>

      {/* 베팅 횟수 표시 */}
      <p className="text-xs text-text-muted text-right mt-1">
        {points.length} bets
      </p>
    </div>
  );
}
