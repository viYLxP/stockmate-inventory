import { useEffect, useRef } from 'react'
import { Icon } from './components/Icon'
import { Layout } from './components/Layout'
import { ProductActionsProvider } from './components/ProductActions'
import { ToastProvider } from './components/Toast'
import { EmptyState } from './components/ui'
import { href, useHashRoute } from './hooks/useHashRoute'
import { LanguageProvider } from './i18n/LanguageContext'
import { useI18n } from './i18n/useI18n'
import { DashboardPage } from './pages/DashboardPage'
import { MovementsPage } from './pages/MovementsPage'
import { ProductsPage } from './pages/ProductsPage'
import { SettingsPage } from './pages/SettingsPage'
import { InventoryProvider } from './state/InventoryContext'

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <InventoryProvider>
          <ProductActionsProvider>
            <Routes />
          </ProductActionsProvider>
        </InventoryProvider>
      </ToastProvider>
    </LanguageProvider>
  )
}

function Routes() {
  const { route, params } = useHashRoute()
  const { t } = useI18n()
  const first = useRef(true)

  // Keep the document title in the active language, and move focus to the
  // page on navigation so screen-reader users hear the new page.
  useEffect(() => {
    const titleKey = route === 'not-found' ? 'errors.notFound' : (`nav.${route}` as const)
    document.title = `${t(titleKey)} · ${t('app.name')}`
  }, [route, t])
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus()
    window.scrollTo(0, 0)
  }, [route])

  return (
    <Layout route={route}>
      {route === 'dashboard' && <DashboardPage />}
      {route === 'products' && <ProductsPage params={params} />}
      {route === 'movements' && <MovementsPage />}
      {route === 'settings' && <SettingsPage />}
      {route === 'not-found' && (
        <div className="card">
          <EmptyState
            icon="alert"
            title={t('errors.notFound')}
            body={t('errors.notFoundBody')}
            action={
              <a className="btn btn--primary" href={href('dashboard')}>
                {t('errors.backHome')}
                <Icon name="arrowForward" />
              </a>
            }
          />
        </div>
      )}
    </Layout>
  )
}
