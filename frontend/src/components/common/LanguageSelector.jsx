/**
 * LanguageSelector — 언어 선택 드롭다운 (F-27)
 * EN / KO / ZH / JA, localStorage 저장
 */
import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ko', label: '한국어', short: 'KO' },
  { code: 'zh', label: '中文', short: 'ZH' },
  { code: 'ja', label: '日本語', short: 'JA' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language?.split('-')[0]) || LANGUAGES[0];

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    // html lang 속성 업데이트 (접근성)
    document.documentElement.lang = code;
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="언어 선택"
        aria-expanded={open}
        className="
          flex items-center gap-1.5
          px-2.5 py-1.5 rounded-md
          text-text-secondary hover:text-text-primary hover:bg-bg-surface
          text-sm font-medium
          transition-colors duration-150
        "
      >
        <Globe className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        <span>{currentLang.short}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-1 z-50
          bg-bg-elevated border border-border-default rounded-lg
          shadow-elevation-2 py-1 min-w-[120px]
          animate-fade-scale
        ">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`
                w-full flex items-center gap-2.5
                px-3 py-2 text-sm
                transition-colors duration-100
                ${lang.code === currentLang.code
                  ? 'text-brand-primary bg-brand-primary-muted font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                }
              `}
            >
              <span className="text-xs font-bold tracking-wide w-6 shrink-0">{lang.short}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
