import { useEffect, useState, type ReactNode } from 'react'
import { href, type Route } from '../hooks/useHashRoute'
import type { TranslationKey } from '../i18n/config'
import { useI18n } from '../i18n/useI18n'
import { useInventory } from '../state/useInventory'
import { getStockStatus } from '../domain/inventory'
import { Icon, type IconName } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'

const NAV: { route: Exclude<Route, 'not-found'>; label: TranslationKey; icon: IconName }[] = [
  { route: 'dashboard', label: 'nav.dashboard', icon: 'dashboard' },
  { route: 'products', label: 'nav.products', icon: 'box' },
  { route: 'movements', label: 'nav.movements', icon: 'history' },
  { route: 'settings', label: 'nav.settings', icon: 'settings' },
]

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { t, formatNumber } = useI18n()
  const { products } = useInventory()
  const [menuOpen, setMenuOpen] = useState(false)
  const alertCount = products.filter((p) => getStockStatus(p) !== 'ok').length

  useEffect(() => setMenuOpen(false), [route])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>

      <aside className={`sidebar${menuOpen ? ' sidebar--open' : ''}`} id="sidebar">
        <div className="sidebar__brand">
          <span className="logo" aria-hidden="true">
            <Icon name="layers" size={20} />
          </span>
          <div>
            <strong>{t('app.name')}</strong>
            <span className="muted">{t('app.tagline')}</span>
          </div>
        </div>
        <nav aria-label={t('nav.main')}>
          <ul>
            {NAV.map((item) => (
              <li key={item.route}>
                <a
                  href={href(item.route)}
                  className={`nav-link${route === item.route ? ' nav-link--active' : ''}`}
                  aria-current={route === item.route ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{t(item.label)}</span>
                  {item.route === 'products' && alertCount > 0 && (
                    <span className="nav-link__count" aria-label={`${formatNumber(alertCount)} ${t('dashboard.alertsTitle')}`}>
                      {formatNumber(alertCount)}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="shell__main">
        <header className="topbar">
          <button
            type="button"
            className="icon-button topbar__menu"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <span className="topbar__title">{t('app.name')}</span>
          <LanguageSwitcher />
        </header>

        <main id="main" className="content" tabIndex={-1}>
          {children}
        </main>

        <footer className="footer">
          <span>{t('footer.note')}</span>
          <span>{t('footer.rights', { year: formatNumber(new Date().getFullYear(), { useGrouping: false }) })}</span>
        </footer>
      </div>
    </div>
  )
}
