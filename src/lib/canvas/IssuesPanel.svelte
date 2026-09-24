<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { board } from './board.svelte';
  import { md } from '../md';

  let filter = $state<'all' | 'error' | 'warn' | 'hint'>('all');
  const counts = $derived({
    error: board.issues.filter((i) => i.level === 'error').length,
    warn: board.issues.filter((i) => i.level === 'warn').length,
    hint: board.issues.filter((i) => i.level === 'hint').length
  });
  const list = $derived(filter === 'all' ? board.issues : board.issues.filter((i) => i.level === filter));
  const icon = { error: 'circle-x', warn: 'triangle-alert', hint: 'lightbulb' };
</script>

<div class="issues">
  <div class="filters">
    <button class:on={filter === 'all'} onclick={() => (filter = 'all')}>All {board.issues.length}</button>
    <button class="e" class:on={filter === 'error'} onclick={() => (filter = 'error')}>Errors {counts.error}</button>
    <button class="w" class:on={filter === 'warn'} onclick={() => (filter = 'warn')}>Warnings {counts.warn}</button>
    <button class="h" class:on={filter === 'hint'} onclick={() => (filter = 'hint')}>Hints {counts.hint}</button>
  </div>
  {#if !board.nodes.length}
    <p class="faint pad">The architecture linter checks your design as you build — placement, networking, availability and security best practice.</p>
  {:else if !list.length}
    <div class="clean">
      <Icon name="shield-check" size={30} />
      <strong>{filter === 'all' ? 'No issues — nice architecture!' : 'Nothing in this category.'}</strong>
    </div>
  {/if}
  <div class="list">
    {#each list as i (i.key)}
      <button class="iss {i.level}" onclick={() => i.node && (board.selected = i.node)}>
        <span class="ic"><Icon name={icon[i.level]} size={16} /></span>
        <div>
          <strong>{i.title}</strong>
          <div class="b">{@html md(i.body)}</div>
          {#if i.docs}<a href={i.docs} target="_blank" rel="noopener" onclick={(e) => e.stopPropagation()}>Read the docs →</a>{/if}
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .issues {
    padding: 12px;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 10px;
  }
  .filters button {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .filters button.on {
    background: var(--surface-3);
    color: var(--text);
    border-color: var(--border-strong);
  }
  .filters .e.on {
    color: var(--err);
  }
  .filters .w.on {
    color: var(--warn);
  }
  .filters .h.on {
    color: var(--info);
  }
  .pad {
    font-size: 0.84rem;
    padding: 6px;
  }
  .clean {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 30px 10px;
    color: var(--ok);
    text-align: center;
  }
  .list {
    display: grid;
    gap: 6px;
  }
  .iss {
    display: flex;
    gap: 10px;
    text-align: left;
    padding: 10px 11px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.8rem;
    transition: transform 0.15s;
  }
  .iss:hover {
    transform: translateX(2px);
  }
  .iss .ic {
    display: grid;
    padding-top: 1px;
  }
  .iss.error .ic {
    color: var(--err);
  }
  .iss.warn .ic {
    color: var(--warn);
  }
  .iss.hint .ic {
    color: var(--info);
  }
  .iss.error {
    border-color: rgba(248, 113, 113, 0.35);
  }
  .b {
    color: var(--text-2);
    margin: 2px 0 4px;
  }
  .b :global(p) {
    margin: 0;
  }
  .iss a {
    font-size: 0.74rem;
    font-weight: 600;
  }
</style>
