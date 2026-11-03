import { useEffect, useMemo, useState } from 'react'
import en from './i18n/en.json'
import am from './i18n/am.json'
import om from './i18n/om.json'
import './theme.css'

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
  { key: 'addRecord', labelKey: 'nav.addRecord', icon: 'plus' },
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
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('markbook-language')
    return saved === 'am' || saved === 'om' ? saved : 'en'
  })
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('markbook-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

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
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }

    const handlePopState = () => {
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
  }, [menuOpen])

  const t = (key: string) => translations[language][key] ?? key

  const showExport = page === 'addRecord' || page === 'attendance' || page === 'analytics'

  const menuLinks = useMemo<Array<{ labelKey: string; target: PageKey }>>(
    () => [
      { labelKey: 'nav.home', target: 'home' },
      { labelKey: 'nav.addRecord', target: 'addRecord' },
      { labelKey: 'nav.attendance', target: 'attendance' },
      { labelKey: 'nav.analytics', target: 'analytics' },
      { labelKey: 'nav.settings', target: 'settings' },
    ],
    [],
  )

  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)

  const handleMenuSelect = (target: PageKey) => {
    setPage(target)
    closeMenu()
  }

  const renderPlaceholderPage = (key: Exclude<PageKey, 'home' | 'settings'>) => (
    <section className="page-panel">
      <div className="placeholder-card">
        <h2>{t(`page.${key}`)}</h2>
        <p>{t('page.comingSoon')}</p>
      </div>
    </section>
  )

  return (
    <div className="app-shell min-h-screen bg-[var(--bg-page)] text-[var(--text)]">
      <header className="top-bar">
        <div className="top-bar-left">
          {showExport && (
            <div className="export-menu-wrap">
              <button type="button" className="export-button" aria-label={t('menu.export')}>
                {t('menu.export')}
              </button>
              <div className="export-menu" role="menu" aria-label={t('menu.export')}>
                <span>{t('menu.available')}</span>
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
        <button type="button" className="menu-link disabled" disabled>
          {t('menu.about')}
        </button>
      </aside>

      <main className="content-area">
        {page === 'home' && (
          <section className="page-panel">
            <div className="page-card home-card">
              <div className="field-block">
                <label htmlFor="home-class-select">{t('home.classLabel')}</label>
                <select id="home-class-select" value="" disabled>
                  <option value="">{t('common.classPlaceholder')}</option>
                </select>
              </div>

              <div className="field-block">
                <label htmlFor="home-semester-select">{t('home.semesterLabel')}</label>
                <select id="home-semester-select" value="" disabled>
                  <option value="">{t('common.semesterPlaceholder')}</option>
                </select>
              </div>

              <p className="home-empty">{t('home.empty')}</p>
            </div>
          </section>
        )}

        {page === 'addRecord' && renderPlaceholderPage('addRecord')}
        {page === 'attendance' && renderPlaceholderPage('attendance')}
        {page === 'analytics' && renderPlaceholderPage('analytics')}

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
