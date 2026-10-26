import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { MovementList } from '../components/MovementList'
import { EmptyState, PageHeader } from '../components/ui'
import { normalizeSearch } from '../domain/inventory'
import { MOVEMENT_TYPES, type MovementType } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'

const PAGE_SIZE = 50

export function MovementsPage() {
  const { t } = useI18n()
  const { movements, products } = useInventory()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<MovementType | 'all'>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    const names = new Map(products.map((p) => [p.id, p.name]))
    return movements.filter((m) => {
      if (type !== 'all' && m.type !== type) return false
      if (!q) return true
      return [m.productName, names.get(m.productId) ?? '', m.sku, m.note].some((f) => normalizeSearch(f).includes(q))
    })
  }, [movements, products, query, type])

  return (
    <>
      <PageHeader title={t('movements.title')} subtitle={t('movements.subtitle')} />
      <div className="card">
        <div className="toolbar" role="search">
          <div className="search-input">
            <Icon name="search" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('movements.searchPlaceholder')}
              aria-label={t('movements.searchLabel')}
            />
          </div>
          <label className="select-inline">
            <span>{t('movements.filterType')}</span>
            <select value={type} onChange={(e) => setType(e.target.value as MovementType | 'all')}>
              <option value="all">{t('common.all')}</option>
              {MOVEMENT_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {t(`movement.types.${mt}`)}
                </option>
              ))}
            </select>
          </label>
          {(query || type !== 'all') && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setQuery('')
                setType('all')
              }}
            >
              {t('common.clearFilters')}
            </button>
          )}
        </div>

        {movements.length > 0 && (
          <p className="result-count muted" aria-live="polite">
            {t('common.showing', { shown: Math.min(limit, filtered.length), total: filtered.length })}
          </p>
        )}

        {movements.length === 0 ? (
          <EmptyState icon="history" title={t('movements.emptyTitle')} body={t('movements.emptyBody')} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="search" title={t('movements.noResultsTitle')} body={t('movements.noResultsBody')} />
        ) : (
          <>
            <MovementList movements={filtered.slice(0, limit)} />
            {filtered.length > limit && (
              <div className="load-more">
                <button type="button" className="btn btn--secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  {t('common.showMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
