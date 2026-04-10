/**
 * Countdown 컴포넌트 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Countdown } from '../common/Countdown.jsx';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('마감 시간이 지난 경우 "마감됨" 표시', () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    render(<Countdown deadline={past} />);
    expect(screen.getByText('마감됨')).toBeInTheDocument();
  });

  it('남은 시간이 있으면 카운트다운 표시', () => {
    const future = Math.floor(Date.now() / 1000) + 3600 * 2; // 2시간 후
    render(<Countdown deadline={future} />);
    expect(screen.getByText(/h.*m/)).toBeInTheDocument();
  });

  it('showIcon=false이면 아이콘 숨김', () => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const { container } = render(<Countdown deadline={future} showIcon={false} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('showIcon=true이면 아이콘 표시 (기본값)', () => {
    const future = Math.floor(Date.now() / 1000) + 86400;
    const { container } = render(<Countdown deadline={future} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
