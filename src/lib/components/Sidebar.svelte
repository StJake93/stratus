<script lang="ts">
  import Icon from './Icon.svelte';
  import { router, href } from '../stores/router.svelte';
  import { progress } from '../stores/progress.svelte';
  import { settings } from '../stores/settings.svelte';
  import { TRACKS } from '../data/tracks';

  const r = $derived(router.route);
  const isTrack = (id: string) => (r.name === 'track' && r.id === id) || (r.name === 'lesson' && TRACKS.find((t) => t.id === id)?.lessons.includes(r.id));
  const trackPct = (id: string) => {
    const t = TRACKS.find((x) => x.id === id)!;
    return t.lessons.filter((l) => progress.lessonDone(l)).length / t.lessons.length;
  };
  const providers = [
    { id: 'aws', label: 'AWS', color: 'var(--aws)', icon: 'cloud' },
    { id: 'terraform', label: 'Terraform', color: 'var(--tf)', icon: 'file-code' },
    { id: 'azure', label: 'Azure', color: 'var(--azure)', icon: 'cloud', soon: true },
    { id: 'gcp', label: 'Google Cloud', color: 'var(--gcp)', icon: 'cloud', soon: true }
  ];
</script>

<nav class="side" class:open={settings.navOpen} aria-label="Main">
  <a class="brand" href={href.home()} onclick={() => (settings.navOpen = false)}>
    <span class="logo"><Icon name="cloud" size={20} stroke={2.4} /></span>
    <span><strong>Stratus</strong><small>Cloud infrastructure lab</small></span>
  </a>

  <div class="scroll" onclick={(e) => (e.target as HTMLElement).closest('a') && (settings.navOpen = false)} role="presentation">
    <a class="item" class:on={r.name === 'home'} href={href.home()}><Icon name="house" size={17} /> Dashboard</a>

    <div class="label">Learn</div>
    <div data-tour="nav">
      {#each TRACKS as t (t.id)}
        {@const pct = trackPct(t.id)}
        <a class="item track" class:on={isTrack(t.id)} href={href.track(t.id)} style:--tc={t.color}>
          <span class="ring" style:--p={pct}><i></i></span>
          <span class="t">{t.title}</span>
          {#if pct === 1}<Icon name="check" size={14} />{/if}
        </a>
      {/each}
    </div>

    <div class="label">Build</div>
    <a class="item" class:on={r.name === 'play' && !r.scenario} href={href.play()}><Icon name="blocks" size={17} /> Free-play canvas</a>
    <a class="item" class:on={r.name === 'scenarios' || (r.name === 'play' && !!r.scenario)} href={href.scenarios()} data-tour="nav-scenarios"><Icon name="list-checks" size={17} /> Scenarios</a>
    <a class="item" class:on={r.name === 'compare'} href={href.compare()} data-tour="nav-compare"><Icon name="git-compare" size={17} /> Compare clouds</a>

    <div class="label">Providers</div>
    <div data-tour="providers">
      {#each providers as p}
        <a class="item" class:on={r.name === 'provider' && r.id === p.id} href={href.provider(p.id)} style:--pc={p.color}>
          <span class="pdot"></span> {p.label}
          {#if p.soon}<span class="soon">preview</span>{/if}
        </a>
      {/each}
    </div>
  </div>

  <div class="foot">
    <a class="xp" href={href.progress()} data-tour="xp">
      <div class="lvl">
        <span class="badge">{progress.level.n}</span>
        <div>
          <strong>{progress.level.title}</strong>
          <small>{progress.d.xp.toLocaleString()} XP{progress.level.next ? ` · ${progress.level.next.xp - progress.d.xp} to next` : ''}</small>
        </div>
        {#if progress.d.streak.count > 1}<span class="streak" title="Day streak"><Icon name="flame" size={14} />{progress.d.streak.count}</span>{/if}
      </div>
      <div class="bar"><span style:width="{progress.level.pct * 100}%"></span></div>
    </a>
    <div class="row tools">
      <button class="btn sm ghost" onclick={() => settings.toggleTheme()} aria-label="Toggle theme" title="Toggle theme"><Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={16} /></button>
      <button class="btn sm ghost" onclick={() => (settings.tourOpen = true)} title="Replay tutorial"><Icon name="circle-play" size={16} /> Tour</button>
      <a class="btn sm ghost" href="https://github.com/StJake93/stratus" target="_blank" rel="noopener" title="Source code"><Icon name="code-xml" size={16} /></a>
    </div>
  </div>
</nav>
{#if settings.navOpen}<button class="scrim" aria-label="Close menu" onclick={() => (settings.navOpen = false)}></button>{/if}

<style>
  .side {
    position: sticky;
    top: 0;
    height: 100vh;
    width: var(--sidebar-w);
    flex: none;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    background: var(--bg-2);
    z-index: 50;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 18px 14px;
    color: var(--text);
  }
  .brand:hover {
    text-decoration: none;
  }
  .logo {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: var(--grad);
    color: white;
    box-shadow: 0 6px 20px -6px rgba(124, 92, 255, 0.8);
  }
  .brand strong {
    display: block;
    font-size: 1.05rem;
    letter-spacing: -0.02em;
  }
  .brand small {
    display: block;
    font-size: 0.7rem;
    color: var(--text-3);
    margin-top: -2px;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 4px 10px 16px;
  }
  .label {
    margin: 16px 10px 6px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-3);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    color: var(--text-2);
    font-size: 0.88rem;
    font-weight: 550;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .item:hover {
    background: var(--surface-2);
    color: var(--text);
    text-decoration: none;
  }
  .item.on {
    background: var(--accent-soft);
    color: var(--text);
    box-shadow: inset 2px 0 0 var(--accent);
  }
  .track .t {
    flex: 1;
  }
  .track :global(svg) {
    color: var(--ok);
  }
  .ring {
    width: 16px;
    height: 16px;
    flex: none;
    border-radius: 50%;
    background: conic-gradient(var(--tc) calc(var(--p) * 360deg), var(--surface-3) 0);
    display: grid;
    place-items: center;
  }
  .ring i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--bg-2);
  }
  .pdot {
    width: 9px;
    height: 9px;
    border-radius: 3px;
    background: var(--pc);
    margin: 0 4px 0 3px;
  }
  .soon {
    margin-left: auto;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    border: 1px solid var(--border);
    padding: 1px 6px;
    border-radius: 6px;
  }
  .foot {
    padding: 10px;
    border-top: 1px solid var(--border);
  }
  .xp {
    display: block;
    padding: 10px;
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
    transition: background 0.2s;
  }
  .xp:hover {
    background: var(--surface-2);
    text-decoration: none;
  }
  .lvl {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .lvl > div {
    flex: 1;
    min-width: 0;
  }
  .badge {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--grad);
    color: white;
    font-weight: 800;
  }
  .lvl strong {
    display: block;
    font-size: 0.82rem;
  }
  .lvl small {
    display: block;
    font-size: 0.7rem;
    color: var(--text-3);
  }
  .streak {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fb923c;
  }
  .bar {
    height: 5px;
    border-radius: 5px;
    background: var(--surface-3);
    margin-top: 9px;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--grad);
    transition: width 0.6s var(--ease);
  }
  .tools {
    margin-top: 8px;
    gap: 2px;
  }
  .scrim {
    display: none;
  }
  @media (max-width: 900px) {
    .side {
      position: fixed;
      left: 0;
      top: 0;
      transform: translateX(-100%);
      transition: transform 0.3s var(--ease);
      box-shadow: var(--shadow-lg);
    }
    .side.open {
      transform: none;
    }
    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(0, 0, 0, 0.5);
      border: 0;
    }
  }
</style>
