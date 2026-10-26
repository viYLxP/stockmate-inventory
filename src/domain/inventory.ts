import type { TranslationKey } from '../i18n/config'
import {
  CATEGORIES,
  UNITS,
  type Category,
  type MovementReason,
  type MovementType,
  type Product,
  type StockMovement,
  type StockStatus,
  type Unit,
} from './types'

/** A validation message stored as a key so it re-translates when the language changes. */
export interface FieldError {
  key: TranslationKey
  params?: Record<string, string | number>
}

export const roundMoney = (n: number) => Math.round(n * 100) / 100

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// ---------------------------------------------------------------- status & value

export function getStockStatus(p: Pick<Product, 'quantity' | 'minStock'>): StockStatus {
  if (p.quantity <= 0) return 'out'
  if (p.quantity <= p.minStock) return 'low'
  return 'ok'
}

export const costValue = (p: Product) => roundMoney(p.quantity * p.costPrice)
export const retailValue = (p: Product) => roundMoney(p.quantity * p.sellPrice)

export interface InventorySummary {
  productCount: number
  totalUnits: number
  costValue: number
  retailValue: number
  potentialProfit: number
  lowCount: number
  outCount: number
}

export function summarize(products: Product[]): InventorySummary {
  let totalUnits = 0
  let cost = 0
  let retail = 0
  let lowCount = 0
  let outCount = 0
  for (const p of products) {
    totalUnits += p.quantity
    cost += p.quantity * p.costPrice
    retail += p.quantity * p.sellPrice
    const status = getStockStatus(p)
    if (status === 'low') lowCount++
    if (status === 'out') outCount++
  }
  return {
    productCount: products.length,
    totalUnits,
    costValue: roundMoney(cost),
    retailValue: roundMoney(retail),
    potentialProfit: roundMoney(retail - cost),
    lowCount,
    outCount,
  }
}

export function valueByCategory(products: Product[]): { category: Category; value: number }[] {
  const totals = new Map<Category, number>()
  for (const p of products) totals.set(p.category, (totals.get(p.category) ?? 0) + p.quantity * p.costPrice)
  return [...totals.entries()]
    .map(([category, value]) => ({ category, value: roundMoney(value) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
}

/** Out-of-stock first, then by how far below the reorder level the product is. */
export function stockAlerts(products: Product[]): Product[] {
  return products
    .filter((p) => getStockStatus(p) !== 'ok')
    .sort((a, b) => a.quantity - a.minStock - (b.quantity - b.minStock) || a.quantity - b.quantity)
}

// ---------------------------------------------------------------- search & sort

export type ProductSort = 'updated' | 'name' | 'quantityAsc' | 'quantityDesc' | 'value'

export interface ProductFilters {
  query: string
  category: Category | 'all'
  status: StockStatus | 'all'
  sort: ProductSort
}

export const DEFAULT_FILTERS: ProductFilters = { query: '', category: 'all', status: 'all', sort: 'updated' }

/** Lower-case and strip Arabic diacritics/tatweel so searches match regardless of tashkeel. */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim()
}

export function filterProducts(products: Product[], f: ProductFilters, locale: string): Product[] {
  const q = normalizeSearch(f.query)
  const result = products.filter((p) => {
    if (f.category !== 'all' && p.category !== f.category) return false
    if (f.status !== 'all' && getStockStatus(p) !== f.status) return false
    if (!q) return true
    return [p.name, p.sku, p.supplier, p.location].some((field) => normalizeSearch(field).includes(q))
  })
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const sorters: Record<ProductSort, (a: Product, b: Product) => number> = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    name: (a, b) => collator.compare(a.name, b.name),
    quantityAsc: (a, b) => a.quantity - b.quantity,
    quantityDesc: (a, b) => b.quantity - a.quantity,
    value: (a, b) => costValue(b) - costValue(a),
  }
  return result.sort(sorters[f.sort])
}

// ---------------------------------------------------------------- product validation

export interface ProductDraft {
  name: string
  sku: string
  category: Category
  unit: Unit
  quantity: string
  minStock: string
  costPrice: string
  sellPrice: string
  supplier: string
  location: string
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
export type ProductErrors = Partial<Record<keyof ProductDraft, FieldError>>

export const emptyDraft = (): ProductDraft => ({
  name: '',
  sku: '',
  category: 'other',
  unit: 'piece',
  quantity: '0',
  minStock: '5',
  costPrice: '',
  sellPrice: '',
  supplier: '',
  location: '',
})

export const draftFromProduct = (p: Product): ProductDraft => ({
  name: p.name,
  sku: p.sku,
  category: p.category,
  unit: p.unit,
  quantity: String(p.quantity),
  minStock: String(p.minStock),
  costPrice: String(p.costPrice),
  sellPrice: String(p.sellPrice),
  supplier: p.supplier,
  location: p.location,
})

const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/

/** Accept Arabic-Indic and Persian digits as well as Latin ones. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, '')
}

export function parseWholeNumber(raw: string): number | null {
  const s = toLatinDigits(raw).trim()
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isSafeInteger(n) ? n : null
}

export function parseMoney(raw: string): number | null {
  const s = toLatinDigits(raw).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Number(s)
}

export function validateProduct(
  draft: ProductDraft,
  existing: Product[],
  editingId?: string,
): { errors: ProductErrors; value?: ProductInput } {
  const errors: ProductErrors = {}
  const name = draft.name.trim()
  const sku = draft.sku.trim().toUpperCase()

  if (!name) errors.name = { key: 'validation.required' }
  else if (name.length > 80) errors.name = { key: 'validation.tooLong', params: { max: 80 } }

  if (!sku) errors.sku = { key: 'validation.required' }
  else if (!SKU_PATTERN.test(sku)) errors.sku = { key: 'validation.skuFormat' }
  else if (existing.some((p) => p.id !== editingId && p.sku.toUpperCase() === sku))
    errors.sku = { key: 'validation.skuTaken' }

  if (!CATEGORIES.includes(draft.category)) errors.category = { key: 'validation.required' }
  if (!UNITS.includes(draft.unit)) errors.unit = { key: 'validation.required' }

  const quantity = parseWholeNumber(draft.quantity)
  if (quantity === null) errors.quantity = { key: 'validation.wholeNumber' }
  const minStock = parseWholeNumber(draft.minStock)
  if (minStock === null) errors.minStock = { key: 'validation.wholeNumber' }

  const costPrice = draft.costPrice.trim() ? parseMoney(draft.costPrice) : null
  if (!draft.costPrice.trim()) errors.costPrice = { key: 'validation.required' }
  else if (costPrice === null) errors.costPrice = { key: 'validation.nonNegative' }
  const sellPrice = draft.sellPrice.trim() ? parseMoney(draft.sellPrice) : null
  if (!draft.sellPrice.trim()) errors.sellPrice = { key: 'validation.required' }
  else if (sellPrice === null) errors.sellPrice = { key: 'validation.nonNegative' }

  if (draft.supplier.trim().length > 80) errors.supplier = { key: 'validation.tooLong', params: { max: 80 } }
  if (draft.location.trim().length > 80) errors.location = { key: 'validation.tooLong', params: { max: 80 } }

  if (Object.keys(errors).length > 0) return { errors }
  return {
    errors,
    value: {
      name,
      sku,
      category: draft.category,
      unit: draft.unit,
      quantity: quantity!,
      minStock: minStock!,
      costPrice: costPrice!,
      sellPrice: sellPrice!,
      supplier: draft.supplier.trim(),
      location: draft.location.trim(),
    },
  }
}

// ---------------------------------------------------------------- stock movements

export interface MovementDraft {
  type: MovementType
  reason: MovementReason
  amount: string
  note: string
}

export interface MovementResult {
  change: number
  balanceAfter: number
}

/** Pure calculation of what a movement does to stock. Returns an error instead of going negative. */
export function computeMovement(
  currentQty: number,
  type: MovementType,
  amountRaw: string,
): { error?: FieldError; result?: MovementResult } {
  const amount = parseWholeNumber(amountRaw)
  if (type === 'adjust') {
    if (amount === null) return { error: { key: 'validation.wholeNumber' } }
    if (amount === currentQty) return { error: { key: 'validation.sameQuantity' } }
    return { result: { change: amount - currentQty, balanceAfter: amount } }
  }
  if (amount === null || amount <= 0) return { error: { key: 'validation.positiveWholeNumber' } }
  if (type === 'out' && amount > currentQty)
    return { error: { key: 'validation.insufficientStock', params: { qty: currentQty } } }
  const change = type === 'in' ? amount : -amount
  return { result: { change, balanceAfter: currentQty + change } }
}

export function buildMovement(
  product: Product,
  draft: { type: MovementType; reason: MovementReason; note: string },
  result: MovementResult,
  date: string,
): StockMovement {
  return {
    id: newId(),
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    type: draft.type,
    reason: draft.reason,
    change: result.change,
    balanceAfter: result.balanceAfter,
    note: draft.note.trim().slice(0, 200),
    date,
  }
}
