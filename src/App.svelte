<script lang="ts">
  import { tick } from 'svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Toaster from './lib/components/Toaster.svelte';
  import Tour from './lib/components/Tour.svelte';
  import Icon from './lib/components/Icon.svelte';
  import Home from './lib/pages/Home.svelte';
  import TrackPage from './lib/pages/TrackPage.svelte';
  import LessonPage from './lib/pages/LessonPage.svelte';
  import ScenariosPage from './lib/pages/ScenariosPage.svelte';
  import ComparePage from './lib/pages/ComparePage.svelte';
  import ProviderPage from './lib/pages/ProviderPage.svelte';
  import ProgressPage from './lib/pages/ProgressPage.svelte';
  import { router, href, type Route } from './lib/stores/router.svelte';
  import { settings } from './lib/stores/settings.svelte';
  import { progress } from './lib/stores/progress.svelte';
  import { announcer } from './lib/stores/announce.svelte';
  import { TRACK } from './lib/data/tracks';
  import { LESSON } from './lib/data/lessons';
  import { SCENARIO } from './lib/data/scenarios';
  import { CONCEPT } from './lib/data/compare';

  // The canvas pulls in Svelte Flow, so load it only when needed.
  const loadPlay = () => import('./lib/pages/PlayPage.svelte');

  const r = $derived(router.route);
  const full = $derived(r.name === 'play');
  let main: HTMLElement;

  // First visit to the dashboard: open the tutorial (don't hijack deep links to lessons or scenarios).
  if (!progress.d.tutorialDone && router.route.name === 'home') setTimeout(() => (settings.tourOpen = true), 500);

  const PROVIDERS: Record<string, string> = { aws: 'AWS', terraform: 'Terraform', azure: 'Azure', gcp: 'Google Cloud' };

  function titleFor(route: Route): string {
    switch (route.name) {
      case 'home':
        return 'Dashboard';
      case 'track':
        return TRACK[route.id] ? `${TRACK[route.id].title} track` : 'Track not found';
      case 'lesson': {
        const l = LESSON[route.id];
        if (!l) return 'Lesson not found';
        const step = l.steps[Math.min(route.step, l.steps.length - 1)];
        return `${step.title} (step ${Math.min(route.step, l.steps.length - 1) + 1} of ${l.steps.length}) · ${l.title}`;
      }
      case 'play':
        return route.scenario && SCENARIO[route.scenario] ? `${SCENARIO[route.scenario].title} · Scenario` : 'Free-play canvas';
      case 'scenarios':
        return 'Scenarios';
      case 'compare':
        return route.concept && CONCEPT[route.concept] ? `${CONCEPT[route.concept].title} · Compare clouds` : 'Compare clouds';
      case 'provider':
        return PROVIDERS[route.id] ?? 'Provider not found';
      case 'progress':
        return 'Progress and settings';
      default:
        return 'Page not found';
    }
  }

  // Page titles (WCAG 2.4.2) and focus management on navigation, so screen reader and keyboard
  // users land on the new page's heading instead of wherever focus was left behind.
  let previous: Route | null = null;
  $effect(() => {
    const route = router.route;
    document.title = `${titleFor(route)} · Stratus`;
    const prev = previous;
    previous = route;
    if (!prev) return;
    const samePage =
      prev.name === route.name && (('id' in prev && 'id' in route && prev.id === route.id) || (route.name === 'compare' && prev.name === 'compare'));
    if (samePage) return;
    settings.navOpen = false;
    tick().then(() => {
      setTimeout(() => {
        const h1 = main?.querySelector('h1');
        if (h1 && !settings.tourOpen) {
          h1.setAttribute('tabindex', '-1');
          h1.focus({ preventScroll: true });
        }
      }, 80);
    });
  });

  // Mobile nav is a modal overlay: make the page behind it inert and close on Escape.
  const navModal = $derived(settings.compact && settings.navOpen);
  let menuButton: HTMLButtonElement;
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && navModal) {
      settings.navOpen = false;
      menuButton?.focus();
    }
  }
  $effect(() => {
    if (navModal) tick().then(() => (document.querySelector('#site-nav a') as HTMLElement | null)?.focus());
  });

  function skip() {
    const h1 = main.querySelector('h1');
    const target = (h1 ?? main) as HTMLElement;
    target.setAttribute('tabindex', '-1');
    target.focus();
  }
</script>

<svelte:window onkeydown={onKey} />

<button class="skip-link" onclick={skip}>Skip to main content</button>

<div class="shell" inert={settings.tourOpen || undefined}>
  <Sidebar />
  <main id="main" class:full bind:this={main} inert={navModal || undefined}>
    <button
      class="menu btn sm"
      bind:this={menuButton}
      onclick={() => (settings.navOpen = true)}
      aria-label="Open menu"
      aria-expanded={settings.navOpen}
      aria-controls="site-nav"><Icon name="menu" size={20} /></button
    >
    {#if r.name === 'home'}
      <Home />
    {:else if r.name === 'track'}
      {#key r.id}<TrackPage id={r.id} />{/key}
    {:else if r.name === 'lesson'}
      {#key r.id}<LessonPage id={r.id} step={r.step} />{/key}
    {:else if r.name === 'play'}
      {#await loadPlay()}
        <div class="loading" role="status"><span class="spin" aria-hidden="true"></span> Loading canvas…</div>
      {:then m}
        {#key r.scenario}<m.default scenario={r.scenario} />{/key}
      {/await}
    {:else if r.name === 'scenarios'}
      <ScenariosPage />
    {:else if r.name === 'compare'}
      <ComparePage concept={r.concept} />
    {:else if r.name === 'provider'}
      {#key r.id}<ProviderPage id={r.id} />{/key}
    {:else if r.name === 'progress'}
      <ProgressPage />
    {:else}
      <div class="nf">
        <h1>404: resource not found</h1>
        <p class="muted">Terraform would say <code>Error: reading page: NotFound</code>.</p>
        <a class="btn primary" href={href.home()}>Back to dashboard</a>
      </div>
    {/if}
  </main>
</div>
<Toaster />
<Tour />

<!-- Live regions for status messages (WCAG 4.1.3). Kept outside the shell so they are never inert. -->
<div class="sr-only" aria-live="polite" aria-atomic="true">{announcer.polite}</div>
<div class="sr-only" aria-live="assertive" aria-atomic="true">{announcer.assertive}</div>

<style>
  .shell {
    display: flex;
    min-height: 100vh;
    background:
      radial-gradient(60% 40% at 85% -5%, rgba(124, 92, 255, 0.13), transparent 70%),
      radial-gradient(50% 35% at 30% -10%, rgba(34, 211, 238, 0.08), transparent 70%),
      var(--bg);
  }
  main {
    flex: 1;
    min-width: 0;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    position: relative;
  }
  main.full {
    overflow: hidden;
  }
  main :global(h1[tabindex='-1']:focus) {
    outline: none;
  }
  .menu {
    display: none;
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 30;
    min-width: 40px;
    min-height: 40px;
    background: var(--solid);
    border: 1px solid var(--border-strong);
  }
  .loading {
    height: 100%;
    display: grid;
    place-content: center;
    grid-auto-flow: column;
    gap: 10px;
    align-items: center;
    color: var(--text-2);
  }
  .spin {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid var(--surface-3);
    border-top-color: var(--accent-2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .nf {
    padding: 80px 40px;
    text-align: center;
  }
  @media (max-width: 900px) {
    .menu {
      display: inline-flex;
    }
  }
</style>
