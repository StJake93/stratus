<script lang="ts">
  import Range from '../ui/Range.svelte';

  let mem = $state(512);
  let dur = $state(120);
  let invLog = $state(50); // 0..100 → 1k .. 1B per month
  let arm = $state(true);
  let free = $state(true);
  let rpsLog = $state(40); // 0..100 → 1 .. 10k req/s

  const inv = $derived(Math.round(10 ** (3 + (invLog / 100) * 6)));
  const rps = $derived(Math.round(10 ** ((rpsLog / 100) * 4)));

  // us-east-1 list prices (see AWS Lambda pricing page for current figures).
  const rate = $derived(arm ? 0.0000133334 : 0.0000166667);
  const gbs = $derived(inv * (dur / 1000) * (mem / 1024));
  const reqCost = $derived((Math.max(0, inv - (free ? 1e6 : 0)) / 1e6) * 0.2);
  const compCost = $derived(Math.max(0, gbs - (free ? 400000 : 0)) * rate);
  const total = $derived(reqCost + compCost);

  const conc = $derived(Math.ceil(rps * (dur / 1000)));
  const limit = 1000;

  const money = (n: number) => (n < 0.01 && n > 0 ? '< $0.01' : n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }));
  const big = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(n));
</script>

<div class="wbox">
  <div class="whead"><span class="wtag">Interactive</span><h4>Lambda cost &amp; concurrency lab</h4></div>
  <div class="cols">
    <div>
      <Range label="Memory" bind:value={mem} min={128} max={10240} step={64} format={(v) => `${v} MB`} />
      <Range label="Average duration" bind:value={dur} min={1} max={5000} format={(v) => `${v} ms`} />
      <Range label="Invocations / month" bind:value={invLog} min={0} max={100} format={() => big(inv)} />
      <div class="toggles">
        <label><input type="checkbox" bind:checked={arm} /> arm64 (Graviton)</label>
        <label><input type="checkbox" bind:checked={free} /> Apply free tier</label>
      </div>
    </div>
    <div class="out">
      <div class="stat hero"><span>Estimated monthly cost</span><b>{money(total)}</b></div>
      <div class="split">
        <div class="stat"><span>Requests</span><b>{money(reqCost)}</b></div>
        <div class="stat"><span>Compute</span><b>{money(compCost)}</b></div>
      </div>
      <div class="stat"><span>Compute used</span><b>{big(Math.round(gbs))} GB-s</b></div>
    </div>
  </div>

  <hr />
  <Range label="Peak traffic" bind:value={rpsLog} min={0} max={100} format={() => `${big(rps)} req/s`} />
  <div class="conc">
    <div class="bar"><span style:width="{Math.min(100, (conc / limit) * 100)}%" class:over={conc > limit}></span></div>
    <div class="row">
      <strong class:bad={conc > limit}>{conc.toLocaleString()} concurrent executions</strong>
      <span class="spacer"></span>
      <span class="faint">default account limit ≈ {limit.toLocaleString()}</span>
    </div>
    <p class="faint small">Concurrency ≈ requests per second × average duration in seconds. {conc > limit ? 'Above the limit, extra requests are throttled (HTTP 429) — request a quota increase, shorten duration, or buffer with SQS.' : 'Shorter functions need less concurrency for the same traffic.'}</p>
  </div>
  <p class="faint small">Prices are illustrative us-east-1 list prices — always check the <a href="https://aws.amazon.com/lambda/pricing/" target="_blank" rel="noopener">Lambda pricing page</a>.</p>
</div>

<style>
  .cols {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 20px;
  }
  @media (max-width: 640px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }
  .toggles {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-2);
  }
  .toggles input {
    accent-color: var(--accent);
  }
  .out {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .hero b {
    font-size: 1.9rem;
    background: var(--grad);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  hr {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 16px 0;
  }
  .bar {
    height: 10px;
    border-radius: 10px;
    background: var(--surface-3);
    overflow: hidden;
    margin-bottom: 8px;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--grad);
    border-radius: 10px;
    transition: width 0.3s var(--ease);
  }
  .bar span.over {
    background: var(--err);
  }
  .bad {
    color: var(--err);
  }
  .small {
    font-size: 0.8rem;
    margin: 6px 0 0;
  }
</style>
