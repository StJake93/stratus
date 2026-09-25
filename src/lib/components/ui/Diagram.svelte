<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Icon from '../Icon.svelte';
  import type { DiagramEdge, DiagramNode } from '../../data/types';
  import { SERVICE, categoryColor } from '../../data/services';
  import { md, plain } from '../../md';
  import { scrollable } from '../../actions';

  let { nodes, edges, height = 320, caption }: { nodes: DiagramNode[]; edges: DiagramEdge[]; height?: number; caption?: string } = $props();

  const uid = `dg-${Math.random().toString(36).slice(2, 8)}`;
  let w = $state(700);
  let selected = $state<string | null>(null);
  let hovered = $state<string | null>(null);

  // ---------- geometry ----------
  // Nodes are authored in percentages of an inset area, so tiles, labels and hover rings
  // always stay inside the stage (no clipping by the scroll container).
  const PAD_X = 66;
  const PAD_TOP = 40;
  const PAD_BOTTOM = 54;
  const TILE = 25; // half the tile size

  type Pt = { x: number; y: number };
  type Box = { x1: number; y1: number; x2: number; y2: number };

  const items = $derived(nodes.filter((n) => !n.group));
  const groups = $derived(nodes.filter((n) => n.group));
  const byId = $derived(Object.fromEntries(nodes.map((n) => [n.id, n])));

  const labelW = (text: string, size = 6.7) => Math.min(150, text.length * size + 16);
  const textW = (text: string) => text.length * 6.7 + 14;
  const innerW = $derived(w - 2 * PAD_X);
  const px = (x: number) => PAD_X + (x / 100) * innerW;

  // Node labels wrap to fit between neighbours on the same line, and to stay clear of a tile just below and
  // to the side. (Stacked nodes are separated by growing the stage instead. Distances use the authored height,
  // so this doesn't depend on the auto-grown height below.)
  const labelMax = $derived.by(() => {
    const m = new Map<string, number>();
    const inner0 = height - PAD_TOP - PAD_BOTTOM;
    for (const a of items) {
      let lim = 150;
      for (const b of items) {
        if (a === b) continue;
        const dy = ((b.y - a.y) / 100) * inner0;
        const dx = (Math.abs(a.x - b.x) / 100) * innerW;
        if (Math.abs(dy) < 36) lim = Math.min(lim, dx - 12);
        else if (dy > 0 && dy < 76 && dx - TILE - 6 >= 32) lim = Math.min(lim, 2 * (dx - TILE - 6));
      }
      m.set(a.id, Math.max(64, lim));
    }
    return m;
  });

  // Rendered label sizes depend only on their text and the widths allowed above, so they are measured and fed
  // back into the layout (estimated until then). Measuring straight after each render, rather than waiting for
  // a ResizeObserver frame, means the first paint is already laid out correctly.
  type Size = { w: number; h: number };
  const els: Record<string, HTMLElement | null> = {};
  let sizes = $state<Record<string, Size>>({});
  function measure() {
    const next: Record<string, Size> = {};
    for (const [k, el] of Object.entries(els)) if (el) next[k] = { w: el.offsetWidth, h: el.offsetHeight };
    if (JSON.stringify(next) !== JSON.stringify(untrack(() => sizes))) sizes = next;
  }
  $effect(() => {
    void [labelMax, innerW, items, groups, edges];
    // Wait for pending DOM updates (such as the stage's first real width) before reading sizes.
    tick().then(measure);
  });
  $effect(() => {
    // Web fonts can land after the first measurement.
    document.fonts?.addEventListener('loadingdone', measure);
    return () => document.fonts?.removeEventListener('loadingdone', measure);
  });

  const halfW = (n: DiagramNode) => Math.max(TILE, (sizes[`n:${n.id}`]?.w || Math.min(textW(n.label), labelMax.get(n.id) ?? 150)) / 2);
  const labelH = (n: DiagramNode) => sizes[`n:${n.id}`]?.h || Math.min(3, Math.ceil(textW(n.label) / (labelMax.get(n.id) ?? 150))) * 15 + 4;
  const groupW = (g: DiagramNode) => ((g.w ?? 40) / 100) * innerW;
  // Legends wrap rather than overflow a narrow group (see .group span).
  const legendW = (g: DiagramNode) => sizes[`g:${g.id}`]?.w || Math.min(g.label.length * 7 + 18, groupW(g) - 18);
  const legendHalfH = (g: DiagramNode) => (sizes[`g:${g.id}`]?.h || 19) / 2;
  const edgeKey = (e: DiagramEdge) => `e:${e.from}>${e.to}`;
  // Let long identifiers (aws_internet_gateway, node.js) break after separators rather than mid-word,
  // and keep short parentheticals like "(AZ a)" together.
  const nobr = (s: string) => s.replace(/\([^)]{1,8}\)/g, (m) => m.replaceAll(' ', '\u00a0'));
  const parts = (s: string) => nobr(s).split(/(?<=[_./-])/);

  // Legends sit on a group's top border and can slide along it. For each spot, work out the inner stage height
  // at which nodes above the border (their labels) and below it (their tiles) stay clear of the legend.
  function legendSpots(g: DiagramNode) {
    const gx1 = px(g.x);
    const lw = legendW(g);
    const lh = legendHalfH(g) + 3;
    const spots: { off: number; need: number }[] = [];
    // (A legend may overhang the far end of a cramped group slightly.)
    for (let off = 12; off === 12 || off + lw <= groupW(g) + 6; off += 4) {
      let need = 0;
      for (const n of items) {
        const c = px(n.x);
        const half = halfW(n) + 3;
        if (c + half <= gx1 + off || c - half >= gx1 + off + lw) continue;
        const dy = (g.y - n.y) / 100;
        need = Math.max(need, dy > 0 ? (TILE + 6 + labelH(n) + lh) / dy : dy < 0 ? (TILE + lh) / -dy : Infinity);
      }
      spots.push({ off, need });
    }
    return spots;
  }
  const spots = $derived(new Map(groups.map((g) => [g.id, legendSpots(g)])));

  // Grow the stage when stacked nodes would put a label on the tile below, or when no legend spot is clear.
  const H = $derived.by(() => {
    let inner = height - PAD_TOP - PAD_BOTTOM;
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const clash = (Math.abs(a.x - b.x) / 100) * innerW < halfW(a) + halfW(b) + 8;
        const dy = Math.abs(a.y - b.y) / 100;
        const upper = a.y <= b.y ? a : b;
        // A labelled edge between two stacked nodes also needs room for its label in between.
        const labelled = edges.some((e) => e.label && ((e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)));
        const need = TILE * 2 + 6 + labelH(upper) + 14 + (labelled ? 28 : 0);
        if (clash && dy > 0) inner = Math.max(inner, need / dy);
      }
    // (Not when a node sits almost on the border line: no sensible height would clear it.)
    for (const s of spots.values()) {
      const need = Math.min(...s.map((o) => o.need));
      if (need <= inner * 1.6) inner = Math.max(inner, need);
    }
    return Math.round(Math.min(inner, 820) + PAD_TOP + PAD_BOTTOM);
  });
  const py = (y: number) => PAD_TOP + (y / 100) * (H - PAD_TOP - PAD_BOTTOM);
  const center = (n: DiagramNode): Pt => ({ x: px(n.x), y: py(n.y) });

  // The leftmost clear legend spot, or the least crowded one if the stage reached its height cap.
  const legendX = $derived.by(() => {
    const inner = H - PAD_TOP - PAD_BOTTOM;
    const m = new Map<string, number>();
    for (const [id, s] of spots) m.set(id, (s.find((o) => o.need <= inner + 1) ?? s.reduce((a, b) => (b.need < a.need ? b : a))).off);
    return m;
  });
  // (Offsets are from the group's padding box, inside its 1.5px border.)
  const legendBox = (g: DiagramNode): Box => {
    const x1 = px(g.x) + 1.5 + (legendX.get(g.id) ?? 12);
    const y = py(g.y) + 1.5;
    return { x1, y1: y - legendHalfH(g), x2: x1 + legendW(g), y2: y + legendHalfH(g) };
  };

  // Does the segment p→q cross box b? (Liang–Barsky clipping, so thin corners aren't missed between samples.)
  function crosses(p: Pt, q: Pt, b: Box) {
    let t0 = 0;
    let t1 = 1;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    for (const [pp, qq] of [[-dx, p.x - b.x1], [dx, b.x2 - p.x], [-dy, p.y - b.y1], [dy, b.y2 - p.y]]) {
      if (pp === 0) {
        if (qq < 0) return false;
        continue;
      }
      const r = qq / pp;
      if (pp < 0) {
        if (r > t1) return false;
        t0 = Math.max(t0, r);
      } else {
        if (r < t0) return false;
        t1 = Math.min(t1, r);
      }
    }
    return true;
  }

  // A node is its tile plus the (possibly wrapped) label underneath it. They are kept as two boxes so an edge
  // can leave the side of a tile even when the label below it is wider.
  function nodeBoxes(n: DiagramNode, inflate = 0): Box[] {
    const c = center(n);
    const half = (sizes[`n:${n.id}`]?.w || Math.min(textW(n.label), labelMax.get(n.id) ?? 150)) / 2;
    const top = c.y + TILE + 6;
    return [
      { x1: c.x - TILE - inflate, y1: c.y - TILE - inflate, x2: c.x + TILE + inflate, y2: c.y + TILE + inflate },
      { x1: c.x - half - inflate, y1: top - inflate, x2: c.x + half + inflate, y2: top + labelH(n) + inflate }
    ];
  }

  type Side = 'l' | 'r' | 't' | 'b';
  type Port = { p: Pt; out: Pt };
  const OUT: Record<Side, Pt> = { l: { x: -1, y: 0 }, r: { x: 1, y: 0 }, t: { x: 0, y: -1 }, b: { x: 0, y: 1 } };
  // How far each side sits from the node's centre (the bottom side clears the label).
  const reach = (n: DiagramNode, side: Side) => (side === 'b' ? TILE + 6 + labelH(n) + 2 : TILE + 2);

  // Where the straight line from a node's centre towards `to` leaves its tile+label block, followed by the
  // middles of the two perpendicular sides as fallbacks for when that way out is blocked.
  function ports(n: DiagramNode, to: Pt, gap: number): Port[] {
    const c = center(n);
    const dx = to.x - c.x;
    const dy = to.y - c.y;
    const tx = dx === 0 ? Infinity : reach(n, 'r') / Math.abs(dx);
    const ty = dy === 0 ? Infinity : reach(n, dy > 0 ? 'b' : 't') / Math.abs(dy);
    const t = Math.min(tx, ty);
    const len = Math.hypot(dx, dy) || 1;
    const side: Side = tx <= ty ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'b' : 't';
    const natural = { p: { x: c.x + dx * t + (dx / len) * gap, y: c.y + dy * t + (dy / len) * gap }, out: OUT[side] };
    const alt: Side[] = side === 'l' || side === 'r' ? ['t', 'b'] : ['l', 'r'];
    return [natural, ...alt.map((sd) => ({ p: { x: c.x + OUT[sd].x * (reach(n, sd) + gap), y: c.y + OUT[sd].y * (reach(n, sd) + gap) }, out: OUT[sd] }))];
  }

  const bez = (p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y
    };
  };

  interface Routed {
    e: DiagramEdge;
    d: string;
    label?: { x: number; y: number };
  }

  const routed = $derived.by((): Routed[] => {
    const placedLabels: Box[] = [];
    const out: Routed[] = [];
    for (const e of edges) {
      const a = byId[e.from];
      const b = byId[e.to];
      if (!a || !b) continue;
      const others = items.filter((n) => n !== a && n !== b).flatMap((n) => nodeBoxes(n, 6));
      const ends = [...nodeBoxes(a), ...nodeBoxes(b)];

      // Score every combination of ports and sideways bends: anything that crosses a node (or leaves the stage)
      // loses, then prefer the natural ports, the gentlest bend, and a curve that neither loops nor shrinks to a
      // stub (as happens between nodes stacked almost on top of each other).
      let best: { s: Pt; t: Pt; c1: Pt; c2: Pt; score: number } | null = null;
      const from = ports(a, center(b), 2);
      const to = ports(b, center(a), 6);
      for (const [i, ps] of from.entries())
        for (const [j, pt] of to.entries()) {
          const s = ps.p;
          const t = pt.p;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const len = Math.hypot(dx, dy) || 1;
          // Control points stretch out of each port by half the distance in that direction (or a tighter
          // version of the same curve).
          for (const [ks, off] of [1, 0.55].flatMap((ks) => [0, 50, -50, 90, -90, 140, -140].map((o) => [ks, o]))) {
            const k1 = Math.max(24, (Math.abs(dx * ps.out.x + dy * ps.out.y) / 2) * ks);
            const k2 = Math.max(24, (Math.abs(dx * pt.out.x + dy * pt.out.y) / 2) * ks);
            const c1 = { x: s.x + ps.out.x * k1 - (dy / len) * off, y: s.y + ps.out.y * k1 + (dx / len) * off };
            const c2 = { x: t.x + pt.out.x * k2 - (dy / len) * off, y: t.y + pt.out.y * k2 + (dx / len) * off };
            let hits = 0;
            let length = 0;
            let prev = s;
            for (let k = 1; k <= 32; k++) {
              const p = bez(s, c1, c2, t, k / 32);
              if (others.some((bx) => crosses(prev, p, bx))) hits++;
              if (k > 3 && k < 30 && ends.some((bx) => crosses(prev, p, bx))) hits++;
              if (p.x < 2 || p.x > w - 2 || p.y < 2 || p.y > H - 2) hits++;
              length += Math.hypot(p.x - prev.x, p.y - prev.y);
              prev = p;
            }
            const shape = (len < 24 ? 200 : 0) + Math.max(0, length - 1.6 * len - 40) * 0.5;
            const score = hits * 1000 + (i ? 40 : 0) + (j ? 40 : 0) + Math.abs(off) * 0.3 + (ks < 1 ? 5 : 0) + shape;
            if (!best || score < best.score) best = { s, t, c1, c2, score };
          }
        }
      const { s, t, c1, c2 } = best!;
      const len = Math.hypot(t.x - s.x, t.y - s.y) || 1;
      const nx = -(t.y - s.y) / len;
      const ny = (t.x - s.x) / len;
      const d = `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${t.x},${t.y}`;

      let label: { x: number; y: number } | undefined;
      if (e.label) {
        const lw = (sizes[edgeKey(e)]?.w || labelW(e.label, 6.4)) + 4;
        const lh = (sizes[edgeKey(e)]?.h || 22) / 2 + 2;
        const all = [...items.flatMap((n) => nodeBoxes(n, 4)), ...groups.map(legendBox)];
        const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
        // Walk along the curve first; if the line has no room (e.g. a wide label between close nodes),
        // lift the label off the line to either side. If nothing is completely clear, take the least-covered spot.
        let bestSpot: { p: Pt; box: Box; cost: number } | null = null;
        search: for (const off of [0, 22, -22, 42, -42, 64, -64, 88, -88, 112, -112]) {
          for (const tt of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82]) {
            const q = bez(s, c1, c2, t, tt);
            const p = { x: q.x + nx * off, y: q.y + ny * off };
            const box = { x1: p.x - lw / 2, y1: p.y - lh, x2: p.x + lw / 2, y2: p.y + lh };
            const inside = box.x1 >= 2 && box.x2 <= w - 2 && box.y1 >= 2 && box.y2 <= H - 2;
            if (!inside) continue;
            const cost = [...all, ...placedLabels].reduce((sum, bx) => sum + area(bx, box), 0) + Math.abs(off) * 0.01;
            if (!bestSpot || cost < bestSpot.cost) bestSpot = { p, box, cost };
            if (cost < 1.2) break search;
          }
        }
        if (bestSpot) {
          label = bestSpot.p;
          placedLabels.push(bestSpot.box);
        } else {
          label = bez(s, c1, c2, t, 0.5);
        }
      }
      out.push({ e, d, label });
    }
    return out;
  });

  // ---------- interaction ----------
  function iconOf(n: DiagramNode) {
    const s = n.icon ? SERVICE[n.icon] : undefined;
    return { icon: s?.icon ?? n.icon ?? 'box', color: n.color ?? (s ? categoryColor(s.category) : 'var(--accent)') };
  }
  const related = (id: string) => (e: DiagramEdge) => e.from === id || e.to === id;
  const focus = $derived(hovered ?? selected);
  const lit = (n: DiagramNode) => !focus || focus === n.id || edges.some((e) => related(focus!)(e) && (e.from === n.id || e.to === n.id));
  const sel = $derived(selected ? byId[selected] : null);
  const hasNotes = $derived(items.some((n) => n.note));

  // Text alternative: groups, their members, and every connection (WCAG 1.1.1 / 1.3.1).
  const within = (n: DiagramNode, g: DiagramNode) => n.x >= g.x && n.x <= g.x + (g.w ?? 40) && n.y >= g.y && n.y <= g.y + (g.h ?? 40);
  const description = $derived.by(() => {
    const parts: string[] = [];
    for (const g of groups) {
      const members = items.filter((n) => within(n, g)).map((n) => n.label);
      if (members.length) parts.push(`${g.label} contains ${members.join(', ')}.`);
    }
    const conns = edges.map((e) => `${byId[e.from]?.label} to ${byId[e.to]?.label}${e.label ? ` (${e.label})` : ''}`);
    if (conns.length) parts.push(`Connections: ${conns.join('; ')}.`);
    return parts.join(' ');
  });
</script>

<figure class="diagram" aria-labelledby={caption ? `${uid}-cap` : undefined}>
  <p class="sr-only">Diagram with {items.length} components. {description}</p>
  <div class="scroller" use:scrollable role="group" aria-label="Diagram canvas">
    <div class="stage" bind:clientWidth={w} style:height="{H}px">
      {#each groups as g}
        <div
          class="group"
          aria-hidden="true"
          style:left="{px(g.x)}px"
          style:top="{py(g.y)}px"
          style:width="{((g.w ?? 40) / 100) * (w - 2 * PAD_X)}px"
          style:height="{((g.h ?? 40) / 100) * (H - PAD_TOP - PAD_BOTTOM)}px"
          style:--gc={g.color ?? 'var(--c-network)'}
        >
          <span style:left="{legendX.get(g.id) ?? 12}px" bind:this={els[`g:${g.id}`]}>{nobr(g.label)}</span>
        </div>
      {/each}

      <svg width={w} height={H} aria-hidden="true">
        <defs>
          <marker id="{uid}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)" />
          </marker>
        </defs>
        {#each routed as r}
          {@const on = focus ? related(focus)(r.e) : false}
          <path d={r.d} class="edge" class:dashed={r.e.dashed} class:lit={on} class:dim={focus && !on} marker-end="url(#{uid}-arrow)" />
          {#if r.e.flow}<path d={r.d} class="flow" class:dim={focus && !on} />{/if}
        {/each}
      </svg>

      {#each routed.filter((r) => r.label) as r}
        <span class="elabel" aria-hidden="true" class:dim={focus && !related(focus)(r.e)} style:left="{r.label!.x}px" style:top="{r.label!.y}px" bind:this={els[edgeKey(r.e)]}>{r.e.label}</span>
      {/each}

      {#each items as n}
        {@const ic = iconOf(n)}
        {@const c = center(n)}
        {#if n.note}
          <button
            class="node"
            class:sel={selected === n.id}
            class:dim={!lit(n)}
            style:left="{c.x}px"
            style:top="{c.y}px"
            style:--nc={ic.color}
            aria-expanded={selected === n.id}
            aria-controls="{uid}-note"
            onmouseenter={() => (hovered = n.id)}
            onmouseleave={() => (hovered = null)}
            onfocus={() => (hovered = n.id)}
            onblur={() => (hovered = null)}
            onclick={() => (selected = selected === n.id ? null : n.id)}
          >
            <span class="tile"><Icon name={ic.icon} size={22} /><i class="dot" aria-hidden="true"></i></span>
            <span class="lbl" style:max-width="{labelMax.get(n.id)}px" bind:this={els[`n:${n.id}`]}>{#each parts(n.label) as p, i}{#if i}<wbr />{/if}{p}{/each}</span>
            <span class="sr-only">, show details</span>
          </button>
        {:else}
          <div class="node static" class:dim={!lit(n)} style:left="{c.x}px" style:top="{c.y}px" style:--nc={ic.color} aria-hidden="true">
            <span class="tile"><Icon name={ic.icon} size={22} /></span>
            <span class="lbl" style:max-width="{labelMax.get(n.id)}px" bind:this={els[`n:${n.id}`]}>{#each parts(n.label) as p, i}{#if i}<wbr />{/if}{p}{/each}</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <p class="scroll-hint" aria-hidden="true"><Icon name="move-horizontal" size={14} /> Scroll sideways to see the whole diagram.</p>

  <div id="{uid}-note" aria-live="polite">
    {#if sel?.note}
      <div class="note fade-in">
        <strong>{sel.label}</strong>
        {@html md(sel.note)}
      </div>
    {:else if hasNotes}
      <p class="note hint"><Icon name="mouse-pointer-2" size={14} /> Select a highlighted component to learn what it does.</p>
    {/if}
  </div>
  {#if caption}<figcaption id="{uid}-cap">{plain(caption)}</figcaption>{/if}
</figure>

<style>
  .diagram {
    margin: 14px 0 18px;
    padding: 12px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background:
      radial-gradient(circle at 1px 1px, var(--surface-3) 1px, transparent 0) 0 0 / 22px 22px,
      var(--surface);
  }
  .scroller {
    overflow-x: auto;
    border-radius: 12px;
  }
  /* Shown only while the stage overflows (the scrollable action makes the scroller focusable then). */
  .scroll-hint {
    display: none;
    align-items: center;
    gap: 6px;
    margin: 6px 6px 0;
    font-size: 0.8rem;
    color: var(--text-3);
  }
  .scroller:global([tabindex]) + .scroll-hint {
    display: flex;
  }
  .stage {
    position: relative;
    min-width: 580px;
  }
  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }
  .edge {
    fill: none;
    stroke: var(--text-3);
    stroke-opacity: 0.55;
    stroke-width: 2;
    transition:
      stroke 0.2s,
      opacity 0.2s;
  }
  .edge.dashed {
    stroke-dasharray: 5 5;
  }
  .edge.lit {
    stroke: var(--accent-2-fg);
    stroke-opacity: 1;
  }
  .flow {
    fill: none;
    stroke: var(--accent-2);
    stroke-width: 2.5;
    stroke-dasharray: 4 26;
    stroke-linecap: round;
    animation: flow 1.4s linear infinite;
  }
  @keyframes flow {
    to {
      stroke-dashoffset: -30;
    }
  }
  .edge.dim,
  .flow.dim {
    opacity: 0.2;
  }
  .elabel {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 6px;
    background: var(--solid);
    border: 1px solid var(--border-strong);
    color: var(--text-2);
    white-space: nowrap;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .elabel.dim {
    opacity: 0.35;
  }
  .group {
    position: absolute;
    border: 1.5px dashed color-mix(in srgb, var(--gc) 65%, transparent);
    background: color-mix(in srgb, var(--gc) 6%, transparent);
    border-radius: 12px;
  }
  /* Legend-style label on the border, placed clear of nodes. Edges that cross the border pass behind it. */
  .group span {
    position: absolute;
    z-index: 1;
    top: 0;
    transform: translateY(-50%);
    width: max-content;
    max-width: calc(100% - 20px);
    text-wrap: balance;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.03em;
    text-align: center;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--solid);
    border: 1px solid color-mix(in srgb, var(--gc) 45%, transparent);
    color: color-mix(in oklab, var(--gc), var(--ink) var(--ink-mix));
  }
  .node {
    position: absolute;
    /* Size to the content, not the space left before the stage edge, so labels only wrap at labelMax. */
    width: max-content;
    transform: translate(-50%, -25px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: none;
    border: 0;
    padding: 0;
    color: var(--text);
    border-radius: 14px;
    transition: opacity 0.2s;
  }
  .node:focus-visible {
    outline: none;
  }
  .node:focus-visible .tile {
    outline: 2px solid var(--focus);
    outline-offset: 3px;
  }
  .tile {
    position: relative;
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: var(--nc);
    background: color-mix(in srgb, var(--nc) 14%, var(--solid));
    border: 1.5px solid color-mix(in srgb, var(--nc) 45%, transparent);
    box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--nc) 70%, transparent);
    transition:
      transform 0.25s var(--ease),
      box-shadow 0.25s,
      opacity 0.2s;
  }
  button.node:hover .tile,
  .node.sel .tile {
    transform: translateY(-2px) scale(1.05);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--nc) 22%, transparent),
      0 10px 24px -8px color-mix(in srgb, var(--nc) 80%, transparent);
  }
  /* "Has details" marker, tucked inside the tile corner so it can't collide with edge labels. */
  .dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--focus);
    box-shadow: 0 0 0 2px var(--solid);
  }
  .sel .dot {
    display: none;
  }
  /* Dim only the tile when another node is focused, so labels stay readable. */
  .node.dim .tile {
    opacity: 0.35;
  }
  .node.dim .lbl {
    color: var(--text-2);
  }
  /* Labels wrap (breaking long identifiers if needed) within the width their row allows. */
  .lbl {
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.25;
    text-align: center;
    padding: 1px 6px;
    border-radius: 5px;
    background: color-mix(in srgb, var(--solid) 88%, transparent);
    white-space: normal;
    overflow-wrap: break-word;
  }
  .note {
    margin: 10px 0 0;
    padding: 12px 14px;
    border-radius: 11px;
    background: var(--surface-2);
    font-size: 0.92rem;
  }
  .note strong {
    display: block;
    color: var(--accent-2-fg);
    margin-bottom: 2px;
  }
  .note :global(p:last-child) {
    margin: 0;
  }
  .note.hint {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--text-3);
    font-size: 0.82rem;
    background: none;
    padding: 6px 6px 0;
  }
  figcaption {
    font-size: 0.82rem;
    color: var(--text-3);
    padding: 6px 6px 0;
  }
</style>
