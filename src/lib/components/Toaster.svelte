<script lang="ts">
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import Icon from './Icon.svelte';
  import { toast } from '../stores/toast.svelte';
  import { settings } from '../stores/settings.svelte';
  import { md } from '../md';

  const icon = { ok: 'circle-check', err: 'circle-x', warn: 'triangle-alert', info: 'info', xp: 'zap' };
  const label = { ok: 'Success', err: 'Error', warn: 'Warning', info: 'Note', xp: 'Progress' };
  const d = $derived(settings.reduced ? 0 : 1);
</script>

<!-- Messages are announced through the app's live regions (see toast store), so this list is not itself live. -->
<section class="toaster" aria-label="Notifications">
  {#each toast.items as t (t.id)}
    <div
      class="toast {t.kind} glass"
      in:fly={{ x: 40, duration: 300 * d }}
      out:fly={{ x: 40, duration: 200 * d }}
      animate:flip={{ duration: 250 * d }}
      onmouseenter={() => toast.pause(t.id)}
      onmouseleave={() => toast.resume(t.id)}
      onfocusin={() => toast.pause(t.id)}
      onfocusout={() => toast.resume(t.id)}
      role="group"
      aria-label="{label[t.kind]}: {t.title}"
    >
      <span class="ic"><Icon name={icon[t.kind]} size={18} /></span>
      <div class="c">
        <strong>{t.title}</strong>
        {#if t.body}<div class="b">{@html md(t.body)}</div>{/if}
      </div>
      <button class="x" onclick={() => toast.dismiss(t.id)} aria-label="Dismiss notification: {t.title}"><Icon name="x" size={16} /></button>
      {#if t.ttl}<span class="bar" style:animation-duration="{t.ttl}ms" aria-hidden="true"></span>{/if}
    </div>
  {/each}
</section>

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
    --fg: var(--info-fg);
    position: relative;
    display: flex;
    gap: 10px;
    padding: 12px 10px 12px 14px;
    border-radius: 14px;
    box-shadow: var(--shadow-lg);
    border-left: 3px solid var(--c);
    overflow: hidden;
  }
  .ok {
    --c: var(--ok);
    --fg: var(--ok-fg);
  }
  .err {
    --c: var(--err);
    --fg: var(--err-fg);
  }
  .warn {
    --c: var(--warn);
    --fg: var(--warn-fg);
  }
  .xp {
    --c: var(--accent);
    --fg: var(--accent-fg);
  }
  .ic {
    color: var(--fg);
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
    place-items: center;
    width: 28px;
    height: 28px;
    flex: none;
    background: none;
    border: 0;
    padding: 0;
    color: var(--text-2);
    border-radius: 8px;
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
    opacity: 0.6;
    transform-origin: left;
    animation: shrink linear forwards;
  }
  .toast:hover .bar,
  .toast:focus-within .bar {
    animation-play-state: paused;
  }
  @keyframes shrink {
    to {
      transform: scaleX(0);
    }
  }
</style>
