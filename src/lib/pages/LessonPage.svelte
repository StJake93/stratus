<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import Blocks from '../components/Blocks.svelte';
  import { LESSON } from '../data/lessons';
  import { TRACK, TRACKS } from '../data/tracks';
  import { progress } from '../stores/progress.svelte';
  import { href, router } from '../stores/router.svelte';

  let { id, step }: { id: string; step: number } = $props();

  const lesson = $derived(LESSON[id]);
  const track = $derived(lesson ? TRACK[lesson.track] : undefined);
  const idx = $derived(lesson ? Math.min(step, lesson.steps.length - 1) : 0);
  const cur = $derived(lesson?.steps[idx]);
  const last = $derived(lesson ? idx === lesson.steps.length - 1 : false);

  const order = TRACKS.flatMap((t) => t.lessons).filter((l) => LESSON[l]);
  const nextLesson = $derived(LESSON[order[order.indexOf(id) + 1]]);
  const prevLesson = $derived(LESSON[order[order.indexOf(id) - 1]]);

  let contentEl: HTMLElement | undefined = $state();

  function go(n: number) {
    router.go(href.lesson(id, n));
    contentEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function next() {
    progress.completeStep(id, idx);
    if (!last) go(idx + 1);
    else progress.completeLesson(id, lesson.title);
  }
</script>

{#if lesson && cur && track}
  <div class="wrap" style:--tc={track.color}>
    <aside class="outline">
      <a class="back" href={href.track(track.id)}><Icon name="chevron-left" size={14} /> {track.title}</a>
      <div class="lhead">
        <span class="lic"><Icon name={lesson.icon} size={20} /></span>
        <strong>{lesson.title}</strong>
      </div>
      <ol>
        {#each lesson.steps as s, i}
          {@const d = progress.stepDone(id, i)}
          <li>
            <button class:on={i === idx} class:done={d} onclick={() => go(i)}>
              <span class="n">{#if d}<Icon name="check" size={12} stroke={3} />{:else}{i + 1}{/if}</span>
              <span>{s.title}</span>
            </button>
          </li>
        {/each}
      </ol>
      <div class="meta">
        <span><Icon name="timer" size={13} /> {lesson.minutes} min</span>
        <span><Icon name="gauge" size={13} /> {lesson.level}</span>
      </div>
    </aside>

    <article class="content" bind:this={contentEl}>
      <div class="progress"><span style:width="{((idx + 1) / lesson.steps.length) * 100}%"></span></div>
      <header>
        <span class="eyebrow">Step {idx + 1} of {lesson.steps.length}</span>
        <h1>{cur.title}</h1>
      </header>
      {#key idx}
        <div class="blocks fade-in">
          <Blocks blocks={cur.blocks} />
        </div>
      {/key}

      <footer class="nav">
        {#if idx > 0}
          <button class="btn" onclick={() => go(idx - 1)}><Icon name="arrow-left" size={16} /> Back</button>
        {:else if prevLesson}
          <a class="btn ghost" href={href.lesson(prevLesson.id)}><Icon name="arrow-left" size={16} /> {prevLesson.title}</a>
        {/if}
        <span class="spacer"></span>
        {#if !last}
          <button class="btn primary" onclick={next}>Continue <Icon name="arrow-right" size={16} /></button>
        {:else if !progress.lessonDone(id)}
          <button class="btn primary" onclick={next}><Icon name="check" size={16} /> Complete lesson</button>
        {:else if nextLesson}
          <a class="btn primary" href={href.lesson(nextLesson.id)}>Next: {nextLesson.title} <Icon name="arrow-right" size={16} /></a>
        {:else}
          <a class="btn primary" href={href.scenarios()}>Try a build scenario <Icon name="arrow-right" size={16} /></a>
        {/if}
      </footer>

      {#if last && progress.lessonDone(id)}
        <div class="complete fade-in">
          <Icon name="trophy" size={28} />
          <div>
            <strong>Lesson complete!</strong>
            <p>{nextLesson ? `Up next: ${nextLesson.title}.` : 'You’ve finished every lesson. Time to build!'}</p>
          </div>
        </div>
      {/if}
    </article>
  </div>
{:else}
  <div class="nf"><h1>Lesson not found</h1><a href={href.home()}>Back to dashboard</a></div>
{/if}

<style>
  .wrap {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 40px;
    max-width: 1180px;
    margin: 0 auto;
    padding: 32px 32px 80px;
  }
  .outline {
    position: sticky;
    top: 24px;
    align-self: start;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--text-3);
  }
  .lhead {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0 12px;
  }
  .lic {
    width: 38px;
    height: 38px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: color-mix(in srgb, var(--tc) 16%, transparent);
    color: var(--tc);
  }
  .lhead strong {
    font-size: 0.95rem;
    line-height: 1.25;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    border-left: 2px solid var(--border);
  }
  ol button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    margin-left: -2px;
    border: 0;
    border-left: 2px solid transparent;
    background: none;
    font-size: 0.84rem;
    color: var(--text-2);
    transition: all 0.2s;
  }
  ol button:hover {
    color: var(--text);
  }
  ol button.on {
    border-left-color: var(--tc);
    color: var(--text);
    font-weight: 600;
    background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 10%, transparent), transparent);
  }
  .n {
    width: 20px;
    height: 20px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--surface-3);
    font-size: 0.68rem;
    font-weight: 700;
  }
  .done .n {
    background: var(--tc);
    color: #0b0f1a;
  }
  .meta {
    display: flex;
    gap: 14px;
    margin-top: 16px;
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .content {
    min-width: 0;
    max-width: 820px;
    scroll-margin-top: 20px;
  }
  .progress {
    height: 4px;
    border-radius: 4px;
    background: var(--surface-3);
    overflow: hidden;
    margin-bottom: 22px;
  }
  .progress span {
    display: block;
    height: 100%;
    background: var(--tc);
    transition: width 0.5s var(--ease);
  }
  header h1 {
    margin: 6px 0 18px;
    font-size: clamp(1.6rem, 2.6vw, 2.1rem);
  }
  .blocks {
    font-size: 1rem;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .complete {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-top: 18px;
    padding: 16px 18px;
    border-radius: var(--radius-lg);
    background:
      radial-gradient(100% 140% at 0 50%, color-mix(in srgb, var(--tc) 22%, transparent), transparent 70%),
      var(--surface);
    border: 1px solid color-mix(in srgb, var(--tc) 40%, transparent);
    color: var(--tc);
  }
  .complete strong {
    color: var(--text);
  }
  .complete p {
    margin: 2px 0 0;
    color: var(--text-2);
    font-size: 0.9rem;
  }
  .nf {
    padding: 60px;
  }
  @media (max-width: 960px) {
    .wrap {
      grid-template-columns: 1fr;
      padding: 56px 16px 60px;
      gap: 18px;
    }
    .outline {
      position: static;
    }
    ol {
      display: flex;
      overflow-x: auto;
      border-left: 0;
      border-bottom: 2px solid var(--border);
    }
    ol button {
      white-space: nowrap;
      border-left: 0;
      border-bottom: 2px solid transparent;
      margin: 0 0 -2px;
    }
    ol button.on {
      border-bottom-color: var(--tc);
    }
    .meta {
      display: none;
    }
  }
</style>
