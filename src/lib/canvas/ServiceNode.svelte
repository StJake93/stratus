<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import Icon from '../components/Icon.svelte';
  import { SERVICE, categoryColor } from '../data/services';
  import { board, type FlowNode } from './board.svelte';

  let { id, data, selected }: NodeProps<FlowNode> = $props();
  const s = $derived(SERVICE[data.svc]);
  const color = $derived(categoryColor(s.category));
  const level = $derived(board.worst.get(id));

  // Handles that currently carry a connection stay visible, so you can see exactly where each connector attaches.
  const used = $derived(
    new Set(board.edges.flatMap((e) => (e.source === id ? [e.sourceHandle] : e.target === id ? [e.targetHandle] : [])).filter(Boolean) as string[])
  );

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

<!--
  The handles live on this static outer box. The entrance animation runs on .inner only:
  Svelte Flow measures handle positions when the node mounts, and measuring mid-animation
  (while scaled down) is what made connectors end inside the node instead of on its border.
-->
<div class="svc" class:sel={selected} style:--c={color}>
  <Handle type="source" position={Position.Top} id="t" class={used.has('t') ? 'used' : ''} />
  <Handle type="source" position={Position.Left} id="l" class={used.has('l') ? 'used' : ''} />
  <Handle type="source" position={Position.Right} id="r" class={used.has('r') ? 'used' : ''} />
  <Handle type="source" position={Position.Bottom} id="b" class={used.has('b') ? 'used' : ''} />
  <div class="inner">
    <span class="tile"><Icon name={s.icon} size={24} /></span>
    <span class="name">{data.name}</span>
    <span class="sub">{sub}</span>
  </div>
  {#if level}
    <span class="badge {level}" title="{level === 'error' ? 'Error' : level === 'warn' ? 'Warning' : 'Hint'}: see the Issues tab">
      <Icon name={level === 'error' ? 'circle-x' : level === 'warn' ? 'triangle-alert' : 'lightbulb'} size={12} stroke={2.5} />
    </span>
  {/if}
</div>

<style>
  .svc {
    position: relative;
    width: 108px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--solid) 94%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--c) 45%, var(--border-strong));
    box-shadow: var(--shadow);
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
  }
  .svc:hover {
    border-color: color-mix(in srgb, var(--c) 80%, transparent);
  }
  .svc.sel {
    border-color: var(--c);
    box-shadow:
      0 0 0 3px var(--focus),
      var(--shadow);
  }
  .inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 6px 8px;
    animation: land 0.35s var(--ease);
  }
  @keyframes land {
    from {
      transform: scale(0.7);
      opacity: 0;
    }
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
    font-size: 0.76rem;
    font-weight: 700;
    max-width: 98px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    font-size: 0.66rem;
    color: var(--text-2);
    max-width: 98px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #ffffff;
    box-shadow: 0 0 0 2px var(--bg);
  }
  .badge.error {
    background: var(--err-strong);
    animation: throb 1.6s infinite;
  }
  .badge.warn {
    background: var(--warn);
    color: #3a2800;
  }
  .badge.hint {
    background: var(--info-strong);
  }
  @keyframes throb {
    50% {
      box-shadow:
        0 0 0 2px var(--bg),
        0 0 0 6px rgba(220, 38, 38, 0.3);
    }
  }
  /* Handles: a 12px circle centred on the border, with a larger invisible hit area around it. */
  .svc :global(.svelte-flow__handle) {
    width: 12px;
    height: 12px;
    min-width: 0;
    min-height: 0;
    background: var(--solid);
    border: 2px solid var(--c);
    opacity: 0;
    transition:
      opacity 0.15s,
      scale 0.15s;
  }
  .svc :global(.svelte-flow__handle::before) {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
  }
  .svc :global(.svelte-flow__handle.used) {
    opacity: 1;
    background: var(--c);
    border-color: var(--solid);
  }
  .svc:hover :global(.svelte-flow__handle),
  .svc.sel :global(.svelte-flow__handle),
  :global(.svelte-flow.connecting) .svc :global(.svelte-flow__handle) {
    opacity: 1;
  }
  /* `scale` composes with Svelte Flow's per-side translate, so handles stay centred on the border. */
  .svc :global(.svelte-flow__handle:hover) {
    scale: 1.3;
  }
</style>
