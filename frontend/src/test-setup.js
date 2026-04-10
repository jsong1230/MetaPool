import '@testing-library/jest-dom/vitest';

// import.meta.env 기본값 (vitest는 자동 주입하지만 안전장치)
if (!import.meta.env.VITE_RPC_URL) {
  import.meta.env.VITE_RPC_URL = 'http://127.0.0.1:8545';
}
if (!import.meta.env.VITE_CHAIN_ID) {
  import.meta.env.VITE_CHAIN_ID = '31337';
}
if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
  import.meta.env.VITE_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
}

// react-i18next mock — 카테고리 번역 포함, 나머지는 키 반환
vi.mock('react-i18next', () => {
  const translations = {
    'categories.all': '전체',
    'categories.crypto': '가상자산',
    'categories.sports': '스포츠',
    'categories.weather': '날씨',
    'categories.politics': '정치',
    'categories.entertainment': '엔터',
    'categories.other': '기타',
  };
  return {
    useTranslation: () => ({
      t: (key) => translations[key] ?? key,
      i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  };
});
