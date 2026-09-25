<script lang="ts">
  import { NodeResizer, type NodeProps } from '@xyflow/svelte';
  import Icon from '../components/Icon.svelte';
  import { board, type FlowNode } from './board.svelte';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  const isVpc = $derived(data.svc === 'vpc');
  const pub = $derived(data.config.public === true);
  const level = $derived(board.worst.get(id));
  // --gc colours the border and tint; --gfg is the text-safe version for the label.
  const color = $derived(isVpc ? 'var(--c-network)' : pub ? 'var(--ok)' : 'var(--info)');
  const fg = $derived(isVpc ? 'color-mix(in oklab, var(--c-network), var(--ink) var(--ink-mix))' : pub ? 'var(--ok-fg)' : 'var(--info-fg)');
</script>

<NodeResizer minWidth={isVpc ? 300 : 160} minHeight={isVpc ? 200 : 110} isVisible={selected} lineStyle="border-color: {color}" handleStyle="background: {color}; width: 10px; height: 10px; border-radius: 3px;" />
<div class="grp" class:vpc={isVpc} class:sel={selected} style:--gc={color} style:--gfg={fg}>
  <div class="label">
    <Icon name={isVpc ? 'network' : pub ? 'globe' : 'lock'} size={13} />
    <strong>{data.name}</strong>
    <span class="mono">{data.config.cidr}</span>
    {#if !isVpc}<span class="mono">AZ {data.config.az}</span>{/if}
    {#if !isVpc}<span class="kind">{pub ? 'public' : 'private'}</span>{/if}
    {#if level === 'error' || level === 'warn'}
      <span class="lvl {level}" title={level === 'error' ? 'Error: see the Issues tab' : 'Warning: see the Issues tab'}><Icon name={level === 'error' ? 'circle-x' : 'triangle-alert'} size={13} /></span>
    {/if}
  </div>
</div>

<style>
  .grp {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    border: 1.5px dashed color-mix(in srgb, var(--gc) 70%, transparent);
    background: color-mix(in srgb, var(--gc) 5%, transparent);
    transition:
      background 0.2s,
      border-color 0.2s;
  }
  .grp.vpc {
    border-style: solid;
    border-width: 2px;
    background: color-mix(in srgb, var(--gc) 4%, transparent);
  }
  .grp.sel {
    background: color-mix(in srgb, var(--gc) 9%, transparent);
    box-shadow: 0 0 0 3px var(--focus);
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 8px 10px;
    padding: 3px 9px;
    border-radius: 8px;
    font-size: 0.74rem;
    background: var(--solid);
    border: 1px solid color-mix(in srgb, var(--gc) 45%, transparent);
    color: var(--gfg);
    white-space: nowrap;
  }
  .label strong {
    color: var(--text);
  }
  .mono {
    font-family: var(--mono);
    font-size: 0.7rem;
  }
  .kind {
    text-transform: uppercase;
    font-weight: 800;
    font-size: 0.68rem;
    letter-spacing: 0.06em;
  }
  .lvl {
    display: grid;
  }
  .lvl.error {
    color: var(--err-fg);
  }
  .lvl.warn {
    color: var(--warn-fg);
  }
</style>
