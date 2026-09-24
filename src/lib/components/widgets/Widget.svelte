<script lang="ts">
  import type { Component } from 'svelte';
  import type { WidgetId } from '../../data/types';

  let { id }: { id: WidgetId } = $props();

  // Each widget is code-split so a lesson only downloads the interactives it uses.
  const loaders: Record<WidgetId, () => Promise<{ default: Component }>> = {
    'shared-responsibility': () => import('./SharedResponsibility.svelte'),
    cidr: () => import('./Cidr.svelte'),
    'lambda-cost': () => import('./LambdaCost.svelte'),
    autoscaling: () => import('./AutoScaling.svelte'),
    's3-classes': () => import('./S3Classes.svelte'),
    'k8s-scheduler': () => import('./K8sScheduler.svelte'),
    'tf-workflow': () => import('./TfWorkflow.svelte'),
    'tf-drift': () => import('./TfDrift.svelte'),
    'tf-foreach': () => import('./TfForEach.svelte'),
    'iam-eval': () => import('./IamEval.svelte'),
    'sg-nacl': () => import('./SgNacl.svelte'),
    'region-latency': () => import('./RegionLatency.svelte'),
    'queue-sim': () => import('./QueueSim.svelte')
  };
</script>

<div class="widget">
  {#await loaders[id]()}
    <div class="loading"><span></span></div>
  {:then mod}
    <mod.default />
  {:catch}
    <p class="faint">This interactive failed to load.</p>
  {/await}
</div>

<style>
  .widget {
    margin: 16px 0 20px;
  }
  .loading {
    height: 180px;
    border-radius: var(--radius-lg);
    background: linear-gradient(90deg, var(--surface) 0%, var(--surface-2) 50%, var(--surface) 100%) 0 0 / 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  .widget :global(.wbox) {
    padding: 18px 20px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    background:
      radial-gradient(100% 80% at 100% 0%, rgba(124, 92, 255, 0.1), transparent 60%),
      var(--surface);
  }
  .widget :global(.whead) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .widget :global(.whead h4) {
    margin: 0;
    font-size: 1rem;
  }
  .widget :global(.wtag) {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent-2);
    background: rgba(34, 211, 238, 0.1);
    padding: 3px 8px;
    border-radius: 6px;
  }
  .widget :global(.ctl) {
    display: grid;
    gap: 4px;
    margin-bottom: 12px;
  }
  .widget :global(.ctl label) {
    display: flex;
    justify-content: space-between;
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .widget :global(.ctl output) {
    font-family: var(--mono);
    color: var(--text);
  }
  .widget :global(.stat) {
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .widget :global(.stat b) {
    display: block;
    font-size: 1.3rem;
    letter-spacing: -0.02em;
  }
  .widget :global(.stat span) {
    font-size: 0.76rem;
    color: var(--text-3);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
