import { defineStore } from 'pinia';

export type ThemeId = 'dark' | 'light' | 'ocean' | 'forest' | 'violet';

const THEME_KEY = 'jsonview.theme';

function loadTheme(): ThemeId {
  const stored = window.localStorage.getItem(THEME_KEY) as ThemeId | null;
  const valid: ThemeId[] = ['dark', 'light', 'ocean', 'forest', 'violet'];
  if (stored && valid.includes(stored)) return stored;
  return 'dark';
}

function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: loadTheme() as ThemeId,
  }),
  actions: {
    setTheme(id: ThemeId) {
      this.theme = id;
      window.localStorage.setItem(THEME_KEY, id);
      applyTheme(id);
    },
    initTheme() {
      applyTheme(this.theme);
    },
  },
});
