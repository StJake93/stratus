<script lang="ts">
  import Icon from '../Icon.svelte';
  import type { QuizQuestion } from '../../data/types';
  import { progress } from '../../stores/progress.svelte';
  import { md } from '../../md';

  let { id, questions, oncomplete }: { id: string; questions: QuizQuestion[]; oncomplete?: () => void } = $props();

  let idx = $state(0);
  let picked = $state<number | null>(null);
  let correct = $state(0);
  let done = $state(false);
  let shake = $state(false);

  const q = $derived(questions[idx]);
  const best = $derived(progress.d.quizzes[id]);

  function pick(i: number) {
    if (picked !== null) return;
    picked = i;
    if (i === q.answer) correct++;
    else {
      shake = true;
      setTimeout(() => (shake = false), 450);
    }
  }

  function next() {
    if (idx + 1 < questions.length) {
      idx++;
      picked = null;
    } else {
      done = true;
      progress.recordQuiz(id, correct, questions.length);
      oncomplete?.();
    }
  }

  function retry() {
    idx = 0;
    picked = null;
    correct = 0;
    done = false;
  }
</script>

<div class="quiz">
  <div class="top">
    <span class="eyebrow"><Icon name="brain-circuit" size={14} /> Knowledge check</span>
    <span class="spacer"></span>
    {#if best}<span class="chip">Best {best.correct}/{best.total}</span>{/if}
    {#if !done}<span class="chip">{idx + 1} / {questions.length}</span>{/if}
  </div>

  {#if done}
    {@const pct = correct / questions.length}
    <div class="result fade-in">
      <div class="score" style:--p={pct}>
        <span>{correct}/{questions.length}</span>
      </div>
      <div>
        <h4>{pct === 1 ? 'Flawless!' : pct >= 0.6 ? 'Nice work!' : 'Keep going — review and retry.'}</h4>
        <p class="muted">{pct === 1 ? 'You nailed every question.' : 'Each retry only adds XP for newly correct answers.'}</p>
        <button class="btn sm" onclick={retry}><Icon name="rotate-ccw" size={14} /> Retry quiz</button>
      </div>
    </div>
  {:else}
    {#key idx}
      <div class="q fade-in" class:shake>
        <p class="stem">{@html md(q.q)}</p>
        <div class="opts">
          {#each q.options as opt, i}
            {@const state = picked === null ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'dim'}
            <button class="opt {state}" disabled={picked !== null} onclick={() => pick(i)}>
              <span class="letter">{String.fromCharCode(65 + i)}</span>
              <span class="txt">{@html md(opt)}</span>
              {#if state === 'right'}<Icon name="circle-check" size={18} />{/if}
              {#if state === 'wrong'}<Icon name="circle-x" size={18} />{/if}
            </button>
          {/each}
        </div>
        {#if picked !== null}
          <div class="explain fade-in" class:ok={picked === q.answer}>
            <strong>{picked === q.answer ? 'Correct.' : 'Not quite.'}</strong>
            {@html md(q.explain)}
          </div>
          <div class="row" style="justify-content:flex-end">
            <button class="btn primary sm" onclick={next}>{idx + 1 < questions.length ? 'Next question' : 'See results'} <Icon name="arrow-right" size={14} /></button>
          </div>
        {/if}
      </div>
    {/key}
  {/if}
</div>

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
  }
  .eyebrow {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .stem {
    font-weight: 600;
    font-size: 1.02rem;
  }
  .stem :global(p) {
    margin: 0;
  }
  .opts {
    display: grid;
    gap: 8px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 11px 14px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--surface);
    transition: all 0.2s var(--ease);
  }
  .opt:not(:disabled):hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    transform: translateX(3px);
  }
  .opt:disabled {
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
    color: var(--ok);
  }
  .opt.wrong {
    border-color: var(--err);
    background: var(--err-soft);
    color: var(--err);
  }
  .opt.dim {
    opacity: 0.5;
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
  }
  .result h4 {
    margin-bottom: 4px;
  }
  .score {
    width: 86px;
    height: 86px;
    flex: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: conic-gradient(var(--accent-2) calc(var(--p) * 360deg), var(--surface-3) 0);
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
