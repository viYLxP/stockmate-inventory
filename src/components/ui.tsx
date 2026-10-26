import { useId, type ReactElement, type ReactNode } from 'react'
import { cloneElement } from 'react'
import type { FieldError } from '../domain/inventory'
import type { StockStatus } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { Icon, type IconName } from './Icon'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  href,
}: {
  label: string
  value: string
  icon: IconName
  tone?: 'default' | 'warning' | 'danger' | 'success'
  href?: string
}) {
  const body = (
    <>
      <span className={`stat-card__icon stat-card__icon--${tone}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </>
  )
  return href ? (
    <a className="stat-card stat-card--link" href={href}>
      {body}
    </a>
  ) : (
    <div className="stat-card">{body}</div>
  )
}

export function EmptyState({
  icon = 'box',
  title,
  body,
  action,
}: {
  icon?: IconName
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{body}</p>
      {action}
    </div>
  )
}

export function StatusBadge({ status }: { status: StockStatus }) {
  const { t } = useI18n()
  return <span className={`badge badge--${status}`}>{t(`status.${status}`)}</span>
}

/**
 * Label + control + hint + error, wired up with ids for screen readers.
 * The error is a translation key, so it re-translates on language change.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: FieldError
  required?: boolean
  children: ReactElement<Record<string, unknown>>
}) {
  const { t } = useI18n()
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            {' *'}
          </span>
        ) : (
          <span className="field__optional"> ({t('common.optional')})</span>
        )}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {t(error.key, error.params)}
        </p>
      )}
    </div>
  )
}
