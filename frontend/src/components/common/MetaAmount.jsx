/**
 * MetaAmount — META 금액 + 법정화폐 환산 표시 (F-28)
 * 현재 언어에서 기본 통화를 자동 선택하여 환산값 참고 표시
 */
import { useTranslation } from 'react-i18next';
import { formatMeta } from '../../lib/format.js';
import { convertMetaToFiat, getCurrencyForLanguage } from '../../lib/currency.js';
import { ethers } from 'ethers';

/**
 * @param {bigint|string|number} weiAmount — wei 단위 금액
 * @param {string} [className] — 추가 스타일
 * @param {boolean} [showFiat=true] — 법정화폐 표시 여부
 * @param {string} [size='base'] — 'sm' | 'base' | 'lg'
 */
export function MetaAmount({ weiAmount, className = '', showFiat = true, size = 'base' }) {
  const { i18n } = useTranslation();

  // META 숫자값 계산
  const metaStr = formatMeta(weiAmount);
  const metaNum = weiAmount ? Number(ethers.formatEther(weiAmount)) : 0;

  const currency = getCurrencyForLanguage(i18n.language || 'en');
  const fiatStr = showFiat && metaNum > 0 ? convertMetaToFiat(metaNum, currency) : '';

  const sizeClasses = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
  };

  return (
    <span className={`inline-flex flex-col items-end ${className}`}>
      <span className={`font-semibold tabular-nums text-text-primary ${sizeClasses[size] || sizeClasses.base}`}>
        {metaStr} <span className="text-text-muted font-normal">META</span>
      </span>
      {fiatStr && (
        <span className="text-xs text-text-muted tabular-nums">
          {fiatStr}
        </span>
      )}
    </span>
  );
}
