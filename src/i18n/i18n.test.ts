import { describe, expect, it } from 'vitest'
import { translate } from './config'
import ar from './locales/ar'
import en from './locales/en'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === 'string') out[prefix + k] = v
    else Object.assign(out, flatten(v, `${prefix}${k}.`))
  }
  return out
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  const flatEn = flatten(en)
  const flatAr = flatten(ar)

  it('have exactly the same keys', () => {
    expect(Object.keys(flatAr).sort()).toEqual(Object.keys(flatEn).sort())
  })

  it('have no empty strings', () => {
    for (const [key, value] of [...Object.entries(flatEn), ...Object.entries(flatAr)]) {
      expect(value.trim(), key).not.toBe('')
    }
  })

  it('use the same placeholders in both languages', () => {
    for (const key of Object.keys(flatEn)) {
      expect(placeholders(flatAr[key]), key).toEqual(placeholders(flatEn[key]))
    }
  })

  it('actually translate Arabic strings (contain Arabic letters) except brand-neutral values', () => {
    const allowedLatin = new Set(['language.switchTo'])
    for (const [key, value] of Object.entries(flatAr)) {
      if (allowedLatin.has(key)) continue
      expect(/[؀-ۿ]/.test(value), key).toBe(true)
    }
  })
})

describe('translate', () => {
  it('interpolates parameters', () => {
    expect(translate(en, 'products.created', { name: 'Rice' })).toBe('Product “Rice” added.')
    expect(translate(ar, 'products.created', { name: 'أرز' })).toBe('تمت إضافة المنتج «أرز».')
  })
})
