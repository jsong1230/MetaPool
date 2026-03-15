/**
 * Toast — 토스트 알림 컴포넌트 (F-20)
 * design-system.md §7.7 기준
 * 위치: 우측 하단 fixed
 * 타입: success | error | warning | info
 */
import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// 토스트 컨텍스트
const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: 'border-[rgba(16,185,129,0.3)] text-success',
  error:   'border-[rgba(239,68,68,0.3)] text-danger',
  warning: 'border-[rgba(245,158,11,0.3)] text-warning',
  info:    'border-[rgba(99,102,241,0.3)] text-brand-primary',
};

const AUTO_CLOSE_MS = {
  success: 4000,
  info:    4000,
  warning: 6000,
  error:   6000,
};

let toastIdCounter = 0;

/**
 * ToastProvider — 앱 최상단에서 감싸야 함
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration }) => {
    const id = ++toastIdCounter;
    const ms = duration ?? AUTO_CLOSE_MS[type] ?? 4000;

    setToasts(prev => [...prev, { id, type, message, ms }]);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * useToast — Toast 추가 훅
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provider 없는 환경에서도 안전하게 동작
    return {
      toast: {
        success: () => {},
        error: () => {},
        warning: () => {},
        info: () => {},
      },
    };
  }

  const { addToast } = ctx;

  return {
    toast: {
      success: (message, opts) => addToast({ type: 'success', message, ...opts }),
      error:   (message, opts) => addToast({ type: 'error', message, ...opts }),
      warning: (message, opts) => addToast({ type: 'warning', message, ...opts }),
      info:    (message, opts) => addToast({ type: 'info', message, ...opts }),
    },
  };
}

/**
 * ToastContainer — 토스트 목록 렌더링
 */
function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      aria-live="assertive"
      aria-atomic="false"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
}

/**
 * ToastItem — 개별 토스트
 */
function ToastItem({ id, type, message, ms, onRemove }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(id), ms);
    return () => clearTimeout(timerRef.current);
  }, [id, ms, onRemove]);

  const Icon = ICONS[type] || Info;
  const style = STYLES[type] || STYLES.info;

  return (
    <div
      className={`
        min-w-[280px] max-w-[380px]
        bg-bg-elevated border rounded-lg
        p-4 shadow-elevation-3
        flex items-start gap-3
        animate-slide-in-right
        ${style}
      `}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="flex-1 text-sm text-text-primary leading-relaxed">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="
          shrink-0 ml-1
          text-text-muted hover:text-text-secondary
          transition-colors duration-150
        "
        aria-label="토스트 닫기"
      >
        <X className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
