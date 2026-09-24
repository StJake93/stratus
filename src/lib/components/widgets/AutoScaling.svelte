<script lang="ts">
  import Range from '../ui/Range.svelte';
  import Icon from '../Icon.svelte';

  const CAP = 100; // req/s one instance can serve at 100% CPU
  let min = $state(2);
  let max = $state(10);
  let target = $state(60);
  let traffic = $state(150);
  let auto = $state(false);

  type Inst = { id: number; warm: number };
  let insts = $state<Inst[]>([{ id: 1, warm: 0 }, { id: 2, warm: 0 }]);
  let hist = $state<{ t: number; c: number }[]>([]);
  let log = $state<string[]>(['Auto Scaling group created with 2 instances.']);
  let nextId = 3;
  let t = 0;
  let calm = 0;

  const ready = $derived(insts.filter((i) => i.warm === 0).length);
  const cpu = $derived(ready ? Math.min(100, (traffic / (ready * CAP)) * 100) : 100);
  const dropped = $derived(Math.max(0, traffic - ready * CAP));

  function push(msg: string) {
    log = [msg, ...log].slice(0, 5);
  }

  $effect(() => {
    const id = setInterval(() => {
      t++;
      if (auto) traffic = Math.round(260 + 220 * Math.sin(t / 9) + 120 * Math.sin(t / 3.3) + (Math.random() - 0.5) * 60);
      traffic = Math.max(20, Math.min(1200, traffic));

      // warm-up: instances take a few ticks to pass health checks
      insts = insts.map((i) => ({ ...i, warm: Math.max(0, i.warm - 1) }));

      const desired = Math.max(min, Math.min(max, Math.ceil(traffic / (CAP * (target / 100)))));
      if (desired > insts.length) {
        const add = desired - insts.length;
        insts = [...insts, ...Array.from({ length: add }, () => ({ id: nextId++, warm: 3 }))];
        push(`Scale out +${add} → ${desired} (CPU above ${target}% target)`);
        calm = 0;
      } else if (desired < insts.length) {
        // scale-in is deliberately slower to avoid flapping
        if (++calm >= 4) {
          insts = insts.slice(0, insts.length - 1);
          push(`Scale in −1 → ${insts.length} (sustained low CPU)`);
          calm = 0;
        }
      } else calm = 0;

      hist = [...hist.slice(-59), { t: traffic, c: insts.filter((i) => i.warm === 0).length * CAP }];
    }, 600);
    return () => clearInterval(id);
  });

  const W = 520;
  const H = 110;
  const peak = $derived(Math.max(400, ...hist.map((h) => Math.max(h.t, h.c))));
  const line = (key: 't' | 'c') => hist.map((h, i) => `${(i / 59) * W},${H - (h[key] / peak) * H}`).join(' ');
</script>

<div class="wbox">
  <div class="whead">
    <span class="wtag">Simulation</span><h4>EC2 Auto Scaling — target tracking</h4>
    <span class="spacer"></span>
    <button class="btn sm" class:primary={auto} onclick={() => (auto = !auto)}><Icon name={auto ? 'pause' : 'play'} size={14} /> {auto ? 'Stop' : 'Simulate a day'}</button>
  </div>

  <div class="cols">
    <div>
      <Range label="Incoming traffic" bind:value={traffic} min={20} max={1200} step={10} format={(v) => `${v} req/s`} />
      <Range label="Target CPU utilisation" bind:value={target} min={20} max={90} format={(v) => `${v}%`} />
      <div class="mm">
        <Range label="Min" bind:value={min} min={1} max={5} />
        <Range label="Max" bind:value={max} min={5} max={16} />
      </div>
    </div>
    <div>
      <div class="fleet">
        {#each insts as i (i.id)}
          <span class="srv" class:warm={i.warm > 0} title={i.warm ? 'Warming up / health checks' : 'In service'}><Icon name="server" size={18} /></span>
        {/each}
      </div>
      <div class="stats">
        <div class="stat"><span>In service</span><b>{ready} / {insts.length}</b></div>
        <div class="stat"><span>Avg CPU</span><b class:hot={cpu > 90}>{cpu.toFixed(0)}%</b></div>
        <div class="stat"><span>Dropped</span><b class:hot={dropped > 0}>{dropped} r/s</b></div>
      </div>
    </div>
  </div>

  <svg viewBox="0 0 {W} {H}" class="chart" preserveAspectRatio="none" aria-label="Traffic vs capacity">
    <polyline points={line('c')} class="cap" />
    <polyline points={line('t')} class="tr" />
  </svg>
  <div class="legend"><span><i class="lt"></i> Traffic</span><span><i class="lc"></i> Healthy capacity</span></div>
  <ul class="log">
    {#each log as l, i (l + i)}<li class:first={i === 0}>{l}</li>{/each}
  </ul>
</div>

<style>
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  @media (max-width: 640px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
  .mm {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .fleet {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 44px;
    margin-bottom: 10px;
  }
  .srv {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--c-compute);
    background: rgba(255, 153, 0, 0.14);
    border: 1px solid rgba(255, 153, 0, 0.4);
    animation: pop 0.35s var(--ease);
  }
  .srv.warm {
    opacity: 0.5;
    border-style: dashed;
    animation: pulse 0.9s infinite alternate;
  }
  @keyframes pop {
    from {
      transform: scale(0.2);
    }
  }
  @keyframes pulse {
    to {
      opacity: 0.25;
    }
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .stats b {
    font-size: 1.1rem !important;
  }
  .hot {
    color: var(--err);
  }
  .chart {
    width: 100%;
    height: 110px;
    margin-top: 14px;
    background: var(--surface);
    border-radius: 10px;
  }
  polyline {
    fill: none;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  .tr {
    stroke: var(--accent-2);
  }
  .cap {
    stroke: var(--c-compute);
    stroke-dasharray: 4 3;
  }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 0.76rem;
    color: var(--text-2);
    margin-top: 6px;
  }
  .legend i {
    display: inline-block;
    width: 14px;
    height: 3px;
    margin-right: 5px;
    vertical-align: middle;
  }
  .lt {
    background: var(--accent-2);
  }
  .lc {
    background: var(--c-compute);
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 10px 0 0;
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-3);
  }
  .log .first {
    color: var(--text);
  }
</style>
