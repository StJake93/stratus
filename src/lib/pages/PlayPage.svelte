<script lang="ts">
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import Canvas from '../canvas/Canvas.svelte';
  import Palette from '../canvas/Palette.svelte';
  import Inspector from '../canvas/Inspector.svelte';
  import IssuesPanel from '../canvas/IssuesPanel.svelte';
  import TerraformPanel from '../canvas/TerraformPanel.svelte';
  import ScenarioPanel from '../canvas/ScenarioPanel.svelte';
  import Icon from '../components/Icon.svelte';
  import { board } from '../canvas/board.svelte';
  import { SCENARIO } from '../data/scenarios';
  import { href } from '../stores/router.svelte';

  let { scenario: scenarioId }: { scenario?: string } = $props();
  // PlayPage is keyed on the scenario id by App, so reading the initial value is intended.
  // svelte-ignore state_referenced_locally
  const scenario = scenarioId ? SCENARIO[scenarioId] : undefined;

  board.load(scenario ? `stratus.board.scenario.${scenario.id}` : 'stratus.board.free', scenario ?? null);

  type Tab = 'scenario' | 'inspect' | 'issues' | 'terraform';
  let tab = $state<Tab>(scenario ? 'scenario' : 'inspect');
  let showPalette = $state(false);
  let showPanel = $state(false);

  let lastSel: string | null = null;
  $effect(() => {
    const s = board.selected;
    if (s && s !== lastSel && tab !== 'scenario') tab = 'inspect';
    if (s && s !== lastSel && window.innerWidth < 1100) showPanel = true;
    lastSel = s;
  });

  const tabs = $derived(
    [
      ...(scenario ? [{ id: 'scenario' as Tab, label: 'Goals', icon: 'list-checks' }] : []),
      { id: 'inspect' as Tab, label: 'Inspect', icon: 'sliders-horizontal' },
      { id: 'issues' as Tab, label: 'Issues', icon: 'shield-check' },
      { id: 'terraform' as Tab, label: 'Terraform', icon: 'file-code' }
    ]
  );
  function tabKey(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === tab);
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    tab = tabs[n].id;
    (document.getElementById(`ptab-${tab}`) as HTMLElement | null)?.focus();
  }
  const errs = $derived(board.issues.filter((i) => i.level === 'error').length);
  const warns = $derived(board.issues.filter((i) => i.level === 'warn').length);
</script>

<div class="play">
  <header class="top">
    <div class="title">
      {#if scenario}
        <a class="crumb" href={href.scenarios()}><Icon name="chevron-left" size={14} /> Scenarios</a>
        <h1>{scenario.title}</h1>
      {:else}
        <span class="crumb"><Icon name="blocks" size={14} /> Free play</span>
        <h1>AWS architecture sandbox</h1>
      {/if}
    </div>
    <span class="spacer"></span>
    <button class="btn sm mob" aria-expanded={showPalette} aria-controls="play-palette" onclick={() => (showPalette = !showPalette)}><Icon name="layout-grid" size={15} /> Services</button>
    <button class="btn sm mob panel-btn" aria-expanded={showPanel} aria-controls="play-panel" onclick={() => (showPanel = !showPanel)}><Icon name="sliders-horizontal" size={15} /> Panel</button>
    {#if !scenario}
      <a class="btn sm" href={href.scenarios()}><Icon name="list-checks" size={15} /> Guided scenarios</a>
    {/if}
  </header>

  <div class="grid">
    <div class="pal" class:show={showPalette} id="play-palette">
      <Palette />
    </div>
    <div class="cv">
      <SvelteFlowProvider>
        <Canvas />
      </SvelteFlowProvider>
    </div>
    <aside class="panel" class:show={showPanel} data-tour="panels" id="play-panel" aria-label="Design panel">
      <div class="tabs" role="tablist" aria-label="Panel" tabindex="-1" onkeydown={tabKey}>
        {#each tabs as t (t.id)}
          <button
            role="tab"
            id="ptab-{t.id}"
            aria-selected={tab === t.id}
            aria-controls="ppanel"
            tabindex={tab === t.id ? 0 : -1}
            onclick={() => (tab = t.id)}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
            {#if t.id === 'issues'}
              {#if errs}<span class="n e">{errs}<span class="sr-only"> errors</span></span>{:else if warns}<span class="n w">{warns}<span class="sr-only"> warnings</span></span>{/if}
            {/if}
          </button>
        {/each}
      </div>
      <div class="body" role="tabpanel" id="ppanel" aria-labelledby="ptab-{tab}" tabindex="-1">
        {#if tab === 'scenario' && scenario}
          {#key scenario.id}<ScenarioPanel {scenario} />{/key}
        {:else if tab === 'inspect'}
          <Inspector />
        {:else if tab === 'issues'}
          <IssuesPanel />
        {:else}
          <TerraformPanel />
        {/if}
      </div>
    </aside>
  </div>
</div>

<style>
  .play {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-2);
  }
  .title {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .crumb {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.76rem;
    color: var(--text-3);
  }
  .title h1 {
    margin: 0;
    font-size: 0.98rem;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mob {
    display: none;
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) 340px;
  }
  .pal,
  .cv,
  .panel {
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
    background: var(--bg-2);
  }
  .tabs {
    display: flex;
    gap: 2px;
    padding: 8px 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .tabs button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 8px 4px;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-2);
    white-space: nowrap;
    border-radius: 8px 8px 0 0;
  }
  .tabs button:hover {
    color: var(--text);
  }
  .tabs button[aria-selected='true'] {
    color: var(--text);
    border-bottom-color: var(--accent-strong);
  }
  .tabs button:focus-visible {
    outline-offset: -2px;
  }
  .body:focus {
    outline: none;
  }
  .n {
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    font-size: 0.66rem;
    color: white;
  }
  .n.e {
    background: var(--err-strong);
  }
  .n.w {
    background: var(--warn);
    color: #3a2800;
  }
  .body {
    flex: 1;
    overflow-y: auto;
  }
  @media (max-width: 1100px) {
    .grid {
      grid-template-columns: 200px minmax(0, 1fr);
      position: relative;
    }
    .panel {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: min(360px, 92vw);
      z-index: 20;
      transform: translateX(100%);
      transition: transform 0.3s var(--ease);
      box-shadow: var(--shadow-lg);
    }
    .panel.show {
      transform: none;
    }
    .panel-btn {
      display: inline-flex;
    }
  }
  @media (max-width: 900px) {
    .top {
      padding-left: 56px;
    }
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .mob {
      display: inline-flex;
    }
    .pal {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 230px;
      z-index: 20;
      transform: translateX(-100%);
      transition: transform 0.3s var(--ease);
      box-shadow: var(--shadow-lg);
    }
    .pal.show {
      transform: none;
    }
  }
</style>
