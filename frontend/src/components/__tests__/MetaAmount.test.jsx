/**
 * MetaAmount 컴포넌트 테스트
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ethers } from 'ethers';
import { MetaAmount } from '../common/MetaAmount.jsx';

describe('MetaAmount', () => {
  it('META 금액을 표시한다', () => {
    const wei = ethers.parseEther('1000');
    render(<MetaAmount weiAmount={wei} />);
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
    expect(screen.getByText('META')).toBeInTheDocument();
  });

  it('showFiat=true이면 법정화폐 환산 표시 (en → USD)', () => {
    const wei = ethers.parseEther('1000');
    render(<MetaAmount weiAmount={wei} showFiat={true} />);
    expect(screen.getByText(/≈/)).toBeInTheDocument();
  });

  it('showFiat=false이면 법정화폐 미표시', () => {
    const wei = ethers.parseEther('1000');
    render(<MetaAmount weiAmount={wei} showFiat={false} />);
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it('0 금액 처리', () => {
    render(<MetaAmount weiAmount={0n} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('null 처리', () => {
    render(<MetaAmount weiAmount={null} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('size prop 적용', () => {
    const wei = ethers.parseEther('100');
    const { container } = render(<MetaAmount weiAmount={wei} size="lg" />);
    expect(container.querySelector('.text-base')).not.toBeNull();
  });
});
