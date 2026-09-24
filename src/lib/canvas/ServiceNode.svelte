<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import Icon from '../components/Icon.svelte';
  import { SERVICE, categoryColor } from '../data/services';
  import { board, type FlowNode } from './board.svelte';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  const s = $derived(SERVICE[data.svc]);
  const color = $derived(categoryColor(s.category));
  const level = $derived(board.worst.get(id));

  const sub = $derived.by(() => {
    const c = data.config;
    switch (data.svc) {
      case 'lambda':
        return `${c.runtime} · ${c.memory}MB`;
      case 'ec2':
        return `${c.type} ×${c.count}`;
      case 'ecs':
        return `${c.tasks} tasks`;
      case 'eks':
        return `k8s ${c.version} · ${c.nodes} nodes`;
      case 'rds':
        return `${c.engine}${c.multiAz ? ' · Multi-AZ' : ''}`;
      case 'sqs':
        return c.fifo ? 'FIFO' : 'standard';
      case 'dynamodb':
        return c.billing === 'PAY_PER_REQUEST' ? 'on-demand' : 'provisioned';
      default:
        return s.name;
    }
  });
</script>

<div class="svc" class:sel={selected} style:--c={color}>
  <Handle type="source" position={Position.Top} id="t" />
  <Handle type="source" position={Position.Left} id="l" />
  <Handle type="source" position={Position.Right} id="r" />
  <Handle type="source" position={Position.Bottom} id="b" />
  <span class="tile"><Icon name={s.icon} size={24} /></span>
  <span class="name">{data.name}</span>
  <span class="sub">{sub}</span>
  {#if level}
    <span class="badge {level}" title="{level === 'error' ? 'Error' : level === 'warn' ? 'Warning' : 'Hint'} — see Issues panel">
      <Icon name={level === 'error' ? 'circle-x' : level === 'warn' ? 'triangle-alert' : 'lightbulb'} size={12} stroke={2.5} />
    </span>
  {/if}
</div>

<style>
  .svc {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    width: 104px;
    padding: 10px 6px 8px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--solid) 92%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--c) 35%, var(--border));
    box-shadow: var(--shadow);
    transition:
      box-shadow 0.2s,
      border-color 0.2s,
      transform 0.2s var(--ease);
    animation: land 0.35s var(--ease);
  }
  @keyframes land {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
  }
  .svc:hover {
    border-color: color-mix(in srgb, var(--c) 70%, transparent);
  }
  .svc.sel {
    border-color: var(--c);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--c) 25%, transparent),
      var(--shadow);
  }
  .tile {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 16%, transparent);
  }
  .name {
    font-size: 0.74rem;
    font-weight: 700;
    max-width: 96px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    font-size: 0.62rem;
    color: var(--text-3);
    max-width: 96px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    position: absolute;
    top: -7px;
    right: -7px;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: white;
    box-shadow: 0 0 0 2px var(--bg);
  }
  .badge.error {
    background: var(--err);
    animation: throb 1.6s infinite;
  }
  .badge.warn {
    background: var(--warn);
    color: #3a2800;
  }
  .badge.hint {
    background: var(--info);
  }
  @keyframes throb {
    50% {
      box-shadow:
        0 0 0 2px var(--bg),
        0 0 0 6px rgba(248, 113, 113, 0.3);
    }
  }
  .svc :global(.svelte-flow__handle) {
    width: 10px;
    height: 10px;
    background: var(--solid);
    border: 2px solid var(--c);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .svc:hover :global(.svelte-flow__handle),
  .svc.sel :global(.svelte-flow__handle),
  :global(.svelte-flow.connecting) .svc :global(.svelte-flow__handle) {
    opacity: 1;
  }
</style>
