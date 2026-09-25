<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { TRACK } from '../data/tracks';
  import { LESSON } from '../data/lessons';
  import { SCENARIOS } from '../data/scenarios';
  import { progress } from '../stores/progress.svelte';
  import { href } from '../stores/router.svelte';

  let { id }: { id: string } = $props();
  const t = $derived(TRACK[id]);
  const lessons = $derived(t ? t.lessons.map((l) => LESSON[l]).filter(Boolean) : []);
  const done = $derived(lessons.filter((l) => progress.lessonDone(l.id)).length);
  const scenarios = $derived(SCENARIOS.filter((s) => s.lesson && t?.lessons.includes(s.lesson)));
  const mins = $derived(lessons.reduce((a, l) => a + l.minutes, 0));
</script>

{#if t}
  <div class="page" style:--tc={t.color}>
    <header class="head fade-in">
      <a class="back" href={href.home()}><Icon name="chevron-left" size={14} /> Dashboard</a>
      <span class="eyebrow">{t.provider === 'core' ? 'Foundations' : t.provider === 'aws' ? 'AWS' : 'Terraform'} track</span>
      <h1>{t.title}</h1>
      <p class="muted lead">{t.blurb}</p>
      <div class="meta">
        <span class="chip"><Icon name="book-open" size={13} /> {lessons.length} lessons</span>
        <span class="chip"><Icon name="timer" size={13} /> ~{mins} min</span>
        <span class="chip"><Icon name="check" size={13} /> {done}/{lessons.length} complete</span>
      </div>
      <div class="bar" role="progressbar" aria-label="Track progress" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={done}><span style:width="{(done / Math.max(1, lessons.length)) * 100}%"></span></div>
    </header>

    <ol class="list">
      {#each lessons as l, i (l.id)}
        {@const d = progress.lessonDone(l.id)}
        {@const steps = progress.d.steps[l.id]?.length ?? 0}
        <li class="fade-in" style:animation-delay="{i * 50}ms">
          <a class="lesson" class:done={d} href={href.lesson(l.id)}>
            <span class="num" aria-hidden="true">{#if d}<Icon name="check" size={16} stroke={3} />{:else}{i + 1}{/if}</span>
            <span class="ic" aria-hidden="true"><Icon name={l.icon} size={22} /></span>
            <div class="body">
              <h2 class="lt">{l.title}{#if d}<span class="sr-only"> (completed)</span>{/if}</h2>
              <p>{l.summary}</p>
              <div class="tags">
                <span>{l.level}</span><span>{l.minutes} min</span><span>{l.steps.length} steps</span>
                {#if steps && !d}<span class="prog">{steps}/{l.steps.length} done</span>{/if}
              </div>
            </div>
            <Icon name="chevron-right" size={20} />
          </a>
        </li>
      {/each}
    </ol>

    {#if scenarios.length}
      <h2 class="sub">Put it into practice</h2>
      <div class="scns">
        {#each scenarios as s (s.id)}
          <a class="scn" href={href.play(s.id)}>
            <Icon name={s.icon} size={20} />
            <div>
              <strong>{s.title}</strong>
              <small>{s.difficulty} · {s.steps.length} goals</small>
            </div>
            {#if progress.scenarioDone(s.id)}<span class="okc"><Icon name="circle-check" size={18} /></span><span class="sr-only">(completed)</span>{/if}
          </a>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <div class="page"><h1>Track not found</h1></div>
{/if}

<style>
  .page {
    max-width: 920px;
    margin: 0 auto;
    padding: 36px 32px 64px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82rem;
    color: var(--text-3);
    margin-bottom: 14px;
  }
  .head {
    margin-bottom: 26px;
  }
  .head .eyebrow {
    display: block;
    color: color-mix(in oklab, var(--tc), var(--ink) var(--ink-mix));
  }
  .head h1 {
    margin: 6px 0 8px;
  }
  .lead {
    font-size: 1.02rem;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 14px 0;
  }
  .bar {
    height: 6px;
    border-radius: 6px;
    background: var(--track);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--tc);
    transition: width 0.6s var(--ease);
  }
  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }
  .lesson {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    transition:
      transform 0.2s var(--ease),
      border-color 0.2s,
      background 0.2s;
  }
  .lesson:hover {
    text-decoration: none;
    transform: translateX(4px);
    border-color: color-mix(in srgb, var(--tc) 50%, transparent);
    background: var(--surface-2);
  }
  .lesson > :global(svg:last-child) {
    color: var(--text-3);
  }
  .num {
    width: 30px;
    height: 30px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-size: 0.82rem;
    font-weight: 700;
    background: var(--surface-3);
  }
  .done .num {
    background: var(--tc);
    color: #0b0f1a;
  }
  .ic {
    width: 46px;
    height: 46px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: color-mix(in srgb, var(--tc) 16%, transparent);
    color: var(--tc);
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .body .lt {
    margin: 0 0 3px;
    font-size: 1.02rem;
  }
  .body p {
    margin: 0 0 6px;
    font-size: 0.87rem;
    color: var(--text-2);
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 0.76rem;
    color: var(--text-2);
    font-weight: 600;
  }
  .tags .prog {
    color: color-mix(in oklab, var(--tc), var(--ink) var(--ink-mix));
  }
  .sub {
    margin: 36px 0 12px;
  }
  .scns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .scn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--accent-2-fg);
    transition: border-color 0.2s;
  }
  .scn:hover {
    text-decoration: none;
    border-color: var(--accent);
  }
  .scn div {
    flex: 1;
  }
  .scn strong {
    display: block;
    color: var(--text);
    font-size: 0.9rem;
  }
  .scn small {
    color: var(--text-3);
  }
  .okc {
    display: grid;
    color: var(--ok-fg);
  }
  @media (max-width: 900px) {
    .page {
      padding: 56px 16px 48px;
    }
    .ic {
      display: none;
    }
  }
</style>
