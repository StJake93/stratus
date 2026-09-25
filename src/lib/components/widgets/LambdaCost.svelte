<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Range from '../ui/Range.svelte';

  let mem = $state(512);
  let dur = $state(120);
  let invLog = $state(50); // 0..100 → 1k .. 1B per month
  let arm = $state(true);
  let free = $state(true);
  let rpsLog = $state(40); // 0..100 → 1 .. 10k req/s

  const inv = $derived(Math.round(10 ** (3 + (invLog / 100) * 6)));
  const rps = $derived(Math.round(10 ** ((rpsLog / 100) * 4)));

  // us-east-1 list prices (see the AWS Lambda pricing page for current figures).
  const rate = $derived(arm ? 0.0000133334 : 0.0000166667);
  const gbs = $derived(inv * (dur / 1000) * (mem / 1024));
  const reqCost = $derived((Math.max(0, inv - (free ? 1e6 : 0)) / 1e6) * 0.2);
  const compCost = $derived(Math.max(0, gbs - (free ? 400000 : 0)) * rate);
  const total = $derived(reqCost + compCost);

  const conc = $derived(Math.ceil(rps * (dur / 1000)));
  const limit = 1000;

  const money = (n: number) => (n < 0.01 && n > 0 ? 'under $0.01' : n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }));
  const big = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(n));
  const spoken = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : n.toLocaleString());
</script>

<WidgetFrame title="Lambda cost and concurrency lab">
  <div class="cols">
    <div>
      <Range label="Memory" bind:value={mem} min={128} max={10240} step={64} format={(v) => `${v} MB`} />
      <Range label="Average duration" bind:value={dur} min={1} max={5000} format={(v) => `${v} ms`} valuetext={(v) => `${v} milliseconds`} />
      <Range label="Invocations per month" bind:value={invLog} min={0} max={100} format={() => big(inv)} valuetext={() => `${spoken(inv)} invocations`} />
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
  <p class="sr-only" aria-live="polite">Estimated monthly cost {money(total)}: requests {money(reqCost)}, compute {money(compCost)}.</p>

  <hr />
  <Range label="Peak traffic" bind:value={rpsLog} min={0} max={100} format={() => `${big(rps)} req/s`} valuetext={() => `${spoken(rps)} requests per second`} />
  <div class="conc">
    <div class="bar" role="meter" aria-label="Concurrent executions compared with the default account limit" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(conc, limit)} aria-valuetext="{conc.toLocaleString()} of {limit.toLocaleString()}">
      <span style:width="{Math.min(100, (conc / limit) * 100)}%" class:over={conc > limit}></span>
    </div>
    <div class="row">
      <strong class:bad={conc > limit}>{conc.toLocaleString()} concurrent executions{conc > limit ? ' (throttled)' : ''}</strong>
      <span class="spacer"></span>
      <span class="faint">default account limit ≈ {limit.toLocaleString()}</span>
    </div>
    <p class="faint small" aria-live="polite">
      Concurrency is roughly requests per second × average duration in seconds. {conc > limit
        ? 'Above the limit, extra requests are throttled with HTTP 429. Request a quota increase, shorten the duration, or buffer requests with SQS.'
        : 'Shorter functions need less concurrency for the same traffic.'}
    </p>
  </div>
  <p class="faint small">
    Prices are illustrative us-east-1 list prices. Always check the <a class="lnk" href="https://aws.amazon.com/lambda/pricing/" target="_blank" rel="noopener">Lambda pricing page<span class="sr-only"> (opens in a new tab)</span></a>.
  </p>
</WidgetFrame>

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
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.86rem;
    color: var(--text-2);
  }
  .toggles label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
  }
  .out {
    display: grid;
    gap: 8px;
    align-content: start;
  }
  .hero b {
    font-size: 1.9rem;
    background: var(--grad-text);
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
    background: var(--track);
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
    background: var(--err-strong);
  }
  .bad {
    color: var(--err-fg);
  }
  .small {
    font-size: 0.82rem;
    margin: 6px 0 0;
  }
</style>
