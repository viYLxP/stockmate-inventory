import { useId, useState, type FormEvent } from 'react'
import { computeMovement, type FieldError, type MovementDraft } from '../domain/inventory'
import { MOVEMENT_TYPES, REASONS_BY_TYPE, type MovementType, type Product } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'
import { Icon, type IconName } from './Icon'
import { useToast } from './Toast'
import { Field } from './ui'

const TYPE_ICONS: Record<MovementType, IconName> = { in: 'arrowIn', out: 'arrowOut', adjust: 'scale' }

export function MovementForm({ product, onDone, onCancel }: { product: Product; onDone: () => void; onCancel: () => void }) {
  const { t, formatNumber } = useI18n()
  const { recordMovement } = useInventory()
  const { notify } = useToast()
  const groupId = useId()
  const [draft, setDraft] = useState<MovementDraft>({ type: 'in', reason: 'purchase', amount: '', note: '' })
  const [error, setError] = useState<FieldError>()
  const [submitted, setSubmitted] = useState(false)

  const preview = computeMovement(product.quantity, draft.type, draft.amount)

  const update = (next: MovementDraft) => {
    setDraft(next)
    if (submitted) setError(computeMovement(product.quantity, next.type, next.amount).error)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const { error: err, result } = computeMovement(product.quantity, draft.type, draft.amount)
    setError(err)
    if (!result) return
    recordMovement(product.id, draft, result)
    notify('success', { key: 'movement.recorded', params: { name: product.name, qty: result.balanceAfter } })
    onDone()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <div className="modal__body">
        <div className="movement-product">
          <div>
            <strong>{product.name}</strong>
            <span className="sku" dir="ltr">
              {product.sku}
            </span>
          </div>
          <div className="movement-product__qty">
            <span className="muted">{t('movement.currentQty')}</span>
            <strong>
              {formatNumber(product.quantity)} {t(`units.${product.unit}`)}
            </strong>
          </div>
        </div>

        <fieldset className="segmented">
          <legend>{t('movement.type')}</legend>
          <div className="segmented__options">
            {MOVEMENT_TYPES.map((type) => (
              <label key={type} className={`segmented__option${draft.type === type ? ' is-checked' : ''}`}>
                <input
                  type="radio"
                  name={groupId}
                  value={type}
                  checked={draft.type === type}
                  onChange={() => update({ ...draft, type, reason: REASONS_BY_TYPE[type][0] })}
                />
                <Icon name={TYPE_ICONS[type]} />
                <span>{t(`movement.types.${type}`)}</span>
              </label>
            ))}
          </div>
          <p className="field__hint">{t(`movement.typeHints.${draft.type}`)}</p>
        </fieldset>

        <div className="form-grid">
          <Field label={draft.type === 'adjust' ? t('movement.newCount') : t('movement.quantity')} error={error} required>
            <input
              value={draft.amount}
              onChange={(e) => update({ ...draft, amount: e.target.value })}
              inputMode="numeric"
              autoFocus
            />
          </Field>
          <Field label={t('movement.reason')} required>
            <select
              value={draft.reason}
              onChange={(e) => update({ ...draft, reason: e.target.value as MovementDraft['reason'] })}
            >
              {REASONS_BY_TYPE[draft.type].map((r) => (
                <option key={r} value={r}>
                  {t(`movement.reasons.${r}`)}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid__full">
            <Field label={t('movement.note')}>
              <input
                value={draft.note}
                onChange={(e) => update({ ...draft, note: e.target.value })}
                placeholder={t('movement.notePlaceholder')}
                maxLength={200}
              />
            </Field>
          </div>
        </div>

        {preview.result && (
          <p className="movement-preview" aria-live="polite">
            {t('movement.resultPreview', { qty: preview.result.balanceAfter })}
          </p>
        )}
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn--primary">
          {t('movement.submit')}
        </button>
      </footer>
    </form>
  )
}
