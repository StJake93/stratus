<script lang="ts">
  import type { Snippet } from 'svelte';
  import { slide } from 'svelte/transition';
  import Icon from '../Icon.svelte';
  import { settings } from '../../stores/settings.svelte';
  import { headingLevel, tag } from '../../heading';

  let { titles, body, multi = false }: { titles: string[]; body: Snippet<[number]>; multi?: boolean } = $props();
  const uid = `acc-${Math.random().toString(36).slice(2, 8)}`;
  const level = headingLevel();
  let open = $state<number[]>([]);

  function toggle(i: number) {
    if (open.includes(i)) open = open.filter((x) => x !== i);
    else open = multi ? [...open, i] : [i];
  }
</script>

<div class="acc">
  {#each titles as title, i}
    {@const isOpen = open.includes(i)}
    <div class="item" class:open={isOpen}>
      <svelte:element this={tag(level)} class="h">
        <button class="head" id="{uid}-h-{i}" aria-expanded={isOpen} aria-controls="{uid}-p-{i}" onclick={() => toggle(i)}>
          <span class="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <span class="t">{title}</span>
          <span class="chev" aria-hidden="true"><Icon name="chevron-down" size={18} /></span>
        </button>
      </svelte:element>
      {#if isOpen}
        <div class="body" id="{uid}-p-{i}" role="region" aria-labelledby="{uid}-h-{i}" transition:slide={{ duration: settings.reduced ? 0 : 260 }}>
          <div class="inner">{@render body(i)}</div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .acc {
    display: grid;
    gap: 8px;
    margin: 14px 0 18px;
  }
  .item {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .item.open {
    border-color: var(--border-strong);
    background: var(--surface-2);
  }
  .h {
    margin: 0;
    font-size: 1rem;
    letter-spacing: normal;
  }
  .head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 12px 16px;
    background: none;
    border: 0;
    border-radius: var(--radius);
    text-align: left;
    font-weight: 600;
  }
  .num {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-3);
  }
  .t {
    flex: 1;
  }
  .chev {
    display: grid;
    color: var(--text-3);
    transition: transform 0.3s var(--ease);
  }
  .open .chev {
    transform: rotate(180deg);
    color: var(--accent-2-fg);
  }
  .inner {
    padding: 0 18px 8px 46px;
  }
  @media (max-width: 600px) {
    .inner {
      padding-left: 16px;
    }
  }
</style>
