# Toast 컴포넌트

## 경로
`frontend/src/components/common/Toast.jsx`

## 개요
F-20(베팅 성공 토스트) 구현.
전역 토스트 알림 시스템. Provider + 훅 패턴으로 구성.

## 사용법

### 1. 앱 최상단에 Provider 설정
```jsx
import { ToastProvider } from './components/common/Toast.jsx';

function App() {
  return (
    <ToastProvider>
      {/* ... */}
    </ToastProvider>
  );
}
```

### 2. 컴포넌트에서 훅 사용
```jsx
import { useToast } from './components/common/Toast.jsx';

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast.success('베팅이 완료되었습니다!');
  };

  const handleError = () => {
    toast.error('트랜잭션이 실패했습니다.');
  };
}
```

## API

### `useToast()` 반환값

| 메서드 | 설명 |
|--------|------|
| `toast.success(message, opts?)` | 성공 토스트 (4초) |
| `toast.error(message, opts?)` | 에러 토스트 (6초) |
| `toast.warning(message, opts?)` | 경고 토스트 (6초) |
| `toast.info(message, opts?)` | 정보 토스트 (4초) |

### opts 파라미터
| 키 | 타입 | 설명 |
|----|------|------|
| `duration` | `number` | 자동 닫힘 ms (기본값 타입별 상이) |

## 디자인
- 위치: `fixed bottom-4 right-4 z-[100]`
- 애니메이션: `animate-slide-in-right`
- 타입별 테두리 색상: success=green, error=red, warning=amber, info=indigo
- 자동 닫힘 타이머 (X 버튼으로 수동 닫기도 가능)
