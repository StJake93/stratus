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
    <div class="loading" role="status"><span class="sr-only">Loading interactive…</span></div>
  {:then mod}
    <mod.default />
  {:catch}
    <p class="faint" role="alert">This interactive failed to load. Try refreshing the page.</p>
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
</style>
