/**
 * i18n 초기화 — F-27 4개 언어 지원
 * 브라우저 언어 감지, localStorage 저장
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import ko from '../locales/ko.json';
import zh from '../locales/zh.json';
import ja from '../locales/ja.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
      zh: { translation: zh },
      ja: { translation: ja },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ko', 'zh', 'ja'],
    detection: {
      // localStorage 키, 브라우저 언어 순으로 감지
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'metapool-language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
