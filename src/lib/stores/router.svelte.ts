// Minimal hash router — works on static hosts (GitHub Pages) with no server config.

export type Route =
  | { name: 'home' }
  | { name: 'track'; id: string }
  | { name: 'lesson'; id: string; step: number }
  | { name: 'play'; scenario?: string }
  | { name: 'scenarios' }
  | { name: 'compare'; concept?: string }
  | { name: 'provider'; id: string }
  | { name: 'progress' }
  | { name: 'notfound' };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const [head, a, b] = parts;
  switch (head) {
    case undefined:
      return { name: 'home' };
    case 'track':
      return a ? { name: 'track', id: a } : { name: 'home' };
    case 'learn':
      return a ? { name: 'lesson', id: a, step: Math.max(0, Number(b ?? 0) || 0) } : { name: 'home' };
    case 'play':
      return { name: 'play', scenario: a };
    case 'scenarios':
      return { name: 'scenarios' };
    case 'compare':
      return { name: 'compare', concept: a };
    case 'provider':
      return a ? { name: 'provider', id: a } : { name: 'home' };
    case 'progress':
      return { name: 'progress' };
    default:
      return { name: 'notfound' };
  }
}

class Router {
  route = $state<Route>(parse(location.hash));

  constructor() {
    window.addEventListener('hashchange', () => {
      const prev = this.route;
      this.route = parse(location.hash);
      // Only reset scroll when changing page, not when stepping within a lesson.
      const samePage =
        prev.name === this.route.name && 'id' in prev && 'id' in this.route && prev.id === this.route.id;
      if (!samePage) document.getElementById('main')?.scrollTo({ top: 0 });
    });
  }

  go(path: string) {
    location.hash = path.startsWith('#') ? path : `#${path}`;
  }
}

export const router = new Router();

export const href = {
  home: () => '#/',
  track: (id: string) => `#/track/${id}`,
  lesson: (id: string, step = 0) => `#/learn/${id}${step ? `/${step}` : ''}`,
  play: (scenario?: string) => `#/play${scenario ? `/${scenario}` : ''}`,
  scenarios: () => '#/scenarios',
  compare: (concept?: string) => `#/compare${concept ? `/${concept}` : ''}`,
  provider: (id: string) => `#/provider/${id}`,
  progress: () => '#/progress'
};
