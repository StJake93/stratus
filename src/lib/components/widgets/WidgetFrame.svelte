<script lang="ts">
  import type { Snippet } from 'svelte';
  import { headingLevel, tag } from '../../heading';

  let { kind = 'Interactive', title, actions, children }: { kind?: 'Interactive' | 'Simulation' | 'Scenario'; title: string; actions?: Snippet; children: Snippet } = $props();

  const level = headingLevel();
  const id = `w-${Math.random().toString(36).slice(2, 8)}`;
</script>

<section class="wbox" aria-labelledby={id}>
  <div class="whead">
    <span class="wtag">{kind}</span>
    <svelte:element this={tag(level)} {id} class="wtitle">{title}</svelte:element>
    {#if actions}<span class="spacer"></span><div class="wactions">{@render actions()}</div>{/if}
  </div>
  {@render children()}
</section>

<style>
  .wbox {
    padding: 18px 20px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    background:
      radial-gradient(100% 80% at 100% 0%, rgba(124, 92, 255, 0.08), transparent 60%),
      var(--surface);
  }
  .whead {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 10px;
    margin-bottom: 12px;
  }
  .wtitle {
    margin: 0;
    font-size: 1.02rem;
  }
  /* Text-safe tag colours: 4.5:1+ in both themes (was cyan-on-cyan in light mode). */
  .wtag {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent-2-fg);
    background: var(--accent-2-soft);
    border: 1px solid color-mix(in srgb, var(--accent-2-fg) 30%, transparent);
    padding: 3px 8px;
    border-radius: 6px;
  }
  .wactions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  /* Shared widget primitives */
  .wbox :global(.ctl) {
    display: grid;
    gap: 2px;
    margin-bottom: 12px;
  }
  .wbox :global(.ctl label) {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .wbox :global(.ctl output) {
    font-family: var(--mono);
    color: var(--text);
    text-align: right;
  }
  .wbox :global(.stat) {
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .wbox :global(.stat b) {
    display: block;
    font-size: 1.3rem;
    letter-spacing: -0.02em;
  }
  .wbox :global(.stat span) {
    font-size: 0.74rem;
    color: var(--text-3);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .wbox :global(.seg) {
    display: inline-flex;
    padding: 3px;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .wbox :global(.seg button) {
    min-height: 28px;
    border: 0;
    background: none;
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .wbox :global(.seg button[aria-pressed='true']) {
    background: var(--accent-strong);
    color: #ffffff;
  }
</style>
