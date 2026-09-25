<script lang="ts">
  import Icon from '../Icon.svelte';
  import { md } from '../../md';

  let { variant = 'info', title, body }: { variant?: 'tip' | 'warn' | 'info' | 'error' | 'example'; title?: string; body: string } = $props();

  // --c is the decorative accent (border); --fg is the text-safe version for the title and icon.
  const meta = {
    tip: { icon: 'lightbulb', label: 'Tip', c: 'var(--ok)', fg: 'var(--ok-fg)', bg: 'var(--ok-soft)' },
    warn: { icon: 'triangle-alert', label: 'Watch out', c: 'var(--warn)', fg: 'var(--warn-fg)', bg: 'var(--warn-soft)' },
    info: { icon: 'info', label: 'Note', c: 'var(--info)', fg: 'var(--info-fg)', bg: 'var(--info-soft)' },
    error: { icon: 'circle-x', label: 'Common mistake', c: 'var(--err)', fg: 'var(--err-fg)', bg: 'var(--err-soft)' },
    example: { icon: 'sparkles', label: 'Real-world example', c: 'var(--accent-2)', fg: 'var(--accent-2-fg)', bg: 'var(--accent-2-soft)' }
  };
  const m = $derived(meta[variant]);
</script>

<aside class="callout" style:--c={m.c} style:--fg={m.fg} style:--bg={m.bg} aria-label={title ?? m.label}>
  <span class="ic"><Icon name={m.icon} size={18} /></span>
  <div>
    <strong>{title ?? m.label}</strong>
    <div class="b">{@html md(body)}</div>
  </div>
</aside>

<style>
  .callout {
    display: flex;
    gap: 12px;
    margin: 14px 0 18px;
    padding: 14px 16px;
    border-radius: var(--radius);
    background: var(--bg);
    border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
    border-left: 4px solid var(--c);
  }
  .ic {
    color: var(--fg);
    display: grid;
    padding-top: 2px;
  }
  strong {
    display: block;
    color: var(--fg);
    font-size: 0.88rem;
    margin-bottom: 2px;
  }
  .b :global(p:last-child),
  .b :global(ul:last-child) {
    margin-bottom: 0;
  }
  .b {
    font-size: 0.93rem;
    color: var(--text);
  }
</style>
