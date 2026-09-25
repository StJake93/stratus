<script lang="ts">
  import { BaseEdge, EdgeLabel, getSmoothStepPath, type EdgeProps } from '@xyflow/svelte';
  import { board } from './board.svelte';
  import { settings } from '../stores/settings.svelte';

  let { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, selected, markerEnd }: EdgeProps = $props();

  const geo = $derived(getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14, offset: 18 }));
  const path = $derived(geo[0]);
</script>

<BaseEdge {id} {path} {markerEnd} class="flow-edge {selected ? 'sel' : ''}" interactionWidth={20} />
{#if !settings.reduced}
  <circle r="3.5" class="pkt" aria-hidden="true">
    <animateMotion dur="2.4s" repeatCount="indefinite" {path} />
  </circle>
{/if}
{#if label}
  <EdgeLabel x={geo[1]} y={geo[2]} class="flow-label {selected ? 'sel' : ''}">
    <span>{label}</span>
    {#if selected}
      <button class="del" onclick={() => board.removeEdge(id)} aria-label="Delete this connection">×</button>
    {/if}
  </EdgeLabel>
{/if}

<style>
  :global(.flow-edge) {
    stroke: color-mix(in srgb, var(--accent-2-fg) 70%, var(--text-3)) !important;
    stroke-width: 2 !important;
  }
  :global(.flow-edge.sel) {
    stroke: var(--focus) !important;
    stroke-width: 3 !important;
  }
  .pkt {
    fill: var(--accent-2);
    filter: drop-shadow(0 0 4px var(--accent-2));
  }
  :global(.flow-label) {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--solid) !important;
    border: 1px solid var(--border-strong);
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  :global(.flow-label.sel) {
    border-color: var(--focus);
    color: var(--text);
  }
  .del {
    border: 0;
    background: var(--err-strong);
    color: #ffffff;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    pointer-events: all;
  }
</style>
