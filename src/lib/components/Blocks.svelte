<script lang="ts">
  import Blocks from './Blocks.svelte';
  import Icon from './Icon.svelte';
  import Tabs from './ui/Tabs.svelte';
  import Accordion from './ui/Accordion.svelte';
  import Carousel from './ui/Carousel.svelte';
  import Callout from './ui/Callout.svelte';
  import CodeBlock from './ui/CodeBlock.svelte';
  import Quiz from './ui/Quiz.svelte';
  import Terminal from './ui/Terminal.svelte';
  import Diagram from './ui/Diagram.svelte';
  import Widget from './widgets/Widget.svelte';
  import type { Block } from '../data/types';
  import { md, mdInline, plain } from '../md';
  import { href } from '../stores/router.svelte';
  import { SCENARIO } from '../data/scenarios';
  import { progress } from '../stores/progress.svelte';
  import { headingLevel, provideHeadingLevel, tag } from '../heading';
  import { scrollable } from '../actions';

  let { blocks, level = headingLevel() }: { blocks: Block[]; level?: number } = $props();
  // Children (widgets, quizzes, accordions...) read this to pick the right heading level.
  // svelte-ignore state_referenced_locally
  provideHeadingLevel(level);
</script>

{#each blocks as b, bi (bi)}
  {#if b.type === 'text'}
    <div class="prose">{@html md(b.md)}</div>
  {:else if b.type === 'callout'}
    <Callout variant={b.variant} title={b.title} body={b.md} />
  {:else if b.type === 'tabs'}
    <Tabs labels={b.tabs.map((t) => t.label)}>
      {#snippet panel(i)}<Blocks blocks={b.tabs[i].blocks} {level} />{/snippet}
    </Tabs>
  {:else if b.type === 'accordion'}
    <Accordion titles={b.items.map((t) => t.title)}>
      {#snippet body(i)}<Blocks blocks={b.items[i].blocks} level={level + 1} />{/snippet}
    </Accordion>
  {:else if b.type === 'carousel'}
    <Carousel titles={b.slides.map((s) => s.title)} label="{b.slides.length}-step walkthrough">
      {#snippet slide(i)}<Blocks blocks={b.slides[i].blocks} level={level + 1} />{/snippet}
    </Carousel>
  {:else if b.type === 'code'}
    <CodeBlock code={b.code} lang={b.lang} file={b.file} caption={b.caption} />
  {:else if b.type === 'diagram'}
    <Diagram nodes={b.nodes} edges={b.edges} height={b.height} caption={b.caption} />
  {:else if b.type === 'widget'}
    <Widget id={b.widget} />
  {:else if b.type === 'quiz'}
    <Quiz id={b.id} questions={b.questions} />
  {:else if b.type === 'terminal'}
    <Terminal title={b.title} lines={b.lines} />
  {:else if b.type === 'compare'}
    <div class="tbl-wrap" use:scrollable role="region" aria-label="Comparison: {b.columns.filter(Boolean).join(', ')}">
      <table class="tbl">
        <thead><tr>{#each b.columns as c}<th scope="col">{#if c}{c}{:else}<span class="sr-only">Item</span>{/if}</th>{/each}</tr></thead>
        <tbody>
          {#each b.rows as r}
            <tr>
              {#each r as cell, ci}
                {#if ci === 0}<th scope="row">{@html md(cell)}</th>{:else}<td>{@html md(cell)}</td>{/if}
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if b.type === 'cards'}
    <ul class="cards">
      {#each b.items as c}
        <li class="c" style:--cc={c.color ?? 'var(--accent)'}>
          {#if c.icon}<span class="ci" aria-hidden="true"><Icon name={c.icon} size={20} /></span>{/if}
          <svelte:element this={tag(level)} class="ct">{c.title}</svelte:element>
          <div class="cb">{@html md(c.md)}</div>
        </li>
      {/each}
    </ul>
  {:else if b.type === 'keyterms'}
    <dl class="terms">
      {#each b.terms as t}
        <div><dt>{t.term}</dt><dd>{@html md(t.def)}</dd></div>
      {/each}
    </dl>
  {:else if b.type === 'docs'}
    <nav class="docs" aria-label="Official documentation">
      <p class="eyebrow"><Icon name="book-open" size={13} /> Official documentation</p>
      <ul class="links">
        {#each b.links as l}
          <li><a href={l.url} target="_blank" rel="noopener" class="doc"><span>{l.title}</span><Icon name="external-link" size={13} /><span class="sr-only"> (opens in a new tab)</span></a></li>
        {/each}
      </ul>
    </nav>
  {:else if b.type === 'challenge'}
    {@const s = SCENARIO[b.scenario]}
    {#if s}
      <a class="challenge" href={href.play(s.id)} aria-label="Build challenge, {s.difficulty}: {s.title}. {plain(b.md)}{progress.scenarioDone(s.id) ? ' Completed.' : ''}">
        <span class="cic" aria-hidden="true"><Icon name="blocks" size={26} /></span>
        <span class="cbody" aria-hidden="true">
          <span class="eyebrow">Hands-on build challenge · {s.difficulty}</span>
          <span class="ctitle">{s.title}</span>
          <span class="muted">{@html mdInline(b.md)}</span>
        </span>
        {#if progress.scenarioDone(s.id)}
          <span class="chip done" aria-hidden="true"><Icon name="check" size={13} /> Done</span>
        {:else}
          <span class="go" aria-hidden="true">Open canvas <Icon name="arrow-right" size={15} /></span>
        {/if}
      </a>
    {/if}
  {/if}
{/each}

<style>
  .prose :global(ul),
  .prose :global(ol) {
    padding-left: 1.3em;
    margin: 0 0 0.9em;
  }
  .prose :global(li) {
    margin: 0.25em 0;
  }
  .prose :global(li::marker) {
    color: var(--accent-2-fg);
  }
  .prose :global(strong) {
    color: var(--text);
    font-weight: 650;
  }
  .prose {
    color: var(--text-2);
  }

  .tbl-wrap {
    margin: 14px 0 18px;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .tbl {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  thead th {
    text-align: left;
    padding: 10px 14px;
    background: var(--surface-2);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-2);
  }
  td,
  tbody th {
    padding: 10px 14px;
    border-top: 1px solid var(--border);
    color: var(--text-2);
    vertical-align: top;
    text-align: left;
  }
  tbody th {
    font-weight: 600;
    color: var(--text);
  }
  td :global(p),
  th :global(p) {
    margin: 0;
  }
  tr:hover td,
  tr:hover th {
    background: var(--surface);
  }

  .cards {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
    margin: 14px 0 18px;
  }
  .c {
    padding: 16px;
    border-radius: var(--radius);
    background: linear-gradient(160deg, color-mix(in srgb, var(--cc) 10%, transparent), transparent 70%), var(--surface);
    border: 1px solid var(--border);
    transition:
      transform 0.25s var(--ease),
      border-color 0.25s;
  }
  .c:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--cc) 50%, transparent);
  }
  .ci {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--cc) 18%, transparent);
    color: var(--cc);
    margin-bottom: 10px;
  }
  .ct {
    margin: 0 0 4px;
    font-size: 0.98rem;
  }
  .cb {
    font-size: 0.87rem;
    color: var(--text-2);
  }
  .cb :global(p:last-child) {
    margin: 0;
  }

  .terms {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 10px;
    margin: 14px 0 18px;
  }
  .terms div {
    padding: 12px 14px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  dt {
    font-weight: 700;
    font-family: var(--mono);
    font-size: 0.84rem;
    color: var(--accent-2-fg);
  }
  dd {
    margin: 2px 0 0;
    font-size: 0.87rem;
    color: var(--text-2);
  }
  dd :global(p) {
    margin: 0;
  }

  .docs {
    margin: 22px 0 10px;
    padding: 14px 16px;
    border-radius: var(--radius);
    border: 1px dashed var(--border-strong);
  }
  .docs .eyebrow {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin: 0;
  }
  .links {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0 0;
  }
  .doc {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 6px 11px;
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 0.83rem;
    font-weight: 600;
    color: var(--text);
    transition: background 0.2s;
  }
  .doc:hover {
    background: var(--accent-soft);
    text-decoration: underline;
  }

  .challenge {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 18px 0;
    padding: 18px;
    border-radius: var(--radius-lg);
    color: var(--text);
    border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
    background:
      radial-gradient(100% 140% at 0% 50%, rgba(124, 92, 255, 0.2), transparent 60%),
      var(--surface);
    transition:
      transform 0.25s var(--ease),
      box-shadow 0.25s;
  }
  .challenge:hover {
    text-decoration: none;
    transform: translateY(-2px);
    box-shadow: 0 14px 40px -18px rgba(124, 92, 255, 0.8);
  }
  .cic {
    width: 54px;
    height: 54px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: var(--grad-strong);
    color: white;
  }
  .cbody {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .ctitle {
    display: block;
    margin: 2px 0;
    font-size: 1.05rem;
    font-weight: 700;
  }
  .cbody :global(p) {
    margin: 0;
    font-size: 0.9rem;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 0.86rem;
    color: var(--accent-2-fg);
    white-space: nowrap;
  }
  .done {
    color: var(--ok-fg);
  }
  @media (max-width: 600px) {
    .challenge {
      flex-wrap: wrap;
    }
  }
</style>
