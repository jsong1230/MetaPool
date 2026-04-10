/**
 * Footer — 심플 푸터
 */
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="
      border-t border-border-default
      bg-bg-secondary
      mt-auto
    ">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="
              w-5 h-5 rounded
              bg-brand-primary
              flex items-center justify-center
              text-white font-bold text-xs
            ">
              M
            </div>
            <span className="text-text-secondary text-sm font-medium">
              MetaPool
            </span>
          </div>

          <p className="text-text-muted text-xs text-center">
            {t('footer.tagline')}
          </p>
        </div>
      </div>
    </footer>
  );
}
