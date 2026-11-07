import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getLang } from './i18n';
import { applyTheme } from './state/preferences';
import './styles/theme.css';

applyTheme();
document.documentElement.lang = getLang();
const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');
createRoot(root).render(<StrictMode><App /></StrictMode>);
