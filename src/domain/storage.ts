import {
  CATEGORIES,
  MOVEMENT_REASONS,
  MOVEMENT_TYPES,
  UNITS,
  type InventoryData,
  type Product,
  type StockMovement,
} from './types'

export const DATA_STORAGE_KEY = 'stockmate:data'
const SCHEMA_VERSION = 1

interface StoredFile extends InventoryData {
  app: 'stockmate'
  version: number
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function isProduct(v: unknown): v is Product {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.sku) &&
    isStr(v.name) &&
    (CATEGORIES as readonly unknown[]).includes(v.category) &&
    (UNITS as readonly unknown[]).includes(v.unit) &&
    isNum(v.quantity) &&
    v.quantity >= 0 &&
    isNum(v.minStock) &&
    isNum(v.costPrice) &&
    isNum(v.sellPrice) &&
    isStr(v.supplier) &&
    isStr(v.location) &&
    isStr(v.createdAt) &&
    isStr(v.updatedAt)
  )
}

function isMovement(v: unknown): v is StockMovement {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.productId) &&
    isStr(v.productName) &&
    isStr(v.sku) &&
    (MOVEMENT_TYPES as readonly unknown[]).includes(v.type) &&
    (MOVEMENT_REASONS as readonly unknown[]).includes(v.reason) &&
    isNum(v.change) &&
    isNum(v.balanceAfter) &&
    isStr(v.note) &&
    isStr(v.date)
  )
}

/** Validate an unknown value (from storage or an imported file). Returns null if it is not StockMate data. */
export function parseInventory(raw: unknown): InventoryData | null {
  if (!isObj(raw) || raw.app !== 'stockmate' || !isNum(raw.version) || raw.version > SCHEMA_VERSION) return null
  if (!Array.isArray(raw.products) || !Array.isArray(raw.movements)) return null
  if (!raw.products.every(isProduct) || !raw.movements.every(isMovement)) return null
  return { products: raw.products, movements: raw.movements }
}

export function serializeInventory(data: InventoryData): string {
  const file: StoredFile = { app: 'stockmate', version: SCHEMA_VERSION, ...data }
  return JSON.stringify(file)
}

export type LoadResult = { status: 'ok' | 'empty'; data: InventoryData } | { status: 'corrupt'; data: InventoryData }

export function loadInventory(): LoadResult {
  const empty: InventoryData = { products: [], movements: [] }
  let text: string | null
  try {
    text = localStorage.getItem(DATA_STORAGE_KEY)
  } catch {
    return { status: 'empty', data: empty }
  }
  if (!text) return { status: 'empty', data: empty }
  try {
    const parsed = parseInventory(JSON.parse(text))
    if (parsed) return { status: 'ok', data: parsed }
  } catch {
    // fall through to corrupt handling
  }
  // Keep unreadable data instead of silently overwriting it.
  try {
    localStorage.setItem(`${DATA_STORAGE_KEY}:corrupt-${Date.now()}`, text)
  } catch {
    // ignore
  }
  return { status: 'corrupt', data: empty }
}

export function saveInventory(data: InventoryData): boolean {
  try {
    localStorage.setItem(DATA_STORAGE_KEY, serializeInventory(data))
    return true
  } catch {
    return false
  }
}
