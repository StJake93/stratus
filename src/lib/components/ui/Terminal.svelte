<script lang="ts">
  import Icon from '../Icon.svelte';
  import { settings } from '../../stores/settings.svelte';

  let { title = 'terminal', lines }: { title?: string; lines: { cmd?: string; out?: string }[] } = $props();

  // Rendered output: each entry is either a typed command or an output chunk.
  let shown = $state<{ kind: 'cmd' | 'out'; text: string }[]>([]);
  let running = $state(false);
  let finished = $state(false);
  let body: HTMLDivElement;
  let cancel = false;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const all = () =>
    lines.flatMap((l) => [...(l.cmd ? [{ kind: 'cmd' as const, text: l.cmd }] : []), ...(l.out ? l.out.split('\n').map((t) => ({ kind: 'out' as const, text: t })) : [])]);

  async function run() {
    if (settings.reduced) {
      shown = all();
      finished = true;
      return;
    }
    cancel = false;
    running = true;
    finished = false;
    shown = [];
    for (const l of lines) {
      if (cancel) return;
      if (l.cmd) {
        shown.push({ kind: 'cmd', text: '' });
        const at = shown.length - 1;
        for (const ch of l.cmd) {
          if (cancel) return;
          shown[at].text += ch;
          await sleep(18);
        }
        await sleep(260);
      }
      if (l.out) {
        for (const chunk of l.out.split('\n')) {
          if (cancel) return;
          shown.push({ kind: 'out', text: chunk });
          body?.scrollTo({ top: body.scrollHeight });
          await sleep(45);
        }
        await sleep(220);
      }
    }
    running = false;
    finished = true;
  }

  function skip() {
    cancel = true;
    shown = all();
    running = false;
    finished = true;
  }

  // Colour common Terraform/CLI output markers.
  function cls(t: string) {
    const s = t.trimStart();
    if (/^\+ |created|Apply complete|Success|successfully|✓/.test(s)) return 'g';
    if (/^- aws_|destroyed|Error|error:/.test(s)) return 'r';
    if (/^~ |will be updated|Warning/.test(s)) return 'y';
    if (/^Plan:|^#/.test(s)) return 'b';
    return '';
  }
</script>

<div class="term">
  <header>
    <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="t"><Icon name="square-terminal" size={13} /> {title}</span>
    {#if running}
      <button class="btn sm ghost" onclick={skip}>Skip to end</button>
    {:else}
      <button class="btn sm" onclick={run}><Icon name={finished ? 'rotate-ccw' : 'play'} size={13} /> {finished ? 'Replay' : 'Run'}<span class="sr-only"> {title}</span></button>
    {/if}
  </header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="body" bind:this={body} tabindex="0" role="log" aria-label="{title} output" aria-busy={running}>
    {#if !shown.length}
      <div class="idle">
        {#each lines.filter((l) => l.cmd) as l}<div><span class="p" aria-hidden="true">$</span> {l.cmd}</div>{/each}
        <div class="hint">Press Run to execute these commands.</div>
      </div>
    {/if}
    {#each shown as s}
      {#if s.kind === 'cmd'}
        <div class="cmd"><span class="p" aria-hidden="true">$</span> {s.text}{#if running && s === shown[shown.length - 1]}<span class="cur" aria-hidden="true"></span>{/if}</div>
      {:else}
        <div class="out {cls(s.text)}">{s.text || ' '}</div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .term {
    margin: 14px 0 18px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: #070a13;
    overflow: hidden;
    font-family: var(--mono);
    font-size: 0.8rem;
    color: #d6deeb;
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px 6px 14px;
    background: #0d1220;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-family: var(--font);
  }
  header .btn {
    color: #d6deeb;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.06);
  }
  header .btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  header .btn:focus-visible {
    outline-color: #67e8f9;
  }
  .dots {
    display: flex;
    gap: 5px;
  }
  .dots i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #f87171;
  }
  .dots i:nth-child(2) {
    background: #fbbf24;
  }
  .dots i:nth-child(3) {
    background: #34d399;
  }
  .t {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.76rem;
    color: #a3adc2;
  }
  .body {
    padding: 12px 16px;
    max-height: 340px;
    min-height: 90px;
    overflow: auto;
    white-space: pre-wrap;
    line-height: 1.55;
  }
  .body:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: -2px;
  }
  .p {
    color: #22d3ee;
    user-select: none;
  }
  .cmd {
    color: #ffffff;
  }
  .idle {
    color: #a3adc2;
  }
  .hint {
    margin-top: 6px;
    color: #a3adc2;
    font-family: var(--font);
    font-style: italic;
  }
  .g {
    color: #34d399;
  }
  .r {
    color: #f87171;
  }
  .y {
    color: #fbbf24;
  }
  .b {
    color: #93c5fd;
    font-weight: 600;
  }
  .cur {
    display: inline-block;
    width: 7px;
    height: 1em;
    background: #22d3ee;
    vertical-align: -2px;
    margin-left: 1px;
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
