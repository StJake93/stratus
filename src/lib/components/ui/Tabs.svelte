<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    labels,
    active = $bindable(0),
    panel,
    variant = 'pill',
    label
  }: { labels: string[]; active?: number; panel: Snippet<[number]>; variant?: 'pill' | 'line'; label?: string } = $props();

  const uid = `tabs-${Math.random().toString(36).slice(2, 8)}`;
  let tabEls: HTMLButtonElement[] = $state([]);
  let indicator = $state({ left: 0, width: 0 });

  $effect(() => {
    const el = tabEls[active];
    if (el) indicator = { left: el.offsetLeft, width: el.offsetWidth };
  });

  // Roving tabindex with automatic activation (WAI-ARIA tabs pattern).
  function key(e: KeyboardEvent) {
    const n = labels.length;
    if (e.key === 'ArrowRight') active = (active + 1) % n;
    else if (e.key === 'ArrowLeft') active = (active - 1 + n) % n;
    else if (e.key === 'Home') active = 0;
    else if (e.key === 'End') active = n - 1;
    else return;
    e.preventDefault();
    tabEls[active]?.focus();
  }
</script>

<div class="tabs {variant}">
  <div class="bar focus-inset" role="tablist" tabindex="-1" aria-label={label} onkeydown={key}>
    <span class="ind" style:transform="translateX({indicator.left}px)" style:width="{indicator.width}px" aria-hidden="true"></span>
    {#each labels as l, i}
      <button
        bind:this={tabEls[i]}
        id="{uid}-tab-{i}"
        role="tab"
        aria-selected={active === i}
        aria-controls="{uid}-panel"
        tabindex={active === i ? 0 : -1}
        class:on={active === i}
        onclick={() => (active = i)}>{l}</button
      >
    {/each}
  </div>
  {#key active}
    <div class="panel fade-in" role="tabpanel" id="{uid}-panel" aria-labelledby="{uid}-tab-{active}" tabindex="0">{@render panel(active)}</div>
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
    background: var(--solid);
    box-shadow:
      inset 0 0 0 1px var(--border-strong),
      0 1px 4px rgba(0, 0, 0, 0.12);
    transition:
      transform 0.35s var(--ease),
      width 0.35s var(--ease);
  }
  button {
    position: relative;
    min-height: 32px;
    background: none;
    border: 0;
    padding: 6px 14px;
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
    padding: 4px 4px 0;
    display: flex;
  }
  .line .ind {
    top: auto;
    bottom: -1px;
    height: 3px;
    background: var(--grad);
    box-shadow: none;
    border-radius: 3px;
  }
  .line button {
    border-radius: 8px 8px 0 0;
    padding: 9px 14px;
  }
  .panel {
    padding-top: 14px;
    border-radius: 6px;
  }
</style>
