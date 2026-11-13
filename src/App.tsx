import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import en from './i18n/en.json'
import am from './i18n/am.json'
import om from './i18n/om.json'
import { db } from './db/db'
import * as settingsRepo from './db/repositories/settingsRepo'
import { createSampleData } from './db/sampleData'
import { AddRecordPage } from './pages/AddRecord/AddRecordPage'
import { AttendancePage } from './pages/Attendance/AttendancePage'
import { HomePage } from './pages/Home/HomePage'
import './theme.css'

const AnalyticsPage = lazy(() =>
  import('./pages/Analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)

type Language = 'en' | 'am' | 'om'
type ThemeMode = 'light' | 'dark'
type PageKey = 'home' | 'addRecord' | 'attendance' | 'analytics' | 'settings'

type NavItem = {
  key: PageKey
  labelKey: string
  icon: 'home' | 'plus' | 'calendar' | 'chart' | 'settings'
}

const navItems: NavItem[] = [
  { key: 'home', labelKey: 'nav.home', icon: 'home' },
  { key: 'addRecord', labelKey: 'nav.dataPlus', icon: 'plus' },
  { key: 'attendance', labelKey: 'nav.attendance', icon: 'calendar' },
  { key: 'analytics', labelKey: 'nav.analytics', icon: 'chart' },
  { key: 'settings', labelKey: 'nav.settings', icon: 'settings' },
]

const translations = {
  en: en as Record<string, string>,
  am: am as Record<string, string>,
  om: om as Record<string, string>,
}

function App() {
  const [page, setPage] = useState<PageKey>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('markbook-language')
    return saved === 'am' || saved === 'om' ? saved : 'en'
  })
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('markbook-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })
  const [storageStatus, setStorageStatus] = useState({ supported: false, persisted: false })

  useEffect(() => {
    void db.open()
    void (async () => {
      const status = await settingsRepo.storageStatus()
      setStorageStatus(status)
      if (status.supported && !status.persisted) {
        const persisted = await settingsRepo.persistStorage()
        setStorageStatus({ supported: status.supported, persisted })
      }
    })()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('markbook-theme', theme)
  }, [theme])

  useEffect(() => {
    const targetLang = language === 'am' ? 'am' : language === 'om' ? 'om' : 'en'
    document.documentElement.lang = targetLang
    localStorage.setItem('markbook-language', language)
  }, [language])

  useEffect(() => {
    const handleExportStatus = (event: Event) => {
      const customEvent = event as CustomEvent<{ exporting?: boolean }>
      if (typeof customEvent.detail?.exporting === 'boolean') {
        setIsExporting(customEvent.detail.exporting)
      }
    }
    window.addEventListener('markbook:export-status', handleExportStatus)
    return () => {
      window.removeEventListener('markbook:export-status', handleExportStatus)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (aboutOpen) {
          setAboutOpen(false)
          return
        }
        if (exportMenuOpen) {
          setExportMenuOpen(false)
          return
        }
        if (menuOpen) setMenuOpen(false)
      }
    }

    const handlePopState = () => {
      if (aboutOpen) {
        setAboutOpen(false)
        return
      }
      if (exportMenuOpen) {
        setExportMenuOpen(false)
        return
      }
      if (menuOpen) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [menuOpen, exportMenuOpen, aboutOpen])

  useEffect(() => {
    if (!exportMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && !target.closest('.export-menu-wrap')) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
    }
  }, [exportMenuOpen])

  const t = (key: string) => translations[language][key] ?? key

  const showExport = page === 'addRecord' || page === 'attendance' || page === 'analytics'

  const menuLinks = useMemo<Array<{ labelKey: string; target: PageKey }>>(
    () => [
      { labelKey: 'nav.home', target: 'home' },
      { labelKey: 'nav.dataPlus', target: 'addRecord' },
      { labelKey: 'nav.attendance', target: 'attendance' },
      { labelKey: 'nav.analytics', target: 'analytics' },
      { labelKey: 'nav.settings', target: 'settings' },
    ],
    [],
  )

  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)

  const handleExportRequest = (format: 'csv' | 'xlsx' | 'pdf') => {
    setExportMenuOpen(false)
    window.dispatchEvent(new CustomEvent('markbook:export', { detail: { format } }))
  }

  const handleRosterExportRequest = (format: 'csv' | 'xlsx' | 'pdf') => {
    setExportMenuOpen(false)
    window.dispatchEvent(new CustomEvent('markbook:roster-export', { detail: { format } }))
  }

  const handleMenuSelect = (target: PageKey) => {
    setPage(target)
    closeMenu()
    setExportMenuOpen(false)
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--bg-page)] text-[var(--text)]">
      <header className="top-bar">
        <div className="top-bar-left">
          {showExport && (
            <div className="export-menu-wrap">
              <button
                type="button"
                className="export-button icon-button"
                aria-label={t('menu.export')}
                aria-expanded={exportMenuOpen}
                disabled={isExporting}
                onClick={() => setExportMenuOpen((current) => !current)}
              >
                {isExporting ? (
                  <span>{t('export.loading')}</span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>{t('menu.export')}</span>
                  </>
                )}
              </button>
              <div className={`export-menu ${exportMenuOpen ? 'is-open' : ''}`} role="menu" aria-label={t('menu.export')}>
                <button type="button" className="menu-link" onClick={() => handleExportRequest('xlsx')}>
                  {t('export.excel')}
                </button>
                <button type="button" className="menu-link" onClick={() => handleExportRequest('csv')}>
                  {t('export.csv')}
                </button>
                <button type="button" className="menu-link" onClick={() => handleExportRequest('pdf')}>
                  {t('export.pdf')}
                </button>
                {page === 'addRecord' && (
                  <>
                    <div className="menu-divider" />
                    <button type="button" className="menu-link" onClick={() => handleRosterExportRequest('xlsx')}>
                      {t('export.rosterXlsx')}
                    </button>
                    <button type="button" className="menu-link" onClick={() => handleRosterExportRequest('csv')}>
                      {t('export.rosterCsv')}
                    </button>
                    <button type="button" className="menu-link" onClick={() => handleRosterExportRequest('pdf')}>
                      {t('export.rosterPdf')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="hamburger-button"
          onClick={openMenu}
          aria-label={t('nav.settings')}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div
        className={`menu-overlay ${menuOpen ? 'is-open' : ''}`}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />

      <aside className={`hamburger-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        {menuLinks.map((item) => (
          <button
            key={item.target}
            type="button"
            className="menu-link"
            onClick={() => handleMenuSelect(item.target)}
          >
            {t(item.labelKey)}
          </button>
        ))}
        <div className="menu-divider" />
        <button type="button" className="menu-link disabled" disabled>
          {t('menu.backupRestore')}
        </button>
        <button
          type="button"
          className="menu-link"
          onClick={() => {
            closeMenu()
            setAboutOpen(true)
          }}
        >
          {t('menu.about')}
        </button>
      </aside>

      <main className="content-area">
        {page === 'home' && <HomePage onOpenAddRecord={() => setPage('addRecord')} t={t} />}

        {page === 'addRecord' && <AddRecordPage />}
        {page === 'attendance' && <AttendancePage />}
        {page === 'analytics' && (
          <Suspense fallback={<div className="page-panel"><div className="placeholder-card"><p>{t('analytics.loading')}</p></div></div>}>
            <AnalyticsPage />
          </Suspense>
        )}

        {page === 'settings' && (
          <section className="page-panel">
            <div className="page-card settings-card">
              <div className="setting-row">
                <label htmlFor="darkMode-toggle">{t('settings.darkMode')}</label>
                <button
                  id="darkMode-toggle"
                  type="button"
                  className={`toggle-switch ${theme === 'dark' ? 'is-on' : ''}`}
                  aria-checked={theme === 'dark'}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  <span />
                </button>
              </div>

              <div className="setting-row stacked">
                <label htmlFor="language-select">{t('settings.language')}</label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                >
                  <option value="en">{t('settings.language.en')}</option>
                  <option value="am">{t('settings.language.am')}</option>
                  <option value="om">{t('settings.language.om')}</option>
                </select>
              </div>

              <div className="setting-row stacked">
                <label>Storage</label>
                <span className="setting-status">
                  {storageStatus.supported
                    ? storageStatus.persisted
                      ? 'Persisted'
                      : 'Not persisted'
                    : 'Unsupported'}
                </span>
              </div>

              {import.meta.env.DEV && (
                <button
                  type="button"
                  className="sample-button"
                  onClick={async () => {
                    await createSampleData()
                  }}
                >
                  Create sample data
                </button>
              )}
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = page === item.key

          return (
            <button
              key={item.key}
              type="button"
              className={`nav-button ${isActive ? 'is-active' : ''}`}
              onClick={() => setPage(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-icon">{renderIcon(item.icon, isActive)}</span>
              <span className="nav-label">{t(item.labelKey)}</span>
            </button>
          )
        })}
      </nav>

      {aboutOpen && (
        <div
          className="class-dialog-backdrop"
          onClick={() => setAboutOpen(false)}
          role="presentation"
        >
          <div
            className="class-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="about-dialog-title">{t('about.title')}</h3>
            <p className="text-sm font-semibold text-[var(--navy)]">
              {t('about.version')}: v0.6
            </p>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {t('about.description')}
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="toolbar-button primary-button"
                onClick={() => setAboutOpen(false)}
              >
                {t('about.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function renderIcon(icon: NavItem['icon'], active: boolean) {
  const sharedProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: active ? 'var(--navy)' : 'var(--muted)',
    stroke: active ? 'var(--navy)' : 'var(--muted)',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (icon) {
    case 'home':
      return (
        <svg {...sharedProps}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" fill={active ? 'var(--navy)' : 'var(--muted)'} stroke="none" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...sharedProps}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...sharedProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" fill="none" />
          <path d="M8 3v4M16 3v4M3 9h18" />
          <circle cx="8" cy="14" r="1.2" fill={active ? 'var(--navy)' : 'var(--muted)'} stroke="none" />
          <circle cx="12" cy="14" r="1.2" fill={active ? 'var(--navy)' : 'var(--muted)'} stroke="none" />
          <circle cx="16" cy="14" r="1.2" fill={active ? 'var(--navy)' : 'var(--muted)'} stroke="none" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...sharedProps}>
          <path d="M5 18V9M12 18V5M19 18v-8" />
          <path d="M3 18h18" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...sharedProps}>
          <path d="M12 8.5A3.5 3.5 0 1 1 12 15.5A3.5 3.5 0 0 1 12 8.5Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15.82 20a1.7 1.7 0 0 0-1 .49 1.7 1.7 0 0 0-.4 1.12V22a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9.4 20a1.7 1.7 0 0 0-1-.49 1.7 1.7 0 0 0-1.12.4l-.06.06A2 2 0 1 1 4.4 17.1l.06-.06A1.7 1.7 0 0 0 5 15.82a1.7 1.7 0 0 0-.49-1 1.7 1.7 0 0 0-1.12-.4H3.3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 5 9.4a1.7 1.7 0 0 0 .49-1 1.7 1.7 0 0 0-.4-1.12l-.06-.06A2 2 0 1 1 7.8 4.4l.06.06A1.7 1.7 0 0 0 9.18 5a1.7 1.7 0 0 0 1-.49 1.7 1.7 0 0 0 .4-1.12V3.3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 14.6 5a1.7 1.7 0 0 0 1 .49 1.7 1.7 0 0 0 1.12-.4l.06-.06A2 2 0 1 1 19.6 7.8l-.06.06A1.7 1.7 0 0 0 19 9.18a1.7 1.7 0 0 0 .49 1 1.7 1.7 0 0 0 1.12.4h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19 14.6Z" fill="none" />
        </svg>
      )
    default:
      return null
  }
}

export default App
