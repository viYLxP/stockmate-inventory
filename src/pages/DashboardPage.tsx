import { Icon } from '../components/Icon'
import { MovementList } from '../components/MovementList'
import { useProductActions } from '../components/ProductActions'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '../components/ui'
import { getStockStatus, stockAlerts, summarize, valueByCategory } from '../domain/inventory'
import { href } from '../hooks/useHashRoute'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'
import { useLoadSample } from '../hooks/useLoadSample'

export function DashboardPage() {
  const { t, formatNumber, formatCurrency } = useI18n()
  const { products, movements } = useInventory()
  const { openAdd, openMovement } = useProductActions()
  const loadSample = useLoadSample()

  const summary = summarize(products)
  const alerts = stockAlerts(products)
  const byCategory = valueByCategory(products)
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.value))

  if (products.length === 0 && movements.length === 0) {
    return (
      <>
        <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
        <div className="card">
          <EmptyState
            icon="layers"
            title={t('dashboard.emptyTitle')}
            body={t('dashboard.emptyBody')}
            action={
              <div className="button-row">
                <button type="button" className="btn btn--primary" onClick={openAdd}>
                  <Icon name="plus" />
                  {t('dashboard.addFirst')}
                </button>
                <button type="button" className="btn btn--secondary" onClick={loadSample}>
                  <Icon name="sparkles" />
                  {t('dashboard.loadSample')}
                </button>
              </div>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <button type="button" className="btn btn--primary" onClick={openAdd}>
            <Icon name="plus" />
            {t('products.add')}
          </button>
        }
      />

      <section className="stats-grid" aria-label={t('dashboard.title')}>
        <StatCard label={t('dashboard.totalProducts')} value={formatNumber(summary.productCount)} icon="box" href={href('products')} />
        <StatCard label={t('dashboard.totalUnits')} value={formatNumber(summary.totalUnits)} icon="layers" />
        <StatCard label={t('dashboard.costValue')} value={formatCurrency(summary.costValue)} icon="coins" />
        <StatCard label={t('dashboard.retailValue')} value={formatCurrency(summary.retailValue)} icon="coins" tone="success" />
        <StatCard label={t('dashboard.potentialProfit')} value={formatCurrency(summary.potentialProfit)} icon="sparkles" tone="success" />
        <StatCard
          label={t('dashboard.lowStock')}
          value={formatNumber(summary.lowCount)}
          icon="alert"
          tone="warning"
          href={href('products', { status: 'low' })}
        />
        <StatCard
          label={t('dashboard.outOfStock')}
          value={formatNumber(summary.outCount)}
          icon="alert"
          tone="danger"
          href={href('products', { status: 'out' })}
        />
      </section>

      <div className="dashboard-grid">
        <section className="card" aria-labelledby="alerts-title">
          <div className="card__header">
            <h2 id="alerts-title">{t('dashboard.alertsTitle')}</h2>
            {alerts.length > 0 && <span className="badge badge--low">{formatNumber(alerts.length)}</span>}
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon="check" title={t('dashboard.alertsTitle')} body={t('dashboard.alertsEmpty')} />
          ) : (
            <ul className="alert-list">
              {alerts.slice(0, 6).map((p) => (
                <li key={p.id} className="alert-item">
                  <div className="alert-item__info">
                    <strong>{p.name}</strong>
                    <span className="muted">
                      <span className="sku" dir="ltr">
                        {p.sku}
                      </span>{' '}
                      · {t('dashboard.onHand', { qty: p.quantity, min: p.minStock })}
                    </span>
                  </div>
                  <StatusBadge status={getStockStatus(p)} />
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => openMovement(p)}>
                    {t('dashboard.restock')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {alerts.length > 6 && (
            <a className="card__link" href={href('products', { sort: 'quantityAsc' })}>
              {t('common.viewAll')} <Icon name="arrowForward" size={16} />
            </a>
          )}
        </section>

        <section className="card" aria-labelledby="category-title">
          <div className="card__header">
            <h2 id="category-title">{t('dashboard.valueByCategory')}</h2>
          </div>
          {byCategory.length === 0 ? (
            <EmptyState icon="coins" title={t('dashboard.valueByCategory')} body={t('dashboard.valueByCategoryEmpty')} />
          ) : (
            <ul className="bar-list">
              {byCategory.map((row) => (
                <li key={row.category}>
                  <div className="bar-list__label">
                    <span>{t(`categories.${row.category}`)}</span>
                    <span className="num">{formatCurrency(row.value)}</span>
                  </div>
                  <div className="bar-list__track" aria-hidden="true">
                    <div className="bar-list__fill" style={{ inlineSize: `${(row.value / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card dashboard-grid__wide" aria-labelledby="recent-title">
          <div className="card__header">
            <h2 id="recent-title">{t('dashboard.recentMovements')}</h2>
            {movements.length > 0 && (
              <a className="card__link" href={href('movements')}>
                {t('common.viewAll')} <Icon name="arrowForward" size={16} />
              </a>
            )}
          </div>
          {movements.length === 0 ? (
            <EmptyState icon="history" title={t('dashboard.recentMovements')} body={t('dashboard.recentMovementsEmpty')} />
          ) : (
            <MovementList movements={movements.slice(0, 6)} compact />
          )}
        </section>
      </div>
    </>
  )
}
