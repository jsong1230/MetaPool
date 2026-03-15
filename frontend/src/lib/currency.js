/**
 * 통화 로컬라이제이션 유틸 — F-28
 * META → 법정화폐 환산 (하드코딩 환율)
 * 언어 → 기본 통화 매핑
 */

/**
 * 언어별 기본 통화 매핑
 */
export const LANGUAGE_CURRENCY_MAP = {
  en: 'USD',
  ko: 'KRW',
  zh: 'CNY',
  ja: 'JPY',
};

/**
 * META → 법정화폐 환율 (1 META 기준, 하드코딩)
 * 실제 서비스에서는 외부 API로 갱신 필요
 */
export const META_RATES = {
  USD: 0.0045,
  KRW: 6.0,
  CNY: 0.032,
  JPY: 0.68,
};

/**
 * 통화별 포맷 설정
 */
const CURRENCY_FORMAT = {
  USD: { locale: 'en-US', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  KRW: { locale: 'ko-KR', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  CNY: { locale: 'zh-CN', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  JPY: { locale: 'ja-JP', minimumFractionDigits: 0, maximumFractionDigits: 0 },
};

/**
 * META 금액(숫자)을 법정화폐 문자열로 변환
 * @param {number} metaAmount — META 단위 금액 (wei 아님)
 * @param {string} currency — 'USD' | 'KRW' | 'CNY' | 'JPY'
 * @returns {string} "≈ $4.50" 형태
 */
export function convertMetaToFiat(metaAmount, currency = 'USD') {
  const rate = META_RATES[currency];
  if (!rate || !metaAmount || metaAmount === 0) return '';

  const fiatValue = metaAmount * rate;
  const fmt = CURRENCY_FORMAT[currency] || CURRENCY_FORMAT.USD;

  try {
    const formatted = new Intl.NumberFormat(fmt.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fmt.minimumFractionDigits,
      maximumFractionDigits: fmt.maximumFractionDigits,
    }).format(fiatValue);

    return `≈ ${formatted}`;
  } catch {
    return '';
  }
}

/**
 * 현재 언어에서 기본 통화 코드 반환
 * @param {string} language — i18n language code
 * @returns {string} currency code
 */
export function getCurrencyForLanguage(language) {
  // 언어 코드 정규화 (ko-KR → ko)
  const lang = language.split('-')[0].toLowerCase();
  return LANGUAGE_CURRENCY_MAP[lang] || 'USD';
}
