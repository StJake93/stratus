<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import Tabs from '../components/ui/Tabs.svelte';
  import { CONCEPTS, CONCEPT } from '../data/compare';
  import { href, router } from '../stores/router.svelte';
  import { progress } from '../stores/progress.svelte';
  import { md } from '../md';

  let { concept }: { concept?: string } = $props();

  let q = $state('');
  let cat = $state<string>('All');
  let mode = $state(0); // 0 explore, 1 matrix, 2 match game

  const cats = ['All', ...new Set(CONCEPTS.map((c) => c.category))];
  const list = $derived(
    CONCEPTS.filter((c) => (cat === 'All' || c.category === cat) && (!q || JSON.stringify(c).toLowerCase().includes(q.toLowerCase())))
  );
  const sel = $derived(CONCEPT[concept ?? ''] ?? list[0] ?? CONCEPTS[0]);
  const providers = [
    { key: 'aws', label: 'AWS', color: 'var(--aws)' },
    { key: 'azure', label: 'Azure', color: 'var(--azure)' },
    { key: 'gcp', label: 'Google Cloud', color: 'var(--gcp)' }
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
  function pick(i: number) {
    if (picked !== null) return;
    picked = i;
    score.total++;
    if (round.options[i].id === round.answer.id) {
      score.right++;
      if (score.right % 5 === 0) progress.addXp(20, `${score.right} cloud matches!`);
    }
  }
  function next() {
    round = newRound();
    picked = null;
  }
  const label = (k: P) => providers.find((p) => p.key === k)!.label;
</script>

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
            <div class="search"><Icon name="search" size={15} /><input placeholder="Search e.g. queue, kubernetes…" bind:value={q} /></div>
            <div class="cats">
              {#each cats as c}<button class:on={cat === c} onclick={() => (cat = c)}>{c}</button>{/each}
            </div>
            <div class="items">
              {#each list as c (c.id)}
                <button class="it" class:on={sel.id === c.id} onclick={() => router.go(href.compare(c.id))}>
                  <Icon name={c.icon} size={16} /> {c.title}
                </button>
              {:else}
                <p class="faint">No matches.</p>
              {/each}
            </div>
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
                  <div class="col" style:--pc={p.color}>
                    <span class="pl">{p.label}</span>
                    <h3>{o.name}</h3>
                    <div class="bl">{@html md(o.blurb)}</div>
                    <code class="tf">{o.tf}</code>
                    <a href={o.docs} target="_blank" rel="noopener" class="dl">Docs <Icon name="external-link" size={12} /></a>
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
        <div class="matrix-wrap">
          <table class="matrix">
            <thead><tr><th>Concept</th>{#each providers as p}<th style:color={p.color}>{p.label}</th>{/each}</tr></thead>
            <tbody>
              {#each CONCEPTS as c (c.id)}
                <tr onclick={() => ((mode = 0), router.go(href.compare(c.id)))}>
                  <td class="c"><Icon name={c.icon} size={15} /> {c.title}</td>
                  {#each providers as p}<td>{c[p.key].name}<small>{c[p.key].tf}</small></td>{/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="game">
          <div class="score"><Icon name="target" size={16} /> {score.right} / {score.total} correct</div>
          {#key round}
            <div class="card-q fade-in">
              <p class="ask">What is the <strong style:color={providers.find((p) => p.key === round.to)!.color}>{label(round.to)}</strong> equivalent of…</p>
              <div class="svc" style:--pc={providers.find((p) => p.key === round.from)!.color}>
                <span class="pl">{label(round.from)}</span>
                <strong>{round.answer[round.from].name}</strong>
              </div>
              <div class="opts">
                {#each round.options as o, n}
                  {@const state = picked === null ? '' : o.id === round.answer.id ? 'right' : n === picked ? 'wrong' : 'dim'}
                  <button class="opt {state}" disabled={picked !== null} onclick={() => pick(n)}>{o[round.to].name}</button>
                {/each}
              </div>
              {#if picked !== null}
                <div class="expl fade-in">
                  <p><strong>{round.answer.title}:</strong> {round.answer.aws.name} ↔ {round.answer.azure.name} ↔ {round.answer.gcp.name}</p>
                  <button class="btn primary sm" onclick={next}>Next <Icon name="arrow-right" size={14} /></button>
                </div>
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
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text-3);
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
    border: 1px solid var(--border);
    background: none;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .cats button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }
  .items {
    display: grid;
    gap: 2px;
    max-height: 60vh;
    overflow-y: auto;
  }
  .it {
    display: flex;
    align-items: center;
    gap: 9px;
    text-align: left;
    padding: 8px 10px;
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
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--pc);
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
    font-size: 0.74rem;
    color: #b79dff;
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
    font-size: 0.9rem;
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
  .matrix th {
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
    font-size: 0.7rem;
    color: var(--text-3);
  }
  .matrix td.c {
    font-weight: 600;
    white-space: nowrap;
  }
  .matrix td.c :global(svg) {
    vertical-align: -3px;
    color: var(--accent-2);
    margin-right: 4px;
  }
  .matrix tr {
    cursor: pointer;
  }
  .matrix tbody tr:hover td {
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
    color: var(--accent-2);
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
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    font-weight: 600;
    font-size: 0.88rem;
    transition: all 0.2s;
  }
  .opt:not(:disabled):hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .opt.right {
    background: var(--ok-soft);
    border-color: var(--ok);
    color: var(--ok);
  }
  .opt.wrong {
    background: var(--err-soft);
    border-color: var(--err);
    color: var(--err);
  }
  .opt.dim {
    opacity: 0.45;
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
