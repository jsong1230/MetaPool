/**
 * 앱 전역 상수 — 체인 설정, 컨트랙트 주소, 카테고리
 */

// Metadium 네트워크 설정
export const NETWORKS = {
  metadiumMainnet: {
    chainId: '0xb', // 11
    chainName: 'Metadium Mainnet',
    rpcUrls: ['https://api.metadium.com/prod'],
    nativeCurrency: { name: 'META', symbol: 'META', decimals: 18 },
    blockExplorerUrls: ['https://explorer.metadium.com'],
  },
  metadiumTestnet: {
    chainId: '0xc', // 12
    chainName: 'Metadium Testnet',
    rpcUrls: ['https://api.metadium.com/dev'],
    nativeCurrency: { name: 'META', symbol: 'META', decimals: 18 },
    blockExplorerUrls: ['https://testnetexplorer.metadium.com'],
  },
  localhost: {
    chainId: '0x7a69', // 31337
    chainName: 'Localhost',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: [],
  },
};

// 개발 환경에서 사용할 네트워크 결정
const envChainId = import.meta.env.VITE_CHAIN_ID;
export const ACTIVE_NETWORK =
  envChainId === '11' ? NETWORKS.metadiumMainnet :
  envChainId === '12' ? NETWORKS.metadiumTestnet :
  NETWORKS.localhost;

// 허용되는 체인 ID 목록 (mainnet + testnet + localhost)
export const ALLOWED_CHAIN_IDS = [
  parseInt(NETWORKS.metadiumMainnet.chainId, 16),
  parseInt(NETWORKS.metadiumTestnet.chainId, 16),
  parseInt(NETWORKS.localhost.chainId, 16),
];

// 컨트랙트 주소
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

// RPC URL
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';

// 카테고리 enum (컨트랙트 MarketCategory와 일치)
export const CATEGORIES = [
  { id: 0, name: 'Crypto', label: '가상자산', color: 'brand-primary' },
  { id: 1, name: 'Sports', label: '스포츠', color: 'sky' },
  { id: 2, name: 'Weather', label: '날씨', color: 'warning' },
  { id: 3, name: 'Politics', label: '정치', color: 'brand-secondary' },
  { id: 4, name: 'Entertainment', label: '엔터', color: 'pink' },
  { id: 5, name: 'Other', label: '기타', color: 'muted' },
];

export const CATEGORY_NAMES = CATEGORIES.map(c => c.name);

// 마켓 상태 enum (컨트랙트 MarketStatus와 일치)
export const MARKET_STATUS = {
  0: 'Active',
  1: 'Closed',
  2: 'Resolved',
  3: 'Voided',
  4: 'Paused',
};

// 마켓 결과 enum (컨트랙트 MarketOutcome와 일치)
export const MARKET_OUTCOME = {
  0: 'Undecided',
  1: 'Yes',
  2: 'No',
  3: 'Void',
};

// 베팅 한도 (fallback, 컨트랙트에서 읽는 값 사용)
export const DEFAULT_MIN_BET_ETH = '100';
export const DEFAULT_MAX_BET_ETH = '100000';

// 폴링 주기 (ms)
export const POLL_INTERVAL_MARKETS = 30000;
export const POLL_INTERVAL_BALANCE = 15000;
