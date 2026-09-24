<script lang="ts">
  import { NodeResizer, type NodeProps } from '@xyflow/svelte';
  import Icon from '../components/Icon.svelte';
  import { board, type FlowNode } from './board.svelte';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  const isVpc = $derived(data.svc === 'vpc');
  const pub = $derived(data.config.public === true);
  const level = $derived(board.worst.get(id));
  const color = $derived(isVpc ? 'var(--c-network)' : pub ? '#34d399' : '#60a5fa');
</script>

<NodeResizer minWidth={isVpc ? 300 : 160} minHeight={isVpc ? 200 : 110} isVisible={selected} lineStyle="border-color: {color}" handleStyle="background: {color}; width: 9px; height: 9px; border-radius: 3px;" />
<div class="grp" class:vpc={isVpc} class:sel={selected} style:--gc={color}>
  <div class="label">
    <Icon name={isVpc ? 'network' : pub ? 'globe' : 'lock'} size={13} />
    <strong>{data.name}</strong>
    <span>{data.config.cidr}</span>
    {#if !isVpc}<span class="az">AZ {data.config.az}</span>{/if}
    {#if !isVpc}<span class="kind">{pub ? 'public' : 'private'}</span>{/if}
    {#if level === 'error' || level === 'warn'}
      <span class="lvl {level}"><Icon name={level === 'error' ? 'circle-x' : 'triangle-alert'} size={12} /></span>
    {/if}
  </div>
</div>

<style>
  .grp {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    border: 1.5px dashed color-mix(in srgb, var(--gc) 60%, transparent);
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
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 8px 10px;
    padding: 3px 9px;
    border-radius: 8px;
    font-size: 0.72rem;
    background: color-mix(in srgb, var(--gc) 16%, var(--solid));
    color: var(--gc);
    white-space: nowrap;
  }
  .label strong {
    color: var(--text);
  }
  .label span {
    font-family: var(--mono);
    font-size: 0.66rem;
    opacity: 0.85;
  }
  .kind {
    text-transform: uppercase;
    font-family: var(--font) !important;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .lvl {
    display: grid;
  }
  .lvl.error {
    color: var(--err);
  }
  .lvl.warn {
    color: var(--warn);
  }
</style>
