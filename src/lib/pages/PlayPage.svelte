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

  const errs = $derived(board.issues.filter((i) => i.level === 'error').length);
  const warns = $derived(board.issues.filter((i) => i.level === 'warn').length);
</script>

<div class="play">
  <header class="top">
    <div class="title">
      {#if scenario}
        <a class="crumb" href={href.scenarios()}><Icon name="chevron-left" size={14} /> Scenarios</a>
        <strong>{scenario.title}</strong>
      {:else}
        <span class="crumb"><Icon name="blocks" size={14} /> Free play</span>
        <strong>AWS architecture sandbox</strong>
      {/if}
    </div>
    <span class="spacer"></span>
    <button class="btn sm mob" onclick={() => (showPalette = !showPalette)}><Icon name="layout-grid" size={15} /> Services</button>
    <button class="btn sm mob panel-btn" onclick={() => (showPanel = !showPanel)}><Icon name="sliders-horizontal" size={15} /> Panel</button>
    {#if !scenario}
      <a class="btn sm" href={href.scenarios()}><Icon name="list-checks" size={15} /> Guided scenarios</a>
    {/if}
  </header>

  <div class="grid">
    <div class="pal" class:show={showPalette}>
      <Palette />
    </div>
    <div class="cv">
      <SvelteFlowProvider>
        <Canvas />
      </SvelteFlowProvider>
    </div>
    <aside class="panel" class:show={showPanel} data-tour="panels">
      <nav class="tabs">
        {#if scenario}
          <button class:on={tab === 'scenario'} onclick={() => (tab = 'scenario')}><Icon name="list-checks" size={14} /> Goals</button>
        {/if}
        <button class:on={tab === 'inspect'} onclick={() => (tab = 'inspect')}><Icon name="sliders-horizontal" size={14} /> Inspect</button>
        <button class:on={tab === 'issues'} onclick={() => (tab = 'issues')}>
          <Icon name="shield-check" size={14} /> Issues
          {#if errs}<span class="n e">{errs}</span>{:else if warns}<span class="n w">{warns}</span>{/if}
        </button>
        <button class:on={tab === 'terraform'} onclick={() => (tab = 'terraform')}><Icon name="file-code" size={14} /> Terraform</button>
      </nav>
      <div class="body">
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
    font-size: 0.74rem;
    color: var(--text-3);
  }
  .title strong {
    font-size: 0.98rem;
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
    border-bottom: 2px solid transparent;
    background: none;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-3);
    white-space: nowrap;
  }
  .tabs button:hover {
    color: var(--text);
  }
  .tabs button.on {
    color: var(--text);
    border-bottom-color: var(--accent);
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
    background: var(--err);
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
