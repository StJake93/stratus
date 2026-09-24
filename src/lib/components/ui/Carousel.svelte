<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  let { titles, slide }: { titles: string[]; slide: Snippet<[number]> } = $props();
  let i = $state(0);
  let dir = $state(1);
  let startX = 0;

  const go = (n: number) => {
    const next = Math.max(0, Math.min(titles.length - 1, n));
    dir = next >= i ? 1 : -1;
    i = next;
  };

  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<section
  class="car"
  tabindex="0"
  role="region"
  aria-roledescription="carousel"
  onkeydown={key}
  ontouchstart={(e) => (startX = e.touches[0].clientX)}
  ontouchend={(e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
  }}
>
  <header>
    <span class="count">{i + 1} / {titles.length}</span>
    <h4>{titles[i]}</h4>
    <div class="nav">
      <button class="btn sm ghost" aria-label="Previous" disabled={i === 0} onclick={() => go(i - 1)}><Icon name="chevron-left" /></button>
      <button class="btn sm ghost" aria-label="Next" disabled={i === titles.length - 1} onclick={() => go(i + 1)}><Icon name="chevron-right" /></button>
    </div>
  </header>
  <div class="viewport">
    {#key i}
      <div class="slide" style:--dir={dir}>{@render slide(i)}</div>
    {/key}
  </div>
  <footer>
    {#each titles as t, n}
      <button class="dot" class:on={n === i} class:past={n < i} aria-label="Go to {t}" onclick={() => go(n)}></button>
    {/each}
  </footer>
</section>

<style>
  .car {
    margin: 14px 0 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background:
      radial-gradient(120% 80% at 100% 0%, var(--accent-soft), transparent 60%),
      var(--surface);
    overflow: hidden;
  }
  .car:focus-visible {
    outline-offset: 3px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px 0 20px;
  }
  h4 {
    margin: 0;
    flex: 1;
    font-size: 1.02rem;
  }
  .count {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--accent-2);
    background: var(--surface-2);
    padding: 2px 8px;
    border-radius: 6px;
  }
  .nav {
    display: flex;
    gap: 2px;
  }
  .viewport {
    padding: 12px 20px 4px;
    min-height: 120px;
  }
  .slide {
    animation: slideIn 0.4s var(--ease) both;
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(calc(var(--dir) * 28px));
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  footer {
    display: flex;
    gap: 6px;
    padding: 6px 20px 16px;
  }
  .dot {
    flex: 1;
    height: 4px;
    border-radius: 4px;
    border: 0;
    padding: 0;
    background: var(--surface-3);
    transition: background 0.3s;
  }
  .dot.past {
    background: color-mix(in srgb, var(--accent) 50%, var(--surface-3));
  }
  .dot.on {
    background: var(--grad);
  }
</style>
