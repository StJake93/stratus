<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';
  import { headingLevel, tag } from '../../heading';

  let { titles, slide, label = 'Slides' }: { titles: string[]; slide: Snippet<[number]>; label?: string } = $props();
  const level = headingLevel();
  let i = $state(0);
  let dir = $state(1);
  let startX = 0;

  const go = (n: number) => {
    const next = Math.max(0, Math.min(titles.length - 1, n));
    dir = next >= i ? 1 : -1;
    i = next;
  };

  function key(e: KeyboardEvent) {
    // Only when the carousel itself has focus, so arrow keys inside slide content keep working.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  }
</script>

<!-- Keyboard and swipe navigation for the whole carousel. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<section
  class="car"
  tabindex="0"
  aria-roledescription="carousel"
  aria-label={label}
  onkeydown={key}
  ontouchstart={(e) => (startX = e.touches[0].clientX)}
  ontouchend={(e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
  }}
>
  <header>
    <span class="count" aria-hidden="true">{i + 1} / {titles.length}</span>
    <svelte:element this={tag(level)} class="title">{titles[i]}</svelte:element>
    <div class="nav">
      <button class="btn sm ghost" aria-label="Previous slide" disabled={i === 0} onclick={() => go(i - 1)}><Icon name="chevron-left" /></button>
      <button class="btn sm ghost" aria-label="Next slide" disabled={i === titles.length - 1} onclick={() => go(i + 1)}><Icon name="chevron-right" /></button>
    </div>
  </header>
  <div class="viewport" aria-live="polite">
    {#key i}
      <div class="slide" style:--dir={dir} role="group" aria-roledescription="slide" aria-label="{i + 1} of {titles.length}: {titles[i]}">{@render slide(i)}</div>
    {/key}
  </div>
  <footer>
    {#each titles as t, n}
      <button class="dot" class:on={n === i} class:past={n < i} aria-label="Slide {n + 1}: {t}" aria-current={n === i ? 'true' : undefined} onclick={() => go(n)}><span></span></button>
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
  .title {
    margin: 0;
    flex: 1;
    font-size: 1.02rem;
  }
  .count {
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent-2-fg);
    background: var(--accent-2-soft);
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
    gap: 4px;
    padding: 0 16px 8px;
  }
  /* 24px tall hit area around a 4px bar (WCAG 2.5.8). */
  .dot {
    flex: 1;
    height: 24px;
    display: grid;
    align-items: center;
    border: 0;
    padding: 0 2px;
    background: none;
    border-radius: 6px;
  }
  .dot span {
    height: 4px;
    border-radius: 4px;
    background: var(--track);
    transition: background 0.3s;
  }
  .dot:hover span {
    background: var(--text-3);
  }
  .dot.past span {
    background: color-mix(in srgb, var(--accent) 55%, var(--track));
  }
  .dot.on span {
    background: var(--grad);
    height: 6px;
  }
</style>
