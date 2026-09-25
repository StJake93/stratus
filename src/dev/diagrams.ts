// Dev-only layout audit for lesson diagrams. Never imported by the app, so it is not in production builds.
// Usage (browser console on the dev server):
//   const { auditDiagrams } = await import('/src/dev/diagrams.ts'); await auditDiagrams();
// Resize the window between runs to check other widths.

export const DIAGRAM_ROUTES = [
  '#/learn/regions-azs/0',
  '#/learn/k8s-101/0',
  '#/learn/aws-vpc/0',
  '#/learn/aws-ec2/2',
  '#/learn/aws-lambda/1',
  '#/learn/aws-apigw/1',
  '#/learn/aws-databases/1',
  '#/learn/aws-messaging/1',
  '#/learn/aws-edge/1',
  '#/learn/tf-intro/0',
  '#/learn/tf-deps/0'
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const overlaps = (a: DOMRect, b: DOMRect, pad = 1) => a.left < b.right - pad && a.right > b.left + pad && a.top < b.bottom - pad && a.bottom > b.top + pad;
const outside = (r: DOMRect, s: DOMRect) => r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1;

export interface DiagramReport {
  route: string;
  width: number;
  height: number;
  issues: string[];
}

export async function auditDiagrams(routes = DIAGRAM_ROUTES, settle = 800): Promise<DiagramReport[]> {
  const report: DiagramReport[] = [];
  // Hidden/background tabs don't advance CSS transitions, so freeze them to measure settled positions.
  const freeze = document.createElement('style');
  freeze.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.append(freeze);
  try {
    for (const route of routes) {
      location.hash = route;
      await wait(settle);
      for (const fig of document.querySelectorAll<HTMLElement>('figure.diagram')) {
        const stage = fig.querySelector('.stage')!.getBoundingClientRect();
        const nodes = [...fig.querySelectorAll('.node')].map((n) => ({
          name: n.querySelector('.lbl')!.textContent ?? '',
          tile: n.querySelector('.tile')!.getBoundingClientRect(),
          label: n.querySelector('.lbl')!.getBoundingClientRect()
        }));
        const edgeLabels = [...fig.querySelectorAll('.elabel')].map((e) => ({ name: e.textContent ?? '', r: e.getBoundingClientRect() }));
        const legends = [...fig.querySelectorAll('.group span')].map((e) => ({ name: e.textContent ?? '', r: e.getBoundingClientRect() }));
        const issues: string[] = [];

        nodes.forEach((a, i) =>
          nodes.slice(i + 1).forEach((b) => {
            for (const [ka, ra] of [['tile', a.tile], ['label', a.label]] as const)
              for (const [kb, rb] of [['tile', b.tile], ['label', b.label]] as const) if (overlaps(ra, rb)) issues.push(`${a.name} ${ka} overlaps ${b.name} ${kb}`);
          })
        );
        edgeLabels.forEach((e, i) => {
          for (const n of nodes) if (overlaps(e.r, n.tile) || overlaps(e.r, n.label)) issues.push(`edge label "${e.name}" overlaps ${n.name}`);
          for (const o of edgeLabels.slice(i + 1)) if (overlaps(e.r, o.r)) issues.push(`edge labels "${e.name}" and "${o.name}" overlap`);
          for (const g of legends) if (overlaps(e.r, g.r)) issues.push(`edge label "${e.name}" overlaps legend "${g.name}"`);
          if (outside(e.r, stage)) issues.push(`edge label "${e.name}" is clipped`);
        });
        legends.forEach((g, i) => {
          for (const o of legends.slice(i + 1)) if (overlaps(g.r, o.r)) issues.push(`legends "${g.name}" and "${o.name}" overlap`);
          for (const n of nodes) if (overlaps(g.r, n.tile) || overlaps(g.r, n.label)) issues.push(`legend "${g.name}" overlaps ${n.name}`);
        });
        for (const n of nodes) if (outside(n.tile, stage) || outside(n.label, stage)) issues.push(`${n.name} is clipped`);

        // Edges must not run through any node other than their own ends.
        const svg = fig.querySelector('svg')!;
        const origin = svg.getBoundingClientRect();
        for (const path of svg.querySelectorAll<SVGPathElement>('path.edge')) {
          const len = path.getTotalLength();
          const pts = Array.from({ length: 19 }, (_, k) => {
            const q = path.getPointAtLength((len * (k + 1)) / 20);
            return { x: origin.left + q.x, y: origin.top + q.y };
          });
          for (const n of nodes) {
            const box = { left: Math.min(n.tile.left, n.label.left) + 4, right: Math.max(n.tile.right, n.label.right) - 4, top: n.tile.top + 4, bottom: n.label.bottom - 4 };
            const near = (p: { x: number; y: number }) => p.x > box.left - 30 && p.x < box.right + 30 && p.y > box.top - 30 && p.y < box.bottom + 30;
            if (near(pts[0]) || near(pts[pts.length - 1])) continue;
            if (pts.slice(2, -2).some((p) => p.x > box.left && p.x < box.right && p.y > box.top && p.y < box.bottom)) issues.push(`an edge runs through ${n.name}`);
          }
        }
        report.push({ route, width: Math.round(stage.width), height: Math.round(stage.height), issues: [...new Set(issues)] });
      }
    }
  } finally {
    freeze.remove();
  }
  return report;
}
