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
  const levelName = { error: 'Error', warn: 'Warning', hint: 'Hint' };
</script>

<div class="issues">
  <h2 class="sr-only">Architecture issues</h2>
  <div class="filters" role="group" aria-label="Filter issues">
    <button aria-pressed={filter === 'all'} onclick={() => (filter = 'all')}>All {board.issues.length}</button>
    <button class="e" aria-pressed={filter === 'error'} onclick={() => (filter = 'error')}>Errors {counts.error}</button>
    <button class="w" aria-pressed={filter === 'warn'} onclick={() => (filter = 'warn')}>Warnings {counts.warn}</button>
    <button class="h" aria-pressed={filter === 'hint'} onclick={() => (filter = 'hint')}>Hints {counts.hint}</button>
  </div>
  <p class="sr-only" aria-live="polite">{counts.error} errors, {counts.warn} warnings, {counts.hint} hints.</p>
  {#if !board.nodes.length}
    <p class="faint pad">The architecture linter checks your design as you build: placement, networking, availability and security best practice.</p>
  {:else if !list.length}
    <div class="clean">
      <Icon name="shield-check" size={30} />
      <strong>{filter === 'all' ? 'No issues. Nice architecture!' : 'Nothing in this category.'}</strong>
    </div>
  {/if}
  <ul class="list">
    {#each list as i (i.key)}
      <li class="iss {i.level}">
        <span class="ic"><Icon name={icon[i.level]} size={16} /></span>
        <div>
          <strong><span class="sr-only">{levelName[i.level]}: </span>{i.title}</strong>
          <div class="b">{@html md(i.body)}</div>
          <div class="links">
            {#if i.node}<button class="lnk" onclick={() => (board.selected = i.node!)}>Show component</button>{/if}
            {#if i.docs}<a class="lnk" href={i.docs} target="_blank" rel="noopener">Read the docs<span class="sr-only"> (opens in a new tab)</span></a>{/if}
          </div>
        </div>
      </li>
    {/each}
  </ul>
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
    min-height: 28px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .filters button[aria-pressed='true'] {
    background: var(--surface-3);
    color: var(--text);
    border-color: var(--text-2);
  }
  .filters .e[aria-pressed='true'] {
    color: var(--err-fg);
  }
  .filters .w[aria-pressed='true'] {
    color: var(--warn-fg);
  }
  .filters .h[aria-pressed='true'] {
    color: var(--info-fg);
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
    color: var(--ok-fg);
    text-align: center;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .iss {
    display: flex;
    gap: 10px;
    padding: 10px 11px;
    border-radius: 10px;
    border: 1px solid var(--border);
    border-left-width: 4px;
    background: var(--surface);
    font-size: 0.82rem;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .lnk {
    background: none;
    border: 0;
    padding: 0;
    min-height: 24px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--link);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .iss .ic {
    display: grid;
    padding-top: 1px;
  }
  .iss.error .ic {
    color: var(--err-fg);
  }
  .iss.warn .ic {
    color: var(--warn-fg);
  }
  .iss.hint .ic {
    color: var(--info-fg);
  }
  .iss.error {
    border-left-color: var(--err);
  }
  .iss.warn {
    border-left-color: var(--warn);
  }
  .iss.hint {
    border-left-color: var(--info);
  }
  .b {
    color: var(--text-2);
    margin: 2px 0 4px;
  }
  .b :global(p) {
    margin: 0;
  }

</style>
