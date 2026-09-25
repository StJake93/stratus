<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Range from '../ui/Range.svelte';
  import Icon from '../Icon.svelte';
  import { settings } from '../../stores/settings.svelte';

  let produce = $state(30); // msgs per tick-second
  let consumers = $state(2);
  let failPct = $state(5);
  let useQueue = $state(true);

  const PER = 10; // msgs each consumer handles per second
  let depth = $state(0);
  let done = $state(0);
  let errors = $state(0);
  let dlq = $state(0);
  let hist = $state<number[]>([]);
  let burst = 0;
  // Auto-updating, so it can be paused (WCAG 2.2.2); starts paused if the user prefers less motion.
  let running = $state(!settings.reduced);

  $effect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const incoming = produce + (burst > 0 ? 60 : 0);
      if (burst > 0) burst--;
      const capacity = consumers * PER;
      if (useQueue) {
        depth += incoming;
        const take = Math.min(depth, capacity);
        depth -= take;
        const failed = Math.round(take * (failPct / 100));
        // failed messages become visible again; ~1/3 exceed maxReceiveCount → DLQ
        const toDlq = Math.round(failed / 3);
        dlq += toDlq;
        depth += failed - toDlq;
        done += take - failed;
      } else {
        const served = Math.min(incoming, capacity);
        errors += incoming - served + Math.round(served * (failPct / 100));
        done += served - Math.round(served * (failPct / 100));
      }
      hist = [...hist.slice(-49), depth];
    }, 500);
    return () => clearInterval(t);
  });

  function reset() {
    depth = done = errors = dlq = 0;
    hist = [];
  }
  const peak = $derived(Math.max(50, ...hist));
  const visible = $derived(Math.min(40, Math.ceil(depth / 5)));
</script>

<WidgetFrame kind="Simulation" title="Decoupling with a queue">
  {#snippet actions()}
    <div class="seg" role="group" aria-label="Architecture">
      <button aria-pressed={!useQueue} onclick={() => ((useQueue = false), reset())}>Direct calls</button>
      <button aria-pressed={useQueue} onclick={() => ((useQueue = true), reset())}>With SQS</button>
    </div>
    <button class="btn sm" onclick={() => (running = !running)}><Icon name={running ? 'pause' : 'play'} size={14} /> {running ? 'Pause' : 'Resume'}<span class="sr-only"> simulation</span></button>
  {/snippet}

  <div class="pipe" aria-hidden="true">
    <div class="box prod"><Icon name="users" size={18} /><span>Producers</span><small>{produce}/s</small></div>
    <div class="flowline" class:fast={produce > consumers * PER} class:paused={!running}></div>
    {#if useQueue}
      <div class="queue">
        <div class="msgs">{#each Array(visible) as _, i (i)}<i></i>{/each}</div>
        <span>SQS · {depth.toLocaleString()} waiting</span>
      </div>
      <div class="flowline" class:paused={!running}></div>
    {/if}
    <div class="box cons"><Icon name="lambda" size={18} /><span>Consumers ×{consumers}</span><small>{consumers * PER}/s max</small></div>
  </div>
  <p class="sr-only">Producers send {produce} messages per second{useQueue ? ' into an SQS queue' : ' directly'} to {consumers} consumer{consumers === 1 ? '' : 's'} that can handle {consumers * PER} per second in total.</p>

  <div class="ctls">
    <Range label="Producer rate" bind:value={produce} min={0} max={80} format={(v) => `${v} msg/s`} valuetext={(v) => `${v} messages per second`} />
    <Range label="Consumers" bind:value={consumers} min={1} max={8} />
    <Range label="Processing failure rate" bind:value={failPct} min={0} max={50} format={(v) => `${v}%`} />
  </div>
  <div class="row">
    <button class="btn sm" onclick={() => ((burst = 6), (running = true))}><Icon name="zap" size={14} /> Traffic spike</button>
    <button class="btn sm ghost" onclick={reset}><Icon name="rotate-ccw" size={14} /> Reset<span class="sr-only"> counters</span></button>
    {#if !running}<span class="chip">Paused</span>{/if}
  </div>

  <div class="stats">
    <div class="stat"><span>Processed</span><b>{done.toLocaleString()}</b></div>
    {#if useQueue}
      <div class="stat"><span>Queue depth</span><b>{depth.toLocaleString()}</b></div>
      <div class="stat"><span>Dead-letter queue</span><b class:warn={dlq > 0}>{dlq}</b></div>
    {:else}
      <div class="stat"><span>Errors or dropped</span><b class:bad={errors > 0}>{errors.toLocaleString()}</b></div>
    {/if}
  </div>
  {#if useQueue}
    <svg viewBox="0 0 500 60" class="spark" preserveAspectRatio="none" role="img" aria-label="Queue depth over the last 25 seconds, currently {depth.toLocaleString()} messages.">
      <polyline points={hist.map((d, i) => `${(i / 49) * 500},${60 - (d / peak) * 56}`).join(' ')} />
    </svg>
    <p class="faint small">The queue absorbs spikes: nothing is lost, it just waits. Watch <strong>ApproximateAgeOfOldestMessage</strong> and scale consumers when the backlog grows. Messages that keep failing land in the DLQ for inspection.</p>
  {:else}
    <p class="faint small">Without a buffer, every request beyond consumer capacity fails immediately and failed work is simply lost. Try a traffic spike.</p>
  {/if}
</WidgetFrame>

<style>
  .pipe {
    display: flex;
    align-items: center;
    gap: 0;
    margin: 6px 0 16px;
  }
  .box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 12px;
    min-width: 110px;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .box small {
    font-family: var(--mono);
    font-weight: 400;
    color: var(--text-2);
  }
  .prod {
    background: rgba(148, 163, 184, 0.14);
  }
  .cons {
    background: rgba(255, 153, 0, 0.14);
    color: var(--c-compute);
  }
  .cons span {
    color: var(--text);
  }
  .flowline {
    flex: 1;
    height: 3px;
    min-width: 20px;
    background: repeating-linear-gradient(90deg, var(--accent-2) 0 8px, transparent 8px 16px);
    background-size: 32px 3px;
    animation: move 0.8s linear infinite;
  }
  .flowline.fast {
    animation-duration: 0.3s;
  }
  .flowline.paused {
    animation-play-state: paused;
  }
  @keyframes move {
    to {
      background-position: 32px 0;
    }
  }
  .queue {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border-radius: 12px;
    border: 1.5px solid var(--c-integration);
    background: rgba(224, 72, 143, 0.08);
    min-width: 140px;
  }
  .queue span {
    font-size: 0.76rem;
    font-weight: 700;
    color: color-mix(in oklab, var(--c-integration), var(--ink) var(--ink-mix));
    text-align: center;
  }
  .msgs {
    display: flex;
    flex-wrap: wrap-reverse;
    gap: 2px;
    min-height: 22px;
    justify-content: flex-end;
  }
  .msgs i {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--c-integration);
  }
  .ctls {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  @media (max-width: 640px) {
    .ctls {
      grid-template-columns: 1fr;
    }
    .pipe {
      flex-wrap: wrap;
    }
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 12px;
  }
  .stats b {
    font-size: 1.1rem !important;
  }
  .bad {
    color: var(--err-fg);
  }
  .warn {
    color: var(--warn-fg);
  }
  .spark {
    width: 100%;
    height: 60px;
    margin-top: 10px;
    border-radius: 8px;
    background: var(--surface);
  }
  .spark polyline {
    fill: none;
    stroke: var(--c-integration);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  .small {
    font-size: 0.8rem;
    margin: 8px 0 0;
  }
</style>
