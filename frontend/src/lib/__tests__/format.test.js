/**
 * format.js 유틸리티 테스트
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ethers } from 'ethers';
import {
  formatMeta,
  formatMetaWithUnit,
  shortenAddress,
  formatCountdown,
  formatOdds,
  calcPoolRatio,
  formatDate,
  getLocalizedQuestion,
} from '../format.js';

describe('formatMeta', () => {
  it('wei를 META로 변환한다 (기본 소수점 4자리)', () => {
    const wei = ethers.parseEther('1234.5678');
    expect(formatMeta(wei)).toBe('1,234.5678');
  });

  it('정수 금액은 소수점 없이 표시', () => {
    const wei = ethers.parseEther('100');
    expect(formatMeta(wei)).toBe('100');
  });

  it('0n을 처리한다', () => {
    expect(formatMeta(0n)).toBe('0');
  });

  it('null/undefined를 처리한다', () => {
    expect(formatMeta(null)).toBe('0');
    expect(formatMeta(undefined)).toBe('0');
  });

  it('소수점 자릿수 커스텀', () => {
    const wei = ethers.parseEther('1.123456789');
    expect(formatMeta(wei, 2)).toBe('1.12');
  });

  it('끝의 0을 제거한다', () => {
    const wei = ethers.parseEther('5.1');
    expect(formatMeta(wei)).toBe('5.1');
  });

  it('천 단위 구분자 적용', () => {
    const wei = ethers.parseEther('1000000');
    expect(formatMeta(wei)).toBe('1,000,000');
  });
});

describe('formatMetaWithUnit', () => {
  it('META 단위를 붙인다', () => {
    const wei = ethers.parseEther('50');
    expect(formatMetaWithUnit(wei)).toBe('50 META');
  });
});

describe('shortenAddress', () => {
  it('주소를 0x1234...5678 형태로 축약', () => {
    expect(shortenAddress('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'))
      .toBe('0xAbCd...Ef12');
  });

  it('빈 값은 빈 문자열 반환', () => {
    expect(shortenAddress(null)).toBe('');
    expect(shortenAddress('')).toBe('');
    expect(shortenAddress(undefined)).toBe('');
  });
});

describe('formatCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('마감된 경우 "마감됨" 반환', () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 100;
    const result = formatCountdown(pastDeadline);
    expect(result.text).toBe('마감됨');
    expect(result.urgency).toBe('ended');
  });

  it('1시간 미만이면 danger', () => {
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30분 후
    const result = formatCountdown(deadline);
    expect(result.urgency).toBe('danger');
    expect(result.text).toMatch(/m.*s/);
  });

  it('24시간 미만이면 warning', () => {
    const deadline = Math.floor(Date.now() / 1000) + 7200; // 2시간 후
    const result = formatCountdown(deadline);
    expect(result.urgency).toBe('warning');
    expect(result.text).toMatch(/h.*m/);
  });

  it('24시간 이상이면 normal', () => {
    const deadline = Math.floor(Date.now() / 1000) + 172800; // 2일 후
    const result = formatCountdown(deadline);
    expect(result.urgency).toBe('normal');
    expect(result.text).toMatch(/d.*h/);
  });
});

describe('formatOdds', () => {
  it('basis points를 배수로 변환', () => {
    expect(formatOdds(15000n)).toBe('1.50x');
    expect(formatOdds(20000)).toBe('2.00x');
  });

  it('0 또는 falsy 값은 "--" 반환', () => {
    expect(formatOdds(0)).toBe('--');
    expect(formatOdds(null)).toBe('--');
    expect(formatOdds(0n)).toBe('--');
  });
});

describe('calcPoolRatio', () => {
  it('풀 비율을 계산한다', () => {
    const yes = ethers.parseEther('75');
    const no = ethers.parseEther('25');
    const result = calcPoolRatio(yes, no);
    expect(result.yesPercent).toBe(75);
    expect(result.noPercent).toBe(25);
  });

  it('양쪽 모두 0이면 50/50', () => {
    const result = calcPoolRatio(0n, 0n);
    expect(result.yesPercent).toBe(50);
    expect(result.noPercent).toBe(50);
  });

  it('한쪽만 있는 경우', () => {
    const yes = ethers.parseEther('100');
    const result = calcPoolRatio(yes, 0n);
    expect(result.yesPercent).toBe(100);
    expect(result.noPercent).toBe(0);
  });
});

describe('formatDate', () => {
  it('timestamp를 한국어 날짜로 변환', () => {
    const result = formatDate(1711000000);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('falsy 값은 빈 문자열', () => {
    expect(formatDate(0)).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('getLocalizedQuestion', () => {
  const market = {
    question: 'Will BTC reach 100k?',
    questionKo: 'BTC가 10만 달러에 도달할까?',
    questionZh: 'BTC会达到10万吗？',
    questionJa: 'BTCは10万ドルに到達しますか？',
  };

  it('영어 기본 반환', () => {
    expect(getLocalizedQuestion(market, 'en')).toBe('Will BTC reach 100k?');
  });

  it('한국어 반환', () => {
    expect(getLocalizedQuestion(market, 'ko')).toBe('BTC가 10만 달러에 도달할까?');
  });

  it('중국어 반환', () => {
    expect(getLocalizedQuestion(market, 'zh')).toBe('BTC会达到10万吗？');
  });

  it('일본어 반환', () => {
    expect(getLocalizedQuestion(market, 'ja')).toBe('BTCは10万ドルに到達しますか？');
  });

  it('언어 코드에 지역 포함 시 (ko-KR)', () => {
    expect(getLocalizedQuestion(market, 'ko-KR')).toBe('BTC가 10만 달러에 도달할까?');
  });

  it('해당 언어 번역이 없으면 영어 폴백', () => {
    const partial = { question: 'English only' };
    expect(getLocalizedQuestion(partial, 'ko')).toBe('English only');
  });

  it('market이 null이면 빈 문자열', () => {
    expect(getLocalizedQuestion(null, 'en')).toBe('');
  });
});
