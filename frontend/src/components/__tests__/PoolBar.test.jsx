/**
 * PoolBar 컴포넌트 테스트
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ethers } from 'ethers';
import { PoolBar } from '../common/PoolBar.jsx';

describe('PoolBar', () => {
  it('Yes/No 비율을 표시한다', () => {
    const yes = ethers.parseEther('75');
    const no = ethers.parseEther('25');
    render(<PoolBar yesPool={yes} noPool={no} />);
    expect(screen.getByText('YES 75%')).toBeInTheDocument();
    expect(screen.getByText('NO 25%')).toBeInTheDocument();
  });

  it('양쪽 0이면 50/50', () => {
    render(<PoolBar yesPool={0n} noPool={0n} />);
    expect(screen.getByText('YES 50%')).toBeInTheDocument();
    expect(screen.getByText('NO 50%')).toBeInTheDocument();
  });

  it('progressbar role 적용', () => {
    render(<PoolBar yesPool={0n} noPool={0n} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('aria-label에 비율 포함', () => {
    const yes = ethers.parseEther('60');
    const no = ethers.parseEther('40');
    render(<PoolBar yesPool={yes} noPool={no} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      'YES 60% / NO 40%'
    );
  });

  it('null 풀을 안전하게 처리', () => {
    render(<PoolBar yesPool={null} noPool={null} />);
    expect(screen.getByText('YES 50%')).toBeInTheDocument();
  });
});
