import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyDocumentLanguage,
  detectInitialLanguage,
  languages,
  saveLanguage,
  translate,
  type Direction,
  type Language,
  type TranslationKey,
  type TranslationParams,
} from './config'

 
export const CURRENCY = 'SAR'

export interface LanguageContextValue {
  lang: Language
  dir: Direction
  locale: string
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  /** Translate a key. Numeric params are formatted for the active locale. */
  t: (key: TranslationKey, params?: TranslationParams) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (value: number) => string
  formatDate: (iso: string, options?: Intl.DateTimeFormatOptions) => string
}

// eslint-disable-next-line react-refresh/only-export-components
export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(detectInitialLanguage)
  const { dir, locale, dictionary } = languages[lang]

  useEffect(() => {
    applyDocumentLanguage(lang)
    saveLanguage(lang)
  }, [lang])

  const setLanguage = useCallback((next: Language) => setLang(next), [])
  const toggleLanguage = useCallback(() => setLang((cur) => (cur === 'ar' ? 'en' : 'ar')), [])

  const value = useMemo<LanguageContextValue>(() => {
    const numberFormat = new Intl.NumberFormat(locale)
    const currencyFormat = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const formatNumber = (n: number, options?: Intl.NumberFormatOptions) =>
      options ? new Intl.NumberFormat(locale, options).format(n) : numberFormat.format(n)

    return {
      lang,
      dir,
      locale,
      setLanguage,
      toggleLanguage,
      t: (key, params) => {
        if (!params) return translate(dictionary, key)
        const formatted: TranslationParams = {}
        for (const [k, v] of Object.entries(params)) {
          formatted[k] = typeof v === 'number' ? numberFormat.format(v) : v
        }
        return translate(dictionary, key, formatted)
      },
      formatNumber,
      formatCurrency: (n) => currencyFormat.format(n),
      formatDate: (iso, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
        const date = new Date(iso)
        return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(locale, options).format(date)
      },
    }
  }, [lang, dir, locale, dictionary, setLanguage, toggleLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
