/**
 * contract.js 유틸리티 테스트 (parseContractError)
 */
import { describe, it, expect, vi } from 'vitest';
import { parseContractError } from '../contract.js';

// getReadContract가 내부에서 호출되므로 CONTRACT_ADDRESS 필요
vi.mock('../constants.js', async () => {
  const actual = await vi.importActual('../constants.js');
  return {
    ...actual,
    CONTRACT_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  };
});

describe('parseContractError', () => {
  it('사용자 거부 (ACTION_REJECTED)', () => {
    const err = { code: 'ACTION_REJECTED' };
    const result = parseContractError(err);
    expect(result.type).toBe('USER_REJECTED');
    expect(result.message).toMatch(/거부/);
  });

  it('사용자 거부 (code 4001)', () => {
    const err = { code: 4001 };
    const result = parseContractError(err);
    expect(result.type).toBe('USER_REJECTED');
  });

  it('잔액 부족', () => {
    const err = { code: 'INSUFFICIENT_FUNDS' };
    const result = parseContractError(err);
    expect(result.type).toBe('INSUFFICIENT_FUNDS');
    expect(result.message).toMatch(/잔액/);
  });

  it('네트워크 에러 (일반)', () => {
    const err = { message: 'network timeout' };
    const result = parseContractError(err);
    expect(result.type).toBe('NETWORK_ERROR');
    expect(result.message).toBe('network timeout');
  });

  it('메시지 없는 에러', () => {
    const err = {};
    const result = parseContractError(err);
    expect(result.type).toBe('NETWORK_ERROR');
    expect(result.message).toMatch(/네트워크/);
  });
});
