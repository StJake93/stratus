<script lang="ts">
  import { tick } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import Tabs from '../components/ui/Tabs.svelte';
  import { CONCEPTS, CONCEPT } from '../data/compare';
  import { href, router } from '../stores/router.svelte';
  import { progress } from '../stores/progress.svelte';
  import { md } from '../md';
  import { scrollable } from '../actions';

  let { concept }: { concept?: string } = $props();

  let q = $state('');
  let cat = $state<string>('All');
  let mode = $state(0); // 0 explore, 1 matrix, 2 match game

  const cats = ['All', ...new Set(CONCEPTS.map((c) => c.category))];
  const list = $derived(
    CONCEPTS.filter((c) => (cat === 'All' || c.category === cat) && (!q || JSON.stringify(c).toLowerCase().includes(q.toLowerCase())))
  );
  const sel = $derived(CONCEPT[concept ?? ''] ?? list[0] ?? CONCEPTS[0]);
  // color is decorative (borders, tints); fg is the text-safe variant.
  const providers = [
    { key: 'aws', label: 'AWS', color: 'var(--aws)', fg: 'var(--aws-fg)' },
    { key: 'azure', label: 'Azure', color: 'var(--azure)', fg: 'var(--azure-fg)' },
    { key: 'gcp', label: 'Google Cloud', color: 'var(--gcp)', fg: 'var(--gcp-fg)' }
  ] as const;

  // ---------- match game ----------
  type P = (typeof providers)[number]['key'];
  let round = $state(newRound());
  let picked = $state<number | null>(null);
  let score = $state({ right: 0, total: 0 });

  function newRound() {
    const pool = [...CONCEPTS].sort(() => Math.random() - 0.5);
    const answer = pool[0];
    const keys: P[] = ['aws', 'azure', 'gcp'];
    const from = keys[Math.floor(Math.random() * 3)];
    const to = keys.filter((k) => k !== from)[Math.floor(Math.random() * 2)];
    const options = pool.slice(0, 4).sort(() => Math.random() - 0.5);
    return { answer, from, to, options };
  }
  let nextBtn: HTMLButtonElement | undefined = $state();
  let firstOpt: HTMLButtonElement | undefined = $state();
  async function pick(i: number) {
    if (picked !== null) return;
    picked = i;
    tick().then(() => nextBtn?.focus());
    score.total++;
    if (round.options[i].id === round.answer.id) {
      score.right++;
      if (score.right % 5 === 0) progress.addXp(20, `${score.right} cloud matches!`);
    }
  }
  async function next() {
    round = newRound();
    picked = null;
    await tick();
    firstOpt?.focus();
  }
  const label = (k: P) => providers.find((p) => p.key === k)!.label;
  const fgOf = (k: P) => providers.find((p) => p.key === k)!.fg;
</script>

{#snippet verdict(state: string)}
  {#if state === 'right'}<span class="sr-only"> (correct answer)</span>{:else if state === 'wrong'}<span class="sr-only"> (your answer, incorrect)</span>{/if}
{/snippet}

<div class="page">
  <header class="head fade-in">
    <span class="eyebrow">Multi-cloud Rosetta Stone</span>
    <h1>Compare clouds</h1>
    <p class="muted lead">The same ideas show up in every cloud under different names. Learn one well, then map it across. Every row shows the <strong>Terraform resource</strong> too, because the IaC workflow is identical everywhere.</p>
  </header>

  <Tabs labels={['Explore concepts', 'Service matrix', 'Match game']} bind:active={mode} variant="line">
    {#snippet panel(i)}
      {#if i === 0}
        <div class="explore">
          <aside class="list">
            <div class="search"><Icon name="search" size={15} /><input type="search" aria-label="Search concepts" placeholder="Search, e.g. queue or kubernetes…" bind:value={q} /></div>
            <div class="cats" role="group" aria-label="Filter by category">
              {#each cats as c}<button aria-pressed={cat === c} onclick={() => (cat = c)}>{c}</button>{/each}
            </div>
            <ul class="items focus-inset" aria-label="Concepts">
              {#each list as c (c.id)}
                <li>
                  <button class="it" class:on={sel.id === c.id} aria-current={sel.id === c.id ? 'true' : undefined} onclick={() => router.go(href.compare(c.id))}>
                    <Icon name={c.icon} size={16} /> {c.title}
                  </button>
                </li>
              {:else}
                <li class="faint" role="status">No matches.</li>
              {/each}
            </ul>
          </aside>
          {#key sel.id}
            <section class="detail fade-in">
              <div class="dh">
                <span class="dic"><Icon name={sel.icon} size={24} /></span>
                <div>
                  <span class="eyebrow">{sel.category}</span>
                  <h2>{sel.title}</h2>
                  <p class="muted">{sel.summary}</p>
                </div>
              </div>
              <div class="cols">
                {#each providers as p}
                  {@const o = sel[p.key]}
                  <div class="col" style:--pc={p.color} style:--pfg={p.fg}>
                    <span class="pl">{p.label}</span>
                    <h3>{o.name}</h3>
                    <div class="bl">{@html md(o.blurb)}</div>
                    <code class="tf"><span class="sr-only">Terraform resource: </span>{o.tf}</code>
                    <a href={o.docs} target="_blank" rel="noopener" class="dl">{p.label} docs <Icon name="external-link" size={12} /><span class="sr-only"> for {o.name} (opens in a new tab)</span></a>
                  </div>
                {/each}
              </div>
              <div class="diffs">
                <h4><Icon name="git-compare" size={16} /> Key differences</h4>
                <ul>{#each sel.differences as d}<li>{@html md(d)}</li>{/each}</ul>
              </div>
            </section>
          {/key}
        </div>
      {:else if i === 1}
        <div class="matrix-wrap" use:scrollable role="region" aria-label="Service matrix">
          <table class="matrix">
            <caption class="sr-only">Equivalent services on AWS, Azure and Google Cloud, with Terraform resource types</caption>
            <thead><tr><th scope="col">Concept</th>{#each providers as p}<th scope="col" style:color={p.fg}>{p.label}</th>{/each}</tr></thead>
            <tbody>
              {#each CONCEPTS as c (c.id)}
                <tr>
                  <th scope="row" class="c">
                    <button class="rowbtn" onclick={() => ((mode = 0), router.go(href.compare(c.id)))}><Icon name={c.icon} size={15} /> {c.title}<span class="sr-only">: open details</span></button>
                  </th>
                  {#each providers as p}<td>{c[p.key].name}<small>{c[p.key].tf}</small></td>{/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="game">
          <div class="score" aria-live="polite"><Icon name="target" size={16} /> {score.right} of {score.total} correct</div>
          {#key round}
            <div class="card-q fade-in">
              <p class="ask" id="game-q">What is the <strong style:color={fgOf(round.to)}>{label(round.to)}</strong> equivalent of <span class="sr-only">{label(round.from)} {round.answer[round.from].name}?</span></p>
              <div class="svc" style:--pc={providers.find((p) => p.key === round.from)!.color} style:--pfg={fgOf(round.from)} aria-hidden="true">
                <span class="pl">{label(round.from)}</span>
                <strong>{round.answer[round.from].name}</strong>
              </div>
              <div class="opts" role="group" aria-labelledby="game-q">
                {#each round.options as o, n}
                  {@const state = picked === null ? '' : o.id === round.answer.id ? 'right' : n === picked ? 'wrong' : 'dim'}
                  {#if n === 0}
                    <button class="opt {state}" bind:this={firstOpt} aria-disabled={picked !== null} onclick={() => pick(n)}>{o[round.to].name}{@render verdict(state)}</button>
                  {:else}
                    <button class="opt {state}" aria-disabled={picked !== null} onclick={() => pick(n)}>{o[round.to].name}{@render verdict(state)}</button>
                  {/if}
                {/each}
              </div>
              <div aria-live="polite">
                {#if picked !== null}
                  <div class="expl fade-in">
                    <p><strong>{round.options[picked].id === round.answer.id ? 'Correct.' : 'Not quite.'} {round.answer.title}:</strong> {round.answer.aws.name} ↔ {round.answer.azure.name} ↔ {round.answer.gcp.name}</p>
                  </div>
                {/if}
              </div>
              {#if picked !== null}
                <button class="btn primary sm" bind:this={nextBtn} onclick={next}>Next question <Icon name="arrow-right" size={14} /></button>
              {/if}
            </div>
          {/key}
        </div>
      {/if}
    {/snippet}
  </Tabs>
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
    max-width: 720px;
  }
  .explore {
    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);
    gap: 22px;
    margin-top: 6px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border-input);
    color: var(--text-2);
  }
  .search:focus-within {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
  .search input {
    flex: 1;
    min-width: 0;
    background: none;
    border: 0;
    outline: none;
    font-size: 0.86rem;
  }
  .cats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 10px 0;
  }
  .cats button {
    min-height: 26px;
    border: 1px solid var(--border-strong);
    background: none;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .cats button[aria-pressed='true'] {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: #ffffff;
  }
  .items {
    list-style: none;
    margin: 0;
    padding: 2px;
    display: grid;
    gap: 2px;
    max-height: 60vh;
    overflow-y: auto;
  }
  .it {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 36px;
    text-align: left;
    padding: 7px 10px;
    border: 0;
    border-radius: 9px;
    background: none;
    font-size: 0.86rem;
    color: var(--text-2);
  }
  .it:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  .it.on {
    background: var(--accent-soft);
    color: var(--text);
    font-weight: 600;
  }
  .dh {
    display: flex;
    gap: 14px;
    margin-bottom: 16px;
  }
  .dh h2 {
    margin: 2px 0 2px;
  }
  .dh p {
    margin: 0;
  }
  .dic {
    width: 52px;
    height: 52px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: var(--grad);
    color: white;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .col {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    border-top: 3px solid var(--pc);
    background: linear-gradient(180deg, color-mix(in srgb, var(--pc) 9%, transparent), transparent 50%), var(--surface);
  }
  .pl {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--pfg);
  }
  .col h3 {
    margin: 6px 0 8px;
    font-size: 1.02rem;
  }
  .bl {
    flex: 1;
    font-size: 0.86rem;
    color: var(--text-2);
  }
  .bl :global(p) {
    margin: 0 0 8px;
  }
  .tf {
    align-self: flex-start;
    margin: 6px 0 10px;
    font-size: 0.76rem;
    color: var(--tf-fg);
  }
  .dl {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .diffs {
    margin-top: 16px;
    padding: 16px 18px;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--border-strong);
  }
  .diffs h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 6px;
  }
  .diffs ul {
    margin: 0;
    padding-left: 1.2em;
    color: var(--text-2);
    font-size: 0.92rem;
  }
  .diffs li {
    margin: 4px 0;
  }
  .diffs :global(p) {
    margin: 0;
  }
  .matrix-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .matrix {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.86rem;
  }
  .matrix thead th {
    text-align: left;
    padding: 12px 14px;
    background: var(--surface-2);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    position: sticky;
    top: 0;
  }
  .matrix td {
    padding: 10px 14px;
    border-top: 1px solid var(--border);
    vertical-align: top;
  }
  .matrix td small {
    display: block;
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-2);
  }
  .matrix th.c {
    border-top: 1px solid var(--border);
    padding: 4px 6px;
    text-align: left;
    white-space: nowrap;
  }
  .rowbtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 4px 8px;
    border: 0;
    border-radius: 8px;
    background: none;
    font-weight: 600;
    text-align: left;
  }
  .rowbtn :global(svg) {
    color: var(--accent-2-fg);
  }
  .rowbtn:hover {
    background: var(--surface-2);
    text-decoration: underline;
  }
  .matrix tbody tr:hover td,
  .matrix tbody tr:hover th {
    background: var(--surface);
  }
  .game {
    max-width: 620px;
    margin: 10px auto 0;
  }
  .score {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
    font-weight: 700;
    color: var(--accent-2-fg);
    margin-bottom: 10px;
  }
  .card-q {
    padding: 24px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    text-align: center;
  }
  .ask {
    font-size: 1.05rem;
  }
  .svc {
    display: inline-flex;
    flex-direction: column;
    padding: 14px 26px;
    border-radius: 16px;
    border: 2px solid var(--pc);
    background: color-mix(in srgb, var(--pc) 10%, transparent);
    margin-bottom: 18px;
  }
  .svc strong {
    font-size: 1.2rem;
  }
  .opts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .opt {
    min-height: 44px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--border-strong);
    background: var(--surface-2);
    font-weight: 600;
    font-size: 0.88rem;
    transition: all 0.2s;
  }
  .opt[aria-disabled='false']:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .opt[aria-disabled='true'] {
    cursor: default;
  }
  .opt.right {
    background: var(--ok-soft);
    border: 2px solid var(--ok);
    color: var(--ok-fg);
  }
  .opt.wrong {
    background: var(--err-soft);
    border: 2px dashed var(--err);
    color: var(--err-fg);
  }
  .opt.dim {
    color: var(--text-2);
  }
  .expl {
    margin-top: 16px;
    font-size: 0.88rem;
    color: var(--text-2);
  }
  @media (max-width: 900px) {
    .page {
      padding: 56px 16px 48px;
    }
    .explore {
      grid-template-columns: 1fr;
    }
    .items {
      max-height: 200px;
    }
    .cols {
      grid-template-columns: 1fr;
    }
    .opts {
      grid-template-columns: 1fr;
    }
  }
</style>
