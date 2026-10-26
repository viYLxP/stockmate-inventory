import type { StockMovement } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'
import { Icon } from './Icon'

const TYPE_ICON = { in: 'arrowIn', out: 'arrowOut', adjust: 'scale' } as const

/** Movement history as a table on wide screens and stacked cards on phones (CSS-driven). */
export function MovementList({ movements, compact = false }: { movements: StockMovement[]; compact?: boolean }) {
  const { t, formatNumber, formatDate } = useI18n()
  const { products } = useInventory()
  const names = new Map(products.map((p) => [p.id, p.name]))

  const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + formatNumber(Math.abs(n))

  return (
    <div className="table-wrap">
      <table className={`table table--stack${compact ? ' table--compact' : ''}`}>
        <thead>
          <tr>
            <th scope="col">{t('movements.columns.date')}</th>
            <th scope="col">{t('movements.columns.product')}</th>
            <th scope="col">{t('movements.columns.type')}</th>
            <th scope="col" className="num">
              {t('movements.columns.change')}
            </th>
            <th scope="col" className="num">
              {t('movements.columns.balance')}
            </th>
            {!compact && <th scope="col">{t('movements.columns.reason')}</th>}
            {!compact && <th scope="col">{t('movements.columns.note')}</th>}
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => {
            const current = names.get(m.productId)
            return (
              <tr key={m.id}>
                <td data-label={t('movements.columns.date')}>
                  <time dateTime={m.date}>{formatDate(m.date)}</time>
                </td>
                <td data-label={t('movements.columns.product')}>
                  <div className="cell-product">
                    <span>
                      {current ?? m.productName}
                      {!current && <span className="tag">{t('movements.deletedProduct')}</span>}
                    </span>
                    <span className="sku" dir="ltr">
                      {m.sku}
                    </span>
                  </div>
                </td>
                <td data-label={t('movements.columns.type')}>
                  <span className={`movement-type movement-type--${m.type}`}>
                    <Icon name={TYPE_ICON[m.type]} size={14} />
                    {t(`movement.types.${m.type}`)}
                  </span>
                </td>
                <td data-label={t('movements.columns.change')} className={`num change ${m.change >= 0 ? 'change--up' : 'change--down'}`}>
                  {/* Keep the sign glued to the number in RTL. */}
                  <bdi dir="ltr">{signed(m.change)}</bdi>
                </td>
                <td data-label={t('movements.columns.balance')} className="num">
                  {formatNumber(m.balanceAfter)}
                </td>
                {!compact && <td data-label={t('movements.columns.reason')}>{t(`movement.reasons.${m.reason}`)}</td>}
                {!compact && (
                  <td data-label={t('movements.columns.note')} className="cell-note">
                    {m.note || '—'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
