import { describe, expect, it } from 'vitest'
import {
  computeMovement,
  emptyDraft,
  filterProducts,
  getStockStatus,
  parseMoney,
  stockAlerts,
  summarize,
  validateProduct,
  valueByCategory,
} from './inventory'
import { createSampleData } from './sampleData'
import { parseInventory, serializeInventory } from './storage'
import type { Product } from './types'

const product = (over: Partial<Product>): Product => ({
  id: over.sku ?? 'id',
  sku: 'SKU-1',
  name: 'Item',
  category: 'other',
  unit: 'piece',
  quantity: 10,
  minStock: 2,
  costPrice: 1,
  sellPrice: 2,
  supplier: '',
  location: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

describe('stock status', () => {
  it('classifies out, low (at or below reorder level) and ok', () => {
    expect(getStockStatus({ quantity: 0, minStock: 5 })).toBe('out')
    expect(getStockStatus({ quantity: 5, minStock: 5 })).toBe('low')
    expect(getStockStatus({ quantity: 6, minStock: 5 })).toBe('ok')
    expect(getStockStatus({ quantity: 0, minStock: 0 })).toBe('out')
  })
})

describe('inventory value', () => {
  const items = [
    product({ sku: 'A', category: 'groceries', quantity: 3, costPrice: 0.1, sellPrice: 0.2 }),
    product({ sku: 'B', category: 'electronics', quantity: 2, minStock: 0, costPrice: 52.5, sellPrice: 69.95 }),
    product({ sku: 'C', category: 'groceries', quantity: 0, minStock: 1, costPrice: 10, sellPrice: 12 }),
    product({ sku: 'D', category: 'groceries', quantity: 1, minStock: 4, costPrice: 4, sellPrice: 5 }),
  ]

  it('sums cost, retail and profit without floating point noise', () => {
    const s = summarize(items)
    expect(s.costValue).toBe(109.3) // 0.3 + 105 + 0 + 4
    expect(s.retailValue).toBe(145.5) // 0.6 + 139.9 + 0 + 5
    expect(s.potentialProfit).toBe(36.2)
    expect(s.totalUnits).toBe(6)
    expect(s.lowCount).toBe(1)
    expect(s.outCount).toBe(1)
  })

  it('groups value by category, largest first, omitting zero', () => {
    expect(valueByCategory(items)).toEqual([
      { category: 'electronics', value: 105 },
      { category: 'groceries', value: 4.3 },
    ])
  })

  it('orders alerts by severity', () => {
    expect(stockAlerts(items).map((p) => p.sku)).toEqual(['D', 'C'])
  })
})

describe('product validation', () => {
  const existing = [product({ id: 'x', sku: 'ELC-1' })]

  it('reports required fields as translation keys', () => {
    const { errors, value } = validateProduct(emptyDraft(), existing)
    expect(value).toBeUndefined()
    expect(errors.name?.key).toBe('validation.required')
    expect(errors.sku?.key).toBe('validation.required')
    expect(errors.costPrice?.key).toBe('validation.required')
  })

  it('rejects duplicate SKUs case-insensitively, but not the product being edited', () => {
    const draft = { ...emptyDraft(), name: 'n', sku: 'elc-1', costPrice: '1', sellPrice: '2' }
    expect(validateProduct(draft, existing).errors.sku?.key).toBe('validation.skuTaken')
    expect(validateProduct(draft, existing, 'x').errors.sku).toBeUndefined()
  })

  it('accepts Arabic-Indic digits and normalises SKU to upper case', () => {
    const draft = { ...emptyDraft(), name: 'تمر', sku: 'grc-9', quantity: '١٢', minStock: '٣', costPrice: '٤٫٥', sellPrice: '6' }
    const { value } = validateProduct(draft, existing)
    expect(value).toMatchObject({ sku: 'GRC-9', quantity: 12, minStock: 3, costPrice: 4.5, sellPrice: 6 })
  })

  it('rejects negative and malformed numbers', () => {
    expect(parseMoney('-1')).toBeNull()
    expect(parseMoney('1.234')).toBeNull()
    const draft = { ...emptyDraft(), name: 'n', sku: 'AB', quantity: '-3', costPrice: 'abc', sellPrice: '1' }
    const { errors } = validateProduct(draft, [])
    expect(errors.quantity?.key).toBe('validation.wholeNumber')
    expect(errors.costPrice?.key).toBe('validation.nonNegative')
  })
})

describe('stock movements', () => {
  it('adds and removes stock', () => {
    expect(computeMovement(10, 'in', '5').result).toEqual({ change: 5, balanceAfter: 15 })
    expect(computeMovement(10, 'out', '4').result).toEqual({ change: -4, balanceAfter: 6 })
  })

  it('never allows stock to go negative', () => {
    const { error } = computeMovement(3, 'out', '4')
    expect(error).toEqual({ key: 'validation.insufficientStock', params: { qty: 3 } })
  })

  it('sets an exact count and records the signed difference', () => {
    expect(computeMovement(10, 'adjust', '7').result).toEqual({ change: -3, balanceAfter: 7 })
    expect(computeMovement(10, 'adjust', '0').result).toEqual({ change: -10, balanceAfter: 0 })
    expect(computeMovement(10, 'adjust', '10').error?.key).toBe('validation.sameQuantity')
  })

  it('requires a positive whole number for in/out', () => {
    expect(computeMovement(10, 'in', '0').error?.key).toBe('validation.positiveWholeNumber')
    expect(computeMovement(10, 'in', '1.5').error?.key).toBe('validation.positiveWholeNumber')
  })
})

describe('search', () => {
  const items = [product({ sku: 'BEV-1', name: 'قَهْوَة عربية' }), product({ sku: 'GRC-2', name: 'Basmati rice', supplier: 'Jeddah Food' })]
  const base = { category: 'all', status: 'all', sort: 'name' } as const

  it('ignores Arabic diacritics and letter case', () => {
    expect(filterProducts(items, { ...base, query: 'قهوة' }, 'ar').map((p) => p.sku)).toEqual(['BEV-1'])
    expect(filterProducts(items, { ...base, query: 'bev' }, 'en').map((p) => p.sku)).toEqual(['BEV-1'])
    expect(filterProducts(items, { ...base, query: 'jeddah' }, 'en').map((p) => p.sku)).toEqual(['GRC-2'])
  })
})

describe('sample data and storage', () => {
  it('builds a consistent history: final balances match product quantities', () => {
    for (const lang of ['en', 'ar'] as const) {
      const data = createSampleData(lang, new Date('2026-10-01T12:00:00Z'))
      for (const p of data.products) {
        const history = data.movements.filter((m) => m.productId === p.id)
        const total = history.reduce((sum, m) => sum + m.change, 0)
        expect(total, p.sku).toBe(p.quantity)
        expect(history[0].balanceAfter, p.sku).toBe(p.quantity) // newest first
      }
    }
  })

  it('round-trips through serialisation and rejects foreign files', () => {
    const data = createSampleData('ar')
    expect(parseInventory(JSON.parse(serializeInventory(data)))).toEqual(data)
    expect(parseInventory({ products: [], movements: [] })).toBeNull()
    expect(parseInventory({ app: 'stockmate', version: 1, products: [{ id: 1 }], movements: [] })).toBeNull()
  })
})
