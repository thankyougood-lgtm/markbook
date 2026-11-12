import './HomePage.css'

interface HomePageProps {
  onOpenAddRecord: () => void
  t: (key: string) => string
}

export function HomePage({ onOpenAddRecord, t }: HomePageProps) {
  return (
    <section className="page-panel home-panel">
      <div className="home-launcher-card">
        <div className="home-launcher-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="40"
            height="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>

        <h1 className="home-launcher-title">{t('home.startTitle')}</h1>
        <p className="home-launcher-subtitle">{t('home.startSubtitle')}</p>

        <button type="button" className="home-launcher-btn" onClick={onOpenAddRecord}>
          {t('home.goToAddRecord')}
        </button>
      </div>
    </section>
  )
}
