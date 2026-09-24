const KEY = 'stratus.settings.v1';

function read(): { theme: 'dark' | 'light' } {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (s.theme === 'light' || s.theme === 'dark') return s;
  } catch {
    /* ignore */
  }
  return { theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark' };
}

class Settings {
  theme = $state<'dark' | 'light'>(read().theme);
  navOpen = $state(false);
  tourOpen = $state(false);

  constructor() {
    this.#apply();
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.#apply();
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme: this.theme }));
    } catch {
      /* ignore */
    }
  }

  #apply() {
    document.documentElement.dataset.theme = this.theme;
  }
}

export const settings = new Settings();
