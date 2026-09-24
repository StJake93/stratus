<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { progress, LEVELS } from '../stores/progress.svelte';
  import { BADGES } from '../data/badges';
  import { TRACKS } from '../data/tracks';
  import { LESSON } from '../data/lessons';
  import { SCENARIOS } from '../data/scenarios';
  import { settings } from '../stores/settings.svelte';
  import { toast } from '../stores/toast.svelte';
  import { href } from '../stores/router.svelte';

  const quizzes = $derived(Object.values(progress.d.quizzes));
  const quizPct = $derived(quizzes.length ? quizzes.reduce((a, q) => a + q.correct / q.total, 0) / quizzes.length : 0);

  function reset() {
    if (confirm('Reset all progress, XP and badges? This cannot be undone.')) {
      progress.reset();
      toast.info('Progress reset', 'A fresh start!');
    }
  }
</script>

<div class="page">
  <header class="head fade-in">
    <span class="eyebrow">Your journey</span>
    <h1>Progress &amp; achievements</h1>
  </header>

  <section class="level card">
    <div class="big">{progress.level.n}</div>
    <div class="info">
      <h2>{progress.level.title}</h2>
      <p class="muted">{progress.d.xp.toLocaleString()} XP {progress.level.next ? `· ${(progress.level.next.xp - progress.d.xp).toLocaleString()} XP to ${progress.level.next.title}` : '· max level!'}</p>
      <div class="bar"><span style:width="{progress.level.pct * 100}%"></span></div>
      <div class="ladder">
        {#each LEVELS as l, i}
          <span class:reached={progress.d.xp >= l.xp} title="{l.title} · {l.xp} XP">{i + 1}</span>
        {/each}
      </div>
    </div>
    <div class="mini">
      <div><Icon name="flame" size={16} /><b>{progress.d.streak.count}</b><small>day streak</small></div>
      <div><Icon name="target" size={16} /><b>{Math.round(quizPct * 100)}%</b><small>quiz accuracy</small></div>
      <div><Icon name="blocks" size={16} /><b>{Object.keys(progress.d.scenarios).length}/{SCENARIOS.length}</b><small>scenarios</small></div>
    </div>
  </section>

  <h2 class="sub">Tracks</h2>
  <div class="tracks">
    {#each TRACKS as t (t.id)}
      {@const ls = t.lessons.filter((l) => LESSON[l])}
      {@const done = ls.filter((l) => progress.lessonDone(l)).length}
      <a class="tr" href={href.track(t.id)} style:--tc={t.color}>
        <span class="ring" style:--p={done / Math.max(1, ls.length)}><b>{Math.round((done / Math.max(1, ls.length)) * 100)}%</b></span>
        <div><strong>{t.title}</strong><small>{done} of {ls.length} lessons</small></div>
      </a>
    {/each}
  </div>

  <h2 class="sub">Badges</h2>
  <div class="badges">
    {#each BADGES as b (b.id)}
      {@const got = progress.d.badges.includes(b.id)}
      <div class="bdg" class:got>
        <span class="bi"><Icon name={got ? b.icon : 'lock'} size={22} /></span>
        <strong>{b.name}</strong>
        <small>{b.desc}</small>
      </div>
    {/each}
  </div>

  <h2 class="sub">Settings</h2>
  <div class="row settings">
    <button class="btn" onclick={() => settings.toggleTheme()}><Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={15} /> {settings.theme === 'dark' ? 'Light' : 'Dark'} mode</button>
    <button class="btn" onclick={() => (settings.tourOpen = true)}><Icon name="circle-play" size={15} /> Replay tutorial</button>
    <button class="btn danger" onclick={reset}><Icon name="trash" size={15} /> Reset progress</button>
  </div>
  <p class="faint small">Progress is stored locally in this browser (no account needed).</p>
</div>

<style>
  .page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 36px 32px 64px;
  }
  .head h1 {
    margin: 6px 0 20px;
  }
  .level {
    display: flex;
    gap: 22px;
    align-items: center;
    padding: 24px;
    flex-wrap: wrap;
    background:
      radial-gradient(80% 120% at 0% 0%, rgba(124, 92, 255, 0.18), transparent 60%),
      var(--surface);
  }
  .big {
    width: 88px;
    height: 88px;
    display: grid;
    place-items: center;
    border-radius: 24px;
    background: var(--grad);
    color: white;
    font-size: 2.4rem;
    font-weight: 800;
    box-shadow: 0 16px 40px -14px rgba(124, 92, 255, 0.9);
  }
  .info {
    flex: 1;
    min-width: 240px;
  }
  .info h2 {
    margin: 0 0 2px;
  }
  .bar {
    height: 8px;
    border-radius: 8px;
    background: var(--surface-3);
    overflow: hidden;
    margin: 10px 0;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--grad);
  }
  .ladder {
    display: flex;
    gap: 4px;
  }
  .ladder span {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    background: var(--surface-2);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-3);
  }
  .ladder span.reached {
    background: var(--accent);
    color: white;
  }
  .mini {
    display: grid;
    gap: 8px;
  }
  .mini div {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--accent-2);
  }
  .mini b {
    color: var(--text);
  }
  .mini small {
    color: var(--text-3);
  }
  .sub {
    margin: 32px 0 12px;
  }
  .tracks {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .tr {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }
  .tr:hover {
    text-decoration: none;
    border-color: var(--tc);
  }
  .tr small {
    display: block;
    color: var(--text-3);
    font-size: 0.76rem;
  }
  .ring {
    width: 52px;
    height: 52px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: conic-gradient(var(--tc) calc(var(--p) * 360deg), var(--surface-3) 0);
    position: relative;
  }
  .ring::before {
    content: '';
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    background: var(--solid);
  }
  .ring b {
    position: relative;
    font-size: 0.74rem;
  }
  .badges {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px;
  }
  .bdg {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 4px;
    padding: 18px 12px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: var(--surface);
    opacity: 0.5;
    filter: grayscale(1);
  }
  .bdg.got {
    opacity: 1;
    filter: none;
    border-color: rgba(124, 92, 255, 0.4);
    background:
      radial-gradient(100% 80% at 50% 0%, rgba(124, 92, 255, 0.18), transparent 70%),
      var(--surface);
  }
  .bi {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--surface-3);
    margin-bottom: 6px;
  }
  .got .bi {
    background: var(--grad);
    color: white;
    box-shadow: 0 8px 22px -8px rgba(124, 92, 255, 0.9);
  }
  .bdg small {
    font-size: 0.74rem;
    color: var(--text-3);
  }
  .settings {
    flex-wrap: wrap;
  }
  .small {
    font-size: 0.8rem;
  }
  @media (max-width: 900px) {
    .page {
      padding: 56px 16px 48px;
    }
  }
</style>
