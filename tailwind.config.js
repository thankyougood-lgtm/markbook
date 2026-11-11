/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        surface: 'var(--surface)',
        surfaceAlt: 'var(--surface-alt)',
        primary: 'var(--primary)',
        primarySoft: 'var(--primary-soft)',
        accent: 'var(--accent)',
        navy: 'var(--navy)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        danger: 'var(--danger)',
        shadow: 'var(--shadow)',
      },
      boxShadow: {
        app: 'var(--shadow)',
      },
      fontFamily: {
        sans: ['Ethiopic Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
