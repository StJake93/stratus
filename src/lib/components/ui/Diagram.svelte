<script lang="ts">
  import Icon from '../Icon.svelte';
  import type { DiagramEdge, DiagramNode } from '../../data/types';
  import { SERVICE, categoryColor } from '../../data/services';
  import { md } from '../../md';

  let { nodes, edges, height = 320, caption }: { nodes: DiagramNode[]; edges: DiagramEdge[]; height?: number; caption?: string } = $props();

  let w = $state(700);
  let selected = $state<string | null>(null);
  let hovered = $state<string | null>(null);

  const byId = $derived(Object.fromEntries(nodes.map((n) => [n.id, n])));
  const sel = $derived(selected ? byId[selected] : null);
  const hasNotes = $derived(nodes.some((n) => n.note));

  const px = (n: DiagramNode) => ({ x: (n.x / 100) * w, y: (n.y / 100) * height });

  function iconOf(n: DiagramNode) {
    const s = n.icon ? SERVICE[n.icon] : undefined;
    return { icon: s?.icon ?? n.icon ?? 'box', color: n.color ?? (s ? categoryColor(s.category) : 'var(--accent)') };
  }

  function path(e: DiagramEdge) {
    const a = byId[e.from];
    const b = byId[e.to];
    if (!a || !b) return '';
    const p1 = px(a);
    const p2 = px(b);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Trim ends so arrows stop at the node edge.
    const len = Math.hypot(dx, dy) || 1;
    const r = 30;
    const s = { x: p1.x + (dx / len) * r, y: p1.y + (dy / len) * r };
    const t = { x: p2.x - (dx / len) * (r + 4), y: p2.y - (dy / len) * (r + 4) };
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const c1 = horizontal ? { x: s.x + (t.x - s.x) / 2, y: s.y } : { x: s.x, y: s.y + (t.y - s.y) / 2 };
    const c2 = horizontal ? { x: s.x + (t.x - s.x) / 2, y: t.y } : { x: t.x, y: s.y + (t.y - s.y) / 2 };
    return `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${t.x},${t.y}`;
  }

  function mid(e: DiagramEdge) {
    const a = px(byId[e.from]);
    const b = px(byId[e.to]);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  const related = (id: string) => (e: DiagramEdge) => e.from === id || e.to === id;
  const focus = $derived(hovered ?? selected);
</script>

<figure class="diagram">
  <div class="stage" bind:clientWidth={w} style:height="{height}px">
    {#each nodes.filter((n) => n.group) as g}
      <div
        class="group"
        style:left="{g.x}%"
        style:top="{g.y}%"
        style:width="{g.w ?? 40}%"
        style:height="{g.h ?? 40}%"
        style:--gc={g.color ?? 'var(--c-network)'}
      >
        <span>{g.label}</span>
      </div>
    {/each}

    <svg width={w} {height} aria-hidden="true">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)" />
        </marker>
      </defs>
      {#each edges as e}
        {@const d = path(e)}
        {@const lit = focus ? related(focus)(e) : false}
        <path {d} class="edge" class:dashed={e.dashed} class:lit class:dim={focus && !lit} marker-end="url(#arrow)" />
        {#if e.flow}
          <path {d} class="flow" class:dim={focus && !lit} />
        {/if}
      {/each}
    </svg>

    {#each edges.filter((e) => e.label) as e}
      {@const m = mid(e)}
      <span class="elabel" class:dim={focus && !related(focus)(e)} style:left="{m.x}px" style:top="{m.y}px">{e.label}</span>
    {/each}

    {#each nodes.filter((n) => !n.group) as n}
      {@const ic = iconOf(n)}
      <button
        class="node"
        class:sel={selected === n.id}
        class:dim={focus && focus !== n.id && !edges.some((e) => related(focus!)(e) && (e.from === n.id || e.to === n.id))}
        class:has-note={!!n.note}
        style:left="{n.x}%"
        style:top="{n.y}%"
        style:--nc={ic.color}
        onmouseenter={() => (hovered = n.id)}
        onmouseleave={() => (hovered = null)}
        onclick={() => (selected = selected === n.id ? null : n.id)}
      >
        <span class="tile"><Icon name={ic.icon} size={22} /></span>
        <span class="lbl">{n.label}</span>
      </button>
    {/each}
  </div>

  {#if sel?.note}
    <div class="note fade-in">
      <strong>{sel.label}</strong>
      {@html md(sel.note)}
    </div>
  {:else if hasNotes}
    <div class="note hint"><Icon name="mouse-pointer-2" size={14} /> Click any component to learn what it does.</div>
  {/if}
  {#if caption}<figcaption>{caption}</figcaption>{/if}
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
  .stage {
    position: relative;
    min-width: 560px;
  }
  .diagram {
    overflow-x: auto;
  }
  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }
  .edge {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 2;
    transition:
      stroke 0.2s,
      opacity 0.2s;
  }
  .edge.dashed {
    stroke-dasharray: 5 5;
  }
  .edge.lit {
    stroke: var(--accent-2);
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
  .dim {
    opacity: 0.25;
  }
  .elabel {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 0.68rem;
    font-weight: 600;
    padding: 1px 7px;
    border-radius: 6px;
    background: var(--solid);
    border: 1px solid var(--border);
    color: var(--text-2);
    white-space: nowrap;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .group {
    position: absolute;
    border: 1.5px dashed color-mix(in srgb, var(--gc) 60%, transparent);
    background: color-mix(in srgb, var(--gc) 6%, transparent);
    border-radius: 12px;
  }
  .group span {
    position: absolute;
    top: 6px;
    left: 10px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--gc);
  }
  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    background: none;
    border: 0;
    padding: 0;
    transition: opacity 0.2s;
  }
  .tile {
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
      box-shadow 0.25s;
  }
  .node:hover .tile,
  .node.sel .tile {
    transform: translateY(-3px) scale(1.06);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--nc) 22%, transparent),
      0 10px 24px -8px color-mix(in srgb, var(--nc) 80%, transparent);
  }
  .has-note .tile::after {
    content: '';
    position: absolute;
    top: -3px;
    right: -3px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent-2);
    box-shadow: 0 0 0 2px var(--solid);
  }
  .tile {
    position: relative;
  }
  .sel .tile::after {
    display: none;
  }
  .lbl {
    font-size: 0.74rem;
    font-weight: 600;
    white-space: nowrap;
    padding: 1px 6px;
    border-radius: 5px;
    background: color-mix(in srgb, var(--solid) 80%, transparent);
  }
  .note {
    margin-top: 10px;
    padding: 12px 14px;
    border-radius: 11px;
    background: var(--surface-2);
    font-size: 0.92rem;
  }
  .note strong {
    display: block;
    color: var(--accent-2);
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
    padding: 4px 6px 0;
  }
  figcaption {
    font-size: 0.8rem;
    color: var(--text-3);
    padding: 6px 6px 0;
  }
</style>
