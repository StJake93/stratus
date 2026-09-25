<script lang="ts">
  import Icon from './Icon.svelte';
  import { router, href } from '../stores/router.svelte';
  import { progress } from '../stores/progress.svelte';
  import { settings } from '../stores/settings.svelte';
  import { TRACKS } from '../data/tracks';

  const r = $derived(router.route);
  const isTrack = (id: string) => (r.name === 'track' && r.id === id) || (r.name === 'lesson' && !!TRACKS.find((t) => t.id === id)?.lessons.includes(r.id));
  const trackDone = (id: string) => {
    const t = TRACKS.find((x) => x.id === id)!;
    return t.lessons.filter((l) => progress.lessonDone(l)).length;
  };
  const providers = [
    { id: 'aws', label: 'AWS', color: 'var(--aws)' },
    { id: 'terraform', label: 'Terraform', color: 'var(--tf)' },
    { id: 'azure', label: 'Azure', color: 'var(--azure)', soon: true },
    { id: 'gcp', label: 'Google Cloud', color: 'var(--gcp)', soon: true }
  ];
  const current = (on: boolean) => (on ? ('page' as const) : undefined);
</script>

<nav id="site-nav" class="side" class:open={settings.navOpen} aria-label="Main">
  <a class="brand" href={href.home()} aria-label="Stratus, cloud infrastructure lab: dashboard">
    <span class="logo" aria-hidden="true"><Icon name="cloud" size={20} stroke={2.4} /></span>
    <span aria-hidden="true"><strong>Stratus</strong><small>Cloud infrastructure lab</small></span>
  </a>

  <div class="scroll" onclick={(e) => (e.target as HTMLElement).closest('a') && (settings.navOpen = false)} role="presentation">
    <ul class="list">
      <li><a class="item" aria-current={current(r.name === 'home')} href={href.home()}><Icon name="house" size={17} /> Dashboard</a></li>
    </ul>

    <p class="label" id="nav-learn">Learn</p>
    <ul class="list" aria-labelledby="nav-learn" data-tour="nav">
      {#each TRACKS as t (t.id)}
        {@const done = trackDone(t.id)}
        {@const pct = done / t.lessons.length}
        <li>
          <a class="item track" aria-current={current(!!isTrack(t.id))} href={href.track(t.id)} style:--tc={t.color}>
            <span class="ring" style:--p={pct} aria-hidden="true"><i></i></span>
            <span class="t">{t.title}</span>
            <span class="sr-only">, {done} of {t.lessons.length} lessons complete</span>
            {#if pct === 1}<Icon name="check" size={14} />{/if}
          </a>
        </li>
      {/each}
    </ul>

    <p class="label" id="nav-build">Build</p>
    <ul class="list" aria-labelledby="nav-build">
      <li><a class="item" aria-current={current(r.name === 'play' && !r.scenario)} href={href.play()}><Icon name="blocks" size={17} /> Free-play canvas</a></li>
      <li>
        <a class="item" aria-current={current(r.name === 'scenarios' || (r.name === 'play' && !!r.scenario))} href={href.scenarios()} data-tour="nav-scenarios"
          ><Icon name="list-checks" size={17} /> Scenarios</a
        >
      </li>
      <li><a class="item" aria-current={current(r.name === 'compare')} href={href.compare()} data-tour="nav-compare"><Icon name="git-compare" size={17} /> Compare clouds</a></li>
    </ul>

    <p class="label" id="nav-providers">Providers</p>
    <ul class="list" aria-labelledby="nav-providers" data-tour="providers">
      {#each providers as p}
        <li>
          <a class="item" aria-current={current(r.name === 'provider' && r.id === p.id)} href={href.provider(p.id)} style:--pc={p.color}>
            <span class="pdot" aria-hidden="true"></span>
            {p.label}
            {#if p.soon}<span class="soon">preview</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <div class="foot">
    <a class="xp" href={href.progress()} data-tour="xp" aria-current={current(r.name === 'progress')}>
      <div class="lvl">
        <span class="badge" aria-hidden="true">{progress.level.n}</span>
        <div>
          <strong><span class="sr-only">Level {progress.level.n}: </span>{progress.level.title}</strong>
          <small>{progress.d.xp.toLocaleString()} XP{progress.level.next ? ` · ${progress.level.next.xp - progress.d.xp} to next level` : ''}</small>
        </div>
        {#if progress.d.streak.count > 1}<span class="streak"><Icon name="flame" size={14} />{progress.d.streak.count}<span class="sr-only"> day streak</span></span>{/if}
      </div>
      <div class="bar" aria-hidden="true"><span style:width="{progress.level.pct * 100}%"></span></div>
    </a>
    <div class="row tools">
      <button class="btn sm ghost" onclick={() => settings.toggleTheme()} aria-label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme"
        ><Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={16} /></button
      >
      <button class="btn sm ghost" onclick={() => settings.toggleMotion()} aria-pressed={settings.reduced} aria-label="Reduce motion" title="Reduce motion"
        ><Icon name={settings.reduced ? 'pause' : 'sparkles'} size={16} /></button
      >
      <button class="btn sm ghost" onclick={() => (settings.tourOpen = true)}><Icon name="circle-play" size={16} /> Tour</button>
      <a class="btn sm ghost" href="https://github.com/StJake93/stratus" target="_blank" rel="noopener" aria-label="Source code on GitHub (opens in a new tab)" title="Source code"
        ><Icon name="code-xml" size={16} /></a
      >
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
    margin: 12px 10px 8px;
    padding: 6px 8px;
    border-radius: 12px;
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
    background: var(--grad-strong);
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
    font-size: 0.72rem;
    color: var(--text-3);
    margin-top: -2px;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 6px 10px 16px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .label {
    margin: 16px 10px 6px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-3);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 7px 10px;
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
  .item[aria-current='page'] {
    background: var(--accent-soft);
    color: var(--text);
    box-shadow: inset 3px 0 0 var(--accent-strong);
    font-weight: 650;
  }
  .track .t {
    flex: 1;
  }
  .track :global(svg:last-child) {
    color: var(--ok-fg);
  }
  .ring {
    width: 16px;
    height: 16px;
    flex: none;
    border-radius: 50%;
    background: conic-gradient(var(--tc) calc(var(--p) * 360deg), var(--track) 0);
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
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    border: 1px solid var(--border-strong);
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
    background: var(--grad-strong);
    color: white;
    font-weight: 800;
  }
  .lvl strong {
    display: block;
    font-size: 0.82rem;
  }
  .lvl small {
    display: block;
    font-size: 0.72rem;
    color: var(--text-3);
  }
  .streak {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--aws-fg);
  }
  .bar {
    height: 5px;
    border-radius: 5px;
    background: var(--track);
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
      visibility: hidden;
      transition:
        transform 0.3s var(--ease),
        visibility 0.3s;
      box-shadow: var(--shadow-lg);
    }
    .side.open {
      transform: none;
      visibility: visible;
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
