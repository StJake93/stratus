// Contrast audit for the design tokens in src/app.css (WCAG 2.2 AA).
// Usage: npm run audit:contrast   (exits 1 if any pairing fails)
//
// Text needs 4.5:1 (3:1 for large text). Focus rings, input borders and meaningful icons need 3:1.
// Translucent surfaces are composited over each opaque background, so the worst case is checked.

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');

function block(selector) {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`selector not found: ${selector}`);
  return css.slice(i, css.indexOf('\n}', i));
}
function tokens(text) {
  const out = {};
  for (const m of text.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const THEMES = {
  dark: tokens(block(':root {')),
  light: {}
};
THEMES.light = { ...THEMES.dark, ...tokens(block(":root[data-theme='light'] {")) };

// ---------- colour maths ----------
function parse(c) {
  c = c.trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = [...h].map((x) => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  throw new Error(`cannot parse colour: ${c}`);
}
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lin = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// OKLab (Björn Ottosson) for color-mix(in oklab, ...)
function toOklab([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  const enc = (v) => {
    v = Math.min(1, Math.max(0, v));
    return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  };
  return rgb.map(enc).concat(1);
}
// color-mix(in oklab, a, b pct%), where pct is the share of b
function mix(a, b, pct) {
  const A = toOklab(a);
  const B = toOklab(b);
  const t = pct / 100;
  return fromOklab(A.map((v, i) => v * (1 - t) + B[i] * t));
}

// ---------- checks ----------
// Data-driven colours that the UI may render as text via the --ink mix (tracks, providers, categories, cards).
const PALETTE = ['#22d3ee', '#ff9900', '#f97316', '#5b8def', '#8b5cf6', '#3b9cff', '#34a853', '#a371f7', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#94a3b8', '#7c5cff', '#3fb950', '#f25f5c', '#e0488f', '#d6a50b', '#22b8cf', '#326ce5', '#f5c518'];

// Code blocks, terminals and plan panels are always dark in both themes; these literals live in
// CodeBlock, Terminal, TfWorkflow, TfDrift, TfForEach and TerraformPanel.
const CODE_BG = ['#0b0f1c', '#111827', '#070a13', '#0d1220'];
const CODE_FG = { comment: '#8a96bb', text: '#d6deeb', string: '#a5e075', keyword: '#c792ea', fn: '#82aaff', attr: '#7fdbca', number: '#f78c6c', type: '#ffcb6b', muted: '#a3adc2', output: '#c8d1e6', prompt: '#22d3ee', focus: '#67e8f9', green: '#34d399', red: '#f87171', yellow: '#fbbf24', blue: '#93c5fd' };

let failures = 0;
const rows = [];
function check(theme, what, fg, bgs, min) {
  let worst = Infinity;
  let worstBg = '';
  for (const [name, bg] of bgs) {
    const r = ratio(fg, bg);
    if (r < worst) {
      worst = r;
      worstBg = `${name} ${hex(bg)}`;
    }
  }
  const ok = worst >= min;
  if (!ok) failures++;
  rows.push({ theme, what, fg: hex(fg), worst: worst.toFixed(2), min, against: worstBg, ok });
}

for (const [theme, t] of Object.entries(THEMES)) {
  const c = (name) => parse(t[name]);
  const opaque = ['bg', 'bg-2', 'solid', 'solid-2'].map((n) => [n, c(n)]);
  const surfaces = [...opaque];
  for (const s of ['surface', 'surface-2', 'surface-3']) for (const [n, bg] of opaque) surfaces.push([`${s}/${n}`, over(c(s), bg)]);
  const tinted = (soft) => opaque.map(([n, bg]) => [`${soft}/${n}`, over(c(soft), bg)]);

  for (const n of ['text', 'text-2', 'text-3']) check(theme, `--${n}`, c(n), surfaces, 4.5);
  for (const n of ['link', 'accent-fg', 'accent-2-fg', 'ok-fg', 'warn-fg', 'err-fg', 'info-fg', 'aws-fg', 'tf-fg', 'azure-fg', 'gcp-fg']) check(theme, `--${n}`, c(n), surfaces, 4.5);
  check(theme, '--accent-fg on accent-soft', c('accent-fg'), tinted('accent-soft'), 4.5);
  check(theme, '--accent-2-fg on accent-2-soft', c('accent-2-fg'), tinted('accent-2-soft'), 4.5);
  for (const k of ['ok', 'warn', 'err', 'info']) check(theme, `--${k}-fg on ${k}-soft`, c(`${k}-fg`), tinted(`${k}-soft`), 4.5);
  for (const k of ['text', 'text-2']) for (const soft of ['ok-soft', 'warn-soft', 'err-soft', 'info-soft', 'accent-soft']) check(theme, `--${k} on ${soft}`, c(k), tinted(soft), 4.5);

  // Text on solid colour fills
  const white = [255, 255, 255, 1];
  for (const n of ['accent-strong', 'ok-strong', 'err-strong', 'info-strong']) check(theme, `white on --${n}`, white, [[n, c(n)]], 4.5);
  for (const g of ['grad-strong']) for (const stop of t[g].match(/#[0-9a-f]{6}/gi)) check(theme, `white on ${g} stop`, white, [[stop, parse(stop)]], 4.5);
  for (const stop of t['grad-text'].match(/#[0-9a-f]{6}/gi)) check(theme, `--grad-text stop ${stop} (large text)`, parse(stop), surfaces, 3);

  // Non-text: focus ring, input borders, slider track (3:1)
  check(theme, '--focus ring', c('focus'), surfaces, 3);
  check(theme, '--border-input', c('border-input'), surfaces, 3);
  check(theme, '--track (slider)', c('track'), opaque, 3);

  // Data-driven colours rendered as text through the ink mix
  const ink = c('ink');
  const pct = parseFloat(t['ink-mix']);
  for (const p of PALETTE) {
    const fg = mix(parse(p), ink, pct);
    const tints = opaque.map(([n, bg]) => [`${p}@14%/${n}`, over([...parse(p).slice(0, 3), 0.14], bg)]);
    check(theme, `mix(${p}, ink ${pct}%)`, fg, [...surfaces, ...tints], 4.5);
  }
}
for (const [name, fg] of Object.entries(CODE_FG)) check('code', `code ${name}`, parse(fg), CODE_BG.map((b) => [b, parse(b)]), 4.5);

const fails = rows.filter((r) => !r.ok);
const w = (s, n) => String(s).padEnd(n);
console.log(`${w('theme', 7)}${w('pairing', 44)}${w('fg', 9)}${w('worst', 7)}${w('min', 5)}against`);
for (const r of process.argv.includes('--all') ? rows : fails.length ? fails : []) console.log(`${w(r.theme, 7)}${w(r.what, 44)}${w(r.fg, 9)}${w(r.worst, 7)}${w(r.min, 5)}${r.against}${r.ok ? '' : '  ✗'}`);
console.log(`\n${rows.length - fails.length}/${rows.length} pairings pass${failures ? `, ${failures} fail` : ''}.`);
process.exit(failures ? 1 : 0);
