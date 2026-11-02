/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        navy: 'var(--navy)',
        accent: 'var(--accent)',
        'nav-inactive': 'var(--nav-inactive)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        'header-bg': 'var(--header-bg)',
        'cell-total': 'var(--cell-total)',
        'select-highlight': 'var(--select-highlight)'
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
        btn: 'var(--radius-btn)'
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        nav: 'var(--shadow-nav)'
      }
    }
  },
  plugins: []
};
