<script lang="ts">
  import Range from '../ui/Range.svelte';

  // Illustrative relative figures — see the S3 pricing page for real numbers.
  const classes = [
    { id: 'STANDARD', name: 'S3 Standard', store: 0.023, retrieval: 'Instant (ms)', min: '—', fee: 'None', use: 'Frequently accessed, active data' },
    { id: 'INTELLIGENT_TIERING', name: 'Intelligent-Tiering', store: 0.0125, retrieval: 'Instant (ms)', min: '—', fee: 'Small monitoring fee', use: 'Unknown or changing access patterns' },
    { id: 'STANDARD_IA', name: 'Standard-IA', store: 0.0125, retrieval: 'Instant (ms)', min: '30 days', fee: 'Per-GB retrieval', use: 'Accessed ~monthly, needs fast access' },
    { id: 'ONEZONE_IA', name: 'One Zone-IA', store: 0.01, retrieval: 'Instant (ms)', min: '30 days', fee: 'Per-GB retrieval', use: 'Re-creatable infrequent data (single AZ)' },
    { id: 'GLACIER_IR', name: 'Glacier Instant Retrieval', store: 0.004, retrieval: 'Instant (ms)', min: '90 days', fee: 'Higher per-GB retrieval', use: 'Archives read ~quarterly' },
    { id: 'GLACIER_FR', name: 'Glacier Flexible Retrieval', store: 0.0036, retrieval: 'Minutes – 12 h', min: '90 days', fee: 'Per-GB + per-request', use: 'Backups, DR copies' },
    { id: 'DEEP_ARCHIVE', name: 'Glacier Deep Archive', store: 0.00099, retrieval: '12 – 48 h', min: '180 days', fee: 'Per-GB + per-request', use: 'Compliance archives kept for years' }
  ];

  let freq = $state(3); // 0 = constantly … 6 = almost never
  let predictable = $state(true);
  let reproducible = $state(false);

  const freqLabels = ['Many times a day', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Almost never'];

  const pick = $derived.by(() => {
    if (!predictable) return 'INTELLIGENT_TIERING';
    if (freq <= 2) return 'STANDARD';
    if (freq === 3) return reproducible ? 'ONEZONE_IA' : 'STANDARD_IA';
    if (freq === 4) return 'GLACIER_IR';
    if (freq === 5) return 'GLACIER_FR';
    return 'DEEP_ARCHIVE';
  });
  const maxStore = classes[0].store;
</script>

<div class="wbox">
  <div class="whead"><span class="wtag">Interactive</span><h4>Pick an S3 storage class</h4></div>
  <Range label="How often is the data read?" bind:value={freq} min={0} max={6} format={(v) => freqLabels[v]} />
  <div class="toggles">
    <label><input type="checkbox" bind:checked={predictable} /> Access pattern is predictable</label>
    <label><input type="checkbox" bind:checked={reproducible} /> Data can be re-created if lost</label>
  </div>
  <div class="list">
    {#each classes as c}
      <div class="cls" class:on={c.id === pick}>
        <div class="name">
          <strong>{c.name}</strong>
          <small>{c.use}</small>
        </div>
        <div class="bar" title="Relative storage cost"><span style:width="{(c.store / maxStore) * 100}%"></span></div>
        <div class="meta"><span>{c.retrieval}</span><span>min {c.min}</span></div>
      </div>
    {/each}
  </div>
  <p class="faint small">Bars show relative per-GB storage price. Cheaper storage trades off retrieval time, retrieval fees and minimum storage duration. Use <strong>lifecycle rules</strong> to move objects between classes automatically.</p>
</div>

<style>
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-2);
    margin-bottom: 12px;
  }
  .toggles input {
    accent-color: var(--accent);
  }
  .list {
    display: grid;
    gap: 6px;
  }
  .cls {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 12px;
    align-items: center;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    transition: all 0.3s var(--ease);
    opacity: 0.55;
  }
  .cls.on {
    opacity: 1;
    border-color: var(--c-storage);
    background: rgba(63, 185, 80, 0.1);
    transform: scale(1.01);
  }
  .name strong {
    display: block;
    font-size: 0.88rem;
  }
  .name small {
    color: var(--text-3);
    font-size: 0.76rem;
  }
  .bar {
    height: 8px;
    border-radius: 8px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--c-storage);
  }
  .meta {
    display: flex;
    flex-direction: column;
    font-size: 0.74rem;
    color: var(--text-2);
    font-family: var(--mono);
  }
  .small {
    font-size: 0.8rem;
    margin: 10px 0 0;
  }
  @media (max-width: 600px) {
    .cls {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }
</style>
