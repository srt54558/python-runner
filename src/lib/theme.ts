export const APP_THEMES = ['light', 'dark', 'coffee', 'pink'] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export function parseTheme(value: string | null, prefersDark: boolean): AppTheme {
	if (value === 'light' || value === 'dark' || value === 'coffee' || value === 'pink') return value;
	return prefersDark ? 'dark' : 'light';
}

export function isDarkTheme(theme: AppTheme): boolean {
	return theme === 'dark' || theme === 'coffee';
}

/** Browser-chrome colors. The same hex values are set before paint in `src/app.html`. */
export const THEME_COLORS: Record<AppTheme, string> = {
	light: '#ffffff',
	dark: '#0a0a0a',
	coffee: '#2a1c11',
	pink: '#fff0f7'
};

export function applyDocumentTheme(theme: AppTheme) {
	const root = document.documentElement;
	root.classList.toggle('dark', isDarkTheme(theme));
	root.classList.toggle('theme-coffee', theme === 'coffee');
	root.classList.toggle('theme-pink', theme === 'pink');
	root.style.colorScheme = isDarkTheme(theme) ? 'dark' : 'light';
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}
