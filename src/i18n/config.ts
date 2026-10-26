import ar from './locales/ar'
import en, { type Dictionary } from './locales/en'

export type Language = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

export const LANGUAGE_STORAGE_KEY = 'stockmate:language'
export const DEFAULT_LANGUAGE: Language = 'ar'

export const languages: Record<
  Language,
  { dir: Direction; locale: string; dictionary: Dictionary }
> = {
  en: { dir: 'ltr', locale: 'en-SA', dictionary: en },
  // Gregorian calendar keeps inventory dates consistent across both languages.
  ar: { dir: 'rtl', locale: 'ar-SA-u-ca-gregory', dictionary: ar },
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ar'
}

/** Saved preference, then the browser language, then the default. */
export function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : ''
  return isLanguage(browser) ? browser : DEFAULT_LANGUAGE
}

export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // Non-fatal: the choice still applies for this visit.
  }
}

export function applyDocumentLanguage(lang: Language) {
  const root = document.documentElement
  root.lang = lang
  root.dir = languages[lang].dir
}

// Dotted key paths, e.g. "products.columns.sku".
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Paths<T[K], `${Prefix}${K}.`>
}[keyof T & string]

export type TranslationKey = Paths<Dictionary>
export type TranslationParams = Record<string, string | number>

export function translate(
  dictionary: Dictionary,
  key: TranslationKey,
  params?: TranslationParams,
  fallback: Dictionary = en,
): string {
  const lookup = (dict: Dictionary) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict)
  const raw = lookup(dictionary) ?? lookup(fallback)
  if (typeof raw !== 'string') return key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
