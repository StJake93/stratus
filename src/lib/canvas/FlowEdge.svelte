<script lang="ts">
  import { BaseEdge, EdgeLabel, getSmoothStepPath, type EdgeProps } from '@xyflow/svelte';
  import { board } from './board.svelte';

  let { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, selected, markerEnd }: EdgeProps = $props();

  const geo = $derived(getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14 }));
  const path = $derived(geo[0]);
</script>

<BaseEdge {id} {path} {markerEnd} class="flow-edge {selected ? 'sel' : ''}" interactionWidth={18} />
<circle r="3.5" class="pkt">
  <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
</circle>
{#if label}
  <EdgeLabel x={geo[1]} y={geo[2]} class="flow-label {selected ? 'sel' : ''}">
    {label}
    {#if selected}
      <button class="del" onclick={() => board.removeEdge(id)} aria-label="Delete connection">×</button>
    {/if}
  </EdgeLabel>
{/if}

<style>
  :global(.flow-edge) {
    stroke: color-mix(in srgb, var(--accent-2) 55%, var(--border-strong)) !important;
    stroke-width: 1.8 !important;
  }
  :global(.flow-edge.sel) {
    stroke: var(--accent-2) !important;
    stroke-width: 2.5 !important;
  }
  .pkt {
    fill: var(--accent-2);
    filter: drop-shadow(0 0 4px var(--accent-2));
  }
  :global(.flow-label) {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 6px;
    background: var(--solid) !important;
    border: 1px solid var(--border);
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  :global(.flow-label.sel) {
    border-color: var(--accent-2);
    color: var(--text);
  }
  .del {
    border: 0;
    background: var(--err);
    color: white;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 12px;
    line-height: 1;
    padding: 0;
    pointer-events: all;
  }
</style>
