<script lang="ts">
  import Icon from '../Icon.svelte';
  import { highlight } from '../../highlight';

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
  }
  const sym = { create: '+', destroy: '-', replace: '-/+', noop: ' ' };
</script>

<div class="wbox">
  <div class="whead">
    <span class="wtag">Interactive</span><h4>count vs for_each</h4>
    <span class="spacer"></span>
    <div class="seg">
      <button class:on={mode === 'count'} onclick={() => (mode = 'count')}>count</button>
      <button class:on={mode === 'for_each'} onclick={() => (mode = 'for_each')}>for_each</button>
    </div>
  </div>
  <p class="muted small">Remove an item from the <strong>middle</strong> of the list and compare the plans. With <code>count</code>, resources are tracked by position; with <code>for_each</code>, by key.</p>

  <div class="items">
    {#each items as it, i (it)}
      <span class="item">
        <em>{mode === 'count' ? `[${i}]` : `["${it}"]`}</em>
        {it}
        <button aria-label="Remove {it}" onclick={() => (items = items.filter((x) => x !== it))}><Icon name="x" size={12} /></button>
      </span>
    {/each}
    <form onsubmit={(e) => (e.preventDefault(), add())}>
      <input class="input" placeholder="add bucket…" bind:value={draft} />
    </form>
  </div>

  <div class="grid">
    <pre class="hcl"><code>{@html highlight(code, 'hcl')}</code></pre>
    <div class="plan">
      {#each ops as o (o.addr)}
        <div class="op {o.op}"><span class="s">{sym[o.op]}</span> {o.addr} {#if o.note}<small>{o.note}</small>{/if}</div>
      {/each}
      <div class="sum">Plan: {summary.add} to add, 0 to change, {summary.del} to destroy.</div>
      {#if mode === 'count' && ops.some((o) => o.op === 'replace')}
        <div class="warn"><Icon name="triangle-alert" size={14} /> Index shift! Buckets after the removed item get destroyed and re-created — with S3 that means data loss.</div>
      {/if}
      <button class="btn sm primary" onclick={apply} disabled={!summary.add && !summary.del}>Apply</button>
    </div>
  </div>
</div>

<style>
  .small {
    font-size: 0.86rem;
  }
  .seg {
    display: inline-flex;
    padding: 3px;
    border-radius: 9px;
    background: var(--surface-2);
  }
  .seg button {
    border: 0;
    background: none;
    padding: 4px 12px;
    border-radius: 7px;
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .seg button.on {
    background: var(--accent);
    color: white;
  }
  .items {
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
    padding: 4px 6px 4px 10px;
    border-radius: 8px;
    background: rgba(63, 185, 80, 0.12);
    border: 1px solid rgba(63, 185, 80, 0.35);
    font-size: 0.84rem;
    font-weight: 600;
    animation: pop 0.25s var(--ease);
  }
  .item em {
    font-style: normal;
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .item button {
    display: grid;
    border: 0;
    background: none;
    padding: 2px;
    color: var(--text-3);
    border-radius: 4px;
  }
  .item button:hover {
    color: var(--err);
  }
  @keyframes pop {
    from {
      transform: scale(0.6);
    }
  }
  form .input {
    width: 140px;
    padding: 5px 9px;
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
  .op small {
    color: #6b7590;
  }
  .op.noop {
    color: #6b7590;
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
