<script lang="ts">
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
    { route: href.home(), title: 'Welcome to Stratus', icon: 'sparkles', body: 'An interactive lab for learning **cloud infrastructure**, from the basics to building real architectures. This quick tour shows you around (about a minute).' },
    { target: 'nav', title: 'Learning tracks', icon: 'graduation', body: 'Lessons are grouped into **tracks**: Cloud Foundations, three AWS tracks and Terraform. Each lesson mixes tabs, carousels, diagrams, simulations and quizzes.' },
    { target: 'providers', title: 'Provider sections', icon: 'cloud', body: 'Each cloud has its own space. **AWS** and **Terraform** are fully built out; **Azure** and **GCP** are previews that map to the AWS concepts you already know.' },
    { target: 'path', route: href.home(), title: 'Your learning path', icon: 'route', body: 'This map shows every lesson in order. Completed lessons light up — click any node to jump in.' },
    { route: href.play(), target: 'palette', title: 'The build canvas', icon: 'blocks', body: '**Drag** AWS services from this palette onto the canvas. Drop them inside VPCs and subnets, then drag between handles to connect them.' },
    { target: 'panels', title: 'Inspect, validate, export', icon: 'file-code', body: 'Configure the selected component, see **errors, warnings and hints** from the architecture linter, and watch your diagram turn into **Terraform** live.' },
    { target: 'nav-scenarios', title: 'Guided scenarios', icon: 'list-checks', body: 'Scenarios give you a brief (for example, “ship a containerised app”) with step-by-step goals, hints and live checks. Completing them earns the most XP.' },
    { target: 'nav-compare', title: 'Compare clouds', icon: 'git-compare', body: 'Already know Azure or GCP? The comparison tool maps equivalent services side by side (Lambda ↔ Functions ↔ Cloud Run, and so on).' },
    { target: 'xp', title: 'Level up', icon: 'trophy', body: 'Earn XP for lessons, quizzes and builds, unlock badges and keep a streak going. Progress is saved in this browser.' },
    { route: href.home(), title: 'You’re ready!', icon: 'rocket', body: 'Start with **Cloud Foundations**, or jump straight into the canvas. You can replay this tour anytime from the sidebar.' }
  ];

  let i = $state(0);
  let rect = $state<DOMRect | null>(null);
  const step = $derived(steps[i]);

  function locate() {
    const el = step.target ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null) : null;
    rect = el ? el.getBoundingClientRect() : null;
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  $effect(() => {
    if (!settings.tourOpen) return;
    const s = step;
    if (s.route && location.hash !== s.route) router.go(s.route);
    if (s.target && window.innerWidth < 900) settings.navOpen = true;
    // wait for the route/panel to render before measuring
    let tries = 0;
    let raf = 0;
    const seek = () => {
      locate();
      if (!rect && s.target && tries++ < 40) raf = requestAnimationFrame(seek);
    };
    const t = setTimeout(seek, 60);
    // Re-measure while smooth-scrolling or resizing so the spotlight tracks its target.
    let pending = 0;
    const remeasure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const el = s.target ? document.querySelector(`[data-tour="${s.target}"]`) : null;
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

  // Skipping counts as seeing the tour — we never auto-open it again either way.
  function close(_finished: boolean) {
    settings.tourOpen = false;
    settings.navOpen = false;
    i = 0;
    progress.finishTutorial();
  }

  function key(e: KeyboardEvent) {
    if (!settings.tourOpen) return;
    if (e.key === 'Escape') close(false);
    if (e.key === 'ArrowRight' && i < steps.length - 1) i++;
    if (e.key === 'ArrowLeft' && i > 0) i--;
  }

  const pad = 8;
  const card = $derived.by(() => {
    if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    const w = 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // prefer right of target, then below, then left
    if (rect.right + w + 24 < vw) return { left: `${rect.right + 16}px`, top: `${Math.min(Math.max(16, rect.top), vh - 260)}px`, transform: 'none' };
    if (rect.bottom + 240 < vh) return { left: `${Math.min(Math.max(16, rect.left), vw - w - 16)}px`, top: `${rect.bottom + 16}px`, transform: 'none' };
    return { left: `${Math.max(16, rect.left - w - 16)}px`, top: `${Math.min(Math.max(16, rect.top), vh - 260)}px`, transform: 'none' };
  });
</script>

<svelte:window onkeydown={key} />

{#if settings.tourOpen}
  <div class="tour" role="dialog" aria-modal="true" aria-label="Platform tutorial">
    {#if rect}
      <div class="spot" style:left="{rect.left - pad}px" style:top="{rect.top - pad}px" style:width="{rect.width + pad * 2}px" style:height="{rect.height + pad * 2}px"></div>
    {:else}
      <div class="dim"></div>
    {/if}
    {#key i}
      <div class="card glass" style:left={card.left} style:top={card.top} style:transform={card.transform}>
        <div class="top">
          <span class="ic"><Icon name={step.icon} size={20} /></span>
          <span class="count">{i + 1} / {steps.length}</span>
          <button class="x" onclick={() => close(false)} aria-label="Skip tour"><Icon name="x" size={16} /></button>
        </div>
        <h3>{step.title}</h3>
        <div class="body">{@html md(step.body)}</div>
        <div class="dots">{#each steps as _, n}<i class:on={n === i} class:past={n < i}></i>{/each}</div>
        <div class="acts">
          {#if i === 0}
            <button class="btn sm ghost" onclick={() => close(false)}>Skip</button>
          {:else}
            <button class="btn sm ghost" onclick={() => i--}><Icon name="chevron-left" size={14} /> Back</button>
          {/if}
          <span class="spacer"></span>
          {#if i < steps.length - 1}
            <button class="btn sm primary" onclick={() => i++}>{i === 0 ? 'Show me around' : 'Next'} <Icon name="arrow-right" size={14} /></button>
          {:else}
            <a class="btn sm" href={href.play()} onclick={() => close(true)}>Open canvas</a>
            <a class="btn sm primary" href={href.lesson('cloud-101')} onclick={() => close(true)}>Start learning <Icon name="arrow-right" size={14} /></a>
          {/if}
        </div>
      </div>
    {/key}
  </div>
{/if}

<style>
  .tour {
    position: fixed;
    inset: 0;
    z-index: 300;
  }
  .dim {
    position: absolute;
    inset: 0;
    background: rgba(4, 6, 14, 0.7);
    backdrop-filter: blur(3px);
    animation: fade 0.3s;
  }
  .spot {
    position: absolute;
    border-radius: 14px;
    box-shadow:
      0 0 0 3px var(--accent-2),
      0 0 0 9999px rgba(4, 6, 14, 0.72);
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
    animation: pop 0.35s var(--ease);
  }
  @keyframes pop {
    from {
      opacity: 0;
      scale: 0.94;
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
    background: var(--grad);
    color: white;
  }
  .count {
    flex: 1;
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-3);
  }
  .x {
    display: grid;
    background: none;
    border: 0;
    color: var(--text-3);
    padding: 4px;
    border-radius: 6px;
  }
  h3 {
    margin: 0 0 6px;
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
    background: var(--surface-3);
  }
  .dots i.past {
    background: color-mix(in srgb, var(--accent) 50%, var(--surface-3));
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
