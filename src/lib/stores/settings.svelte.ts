const KEY = 'stratus.settings.v1';

type Theme = 'dark' | 'light';
type Motion = 'full' | 'reduce';

function read(): { theme: Theme; motion: Motion } {
  let saved: Partial<{ theme: Theme; motion: Motion }> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    /* ignore */
  }
  return {
    theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    motion: saved.motion === 'reduce' || saved.motion === 'full' ? saved.motion : matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full'
  };
}

class Settings {
  theme = $state<Theme>(read().theme);
  motion = $state<Motion>(read().motion);
  navOpen = $state(false);
  tourOpen = $state(false);
  /** True below the sidebar breakpoint, where the nav becomes an overlay. */
  compact = $state(matchMedia('(max-width: 900px)').matches);

  reduced = $derived(this.motion === 'reduce');

  constructor() {
    this.#apply();
    matchMedia('(max-width: 900px)').addEventListener('change', (e) => {
      this.compact = e.matches;
      if (!e.matches) this.navOpen = false;
    });
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.#persist();
  }

  toggleMotion() {
    this.motion = this.motion === 'reduce' ? 'full' : 'reduce';
    this.#persist();
  }

  #persist() {
    this.#apply();
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme: this.theme, motion: this.motion }));
    } catch {
      /* ignore */
    }
  }

  #apply() {
    document.documentElement.dataset.theme = this.theme;
    document.documentElement.dataset.motion = this.motion;
  }
}

export const settings = new Settings();
