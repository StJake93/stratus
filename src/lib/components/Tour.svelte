<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { settings } from '../stores/settings.svelte';
  import { progress } from '../stores/progress.svelte';
  import { router, href } from '../stores/router.svelte';
  import { md } from '../md';

  interface Step {
    route?: string;
    target?: string;
    title: string;
    body: string;
    icon: string;
  }

  const steps: Step[] = [
    { route: href.home(), title: 'Welcome to Stratus', icon: 'sparkles', body: 'An interactive lab for learning **cloud infrastructure**, from the basics to building real architectures. This quick tour takes about a minute.' },
    { target: 'nav', title: 'Learning tracks', icon: 'graduation', body: 'Lessons are grouped into **tracks**: Cloud Foundations, three AWS tracks and Terraform. Each lesson mixes tabs, carousels, diagrams, simulations and quizzes.' },
    { target: 'providers', title: 'Provider sections', icon: 'cloud', body: 'Each cloud has its own space. **AWS** and **Terraform** are fully built out. **Azure** and **GCP** are previews that map to the AWS concepts you already know.' },
    { target: 'path', route: href.home(), title: 'Your learning path', icon: 'route', body: 'This map shows every lesson in order. Completed lessons light up, and you can open any node to jump in.' },
    { route: href.play(), target: 'palette', title: 'The build canvas', icon: 'blocks', body: '**Drag** AWS services from this palette onto the canvas, or activate one to add it. Place them inside VPCs and subnets, then connect them.' },
    { target: 'panels', title: 'Inspect, validate, export', icon: 'file-code', body: 'Configure the selected component, move it between networks, connect it without dragging, review **errors, warnings and hints**, and watch your diagram turn into **Terraform**.' },
    { target: 'nav-scenarios', title: 'Guided scenarios', icon: 'list-checks', body: 'Scenarios give you a brief, such as shipping a containerised app, with step-by-step goals, hints and live checks. Completing them earns the most XP.' },
    { target: 'nav-compare', title: 'Compare clouds', icon: 'git-compare', body: 'Already know Azure or GCP? The comparison tool maps equivalent services side by side, like Lambda, Azure Functions and Cloud Run functions.' },
    { target: 'xp', title: 'Level up', icon: 'trophy', body: 'Earn XP for lessons, quizzes and builds, unlock badges and keep a streak going. Progress is saved in this browser.' },
    { route: href.home(), title: 'You’re ready!', icon: 'rocket', body: 'Start with **Cloud Foundations**, or jump straight into the canvas. You can replay this tour anytime from the sidebar.' }
  ];

  let dlg: HTMLDialogElement;
  let nextBtn: HTMLButtonElement | undefined = $state();
  let i = $state(0);
  let rect = $state<DOMRect | null>(null);
  const step = $derived(steps[i]);

  const find = (s: Step) => (s.target ? (document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null) : null);

  // Open and close the native modal dialog alongside the setting.
  $effect(() => {
    if (settings.tourOpen && !dlg.open) {
      i = 0;
      dlg.showModal();
      nextBtn?.focus();
    } else if (!settings.tourOpen && dlg.open) dlg.close();
  });

  $effect(() => {
    if (!settings.tourOpen) return;
    const s = step;
    if (s.route && location.hash !== s.route) router.go(s.route);
    if (s.target && settings.compact) settings.navOpen = true;
    // Wait for the route or panel to render before measuring.
    let tries = 0;
    let raf = 0;
    const seek = () => {
      const el = find(s);
      rect = el ? el.getBoundingClientRect() : null;
      if (el) el.scrollIntoView({ block: 'nearest', behavior: settings.reduced ? 'auto' : 'smooth' });
      else if (s.target && tries++ < 40) raf = requestAnimationFrame(seek);
    };
    const t = setTimeout(seek, 60);
    // Re-measure while smooth-scrolling or resizing so the spotlight tracks its target.
    let pending = 0;
    const remeasure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const el = find(s);
        rect = el ? el.getBoundingClientRect() : null;
      });
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  });

  // Skipping counts as seeing the tour, so it never auto-opens again either way.
  function close() {
    settings.tourOpen = false;
    settings.navOpen = false;
    progress.finishTutorial();
  }

  function go(n: number) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    // Buttons change between steps; if the focused one disappeared, move focus to the primary action.
    tick().then(() => {
      if (!dlg.contains(document.activeElement) || document.activeElement === dlg) (dlg.querySelector('.acts .primary') as HTMLElement | null)?.focus();
    });
  }

  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  }

  const pad = 8;
  const card = $derived.by(() => {
    if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    const w = 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer the right of the target, then below, then left.
    if (rect.right + w + 24 < vw) return { left: `${rect.right + 16}px`, top: `${Math.min(Math.max(16, rect.top), vh - 280)}px`, transform: 'none' };
    if (rect.bottom + 260 < vh) return { left: `${Math.min(Math.max(16, rect.left), vw - w - 16)}px`, top: `${rect.bottom + 16}px`, transform: 'none' };
    return { left: `${Math.max(16, rect.left - w - 16)}px`, top: `${Math.min(Math.max(16, rect.top), vh - 280)}px`, transform: 'none' };
  });
</script>

<dialog
  bind:this={dlg}
  class="tour"
  aria-labelledby="tour-title"
  aria-describedby="tour-body"
  oncancel={(e) => {
    e.preventDefault();
    close();
  }}
  onkeydown={key}
>
  {#if settings.tourOpen}
    {#if rect}
      <div class="spot" style:left="{rect.left - pad}px" style:top="{rect.top - pad}px" style:width="{rect.width + pad * 2}px" style:height="{rect.height + pad * 2}px"></div>
    {:else}
      <div class="dim"></div>
    {/if}
  {/if}
  <div class="card glass" style:left={card.left} style:top={card.top} style:transform={card.transform}>
    <div class="top">
      <span class="ic" aria-hidden="true"><Icon name={step.icon} size={20} /></span>
      <span class="count">Step {i + 1} of {steps.length}</span>
      <button class="x" onclick={close} aria-label="Close tour"><Icon name="x" size={18} /></button>
    </div>
    <!-- Live so each step's text is read out when you move through the tour. -->
    <div aria-live="polite">
      {#key i}
        <div class="content">
          <h2 id="tour-title">{step.title}</h2>
          <div class="body" id="tour-body">{@html md(step.body)}</div>
        </div>
      {/key}
    </div>
    <div class="dots" aria-hidden="true">{#each steps as _, n}<i class:on={n === i} class:past={n < i}></i>{/each}</div>
    <div class="acts">
      {#if i === 0}
        <button class="btn sm ghost" onclick={close}>Skip tour</button>
      {:else}
        <button class="btn sm ghost" onclick={() => go(i - 1)}><Icon name="chevron-left" size={14} /> Back</button>
      {/if}
      <span class="spacer"></span>
      {#if i < steps.length - 1}
        <button class="btn sm primary" bind:this={nextBtn} onclick={() => go(i + 1)}>{i === 0 ? 'Show me around' : 'Next'} <Icon name="arrow-right" size={14} /></button>
      {:else}
        <a class="btn sm" href={href.play()} onclick={close}>Open canvas</a>
        <a class="btn sm primary" href={href.lesson('cloud-101')} onclick={close}>Start learning <Icon name="arrow-right" size={14} /></a>
      {/if}
    </div>
  </div>
</dialog>

<style>
  .tour {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text);
    overflow: hidden;
  }
  .tour::backdrop {
    background: transparent;
  }
  .dim {
    position: absolute;
    inset: 0;
    background: rgba(4, 6, 14, 0.72);
    backdrop-filter: blur(3px);
    animation: fade 0.3s;
  }
  .spot {
    position: absolute;
    border-radius: 14px;
    box-shadow:
      0 0 0 3px var(--focus),
      0 0 0 9999px rgba(4, 6, 14, 0.74);
    transition: all 0.45s var(--ease);
    pointer-events: none;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  .card {
    position: absolute;
    width: min(340px, calc(100vw - 32px));
    padding: 18px;
    border-radius: 18px;
    box-shadow: var(--shadow-lg);
    background: var(--solid);
  }
  .content {
    animation: pop 0.3s var(--ease);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .ic {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: var(--grad-strong);
    color: white;
  }
  .count {
    flex: 1;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .x {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 0;
    color: var(--text-2);
    border-radius: 8px;
  }
  .x:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  h2 {
    margin: 0 0 6px;
    font-size: 1.12rem;
  }
  .body {
    font-size: 0.9rem;
    color: var(--text-2);
  }
  .body :global(p) {
    margin: 0;
  }
  .dots {
    display: flex;
    gap: 4px;
    margin: 14px 0 12px;
  }
  .dots i {
    flex: 1;
    height: 3px;
    border-radius: 3px;
    background: var(--track);
  }
  .dots i.past {
    background: color-mix(in srgb, var(--accent) 50%, var(--track));
  }
  .dots i.on {
    background: var(--grad);
  }
  .acts {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
</style>
