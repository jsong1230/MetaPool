/**
 * CategoryFilter 컴포넌트 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFilter } from '../common/CategoryFilter.jsx';

describe('CategoryFilter', () => {
  it('전체 + 6개 카테고리 탭을 렌더링한다', () => {
    render(<CategoryFilter selectedCategory={-1} onChange={() => {}} />);
    expect(screen.getByText('전체')).toBeInTheDocument();
    expect(screen.getByText('가상자산')).toBeInTheDocument();
    expect(screen.getByText('스포츠')).toBeInTheDocument();
    expect(screen.getByText('날씨')).toBeInTheDocument();
    expect(screen.getByText('정치')).toBeInTheDocument();
    expect(screen.getByText('엔터')).toBeInTheDocument();
    expect(screen.getByText('기타')).toBeInTheDocument();
  });

  it('선택된 탭에 aria-selected="true"', () => {
    render(<CategoryFilter selectedCategory={0} onChange={() => {}} />);
    const cryptoTab = screen.getByText('가상자산');
    expect(cryptoTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('전체')).toHaveAttribute('aria-selected', 'false');
  });

  it('탭 클릭 시 onChange 호출', () => {
    const onChange = vi.fn();
    render(<CategoryFilter selectedCategory={-1} onChange={onChange} />);
    fireEvent.click(screen.getByText('스포츠'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('전체 클릭 시 -1 전달', () => {
    const onChange = vi.fn();
    render(<CategoryFilter selectedCategory={0} onChange={onChange} />);
    fireEvent.click(screen.getByText('전체'));
    expect(onChange).toHaveBeenCalledWith(-1);
  });

  it('tablist role 적용', () => {
    render(<CategoryFilter selectedCategory={-1} onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
