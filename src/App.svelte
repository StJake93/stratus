<script lang="ts">
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
  import { router, href } from './lib/stores/router.svelte';
  import { settings } from './lib/stores/settings.svelte';
  import { progress } from './lib/stores/progress.svelte';

  // The canvas pulls in Svelte Flow — load it only when needed.
  const loadPlay = () => import('./lib/pages/PlayPage.svelte');

  const r = $derived(router.route);
  const full = $derived(r.name === 'play');

  // First visit to the dashboard: open the tutorial (don't hijack deep links to lessons or scenarios).
  if (!progress.d.tutorialDone && router.route.name === 'home') setTimeout(() => (settings.tourOpen = true), 500);
</script>

<div class="shell">
  <Sidebar />
  <main id="main" class:full>
    <button class="menu btn sm ghost" onclick={() => (settings.navOpen = true)} aria-label="Open menu"><Icon name="menu" size={20} /></button>
    {#if r.name === 'home'}
      <Home />
    {:else if r.name === 'track'}
      {#key r.id}<TrackPage id={r.id} />{/key}
    {:else if r.name === 'lesson'}
      {#key r.id}<LessonPage id={r.id} step={r.step} />{/key}
    {:else if r.name === 'play'}
      {#await loadPlay()}
        <div class="loading"><span class="spin"></span> Loading canvas…</div>
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
        <h1>404 — resource not found</h1>
        <p class="muted">Terraform would say: <code>Error: reading page: NotFound</code></p>
        <a class="btn primary" href={href.home()}>Back to dashboard</a>
      </div>
    {/if}
  </main>
</div>
<Toaster />
<Tour />

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
    overflow-x: hidden;
    height: 100vh;
    overflow-y: auto;
    position: relative;
  }
  main.full {
    overflow: hidden;
  }
  .menu {
    display: none;
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 30;
    background: var(--solid);
    border: 1px solid var(--border);
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
