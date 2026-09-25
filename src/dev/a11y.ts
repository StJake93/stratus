// Dev-only accessibility harness. Never imported by the app, so it is not in production builds.
// Usage (browser console on the dev server):  const { audit } = await import('/src/dev/a11y.ts'); await audit();
import axe from 'axe-core';

export interface Finding {
  route: string;
  theme: string;
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: { target: string; summary: string; text: string }[];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function scan(route: string, theme: string): Promise<Finding[]> {
  const res = await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    resultTypes: ['violations']
  });
  return res.violations.map((v) => ({
    route,
    theme,
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 60).map((n) => {
      const d = (n.any[0]?.data ?? {}) as { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string };
      const contrast = d.contrastRatio ? ` ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio} (needs ${d.expectedContrastRatio})` : '';
      return { target: String(n.target), summary: ((n.failureSummary ?? '').split('\n').slice(0, 2).join(' ') + contrast).trim(), text: (n.html ?? '').slice(0, 90) };
    })
  }));
}

export async function audit(routes: string[], themes: ('light' | 'dark')[] = ['light', 'dark'], settle = 1400) {
  const out: Finding[] = [];
  // Hidden/background tabs don't advance CSS transitions, so freeze them to get settled colours.
  const freeze = document.createElement('style');
  freeze.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.append(freeze);
  for (const theme of themes) {
    document.documentElement.dataset.theme = theme;
    for (const r of routes) {
      location.hash = r;
      await wait(settle);
      out.push(...(await scan(r, theme)));
    }
  }
  freeze.remove();
  return out;
}
