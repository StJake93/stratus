<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Icon from '../Icon.svelte';
  import { highlight } from '../../highlight';
  import { scrollable } from '../../actions';
  import { announce } from '../../stores/announce.svelte';

  let applied = $state<string[]>(['logs', 'images', 'backups']);
  let items = $state<string[]>(['logs', 'images', 'backups']);
  let mode = $state<'count' | 'for_each'>('for_each');
  let draft = $state('');

  type Op = { addr: string; op: 'create' | 'destroy' | 'replace' | 'noop'; note?: string };

  function planCount(): Op[] {
    const ops: Op[] = [];
    const n = Math.max(applied.length, items.length);
    for (let i = 0; i < n; i++) {
      const a = applied[i];
      const b = items[i];
      const addr = `aws_s3_bucket.this[${i}]`;
      if (a && !b) ops.push({ addr, op: 'destroy', note: `"${a}"` });
      else if (!a && b) ops.push({ addr, op: 'create', note: `"${b}"` });
      else if (a !== b) ops.push({ addr, op: 'replace', note: `"${a}" → "${b}"` });
      else ops.push({ addr, op: 'noop', note: `"${a}"` });
    }
    return ops;
  }

  function planForEach(): Op[] {
    const keys = [...new Set([...applied, ...items])];
    return keys.map((k) => {
      const addr = `aws_s3_bucket.this["${k}"]`;
      const inA = applied.includes(k);
      const inB = items.includes(k);
      return { addr, op: inA && !inB ? 'destroy' : !inA && inB ? 'create' : 'noop' };
    });
  }

  const ops = $derived(mode === 'count' ? planCount() : planForEach());
  const summary = $derived({
    add: ops.filter((o) => o.op === 'create' || o.op === 'replace').length,
    del: ops.filter((o) => o.op === 'destroy' || o.op === 'replace').length
  });

  const code = $derived(
    mode === 'count'
      ? `variable "buckets" {\n  default = [${items.map((i) => `"${i}"`).join(', ')}]\n}\n\nresource "aws_s3_bucket" "this" {\n  count  = length(var.buckets)\n  bucket = "acme-\${var.buckets[count.index]}"\n}`
      : `variable "buckets" {\n  default = [${items.map((i) => `"${i}"`).join(', ')}]\n}\n\nresource "aws_s3_bucket" "this" {\n  for_each = toset(var.buckets)\n  bucket   = "acme-\${each.key}"\n}`
  );

  function add() {
    const v = draft.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (v && !items.includes(v)) items = [...items, v];
    draft = '';
  }
  function apply() {
    applied = [...items];
    announce('Applied. The plan is now empty.');
  }
  const sym = { create: '+', destroy: '-', replace: '-/+', noop: ' ' };
  const verb = { create: 'create', destroy: 'destroy', replace: 'replace', noop: 'no change' };
</script>

<WidgetFrame title="count vs for_each">
  {#snippet actions()}
    <div class="seg" role="group" aria-label="Meta-argument">
      <button aria-pressed={mode === 'count'} onclick={() => (mode = 'count')}>count</button>
      <button aria-pressed={mode === 'for_each'} onclick={() => (mode = 'for_each')}>for_each</button>
    </div>
  {/snippet}
  <p class="muted small">Remove an item from the <strong>middle</strong> of the list and compare the plans. With <code>count</code>, resources are tracked by position; with <code>for_each</code>, by key.</p>

  <ul class="items" aria-label="Buckets in var.buckets">
    {#each items as it, i (it)}
      <li class="item">
        <em aria-hidden="true">{mode === 'count' ? `[${i}]` : `["${it}"]`}</em>
        {it}
        <button aria-label="Remove {it}" onclick={() => (items = items.filter((x) => x !== it))}><Icon name="x" size={14} /></button>
      </li>
    {/each}
  </ul>
  <form class="add" onsubmit={(e) => (e.preventDefault(), add())}>
    <label class="sr-only" for="{mode}-bucket-input">Bucket name to add</label>
    <input id="{mode}-bucket-input" class="input" placeholder="Add a bucket…" bind:value={draft} />
    <button class="btn sm" type="submit" disabled={!draft.trim()}><Icon name="check" size={13} /> Add</button>
  </form>

  <div class="grid">
    <pre class="hcl" use:scrollable><code>{@html highlight(code, 'hcl')}</code></pre>
    <div class="plan">
      <ul class="ops" aria-label="terraform plan">
        {#each ops as o (o.addr)}
          <li class="op {o.op}"><span class="s" aria-hidden="true">{sym[o.op]}</span> <span class="sr-only">{verb[o.op]}: </span>{o.addr} {#if o.note}<small>{o.note}</small>{/if}</li>
        {/each}
      </ul>
      <div class="sum" aria-live="polite">Plan: {summary.add} to add, 0 to change, {summary.del} to destroy.</div>
      {#if mode === 'count' && ops.some((o) => o.op === 'replace')}
        <div class="warn" role="alert"><Icon name="triangle-alert" size={14} /> Index shift! Buckets after the removed item get destroyed and re-created. With S3, that means data loss.</div>
      {/if}
      <button class="btn sm primary" onclick={apply} disabled={!summary.add && !summary.del}>Apply</button>
    </div>
  </div>
</WidgetFrame>

<style>
  .small {
    font-size: 0.86rem;
  }
  .add {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 12px;
    max-width: 320px;
  }
  .items {
    list-style: none;
    padding: 0;
    margin: 0 0 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 12px;
  }
  .item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px 2px 10px;
    border-radius: 8px;
    background: rgba(63, 185, 80, 0.12);
    border: 1px solid rgba(63, 185, 80, 0.5);
    font-size: 0.84rem;
    font-weight: 600;
    animation: pop 0.25s var(--ease);
  }
  .item em {
    font-style: normal;
    font-family: var(--mono);
    font-size: 0.74rem;
    color: var(--text-2);
  }
  .item button {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 0;
    background: none;
    padding: 0;
    color: var(--text-2);
    border-radius: 6px;
  }
  .item button:hover {
    color: var(--err-fg);
    background: var(--err-soft);
  }
  @keyframes pop {
    from {
      transform: scale(0.6);
    }
  }
  .add .input {
    flex: 1;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  @media (max-width: 700px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  .hcl {
    margin: 0;
    padding: 12px;
    border-radius: 10px;
    background: #0b0f1c;
    color: #d6deeb;
    font-size: 0.76rem;
    overflow: auto;
  }
  .hcl:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: -2px;
  }
  .hcl code {
    background: none;
    border: 0;
    padding: 0;
  }
  .plan {
    padding: 10px 12px;
    border-radius: 10px;
    background: #070a13;
    color: #c8d1e6;
    font-family: var(--mono);
    font-size: 0.76rem;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ops {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .op small {
    color: #a3adc2;
  }
  .op.noop {
    color: #a3adc2;
  }
  .op.create {
    color: #34d399;
  }
  .op.destroy {
    color: #f87171;
  }
  .op.replace {
    color: #fbbf24;
  }
  .s {
    display: inline-block;
    width: 26px;
  }
  .sum {
    margin-top: 6px;
    color: #93c5fd;
    font-weight: 600;
  }
  .warn {
    display: flex;
    gap: 6px;
    color: #fbbf24;
    font-family: var(--font);
    font-size: 0.8rem;
    margin: 6px 0;
  }
  .plan .btn {
    align-self: flex-start;
    margin-top: 6px;
    font-family: var(--font);
  }
</style>
