import { expect, test, type Page } from '@playwright/test'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 900

async function goto(page: Page, route: string) {
  await page.goto(`/#/${route}`)
}

/** Navigate with the sidebar, opening the mobile drawer first when needed. */
async function nav(page: Page, name: RegExp) {
  if (isMobile(page)) await page.locator('.topbar__menu').click()
  await page.getByRole('navigation').getByRole('link', { name }).click()
}

/** Use the switch inside an open dialog if there is one (the page behind a modal is inert). */
async function switchLanguage(page: Page) {
  const inDialog = page.locator('dialog[open]').getByTestId('language-switch')
  if (await inDialog.count()) await inDialog.click()
  else await page.locator('.topbar').getByTestId('language-switch').click()
}

async function expectLang(page: Page, lang: 'ar' | 'en') {
  await expect(page.locator('html')).toHaveAttribute('lang', lang)
  await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
}

test.beforeEach(async ({ page }) => {
  // Fresh browser context per test, but force a known starting language.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear()
      localStorage.setItem('stockmate:language', 'ar')
      sessionStorage.setItem('e2e-init', '1')
    }
  })
})

test('language switch updates lang/dir, persists after reload, and is keyboard accessible', async ({ page }) => {
  await goto(page, 'dashboard')
  await expectLang(page, 'ar')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('لوحة التحكم')
  await expect(page).toHaveTitle(/لوحة التحكم/)

  // Keyboard: focus the switch and press Enter.
  const sw = page.locator('.topbar').getByTestId('language-switch')
  await sw.focus()
  await page.keyboard.press('Enter')
  await expectLang(page, 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard')
  await expect(sw).toHaveAccessibleName(/Switch language to Arabic/)

  await page.reload()
  await expectLang(page, 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard')

  await switchLanguage(page)
  await page.reload()
  await expectLang(page, 'ar')
})

test('switching language keeps unsaved form values and re-translates validation errors', async ({ page }) => {
  await goto(page, 'products')
  await page.getByRole('button', { name: 'إضافة منتج' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByLabel('اسم المنتج').fill('قارئ باركود')
  await dialog.getByRole('button', { name: 'حفظ' }).click()
  await expect(dialog.getByText('هذا الحقل مطلوب.').first()).toBeVisible()

  await switchLanguage(page)
  await expectLang(page, 'en')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Product name')).toHaveValue('قارئ باركود')
  await expect(dialog.getByText('This field is required.').first()).toBeVisible()
  await expect(dialog.getByText('هذا الحقل مطلوب.')).toHaveCount(0)

  await dialog.getByLabel('SKU').fill('elc-77')
  await dialog.getByLabel('Opening quantity').fill('12')
  await dialog.getByLabel('Reorder level').fill('3')
  await dialog.getByLabel('Cost price (SAR)').fill('100')
  await dialog.getByLabel('Selling price (SAR)').fill('150.5')

  await switchLanguage(page)
  await expect(dialog.getByLabel('رمز المنتج (SKU)')).toHaveValue('elc-77')
  await expect(dialog.getByLabel('سعر البيع (ر.س)')).toHaveValue('150.5')
  await dialog.getByRole('button', { name: 'حفظ' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByRole('status').filter({ hasText: 'تمت إضافة المنتج «قارئ باركود».' })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'ELC-77' })
  await expect(row).toContainText('١٢')
  await expect(row).toContainText('ر.س')
})

test('product CRUD, stock movements and inventory value in English and Arabic', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stockmate:language', 'en'))
  await goto(page, 'products')
  await expectLang(page, 'en')
  await expect(page.getByText('No products yet')).toBeVisible()

  // Create
  await page.getByRole('button', { name: 'Add product' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Product name').fill('Arabic coffee')
  await dialog.getByLabel('SKU').fill('BEV-10')
  await dialog.getByLabel('Category').selectOption('beverages')
  await dialog.getByLabel('Opening quantity').fill('10')
  await dialog.getByLabel('Reorder level').fill('4')
  await dialog.getByLabel('Cost price (SAR)').fill('25.5')
  await dialog.getByLabel('Selling price (SAR)').fill('40')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()

  // Duplicate SKU is rejected
  await page.getByRole('button', { name: 'Add product' }).first().click()
  await dialog.getByLabel('Product name').fill('Duplicate')
  await dialog.getByLabel('SKU').fill('bev-10')
  await dialog.getByLabel('Cost price (SAR)').fill('1')
  await dialog.getByLabel('Selling price (SAR)').fill('1')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByText('This SKU is already used by another product.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Stock out more than available -> error; then valid stock out
  const row = page.getByRole('row').filter({ hasText: 'BEV-10' })
  await row.getByRole('button', { name: 'Adjust stock' }).click()
  await dialog.getByRole('radio', { name: 'Stock out' }).check()
  await dialog.getByLabel('Quantity').fill('11')
  await dialog.getByRole('button', { name: 'Record movement' }).click()
  await expect(dialog.getByText('Only 10 available.', { exact: false })).toBeVisible()
  await dialog.getByLabel('Quantity').fill('7')
  await expect(dialog.getByText('New quantity will be 3')).toBeVisible()
  await dialog.getByRole('button', { name: 'Record movement' }).click()
  await expect(dialog).toBeHidden()
  await expect(row).toContainText('Low stock')
  await expect(row).toContainText('SAR 76.50') // 3 × 25.50

  // Edit
  await row.getByRole('button', { name: 'Edit: Arabic coffee' }).click()
  await expect(dialog.getByLabel('Opening quantity')).toBeDisabled()
  await dialog.getByLabel('Product name').fill('Arabic coffee 500 g')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Arabic coffee 500 g' })).toBeVisible()

  // Dashboard totals
  await nav(page, /Dashboard/)
  await expect(page.locator('.stat-card').filter({ hasText: 'Inventory value (cost)' })).toContainText('SAR 76.50')
  await expect(page.locator('.stat-card').filter({ hasText: 'Inventory value (retail)' })).toContainText('SAR 120.00')
  await expect(page.locator('.alert-list')).toContainText('Arabic coffee 500 g')

  // Restock from the alert, in Arabic
  await switchLanguage(page)
  await page.getByRole('button', { name: 'إعادة التزويد' }).click()
  await dialog.getByRole('textbox', { name: 'الكمية' }).fill('٥')
  await dialog.getByRole('button', { name: 'تسجيل الحركة' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.stat-card').filter({ hasText: 'قيمة المخزون (بالتكلفة)' })).toContainText('٢٠٤٫٠٠') // 8 × 25.5
  await expect(page.getByText('جميع المنتجات أعلى من حد إعادة الطلب.')).toBeVisible()

  // Movement history
  await nav(page, /حركات المخزون/)
  await expect(page.getByRole('row')).toHaveCount(4) // header + initial + out + in

  // Delete (history is kept and marked as deleted)
  await nav(page, /المنتجات/)
  await page.getByRole('button', { name: /^حذف: / }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'حذف' }).click()
  await expect(page.getByText('لا توجد منتجات بعد')).toBeVisible()
  await nav(page, /حركات المخزون/)
  await expect(page.getByText('محذوف').first()).toBeVisible()

  // Persisted across reload
  await page.reload()
  await expect(page.getByRole('row')).toHaveCount(4)
})

test('sample data, filters and search work in both languages', async ({ page }) => {
  await goto(page, 'dashboard')
  await page.getByRole('button', { name: 'تحميل بيانات تجريبية' }).click()
  await expect(page.locator('.stat-card').filter({ hasText: 'المنتجات' })).toContainText('٩')
  await expect(page.locator('.stat-card').filter({ hasText: 'نفد من المخزون' })).toContainText('١')

  await page.locator('.stat-card').filter({ hasText: 'مخزون منخفض' }).click()
  await expect(page.getByLabel('حالة المخزون')).toHaveValue('low')
  await expect(page.locator('tbody tr')).toHaveCount(3)

  await page.getByRole('button', { name: 'مسح عوامل التصفية' }).click()
  await page.getByLabel('البحث في المنتجات').fill('قهوه') // no hamza / taa marbuta variant
  await expect(page.locator('tbody tr')).toHaveCount(1)

  await switchLanguage(page)
  await expect(page.getByLabel('Search products')).toHaveValue('قهوه')
  await page.getByLabel('Search products').fill('')
  await page.getByLabel('Category').selectOption('beverages')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByText('Showing 2 of 9')).toBeVisible()
})

test('no untranslated English is visible in Arabic mode', async ({ page }) => {
  await goto(page, 'dashboard')
  await page.getByRole('button', { name: 'تحميل بيانات تجريبية' }).click()
  for (const route of ['dashboard', 'products', 'movements', 'settings', 'missing-page']) {
    await goto(page, route)
    await expect(page.locator('main h1, main h3').first()).toBeVisible()
    const text = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement
      // Product codes, the English option of the language switch and the file format name are intentionally Latin.
      clone.querySelectorAll('.sku, [lang="en"], .sr-only, noscript').forEach((el) => el.remove())
      return clone.innerText
    })
    const latinWords = (text.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !['SKU', 'JSON', 'SAR', 'A4'].includes(w))
    expect(latinWords, route).toEqual([])
  }
})

test('layout mirrors correctly and nothing overflows horizontally', async ({ page }) => {
  await goto(page, 'dashboard')
  await page.getByRole('button', { name: 'تحميل بيانات تجريبية' }).click()

  for (const lang of ['ar', 'en'] as const) {
    if (lang === 'en') await switchLanguage(page)
    for (const route of ['dashboard', 'products', 'movements', 'settings']) {
      await goto(page, route)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${lang} ${route}`).toBeLessThanOrEqual(0)
    }

    await goto(page, 'products')
    const sidebar = page.locator('.sidebar')
    const vw = page.viewportSize()!.width
    if (isMobile(page)) {
      await expect(sidebar).toBeHidden()
      await page.locator('.topbar__menu').click()
      await expect(sidebar).toBeVisible()
      await page.waitForTimeout(300)
    }
    const box = (await sidebar.boundingBox())!
    // Sidebar sits on the inline-start edge: right in Arabic, left in English.
    if (lang === 'ar') expect(Math.round(box.x + box.width)).toBe(vw)
    else expect(Math.round(box.x)).toBe(0)
    if (isMobile(page)) {
      await page.keyboard.press('Escape')
      await expect(sidebar).toBeHidden()
    }
  }
})
