import type { Language } from '../i18n/config'
import { buildMovement, newId } from './inventory'
import type { Category, InventoryData, MovementReason, MovementType, Product, Unit } from './types'

// Example catalogue used by "Load sample data". Names are user data, so they are
// created in the language active at the moment the sample is loaded.
interface SampleRow {
  sku: string
  name: Record<Language, string>
  supplier: Record<Language, string>
  location: Record<Language, string>
  category: Category
  unit: Unit
  opening: number
  minStock: number
  costPrice: number
  sellPrice: number
  /** Later movements: [type, reason, amount, daysAgo] */
  history: [MovementType, MovementReason, number, number][]
}

const rows: SampleRow[] = [
  {
    sku: 'ELC-1001',
    name: { en: 'Wireless barcode scanner', ar: 'قارئ باركود لاسلكي' },
    supplier: { en: 'Riyadh Tech Supplies', ar: 'توريدات الرياض التقنية' },
    location: { en: 'Warehouse A, shelf 1', ar: 'المستودع أ، الرف ١' },
    category: 'electronics',
    unit: 'piece',
    opening: 20,
    minStock: 5,
    costPrice: 145,
    sellPrice: 219,
    history: [['out', 'sale', 6, 9], ['out', 'sale', 4, 3]],
  },
  {
    sku: 'ELC-1002',
    name: { en: 'Thermal receipt printer', ar: 'طابعة إيصالات حرارية' },
    supplier: { en: 'Riyadh Tech Supplies', ar: 'توريدات الرياض التقنية' },
    location: { en: 'Warehouse A, shelf 2', ar: 'المستودع أ، الرف ٢' },
    category: 'electronics',
    unit: 'piece',
    opening: 8,
    minStock: 3,
    costPrice: 310,
    sellPrice: 449,
    history: [['out', 'sale', 6, 5]],
  },
  {
    sku: 'GRC-2001',
    name: { en: 'Premium Medjool dates 1 kg', ar: 'تمر مجدول فاخر ١ كغ' },
    supplier: { en: 'Al-Qassim Farms', ar: 'مزارع القصيم' },
    location: { en: 'Cold room', ar: 'غرفة التبريد' },
    category: 'groceries',
    unit: 'box',
    opening: 60,
    minStock: 15,
    costPrice: 38,
    sellPrice: 55,
    history: [['out', 'sale', 25, 7], ['in', 'purchase', 30, 2], ['out', 'damage', 2, 1]],
  },
  {
    sku: 'GRC-2002',
    name: { en: 'Basmati rice 5 kg', ar: 'أرز بسمتي ٥ كغ' },
    supplier: { en: 'Jeddah Food Trading', ar: 'جدة للتجارة الغذائية' },
    location: { en: 'Warehouse B, row 4', ar: 'المستودع ب، الصف ٤' },
    category: 'groceries',
    unit: 'carton',
    opening: 40,
    minStock: 10,
    costPrice: 52.5,
    sellPrice: 69.95,
    history: [['out', 'sale', 32, 4]],
  },
  {
    sku: 'BEV-3001',
    name: { en: 'Arabic coffee 500 g', ar: 'قهوة عربية ٥٠٠ غ' },
    supplier: { en: 'Al-Qassim Farms', ar: 'مزارع القصيم' },
    location: { en: 'Warehouse B, row 1', ar: 'المستودع ب، الصف ١' },
    category: 'beverages',
    unit: 'box',
    opening: 45,
    minStock: 12,
    costPrice: 27,
    sellPrice: 42,
    history: [['out', 'sale', 18, 6], ['out', 'sale', 27, 2]],
  },
  {
    sku: 'BEV-3002',
    name: { en: 'Mineral water 330 ml × 40', ar: 'مياه معدنية ٣٣٠ مل × ٤٠' },
    supplier: { en: 'Jeddah Food Trading', ar: 'جدة للتجارة الغذائية' },
    location: { en: 'Loading bay', ar: 'منطقة التحميل' },
    category: 'beverages',
    unit: 'carton',
    opening: 120,
    minStock: 30,
    costPrice: 14.5,
    sellPrice: 21,
    history: [['out', 'sale', 40, 8], ['in', 'purchase', 50, 3]],
  },
  {
    sku: 'CLN-4001',
    name: { en: 'Floor cleaner 4 L', ar: 'منظف أرضيات ٤ لتر' },
    supplier: { en: 'Dammam Clean Co.', ar: 'شركة الدمام للنظافة' },
    location: { en: 'Warehouse C', ar: 'المستودع ج' },
    category: 'cleaning',
    unit: 'liter',
    opening: 30,
    minStock: 8,
    costPrice: 18,
    sellPrice: 29,
    history: [['out', 'sale', 23, 5]],
  },
  {
    sku: 'STN-5001',
    name: { en: 'A4 copy paper (5 reams)', ar: 'ورق تصوير A4 (٥ رزم)' },
    supplier: { en: 'Office Hub KSA', ar: 'مكتب هب السعودية' },
    location: { en: 'Warehouse A, shelf 6', ar: 'المستودع أ، الرف ٦' },
    category: 'stationery',
    unit: 'box',
    opening: 25,
    minStock: 6,
    costPrice: 65,
    sellPrice: 89,
    history: [['out', 'sale', 9, 4]],
  },
  {
    sku: 'HRD-6001',
    name: { en: 'Cordless drill 18 V', ar: 'مثقاب لاسلكي ١٨ فولت' },
    supplier: { en: 'Eastern Tools Est.', ar: 'مؤسسة أدوات الشرقية' },
    location: { en: 'Warehouse C, cage 2', ar: 'المستودع ج، القفص ٢' },
    category: 'hardware',
    unit: 'piece',
    opening: 12,
    minStock: 4,
    costPrice: 240,
    sellPrice: 349,
    history: [['out', 'sale', 3, 6], ['adjust', 'correction', 8, 1]],
  },
]

export function createSampleData(lang: Language, now = new Date()): InventoryData {
  const products: Product[] = []
  const movements: InventoryData['movements'] = []
  const daysAgo = (d: number, hour = 10) => {
    const date = new Date(now)
    date.setDate(date.getDate() - d)
    date.setHours(hour, 0, 0, 0)
    return date.toISOString()
  }

  for (const row of rows) {
    const created = daysAgo(14, 9)
    const product: Product = {
      id: newId(),
      sku: row.sku,
      name: row.name[lang],
      category: row.category,
      unit: row.unit,
      quantity: row.opening,
      minStock: row.minStock,
      costPrice: row.costPrice,
      sellPrice: row.sellPrice,
      supplier: row.supplier[lang],
      location: row.location[lang],
      createdAt: created,
      updatedAt: created,
    }
    movements.push(
      buildMovement(product, { type: 'in', reason: 'initial', note: '' }, { change: row.opening, balanceAfter: row.opening }, created),
    )
    for (const [type, reason, amount, ago] of row.history) {
      const change = type === 'adjust' ? amount - product.quantity : type === 'in' ? amount : -amount
      product.quantity += change
      product.updatedAt = daysAgo(ago, 11 + (amount % 6))
      movements.push(buildMovement(product, { type, reason, note: '' }, { change, balanceAfter: product.quantity }, product.updatedAt))
    }
    products.push(product)
  }

  movements.sort((a, b) => b.date.localeCompare(a.date))
  return { products, movements }
}
