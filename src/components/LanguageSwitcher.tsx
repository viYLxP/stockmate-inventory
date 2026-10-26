import { useI18n } from '../i18n/useI18n'
import { Icon } from './Icon'

/**
 * A single toggle button. Its visible text is the *target* language written in
 * that language (with a matching lang attribute so screen readers pronounce it
 * correctly). Hidden text in front of it tells screen-reader users what the button does,
 * while keeping the visible label inside the accessible name for voice control.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, toggleLanguage, t } = useI18n()
  const target = lang === 'ar' ? 'en' : 'ar'
  return (
    <button
      type="button"
      className={`lang-switch${compact ? ' lang-switch--compact' : ''}`}
      onClick={toggleLanguage}
      title={t('language.current')}
      data-testid="language-switch"
    >
      <Icon name="globe" />
      <span className="sr-only">{t('language.switchToLabel')}: </span>
      <span lang={target}>{t('language.switchTo')}</span>
    </button>
  )
}
