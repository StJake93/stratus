<script lang="ts">
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import Icon from './Icon.svelte';
  import { toast } from '../stores/toast.svelte';
  import { md } from '../md';

  const icon = { ok: 'circle-check', err: 'circle-x', warn: 'triangle-alert', info: 'info', xp: 'zap' };
</script>

<div class="toaster" aria-live="polite">
  {#each toast.items as t (t.id)}
    <div class="toast {t.kind} glass" in:fly={{ x: 40, duration: 300 }} out:fly={{ x: 40, duration: 200 }} animate:flip={{ duration: 250 }} role={t.kind === 'err' ? 'alert' : 'status'}>
      <span class="ic"><Icon name={icon[t.kind]} size={18} /></span>
      <div class="c">
        <strong>{t.title}</strong>
        {#if t.body}<div class="b">{@html md(t.body)}</div>{/if}
      </div>
      <button class="x" onclick={() => toast.dismiss(t.id)} aria-label="Dismiss"><Icon name="x" size={14} /></button>
      <span class="bar" style:animation-duration="{t.ttl}ms"></span>
    </div>
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(380px, calc(100vw - 32px));
  }
  .toast {
    --c: var(--info);
    position: relative;
    display: flex;
    gap: 10px;
    padding: 12px 12px 12px 14px;
    border-radius: 14px;
    box-shadow: var(--shadow-lg);
    border-left: 3px solid var(--c);
    overflow: hidden;
  }
  .ok {
    --c: var(--ok);
  }
  .err {
    --c: var(--err);
  }
  .warn {
    --c: var(--warn);
  }
  .xp {
    --c: var(--accent);
  }
  .ic {
    color: var(--c);
    display: grid;
    padding-top: 1px;
  }
  .c {
    flex: 1;
    min-width: 0;
    font-size: 0.86rem;
  }
  .b {
    color: var(--text-2);
    font-size: 0.82rem;
    margin-top: 2px;
  }
  .b :global(p) {
    margin: 0;
  }
  .x {
    align-self: flex-start;
    display: grid;
    background: none;
    border: 0;
    padding: 2px;
    color: var(--text-3);
    border-radius: 6px;
  }
  .x:hover {
    color: var(--text);
    background: var(--surface-2);
  }
  .bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 100%;
    background: var(--c);
    opacity: 0.5;
    transform-origin: left;
    animation: shrink linear forwards;
  }
  @keyframes shrink {
    to {
      transform: scaleX(0);
    }
  }
</style>
