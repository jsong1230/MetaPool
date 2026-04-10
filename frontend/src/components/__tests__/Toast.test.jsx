/**
 * Toast 컴포넌트 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../common/Toast.jsx';

// 테스트용 소비 컴포넌트
function ToastTrigger({ type = 'success', message = '테스트 메시지' }) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast[type](message)}>
      트리거
    </button>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('토스트 메시지를 표시한다', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('트리거'));
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
  });

  it('닫기 버튼으로 토스트 제거', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('트리거'));
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('토스트 닫기'));
    expect(screen.queryByText('테스트 메시지')).not.toBeInTheDocument();
  });

  it('자동으로 사라진다 (success: 4초)', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('트리거'));
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByText('테스트 메시지')).not.toBeInTheDocument();
  });

  it('error 타입은 6초 후 사라진다', () => {
    render(
      <ToastProvider>
        <ToastTrigger type="error" message="에러!" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('트리거'));

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByText('에러!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('에러!')).not.toBeInTheDocument();
  });

  it('role="alert"가 적용된다', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('트리거'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('Provider 없이도 useToast가 안전하게 동작', () => {
    // Provider 없이 사용 — no-op 반환
    function Bare() {
      const { toast } = useToast();
      return <button onClick={() => toast.info('test')}>bare</button>;
    }
    render(<Bare />);
    // 에러 없이 클릭 가능
    fireEvent.click(screen.getByText('bare'));
  });
});
