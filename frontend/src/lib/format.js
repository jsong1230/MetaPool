/**
 * 포맷팅 유틸리티
 * META 금액, 지갑 주소 축약, 타임스탬프 카운트다운
 */
import { ethers } from 'ethers';

/**
 * wei → META 포맷 (소수점 최대 4자리, 천 단위 구분자)
 * @param {bigint|string} weiValue
 * @param {number} [decimals=4]
 * @returns {string} "1,234.5678"
 */
export function formatMeta(weiValue, decimals = 4) {
  if (!weiValue && weiValue !== 0n) return '0';
  try {
    const formatted = ethers.formatEther(weiValue);
    const num = parseFloat(formatted);

    if (num === 0) return '0';

    // 정수 부분과 소수 부분 분리
    const [intPart, decPart = ''] = formatted.split('.');
    const trimmedDec = decPart.replace(/0+$/, '').slice(0, decimals);

    // 천 단위 구분자
    const intFormatted = parseInt(intPart).toLocaleString('en-US');

    return trimmedDec ? `${intFormatted}.${trimmedDec}` : intFormatted;
  } catch {
    return '0';
  }
}

/**
 * wei → META 포맷 (단위 포함)
 * @param {bigint|string} weiValue
 * @returns {string} "1,234 META"
 */
export function formatMetaWithUnit(weiValue) {
  return `${formatMeta(weiValue)} META`;
}

/**
 * 지갑 주소 축약
 * @param {string} address
 * @returns {string} "0x1234...5678"
 */
export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Unix timestamp → 카운트다운 문자열
 * @param {number} deadline Unix timestamp (초)
 * @returns {{ text: string, urgency: 'normal' | 'warning' | 'danger' | 'ended' }}
 */
export function formatCountdown(deadline) {
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;

  if (remaining <= 0) {
    return { text: '마감됨', urgency: 'ended' };
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  let text;
  if (days > 0) {
    text = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    text = `${minutes}m ${seconds}s`;
  }

  // 긴급도 계산
  let urgency;
  if (remaining < 3600) {
    urgency = 'danger'; // 1시간 미만
  } else if (remaining < 86400) {
    urgency = 'warning'; // 24시간 미만
  } else {
    urgency = 'normal'; // 24시간 이상
  }

  return { text, urgency };
}

/**
 * basis points → 배수 표시
 * @param {bigint|number} basisPoints
 * @returns {string} "1.50x" 또는 "--"
 */
export function formatOdds(basisPoints) {
  const bp = typeof basisPoints === 'bigint' ? Number(basisPoints) : basisPoints;
  if (!bp || bp === 0) return '--';
  return `${(bp / 10000).toFixed(2)}x`;
}

/**
 * wei 기반 Yes/No 풀에서 비율 계산
 * @param {bigint} yesPool
 * @param {bigint} noPool
 * @returns {{ yesPercent: number, noPercent: number }}
 */
export function calcPoolRatio(yesPool, noPool) {
  const yes = Number(ethers.formatEther(yesPool || 0n));
  const no = Number(ethers.formatEther(noPool || 0n));
  const total = yes + no;

  if (total === 0) {
    return { yesPercent: 50, noPercent: 50 };
  }

  const yesPercent = Math.round((yes / total) * 100);
  return { yesPercent, noPercent: 100 - yesPercent };
}

/**
 * Unix timestamp → 날짜 문자열
 * @param {number} timestamp
 * @returns {string} "2026-03-16 15:30"
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 현재 언어에 맞는 마켓 질문 반환 — F-29
 * 해당 언어 질문이 없으면 영어(기본) 폴백
 * @param {Object} market — { question, questionKo, questionZh, questionJa }
 * @param {string} language — i18n language code (en/ko/zh/ja)
 * @returns {string}
 */
export function getLocalizedQuestion(market, language) {
  if (!market) return '';

  const lang = (language || 'en').split('-')[0].toLowerCase();

  const fieldMap = {
    ko: 'questionKo',
    zh: 'questionZh',
    ja: 'questionJa',
  };

  const field = fieldMap[lang];
  if (field && market[field]) {
    return market[field];
  }

  return market.question || '';
}
