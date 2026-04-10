/**
 * currency.js 유틸리티 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_CURRENCY_MAP,
  META_RATES,
  convertMetaToFiat,
  getCurrencyForLanguage,
} from '../currency.js';

describe('LANGUAGE_CURRENCY_MAP', () => {
  it('4개 언어-통화 매핑이 존재한다', () => {
    expect(LANGUAGE_CURRENCY_MAP.en).toBe('USD');
    expect(LANGUAGE_CURRENCY_MAP.ko).toBe('KRW');
    expect(LANGUAGE_CURRENCY_MAP.zh).toBe('CNY');
    expect(LANGUAGE_CURRENCY_MAP.ja).toBe('JPY');
  });
});

describe('META_RATES', () => {
  it('4개 통화 환율이 존재한다', () => {
    expect(META_RATES.USD).toBeGreaterThan(0);
    expect(META_RATES.KRW).toBeGreaterThan(0);
    expect(META_RATES.CNY).toBeGreaterThan(0);
    expect(META_RATES.JPY).toBeGreaterThan(0);
  });
});

describe('convertMetaToFiat', () => {
  it('META를 USD로 환산', () => {
    const result = convertMetaToFiat(1000, 'USD');
    expect(result).toMatch(/≈/);
    expect(result).toMatch(/\$/);
  });

  it('META를 KRW로 환산', () => {
    const result = convertMetaToFiat(1000, 'KRW');
    expect(result).toMatch(/≈/);
    expect(result).toMatch(/₩/);
  });

  it('META를 JPY로 환산', () => {
    const result = convertMetaToFiat(1000, 'JPY');
    expect(result).toMatch(/≈/);
    expect(result).toMatch(/￥|¥/);
  });

  it('0이면 빈 문자열', () => {
    expect(convertMetaToFiat(0, 'USD')).toBe('');
  });

  it('null이면 빈 문자열', () => {
    expect(convertMetaToFiat(null, 'USD')).toBe('');
  });

  it('알 수 없는 통화면 빈 문자열', () => {
    expect(convertMetaToFiat(1000, 'XYZ')).toBe('');
  });
});

describe('getCurrencyForLanguage', () => {
  it('언어 코드로 통화 반환', () => {
    expect(getCurrencyForLanguage('ko')).toBe('KRW');
    expect(getCurrencyForLanguage('en')).toBe('USD');
    expect(getCurrencyForLanguage('ja')).toBe('JPY');
    expect(getCurrencyForLanguage('zh')).toBe('CNY');
  });

  it('지역 포함 언어 코드 처리 (ko-KR)', () => {
    expect(getCurrencyForLanguage('ko-KR')).toBe('KRW');
    expect(getCurrencyForLanguage('en-US')).toBe('USD');
  });

  it('알 수 없는 언어는 USD 폴백', () => {
    expect(getCurrencyForLanguage('fr')).toBe('USD');
    expect(getCurrencyForLanguage('de')).toBe('USD');
  });
});
