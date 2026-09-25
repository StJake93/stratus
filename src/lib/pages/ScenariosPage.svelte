<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { SCENARIOS } from '../data/scenarios';
  import { LESSON } from '../data/lessons';
  import { progress } from '../stores/progress.svelte';
  import { href } from '../stores/router.svelte';
  import { md } from '../md';

  const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
  let filter = $state<string>('All');
  const list = $derived(filter === 'All' ? SCENARIOS : SCENARIOS.filter((s) => s.difficulty === filter));
  const color = { Beginner: 'var(--ok-fg)', Intermediate: 'var(--warn-fg)', Advanced: 'var(--err-fg)' };
</script>

<div class="page">
  <header class="head fade-in">
    <span class="eyebrow">Guided builds</span>
    <h1>Scenarios</h1>
    <p class="muted lead">Real-world briefs to solve on the canvas. Each one has goals that are checked live as you build, hints if you get stuck, and a debrief explaining why the architecture works. Finishing without hints earns bonus XP.</p>
    <div class="filters" role="group" aria-label="Filter by difficulty">
      {#each ['All', ...levels] as l}<button aria-pressed={filter === l} onclick={() => (filter = l)}>{l}</button>{/each}
      <span class="spacer"></span>
      <span class="chip"><Icon name="trophy" size={13} /> {Object.keys(progress.d.scenarios).length}/{SCENARIOS.length} complete</span>
    </div>
  </header>

  <div class="grid">
    {#each list as s, i (s.id)}
      {@const done = progress.scenarioDone(s.id)}
      <a class="scn fade-in" class:done href={href.play(s.id)} style:--dc={color[s.difficulty]} style:animation-delay="{i * 40}ms">
        <div class="top">
          <span class="ic" aria-hidden="true"><Icon name={s.icon} size={22} /></span>
          <span class="lvl">{s.difficulty}</span>
          {#if done}<span class="ok"><Icon name="circle-check" size={18} /> <span class="sr-only">Completed</span></span>{/if}
        </div>
        <h2 class="st">{s.title}</h2>
        <p>{s.summary}</p>
        <div class="story">{@html md(s.story)}</div>
        <div class="foot">
          <span><Icon name="list-checks" size={13} /> {s.steps.length} goals</span>
          {#if s.lesson && LESSON[s.lesson]}<span><Icon name="book-open" size={13} /> {LESSON[s.lesson].title}</span>{/if}
          <span class="spacer"></span>
          <span class="go">{done ? 'Replay' : 'Start'} <Icon name="arrow-right" size={14} /></span>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 36px 32px 64px;
  }
  .head h1 {
    margin: 6px 0 8px;
  }
  .lead {
    max-width: 760px;
  }
  .filters {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 18px 0 20px;
    flex-wrap: wrap;
  }
  .filters button {
    min-height: 32px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 5px 14px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .filters button[aria-pressed='true'] {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: #ffffff;
  }
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
  .scn {
    display: flex;
    flex-direction: column;
    padding: 20px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    transition:
      transform 0.25s var(--ease),
      border-color 0.25s,
      box-shadow 0.25s;
  }
  .scn:hover {
    text-decoration: none;
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: 0 20px 40px -24px var(--accent);
  }
  .scn.done {
    border-color: rgba(52, 211, 153, 0.35);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ic {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: var(--grad-strong);
    color: white;
  }
  .lvl {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--dc);
    border: 1px solid color-mix(in srgb, var(--dc) 55%, transparent);
    padding: 2px 8px;
    border-radius: 6px;
  }
  .ok {
    margin-left: auto;
    color: var(--ok-fg);
    display: grid;
  }
  .st {
    margin: 14px 0 4px;
    font-size: 1.12rem;
  }
  .scn > p {
    color: var(--text-2);
    font-size: 0.9rem;
    margin: 0 0 10px;
  }
  .story {
    flex: 1;
    font-size: 0.84rem;
    color: var(--text-2);
    border-left: 2px solid var(--border-strong);
    padding-left: 10px;
    margin-bottom: 14px;
  }
  .story :global(p) {
    margin: 0;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.78rem;
    color: var(--text-2);
    flex-wrap: wrap;
  }
  .foot span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .go {
    font-weight: 700;
    color: var(--accent-2-fg);
    font-size: 0.84rem;
  }
  @media (max-width: 900px) {
    .page {
      padding: 56px 16px 48px;
    }
  }
</style>
