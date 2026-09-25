<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Range from '../ui/Range.svelte';
  import Icon from '../Icon.svelte';

  // Illustrative relative figures. See the S3 pricing page for real numbers.
  const classes = [
    { id: 'STANDARD', name: 'S3 Standard', store: 0.023, retrieval: 'Instant (ms)', min: 'None', use: 'Frequently accessed, active data' },
    { id: 'INTELLIGENT_TIERING', name: 'Intelligent-Tiering', store: 0.0125, retrieval: 'Instant (ms)', min: 'None', use: 'Unknown or changing access patterns' },
    { id: 'STANDARD_IA', name: 'Standard-IA', store: 0.0125, retrieval: 'Instant (ms)', min: '30 days', use: 'Accessed about monthly, needs fast access' },
    { id: 'ONEZONE_IA', name: 'One Zone-IA', store: 0.01, retrieval: 'Instant (ms)', min: '30 days', use: 'Re-creatable infrequent data (single AZ)' },
    { id: 'GLACIER_IR', name: 'Glacier Instant Retrieval', store: 0.004, retrieval: 'Instant (ms)', min: '90 days', use: 'Archives read about quarterly' },
    { id: 'GLACIER_FR', name: 'Glacier Flexible Retrieval', store: 0.0036, retrieval: 'Minutes to 12 h', min: '90 days', use: 'Backups and DR copies' },
    { id: 'DEEP_ARCHIVE', name: 'Glacier Deep Archive', store: 0.00099, retrieval: '12 to 48 h', min: '180 days', use: 'Compliance archives kept for years' }
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
  const chosen = $derived(classes.find((c) => c.id === pick)!);
  const maxStore = classes[0].store;
</script>

<WidgetFrame title="Pick an S3 storage class">
  <Range label="How often is the data read?" bind:value={freq} min={0} max={6} format={(v) => freqLabels[v]} />
  <div class="toggles">
    <label><input type="checkbox" bind:checked={predictable} /> Access pattern is predictable</label>
    <label><input type="checkbox" bind:checked={reproducible} /> Data can be re-created if lost</label>
  </div>
  <p class="rec" aria-live="polite">Recommended: <strong>{chosen.name}</strong>. {chosen.use}.</p>
  <ul class="list" aria-label="S3 storage classes">
    {#each classes as c}
      {@const on = c.id === pick}
      <li class="cls" class:on aria-current={on ? 'true' : undefined}>
        <div class="name">
          <strong>{c.name}{#if on}<span class="badge"><Icon name="check" size={12} stroke={3} /> Recommended</span>{/if}</strong>
          <small>{c.use}</small>
        </div>
        <div class="bar" aria-hidden="true"><span style:width="{(c.store / maxStore) * 100}%"></span></div>
        <span class="sr-only">Storage price about {Math.round((c.store / maxStore) * 100)}% of Standard.</span>
        <div class="meta"><span>Retrieval: {c.retrieval}</span><span>Minimum stay: {c.min}</span></div>
      </li>
    {/each}
  </ul>
  <p class="faint small">Bars show the relative per-GB storage price. Cheaper storage trades off retrieval time, retrieval fees and minimum storage duration. Use <strong>lifecycle rules</strong> to move objects between classes automatically.</p>
</WidgetFrame>

<style>
  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.86rem;
    color: var(--text-2);
    margin-bottom: 10px;
  }
  .toggles label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
  }
  .rec {
    margin: 0 0 10px;
    font-size: 0.9rem;
    color: var(--text-2);
  }
  .rec strong {
    color: var(--text);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
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
    border: 1px solid var(--border);
    transition: all 0.3s var(--ease);
  }
  .cls.on {
    border: 2px solid var(--c-storage);
    background: rgba(63, 185, 80, 0.1);
  }
  .name strong {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 0.88rem;
  }
  .name small {
    color: var(--text-2);
    font-size: 0.78rem;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ok-fg);
  }
  .bar {
    height: 8px;
    border-radius: 8px;
    background: var(--track);
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
    font-size: 0.76rem;
    color: var(--text-2);
  }
  .small {
    font-size: 0.82rem;
    margin: 10px 0 0;
  }
  @media (max-width: 600px) {
    .cls {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }
</style>
