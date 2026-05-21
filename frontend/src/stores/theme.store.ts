'use client';

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
	theme: 'light',
	setTheme: (theme: Theme) => {
		set({ theme });
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', theme);
			document.documentElement.classList.toggle('dark', theme === 'dark');
		}
	},
	toggleTheme: () => {
		const next = get().theme === 'light' ? 'dark' : 'light';
		get().setTheme(next);
	},
}));

// Initialize theme from localStorage on client
if (typeof window !== 'undefined') {
	const saved = localStorage.getItem('theme') as Theme | null;
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const initial = saved || (prefersDark ? 'dark' : 'light');
	useThemeStore.getState().setTheme(initial);
}
