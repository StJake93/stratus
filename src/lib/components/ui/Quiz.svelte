<script lang="ts">
  import { tick } from 'svelte';
  import Icon from '../Icon.svelte';
  import type { QuizQuestion } from '../../data/types';
  import { progress } from '../../stores/progress.svelte';
  import { md, mdInline } from '../../md';
  import { headingLevel, tag } from '../../heading';

  let { id, questions, oncomplete }: { id: string; questions: QuizQuestion[]; oncomplete?: () => void } = $props();

  const level = headingLevel();
  let idx = $state(0);
  let picked = $state<number | null>(null);
  let correct = $state(0);
  let done = $state(false);
  let shake = $state(false);
  let nextBtn: HTMLButtonElement | undefined = $state();
  let firstOpt: HTMLButtonElement | undefined = $state();
  let resultEl: HTMLElement | undefined = $state();

  const q = $derived(questions[idx]);
  const best = $derived(progress.d.quizzes[id]);

  async function pick(i: number) {
    if (picked !== null) return;
    picked = i;
    if (i === q.answer) correct++;
    else {
      shake = true;
      setTimeout(() => (shake = false), 450);
    }
    // Options become inactive, so move focus forward instead of losing it.
    await tick();
    nextBtn?.focus();
  }

  async function next() {
    if (idx + 1 < questions.length) {
      idx++;
      picked = null;
      await tick();
      firstOpt?.focus();
    } else {
      done = true;
      progress.recordQuiz(id, correct, questions.length);
      oncomplete?.();
      await tick();
      resultEl?.focus();
    }
  }

  async function retry() {
    idx = 0;
    picked = null;
    correct = 0;
    done = false;
    await tick();
    firstOpt?.focus();
  }
</script>

<section class="quiz" aria-labelledby="{id}-quiz-title">
  <div class="top">
    <svelte:element this={tag(level)} class="eyebrow title" id="{id}-quiz-title"><Icon name="brain-circuit" size={14} /> Knowledge check</svelte:element>
    <span class="spacer"></span>
    {#if best}<span class="chip">Best {best.correct}/{best.total}</span>{/if}
    {#if !done}<span class="chip">Question {idx + 1} of {questions.length}</span>{/if}
  </div>

  {#if done}
    {@const pct = correct / questions.length}
    <div class="result fade-in" tabindex="-1" bind:this={resultEl}>
      <div class="score" style:--p={pct} aria-hidden="true">
        <span>{correct}/{questions.length}</span>
      </div>
      <div>
        <p class="rt"><strong>{pct === 1 ? 'Flawless!' : pct >= 0.6 ? 'Nice work!' : 'Keep going: review and retry.'}</strong> <span class="sr-only">You scored {correct} out of {questions.length}.</span></p>
        <p class="muted">{pct === 1 ? 'You nailed every question.' : 'Each retry only adds XP for newly correct answers.'}</p>
        <button class="btn sm" onclick={retry}><Icon name="rotate-ccw" size={14} /> Retry quiz</button>
      </div>
    </div>
  {:else}
    {#key idx}
      <fieldset class="q fade-in" class:shake>
        <legend class="stem">{@html mdInline(q.q)}</legend>
        <div class="opts">
          {#each q.options as opt, i}
            {@const state = picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'}
            {#if i === 0}
              <button class="opt {state}" bind:this={firstOpt} aria-disabled={picked !== null} onclick={() => pick(i)}>
                <span class="letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span class="txt">{@html md(opt)}</span>
                {@render mark(state)}
              </button>
            {:else}
              <button class="opt {state}" aria-disabled={picked !== null} onclick={() => pick(i)}>
                <span class="letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span class="txt">{@html md(opt)}</span>
                {@render mark(state)}
              </button>
            {/if}
          {/each}
        </div>
        <div aria-live="polite">
          {#if picked !== null}
            <div class="explain fade-in" class:ok={picked === q.answer}>
              <strong>{picked === q.answer ? 'Correct.' : 'Not quite.'}</strong>
              {@html md(q.explain)}
            </div>
          {/if}
        </div>
        {#if picked !== null}
          <div class="row" style="justify-content:flex-end">
            <button class="btn primary sm" bind:this={nextBtn} onclick={next}>{idx + 1 < questions.length ? 'Next question' : 'See results'} <Icon name="arrow-right" size={14} /></button>
          </div>
        {/if}
      </fieldset>
    {/key}
  {/if}
</section>

{#snippet mark(state: string)}
  {#if state === 'right'}<Icon name="circle-check" size={18} /><span class="sr-only">(correct answer)</span>{/if}
  {#if state === 'wrong'}<Icon name="circle-x" size={18} /><span class="sr-only">(your answer, incorrect)</span>{/if}
{/snippet}

<style>
  .quiz {
    margin: 18px 0;
    padding: 18px 20px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    background:
      radial-gradient(90% 90% at 0% 0%, rgba(34, 211, 238, 0.08), transparent 60%),
      var(--surface);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .title {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin: 0;
    line-height: 1.4;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  .stem {
    padding: 0;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 1.02rem;
  }
  .opts {
    display: grid;
    gap: 8px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    text-align: left;
    padding: 10px 14px;
    border-radius: 11px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    transition: all 0.2s var(--ease);
  }
  .opt[aria-disabled='false']:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    transform: translateX(3px);
  }
  .opt[aria-disabled='true'] {
    cursor: default;
  }
  .txt {
    flex: 1;
  }
  .txt :global(p) {
    margin: 0;
  }
  .letter {
    width: 26px;
    height: 26px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 7px;
    background: var(--surface-2);
    font-size: 0.78rem;
    font-weight: 700;
  }
  .opt.right {
    border-color: var(--ok);
    background: var(--ok-soft);
    color: var(--ok-fg);
  }
  .opt.wrong {
    border-color: var(--err);
    background: var(--err-soft);
    color: var(--err-fg);
  }
  .opt.dim {
    color: var(--text-2);
  }
  .explain {
    margin: 12px 0;
    padding: 12px 14px;
    border-radius: 11px;
    background: var(--err-soft);
    font-size: 0.92rem;
  }
  .explain.ok {
    background: var(--ok-soft);
  }
  .explain :global(p) {
    display: inline;
  }
  .shake {
    animation: shake 0.4s;
  }
  @keyframes shake {
    20%,
    60% {
      transform: translateX(-5px);
    }
    40%,
    80% {
      transform: translateX(5px);
    }
  }
  .result {
    display: flex;
    gap: 20px;
    align-items: center;
    border-radius: 12px;
  }
  .result:focus {
    outline: none;
  }
  .rt {
    margin: 0 0 4px;
    font-size: 1.05rem;
  }
  .score {
    width: 86px;
    height: 86px;
    flex: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: conic-gradient(var(--accent-2) calc(var(--p) * 360deg), var(--track) 0);
    position: relative;
  }
  .score::before {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 50%;
    background: var(--solid);
  }
  .score span {
    position: relative;
    font-weight: 800;
    font-size: 1.2rem;
  }
</style>
