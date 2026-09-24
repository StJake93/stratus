<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    labels,
    active = $bindable(0),
    panel,
    variant = 'pill'
  }: { labels: string[]; active?: number; panel: Snippet<[number]>; variant?: 'pill' | 'line' } = $props();

  let tabEls: HTMLButtonElement[] = $state([]);
  let indicator = $state({ left: 0, width: 0 });

  $effect(() => {
    const el = tabEls[active];
    if (el) indicator = { left: el.offsetLeft, width: el.offsetWidth };
  });

  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') active = (active + 1) % labels.length;
    else if (e.key === 'ArrowLeft') active = (active - 1 + labels.length) % labels.length;
    else return;
    e.preventDefault();
    tabEls[active]?.focus();
  }
</script>

<div class="tabs {variant}">
  <div class="bar" role="tablist" tabindex="-1" onkeydown={key}>
    <span class="ind" style:transform="translateX({indicator.left}px)" style:width="{indicator.width}px"></span>
    {#each labels as label, i}
      <button
        bind:this={tabEls[i]}
        role="tab"
        aria-selected={active === i}
        tabindex={active === i ? 0 : -1}
        class:on={active === i}
        onclick={() => (active = i)}>{label}</button
      >
    {/each}
  </div>
  {#key active}
    <div class="panel fade-in" role="tabpanel">{@render panel(active)}</div>
  {/key}
</div>

<style>
  .tabs {
    margin: 14px 0 18px;
  }
  .bar {
    position: relative;
    display: inline-flex;
    gap: 2px;
    padding: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .ind {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    border-radius: 9px;
    background: var(--surface-3);
    box-shadow: inset 0 0 0 1px var(--border-strong);
    transition:
      transform 0.35s var(--ease),
      width 0.35s var(--ease);
  }
  button {
    position: relative;
    background: none;
    border: 0;
    padding: 7px 14px;
    border-radius: 9px;
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--text-2);
    white-space: nowrap;
    transition: color 0.2s;
  }
  button.on,
  button:hover {
    color: var(--text);
  }
  .line .bar {
    background: none;
    border: 0;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    padding: 0;
    display: flex;
  }
  .line .ind {
    top: auto;
    bottom: -1px;
    height: 2px;
    background: var(--grad);
    box-shadow: none;
    border-radius: 2px;
  }
  .line button {
    border-radius: 0;
    padding: 9px 14px;
  }
  .panel {
    padding-top: 14px;
  }
</style>
