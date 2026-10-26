import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useProductActions } from '../components/ProductActions'
import { EmptyState, PageHeader, StatusBadge } from '../components/ui'
import {
  DEFAULT_FILTERS,
  costValue,
  filterProducts,
  getStockStatus,
  type ProductFilters,
  type ProductSort,
} from '../domain/inventory'
import { CATEGORIES, STOCK_STATUSES, type Category, type StockStatus } from '../domain/types'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'

const SORTS: ProductSort[] = ['updated', 'name', 'quantityAsc', 'quantityDesc', 'value']

function filtersFromParams(params: URLSearchParams): ProductFilters {
  const category = params.get('category')
  const status = params.get('status')
  const sort = params.get('sort')
  return {
    query: params.get('q') ?? '',
    category: (CATEGORIES as readonly string[]).includes(category ?? '') ? (category as Category) : 'all',
    status: (STOCK_STATUSES as readonly string[]).includes(status ?? '') ? (status as StockStatus) : 'all',
    sort: SORTS.includes(sort as ProductSort) ? (sort as ProductSort) : DEFAULT_FILTERS.sort,
  }
}

export function ProductsPage({ params }: { params: URLSearchParams }) {
  const { t, locale, formatNumber, formatCurrency } = useI18n()
  const { products } = useInventory()
  const { openAdd, openEdit, openMovement, openDelete } = useProductActions()
  const paramKey = params.toString()
  const [filters, setFilters] = useState(() => filtersFromParams(params))

  // Links such as "Low stock" on the dashboard pre-set the filters.
  useEffect(() => setFilters(filtersFromParams(new URLSearchParams(paramKey))), [paramKey])

  const visible = useMemo(() => filterProducts(products, filters, locale), [products, filters, locale])
  const isFiltered =
    filters.query !== '' || filters.category !== 'all' || filters.status !== 'all'
  const set = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }))

  return (
    <>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            <Icon name="plus" />
            {t('products.add')}
          </button>
        }
      />

      <div className="card">
        <div className="toolbar" role="search">
          <div className="search-input">
            <Icon name="search" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set('query', e.target.value)}
              placeholder={t('products.searchPlaceholder')}
              aria-label={t('products.searchLabel')}
            />
          </div>
          <label className="select-inline">
            <span>{t('products.filterCategory')}</span>
            <select value={filters.category} onChange={(e) => set('category', e.target.value as ProductFilters['category'])}>
              <option value="all">{t('common.all')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="select-inline">
            <span>{t('products.filterStatus')}</span>
            <select value={filters.status} onChange={(e) => set('status', e.target.value as ProductFilters['status'])}>
              <option value="all">{t('common.all')}</option>
              {STOCK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="select-inline">
            <span>{t('products.sortBy')}</span>
            <select value={filters.sort} onChange={(e) => set('sort', e.target.value as ProductSort)}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`products.sort.${s}`)}
                </option>
              ))}
            </select>
          </label>
          {isFiltered && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setFilters((f) => ({ ...DEFAULT_FILTERS, sort: f.sort }))}
            >
              {t('common.clearFilters')}
            </button>
          )}
        </div>

        {products.length > 0 && (
          <p className="result-count muted" aria-live="polite">
            {t('common.showing', { shown: visible.length, total: products.length })}
          </p>
        )}

        {products.length === 0 ? (
          <EmptyState
            title={t('products.emptyTitle')}
            body={t('products.emptyBody')}
            action={
              <button type="button" className="btn btn--primary" onClick={openAdd}>
                <Icon name="plus" />
                {t('products.add')}
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState icon="search" title={t('products.noResultsTitle')} body={t('products.noResultsBody')} />
        ) : (
          <div className="table-wrap">
            <table className="table table--stack table--stack-early">
              <thead>
                <tr>
                  <th scope="col">{t('products.columns.product')}</th>
                  <th scope="col">{t('products.columns.category')}</th>
                  <th scope="col" className="num">
                    {t('products.columns.quantity')}
                  </th>
                  <th scope="col" className="num">
                    {t('products.columns.cost')}
                  </th>
                  <th scope="col" className="num">
                    {t('products.columns.price')}
                  </th>
                  <th scope="col" className="num">
                    {t('products.columns.value')}
                  </th>
                  <th scope="col">{t('products.columns.status')}</th>
                  <th scope="col">
                    <span className="sr-only">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td data-label={t('products.columns.product')} className="cell-primary">
                      <div className="cell-product">
                        <strong>{p.name}</strong>
                        <span className="sku" dir="ltr">
                          {p.sku}
                        </span>
                        {(p.supplier || p.location) && (
                          <span className="muted small">{[p.supplier, p.location].filter(Boolean).join(' · ')}</span>
                        )}
                      </div>
                    </td>
                    <td data-label={t('products.columns.category')}>{t(`categories.${p.category}`)}</td>
                    <td data-label={t('products.columns.quantity')} className="num">
                      <div className="cell-qty">
                        <strong>
                          {formatNumber(p.quantity)} <span className="muted">{t(`units.${p.unit}`)}</span>
                        </strong>
                        <span className="muted small">{t('products.reorderAt', { min: p.minStock })}</span>
                      </div>
                    </td>
                    <td data-label={t('products.columns.cost')} className="num">
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td data-label={t('products.columns.price')} className="num">
                      {formatCurrency(p.sellPrice)}
                    </td>
                    <td data-label={t('products.columns.value')} className="num">
                      {formatCurrency(costValue(p))}
                    </td>
                    <td data-label={t('products.columns.status')}>
                      <StatusBadge status={getStockStatus(p)} />
                    </td>
                    <td className="cell-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => openMovement(p)}
                          title={t('products.adjustStock')}
                        >
                          <Icon name="scale" size={16} />
                          <span className="row-actions__label">{t('products.adjustStock')}</span>
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => openEdit(p)}
                          aria-label={`${t('common.edit')}: ${p.name}`}
                          title={t('common.edit')}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--danger"
                          onClick={() => openDelete(p)}
                          aria-label={`${t('common.delete')}: ${p.name}`}
                          title={t('common.delete')}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
