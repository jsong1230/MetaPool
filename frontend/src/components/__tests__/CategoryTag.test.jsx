/**
 * CategoryTag 컴포넌트 테스트
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryTag } from '../common/CategoryTag.jsx';

describe('CategoryTag', () => {
  it('카테고리 이름을 표시한다', () => {
    render(<CategoryTag categoryId={0} />);
    expect(screen.getByText('가상자산')).toBeInTheDocument();
  });

  it('각 카테고리 ID에 올바른 번역 레이블 표시', () => {
    const labels = ['가상자산', '스포츠', '날씨', '정치', '엔터', '기타'];
    labels.forEach((label, id) => {
      const { unmount } = render(<CategoryTag categoryId={id} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('알 수 없는 ID는 기타 레이블 표시', () => {
    render(<CategoryTag categoryId={99} />);
    expect(screen.getByText('기타')).toBeInTheDocument();
  });

  it('추가 className 적용', () => {
    const { container } = render(<CategoryTag categoryId={0} className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });
});
