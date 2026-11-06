import { createRoot } from 'react-dom/client';
import { I18nProvider } from 'react-aria-components';
import { App } from '@/app/App';
import { restoreSession } from '@/entities/session';
import '@/app/styles.css';

const theme = window.matchMedia('(prefers-color-scheme: dark)');
function applySystemTheme() {
	document.documentElement.dataset.theme = theme.matches ? 'dark' : 'light';
}
applySystemTheme();
theme.addEventListener('change', applySystemTheme);
document.documentElement.dataset.platform = navigator.userAgent.includes('Macintosh')
	? 'mac'
	: 'windows';

createRoot(document.getElementById('root')!).render(
	<I18nProvider locale="ru-RU">
		<App />
	</I18nProvider>,
);
void restoreSession();
