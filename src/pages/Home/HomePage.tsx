import './HomePage.css'

interface HomePageProps {
  onOpenAddRecord: () => void
  t: (key: string) => string
}

export function HomePage({ onOpenAddRecord, t }: HomePageProps) {
  return (
    <section className="home-panel">
      <div className="home-launcher-card">
        <div className="home-launcher-icon" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </div>

        <h1 className="home-launcher-title">{t('home.startTitle')}</h1>
        <p className="home-launcher-subtitle">{t('home.startSubtitle')}</p>

        <button
          type="button"
          className="home-launcher-btn"
          onClick={onOpenAddRecord}
        >
          {t('home.goToAddRecord')}
        </button>
      </div>
    </section>
  )
}
