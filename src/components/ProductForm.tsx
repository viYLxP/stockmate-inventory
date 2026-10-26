import { useState, type FormEvent } from 'react'
import {
  draftFromProduct,
  emptyDraft,
  parseMoney,
  validateProduct,
  type ProductDraft,
  type ProductErrors,
} from '../domain/inventory'
import { CATEGORIES, UNITS, type Product } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'
import { useToast } from './Toast'
import { Field } from './ui'

interface Props {
  product?: Product
  onDone: () => void
  onCancel: () => void
}

export function ProductForm({ product, onDone, onCancel }: Props) {
  const { t } = useI18n()
  const { products, addProduct, updateProduct } = useInventory()
  const { notify } = useToast()
  const [draft, setDraft] = useState<ProductDraft>(() => (product ? draftFromProduct(product) : emptyDraft()))
  const [errors, setErrors] = useState<ProductErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    // After the first submit attempt, re-validate as the user types.
    if (submitted) setErrors(validateProduct(next, products, product?.id).errors)
  }

  const cost = parseMoney(draft.costPrice)
  const sell = parseMoney(draft.sellPrice)
  const belowCost = cost !== null && sell !== null && sell < cost

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const { errors: found, value } = validateProduct(draft, products, product?.id)
    setErrors(found)
    if (!value) {
      const form = e.currentTarget as HTMLFormElement
      // Focus the first invalid field once React has applied aria-invalid.
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (product) {
      updateProduct(product.id, value)
      notify('success', { key: 'products.updated', params: { name: value.name } })
    } else {
      addProduct(value)
      notify('success', { key: 'products.created', params: { name: value.name } })
    }
    onDone()
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <div className="modal__body">
        {hasErrors && (
          <p className="form__summary" role="alert">
            {t('form.fixErrors')}
          </p>
        )}
        <div className="form-grid">
          <Field label={t('form.name')} error={errors.name} required>
            <input value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={120} autoComplete="off" />
          </Field>
          <Field label={t('form.sku')} hint={t('form.skuHint')} error={errors.sku} required>
            <input
              value={draft.sku}
              onChange={(e) => set('sku', e.target.value)}
              dir="ltr"
              className="ltr-value"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field label={t('form.category')} error={errors.category} required>
            <select value={draft.category} onChange={(e) => set('category', e.target.value as ProductDraft['category'])}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('form.unit')} error={errors.unit} required>
            <select value={draft.unit} onChange={(e) => set('unit', e.target.value as ProductDraft['unit'])}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t('form.quantity')}
            hint={product ? t('form.quantityReadonly') : undefined}
            error={errors.quantity}
            required
          >
            <input
              value={draft.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              inputMode="numeric"
              disabled={Boolean(product)}
            />
          </Field>
          <Field label={t('form.minStock')} hint={t('form.minStockHint')} error={errors.minStock} required>
            <input value={draft.minStock} onChange={(e) => set('minStock', e.target.value)} inputMode="numeric" />
          </Field>
          <Field label={t('form.costPrice')} error={errors.costPrice} required>
            <input value={draft.costPrice} onChange={(e) => set('costPrice', e.target.value)} inputMode="decimal" />
          </Field>
          <Field
            label={t('form.sellPrice')}
            hint={belowCost ? t('form.marginWarning') : undefined}
            error={errors.sellPrice}
            required
          >
            <input value={draft.sellPrice} onChange={(e) => set('sellPrice', e.target.value)} inputMode="decimal" />
          </Field>
          <Field label={t('form.supplier')} error={errors.supplier}>
            <input value={draft.supplier} onChange={(e) => set('supplier', e.target.value)} maxLength={120} />
          </Field>
          <Field label={t('form.location')} error={errors.location}>
            <input
              value={draft.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder={t('form.locationPlaceholder')}
              maxLength={120}
            />
          </Field>
        </div>
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn--primary">
          {t('common.save')}
        </button>
      </footer>
    </form>
  )
}
