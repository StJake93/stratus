<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import { board } from './board.svelte';
  import { progress } from '../stores/progress.svelte';
  import { href } from '../stores/router.svelte';
  import { md } from '../md';
  import type { Scenario } from '../data/scenarios';
  import { SCENARIOS } from '../data/scenarios';

  let { scenario }: { scenario: Scenario } = $props();

  let hints = $state<number[]>([]);
  let celebrated = $state(progress.scenarioDone(scenario.id));

  const status = $derived(scenario.steps.map((s) => s.check(board.graph)));
  // Steps unlock in order so learners are guided, but a later step already satisfied still shows as done.
  const firstOpen = $derived(status.findIndex((x) => !x));
  const errors = $derived(board.issues.filter((i) => i.level === 'error').length);
  const allSteps = $derived(status.every(Boolean));
  const complete = $derived(allSteps && (!scenario.noErrors || errors === 0));
  const pct = $derived((status.filter(Boolean).length + (complete ? 1 : 0)) / (scenario.steps.length + 1));
  const next = $derived(SCENARIOS[(SCENARIOS.findIndex((s) => s.id === scenario.id) + 1) % SCENARIOS.length]);

  $effect(() => {
    if (complete && !celebrated) {
      celebrated = true;
      const used = hints.length;
      untrack(() => progress.completeScenario(scenario.id, scenario.title, used));
      burst();
    }
  });

  let confetti = $state<{ id: number; x: number; c: string; d: number; r: number }[]>([]);
  function burst() {
    const colors = ['#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#ff9900'];
    confetti = Array.from({ length: 60 }, (_, i) => ({ id: i, x: Math.random() * 100, c: colors[i % colors.length], d: Math.random() * 0.6, r: Math.random() * 360 }));
    setTimeout(() => (confetti = []), 2600);
  }
</script>

<div class="scn">
  <div class="head">
    <span class="chip">{scenario.difficulty}</span>
    <h3>{scenario.title}</h3>
    <div class="prog"><span style:width="{pct * 100}%"></span></div>
  </div>
  <div class="story">{@html md(scenario.story)}</div>

  <ol class="steps">
    {#each scenario.steps as s, i}
      {@const done = status[i]}
      {@const active = i === firstOpen}
      <li class:done class:active class:locked={!done && i > firstOpen}>
        <span class="n">{#if done}<Icon name="check" size={13} stroke={3} />{:else}{i + 1}{/if}</span>
        <div class="t">
          <div>{@html md(s.goal)}</div>
          {#if active && !done}
            {#if hints.includes(i)}
              <p class="hint fade-in"><Icon name="lightbulb" size={13} /> {@html md(s.hint)}</p>
            {:else}
              <button class="btn sm ghost hbtn" onclick={() => (hints = [...hints, i])}><Icon name="lightbulb" size={13} /> Show hint</button>
            {/if}
          {/if}
        </div>
      </li>
    {/each}
    {#if scenario.noErrors}
      <li class:done={complete} class:active={allSteps && !complete}>
        <span class="n">{#if complete}<Icon name="check" size={13} stroke={3} />{:else}<Icon name="shield-check" size={13} />{/if}</span>
        <div class="t">
          <div>Resolve all <strong>errors</strong> in the Issues tab {#if allSteps && errors}<span class="err">({errors} left)</span>{/if}</div>
        </div>
      </li>
    {/if}
  </ol>

  {#if complete}
    <div class="done-card fade-in">
      <Icon name="trophy" size={26} />
      <div>
        <strong>Scenario complete!</strong>
        <div class="deb">{@html md(scenario.debrief)}</div>
        <a class="btn sm primary" href={href.play(next.id)}>Next: {next.title} <Icon name="arrow-right" size={13} /></a>
      </div>
    </div>
  {/if}
  <div class="foot">
    <span class="faint">Hints used: {hints.length}</span>
    <span class="spacer"></span>
    <button class="btn sm ghost" onclick={() => board.reset()}><Icon name="rotate-ccw" size={13} /> Restart</button>
  </div>
</div>

{#if confetti.length}
  <div class="confetti" aria-hidden="true">
    {#each confetti as p (p.id)}<i style:left="{p.x}%" style:background={p.c} style:animation-delay="{p.d}s" style:--r="{p.r}deg"></i>{/each}
  </div>
{/if}

<style>
  .scn {
    padding: 14px;
  }
  .head h3 {
    margin: 8px 0 8px;
  }
  .prog {
    height: 6px;
    border-radius: 6px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .prog span {
    display: block;
    height: 100%;
    background: var(--grad);
    transition: width 0.5s var(--ease);
  }
  .story {
    font-size: 0.84rem;
    color: var(--text-2);
    margin: 12px 0;
  }
  .steps {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }
  .steps li {
    display: flex;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 11px;
    border: 1px solid var(--border);
    font-size: 0.83rem;
    transition: all 0.3s var(--ease);
  }
  .steps li.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .steps li.done {
    border-color: rgba(52, 211, 153, 0.35);
    background: var(--ok-soft);
  }
  .steps li.locked {
    opacity: 0.55;
  }
  .n {
    width: 22px;
    height: 22px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--surface-3);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .done .n {
    background: var(--ok);
    color: #06281c;
  }
  .active .n {
    background: var(--accent);
    color: white;
  }
  .t {
    flex: 1;
  }
  .t :global(p) {
    margin: 0;
  }
  .hint {
    display: flex;
    gap: 6px;
    margin-top: 6px !important;
    padding: 7px 9px;
    border-radius: 8px;
    background: var(--warn-soft);
    color: var(--text);
    font-size: 0.8rem;
  }
  .hint :global(svg) {
    flex: none;
    color: var(--warn);
    margin-top: 3px;
  }
  .hbtn {
    margin-top: 4px;
    padding: 3px 8px;
    color: var(--warn);
  }
  .err {
    color: var(--err);
    font-weight: 700;
  }
  .done-card {
    display: flex;
    gap: 12px;
    margin-top: 14px;
    padding: 14px;
    border-radius: 14px;
    background:
      radial-gradient(120% 120% at 0 0, rgba(52, 211, 153, 0.2), transparent 60%),
      var(--surface-2);
    border: 1px solid rgba(52, 211, 153, 0.4);
    color: var(--ok);
  }
  .done-card strong {
    color: var(--text);
  }
  .deb {
    font-size: 0.82rem;
    color: var(--text-2);
    margin: 4px 0 10px;
  }
  .foot {
    display: flex;
    align-items: center;
    margin-top: 14px;
    font-size: 0.78rem;
  }
  .confetti {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    overflow: hidden;
  }
  .confetti i {
    position: absolute;
    top: -12px;
    width: 8px;
    height: 12px;
    border-radius: 2px;
    animation: fall 2.2s cubic-bezier(0.3, 0.6, 0.5, 1) forwards;
  }
  @keyframes fall {
    to {
      transform: translateY(105vh) rotate(calc(var(--r) * 4));
      opacity: 0.8;
    }
  }
</style>
