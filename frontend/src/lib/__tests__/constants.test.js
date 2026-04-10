/**
 * constants.js 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  NETWORKS,
  ALLOWED_CHAIN_IDS,
  CATEGORIES,
  CATEGORY_NAMES,
  MARKET_STATUS,
  MARKET_OUTCOME,
} from '../constants.js';

describe('NETWORKS', () => {
  it('3개 네트워크가 정의되어 있다', () => {
    expect(NETWORKS.metadiumMainnet).toBeDefined();
    expect(NETWORKS.metadiumTestnet).toBeDefined();
    expect(NETWORKS.localhost).toBeDefined();
  });

  it('Metadium mainnet chainId = 11 (0xb)', () => {
    expect(NETWORKS.metadiumMainnet.chainId).toBe('0xb');
  });

  it('Metadium testnet chainId = 12 (0xc)', () => {
    expect(NETWORKS.metadiumTestnet.chainId).toBe('0xc');
  });

  it('localhost chainId = 31337 (0x7a69)', () => {
    expect(NETWORKS.localhost.chainId).toBe('0x7a69');
  });

  it('각 네트워크에 rpcUrls가 있다', () => {
    Object.values(NETWORKS).forEach(net => {
      expect(Array.isArray(net.rpcUrls)).toBe(true);
    });
  });
});

describe('ALLOWED_CHAIN_IDS', () => {
  it('3개 체인 ID 포함 (11, 12, 31337)', () => {
    expect(ALLOWED_CHAIN_IDS).toContain(11);
    expect(ALLOWED_CHAIN_IDS).toContain(12);
    expect(ALLOWED_CHAIN_IDS).toContain(31337);
  });
});

describe('CATEGORIES', () => {
  it('6개 카테고리', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it('ID 0~5 순서', () => {
    CATEGORIES.forEach((cat, idx) => {
      expect(cat.id).toBe(idx);
    });
  });

  it('각 카테고리에 name, labelKey, color 존재', () => {
    CATEGORIES.forEach(cat => {
      expect(cat.name).toBeTruthy();
      expect(cat.labelKey).toBeTruthy();
      expect(cat.color).toBeTruthy();
    });
  });

  it('CATEGORY_NAMES는 이름 배열', () => {
    expect(CATEGORY_NAMES).toEqual(['Crypto', 'Sports', 'Weather', 'Politics', 'Entertainment', 'Other']);
  });
});

describe('MARKET_STATUS', () => {
  it('5개 상태 매핑', () => {
    expect(MARKET_STATUS[0]).toBe('Active');
    expect(MARKET_STATUS[1]).toBe('Closed');
    expect(MARKET_STATUS[2]).toBe('Resolved');
    expect(MARKET_STATUS[3]).toBe('Voided');
    expect(MARKET_STATUS[4]).toBe('Paused');
  });
});

describe('MARKET_OUTCOME', () => {
  it('4개 결과 매핑', () => {
    expect(MARKET_OUTCOME[0]).toBe('Undecided');
    expect(MARKET_OUTCOME[1]).toBe('Yes');
    expect(MARKET_OUTCOME[2]).toBe('No');
    expect(MARKET_OUTCOME[3]).toBe('Void');
  });
});
