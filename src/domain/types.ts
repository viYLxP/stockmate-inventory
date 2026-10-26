export const CATEGORIES = [
  'electronics',
  'groceries',
  'beverages',
  'cleaning',
  'stationery',
  'hardware',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const UNITS = ['piece', 'box', 'carton', 'kg', 'liter'] as const
export type Unit = (typeof UNITS)[number]

export const STOCK_STATUSES = ['ok', 'low', 'out'] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]

export const MOVEMENT_TYPES = ['in', 'out', 'adjust'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const MOVEMENT_REASONS = [
  'initial',
  'purchase',
  'sale',
  'return',
  'damage',
  'transfer',
  'correction',
] as const
export type MovementReason = (typeof MOVEMENT_REASONS)[number]

/** Reasons offered for each movement type in the stock form. */
export const REASONS_BY_TYPE: Record<MovementType, MovementReason[]> = {
  in: ['purchase', 'return', 'transfer'],
  out: ['sale', 'damage', 'transfer'],
  adjust: ['correction'],
}

export interface Product {
  id: string
  sku: string
  name: string
  category: Category
  unit: Unit
  quantity: number
  minStock: number
  costPrice: number
  sellPrice: number
  supplier: string
  location: string
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  /** Snapshots so history stays readable after a product is renamed or deleted. */
  productName: string
  sku: string
  type: MovementType
  reason: MovementReason
  /** Signed change applied to stock. */
  change: number
  balanceAfter: number
  note: string
  date: string
}

export interface InventoryData {
  products: Product[]
  movements: StockMovement[]
}
