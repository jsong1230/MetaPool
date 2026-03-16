/**
 * AdminCreateMarketPage — 마켓 생성 페이지 (/admin/create)
 * F-01, F-02: 4개 언어 질문, 카테고리, 마감 시간 입력 폼
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CheckCircle, ShieldAlert,
  ChevronDown, Eye
} from 'lucide-react';
import { CATEGORIES } from '../lib/constants.js';
import { CategoryTag } from '../components/common/CategoryTag.jsx';
import { useCreateMarket, TX_STATUS } from '../hooks/useCreateMarket.js';
import { useAdmin } from '../hooks/useAdmin.js';
import { useToast } from '../components/common/Toast.jsx';

// datetime-local → Unix timestamp (초)
function toUnixTimestamp(datetimeLocal) {
  if (!datetimeLocal) return 0;
  return Math.floor(new Date(datetimeLocal).getTime() / 1000);
}

// 현재 시각 + offset(분)을 datetime-local 입력값으로 변환
function defaultDatetime(offsetMinutes = 60) {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  // 로컬 ISO 문자열 (datetime-local 형식)
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminCreateMarketPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner, loading: adminLoading } = useAdmin();
  const { createMarket, txStatus, txHash, createdMarketId, txError, reset } = useCreateMarket();

  const [form, setForm] = useState({
    question: '',
    questionKo: '',
    questionZh: '',
    questionJa: '',
    category: 0,
    bettingDeadline: defaultDatetime(120),   // 기본: 2시간 후
    resolutionDeadline: defaultDatetime(240), // 기본: 4시간 후
  });

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});

  const isLoading = txStatus === TX_STATUS.PENDING || txStatus === TX_STATUS.CONFIRMING;
  const isSuccess = txStatus === TX_STATUS.SUCCESS;

  // 성공 시 토스트 + 이동
  useEffect(() => {
    if (isSuccess) {
      toast.success(
        createdMarketId
          ? `마켓 #${createdMarketId} 생성 완료`
          : '마켓 생성 완료'
      );
      const timer = setTimeout(() => navigate('/admin'), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, createdMarketId, toast, navigate]);

  // 폼 유효성 검사
  const validate = () => {
    const errs = {};
    if (!form.question.trim()) errs.question = '영어 질문은 필수입니다';
    if (!form.bettingDeadline) errs.bettingDeadline = '베팅 마감 시간을 입력해주세요';
    if (!form.resolutionDeadline) errs.resolutionDeadline = '결과 확정 시간을 입력해주세요';

    const betting = toUnixTimestamp(form.bettingDeadline);
    const resolution = toUnixTimestamp(form.resolutionDeadline);
    const now = Math.floor(Date.now() / 1000);

    if (betting && betting <= now) {
      errs.bettingDeadline = '베팅 마감 시간은 현재 시각 이후여야 합니다';
    }
    if (betting && resolution && resolution <= betting) {
      errs.resolutionDeadline = '결과 확정 시간은 베팅 마감 이후여야 합니다';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    reset();

    await createMarket({
      question: form.question.trim(),
      questionKo: form.questionKo.trim(),
      questionZh: form.questionZh.trim(),
      questionJa: form.questionJa.trim(),
      category: form.category,
      bettingDeadline: toUnixTimestamp(form.bettingDeadline),
      resolutionDeadline: toUnixTimestamp(form.resolutionDeadline),
    });
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // 관리자 로딩 중
  if (adminLoading) {
    return (
      <main className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" strokeWidth={1.5} />
        </div>
      </main>
    );
  }

  // owner 아님
  if (!isOwner) {
    return (
      <main className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
        <div className="
          bg-bg-surface border border-border-default rounded-lg
          p-10 flex flex-col items-center text-center
          min-h-[300px]
        ">
          <ShieldAlert className="w-12 h-12 text-danger mb-4" strokeWidth={1} />
          <h2 className="text-xl font-bold text-text-primary mb-2">접근 권한 없음</h2>
          <Link to="/" className="mt-4 text-sm text-brand-primary hover:underline">
            메인으로 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      {/* 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="
            p-1.5 rounded-md
            text-text-muted hover:text-text-secondary hover:bg-bg-surface
            transition-colors duration-150
          "
          aria-label="관리자 패널로"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-[-0.02em]">
            마켓 생성
          </h1>
          <p className="text-text-muted text-xs mt-0.5">새로운 예측 마켓을 생성합니다</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 질문 섹션 */}
          <section className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">질문 (다국어)</h2>

            {/* 영어 (필수) */}
            <FormField label="영어 (필수)" error={errors.question}>
              <textarea
                value={form.question}
                onChange={(e) => handleChange('question', e.target.value)}
                placeholder="Will Bitcoin reach $100,000 by end of 2025?"
                rows={2}
                className={`
                  w-full bg-bg-input border rounded-md
                  px-3 py-2.5 text-sm text-text-primary
                  placeholder:text-text-muted
                  resize-none
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                  ${errors.question ? 'border-danger' : 'border-border-default'}
                `}
              />
            </FormField>

            {/* 한국어 */}
            <FormField label="한국어 (선택)">
              <textarea
                value={form.questionKo}
                onChange={(e) => handleChange('questionKo', e.target.value)}
                placeholder="비트코인이 2025년 말까지 $100,000에 도달할까요?"
                rows={2}
                className="
                  w-full bg-bg-input border border-border-default rounded-md
                  px-3 py-2.5 text-sm text-text-primary
                  placeholder:text-text-muted
                  resize-none
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                "
              />
            </FormField>

            {/* 중국어 */}
            <FormField label="중국어 (선택)">
              <textarea
                value={form.questionZh}
                onChange={(e) => handleChange('questionZh', e.target.value)}
                placeholder="比特币能在2025年底达到10万美元吗？"
                rows={2}
                className="
                  w-full bg-bg-input border border-border-default rounded-md
                  px-3 py-2.5 text-sm text-text-primary
                  placeholder:text-text-muted
                  resize-none
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                "
              />
            </FormField>

            {/* 일본어 */}
            <FormField label="일본어 (선택)">
              <textarea
                value={form.questionJa}
                onChange={(e) => handleChange('questionJa', e.target.value)}
                placeholder="ビットコインは2025年末までに10万ドルに達するでしょうか？"
                rows={2}
                className="
                  w-full bg-bg-input border border-border-default rounded-md
                  px-3 py-2.5 text-sm text-text-primary
                  placeholder:text-text-muted
                  resize-none
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                "
              />
            </FormField>
          </section>

          {/* 카테고리 + 마감 시간 */}
          <section className="bg-bg-surface border border-border-default rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">마켓 설정</h2>

            {/* 카테고리 */}
            <FormField label="카테고리">
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => handleChange('category', Number(e.target.value))}
                  className="
                    w-full bg-bg-input border border-border-default rounded-md
                    px-3 py-2.5 text-sm text-text-primary
                    appearance-none
                    focus:outline-none focus:border-border-brand
                    transition-colors duration-150
                    cursor-pointer
                  "
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({cat.name})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                  strokeWidth={1.5}
                />
              </div>
            </FormField>

            {/* 베팅 마감 시간 */}
            <FormField label="베팅 마감 시간" error={errors.bettingDeadline}>
              <input
                type="datetime-local"
                value={form.bettingDeadline}
                onChange={(e) => handleChange('bettingDeadline', e.target.value)}
                className={`
                  w-full bg-bg-input border rounded-md
                  px-3 py-2.5 text-sm text-text-primary
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                  ${errors.bettingDeadline ? 'border-danger' : 'border-border-default'}
                `}
              />
            </FormField>

            {/* 결과 확정 예정 시간 */}
            <FormField label="결과 확정 예정 시간" error={errors.resolutionDeadline}>
              <input
                type="datetime-local"
                value={form.resolutionDeadline}
                onChange={(e) => handleChange('resolutionDeadline', e.target.value)}
                className={`
                  w-full bg-bg-input border rounded-md
                  px-3 py-2.5 text-sm text-text-primary
                  focus:outline-none focus:border-border-brand
                  transition-colors duration-150
                  ${errors.resolutionDeadline ? 'border-danger' : 'border-border-default'}
                `}
              />
            </FormField>
          </section>

          {/* 트랜잭션 에러 */}
          {txError && (
            <div className="
              bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)]
              rounded-md p-3
            ">
              <p className="text-sm text-danger">{txError}</p>
            </div>
          )}

          {/* 성공 메시지 */}
          {isSuccess && (
            <div className="
              bg-yes-muted border border-yes/30
              rounded-md p-3
              flex items-center gap-2
            ">
              <CheckCircle className="w-4 h-4 text-yes shrink-0" strokeWidth={2} />
              <p className="text-sm text-yes">
                마켓 #{createdMarketId} 생성 완료! 관리자 패널로 이동합니다...
              </p>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <Link
              to="/admin"
              className="
                flex-1 py-2.5 px-4 rounded-md text-center
                bg-transparent border border-border-default
                text-text-secondary hover:text-text-primary hover:border-border-strong
                font-medium text-sm
                transition-colors duration-150
              "
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="
                flex-[2] py-2.5 px-4 rounded-md
                bg-brand-primary hover:bg-brand-primary-hover
                text-white font-medium text-sm
                transition-colors duration-150
                flex items-center justify-center gap-2
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
              {isLoading
                ? (txStatus === TX_STATUS.CONFIRMING ? '블록 확인 중...' : '서명 대기...')
                : isSuccess
                  ? '✓ 생성 완료'
                  : '마켓 생성'
              }
            </button>
          </div>
        </form>

        {/* 미리보기 카드 */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                미리보기
              </p>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                {showPreview ? '숨기기' : '보기'}
              </button>
            </div>

            <div className="
              bg-bg-surface border border-border-default rounded-lg p-4
              space-y-3
            ">
              {/* 카테고리 태그 */}
              <div className="flex items-center gap-2">
                <CategoryTag category={form.category} />
                <span className="text-xs text-text-muted">
                  {CATEGORIES[form.category]?.label}
                </span>
              </div>

              {/* 질문 */}
              <p className="text-sm font-semibold text-text-primary leading-relaxed">
                {form.question || (
                  <span className="text-text-muted font-normal">영어 질문을 입력하면 미리보기가 표시됩니다</span>
                )}
              </p>

              {/* 마감 시간 */}
              {form.bettingDeadline && (
                <p className="text-xs text-text-muted">
                  베팅 마감: {new Date(form.bettingDeadline).toLocaleString('ko-KR')}
                </p>
              )}

              {/* Pool 바 (비어있음) */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-yes">YES 50%</span>
                  <span className="text-no">NO 50%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-bg-input flex">
                  <div className="bg-yes w-1/2 transition-all duration-500" />
                  <div className="flex-1 bg-no" />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/**
 * 폼 필드 레이아웃 컴포넌트
 */
function FormField({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
