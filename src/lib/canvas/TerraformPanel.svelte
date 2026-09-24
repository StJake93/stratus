<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import { highlight } from '../highlight';
  import { board } from './board.svelte';
  import { progress } from '../stores/progress.svelte';
  import { toast } from '../stores/toast.svelte';

  let file = $state(0);
  let showPlan = $state(false);

  // Count (once per mount) a learner opening the export with something on the canvas.
  let counted = false;
  $effect(() => {
    if (!counted && board.nodes.length) {
      counted = true;
      untrack(() => progress.recordExport());
    }
  });

  const files = $derived(board.terraform.files);
  const current = $derived(files[file] ?? files[0]);
  const addrs = $derived(board.terraform.resources.map((r) => r.addr));
  const plan = $derived({
    add: addrs.filter((a) => !board.applied.includes(a)),
    del: board.applied.filter((a) => !addrs.includes(a)),
    keep: addrs.filter((a) => board.applied.includes(a))
  });
  const errors = $derived(board.issues.filter((i) => i.level === 'error'));

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.code);
      toast.info(`Copied ${current.name}`);
    } catch {
      toast.warn('Clipboard unavailable');
    }
  }
  function download() {
    const blob = new Blob([files.map((f) => `# ===== ${f.name} =====\n\n${f.code}`).join('\n\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stratus-terraform.tf';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function apply() {
    if (errors.length) {
      toast.err('terraform apply would fail', `Fix the ${errors.length} error${errors.length > 1 ? 's' : ''} in the Issues tab first — AWS would reject this configuration.`);
      return;
    }
    board.markApplied();
    toast.ok('Apply complete!', `Resources: ${plan.add.length} added, 0 changed, ${plan.del.length} destroyed.`);
  }
</script>

<div class="tf">
  <div class="bar">
    <div class="seg">
      <button class:on={!showPlan} onclick={() => (showPlan = false)}><Icon name="file-code" size={13} /> Code</button>
      <button class:on={showPlan} onclick={() => (showPlan = true)}><Icon name="square-terminal" size={13} /> Plan</button>
    </div>
    <span class="spacer"></span>
    <button class="btn sm ghost" onclick={copy} title="Copy file"><Icon name="copy" size={14} /></button>
    <button class="btn sm ghost" onclick={download} title="Download all files"><Icon name="download" size={14} /></button>
  </div>

  {#if !showPlan}
    <div class="files">
      {#each files as f, i}<button class:on={file === i} onclick={() => (file = i)}>{f.name}</button>{/each}
    </div>
    <pre class="code"><code>{@html highlight(current.code, 'hcl')}</code></pre>
    <p class="note">Generated live from your diagram. Simplified for learning — review before real use.</p>
  {:else}
    <div class="plan">
      <div class="cmd">$ terraform plan</div>
      {#if errors.length}
        <div class="r">│ Error: {errors[0].title}</div>
        <div class="r">│ {errors[0].body}</div>
        {#if errors.length > 1}<div class="r">│ …and {errors.length - 1} more</div>{/if}
      {:else if !plan.add.length && !plan.del.length}
        <div class="g">No changes. Your infrastructure matches the configuration.</div>
      {:else}
        <div>Terraform will perform the following actions:</div>
        {#each plan.add as a (a)}<div class="g">  + {a}</div>{/each}
        {#each plan.del as a (a)}<div class="r">  - {a}</div>{/each}
        <div class="b">Plan: {plan.add.length} to add, 0 to change, {plan.del.length} to destroy.</div>
      {/if}
      {#if plan.keep.length}<div class="faint">  ({plan.keep.length} unchanged)</div>{/if}
    </div>
    <div class="row acts">
      <button class="btn sm primary" onclick={apply} disabled={!plan.add.length && !plan.del.length}><Icon name="play" size={13} /> terraform apply</button>
      <span class="faint small">Simulated — nothing is deployed. Change the diagram and re-plan to see the diff.</span>
    </div>
  {/if}
</div>

<style>
  .tf {
    padding: 12px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
  }
  .seg {
    display: inline-flex;
    padding: 3px;
    border-radius: 9px;
    background: var(--surface-2);
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: none;
    padding: 4px 10px;
    border-radius: 7px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .seg button.on {
    background: var(--tf);
    color: white;
  }
  .files {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .files button {
    border: 0;
    background: none;
    padding: 6px 9px;
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-3);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
  }
  .files button.on {
    color: var(--text);
    border-bottom-color: var(--tf);
  }
  .code {
    margin: 8px 0 0;
    padding: 12px;
    border-radius: 10px;
    background: #0b0f1c;
    color: #d6deeb;
    font-size: 0.72rem;
    line-height: 1.55;
    overflow: auto;
    max-height: calc(100vh - 260px);
  }
  .code code {
    background: none;
    border: 0;
    padding: 0;
  }
  .note {
    font-size: 0.72rem;
    color: var(--text-3);
    margin: 8px 0 0;
  }
  .plan {
    padding: 12px;
    border-radius: 10px;
    background: #070a13;
    color: #c8d1e6;
    font-family: var(--mono);
    font-size: 0.72rem;
    white-space: pre-wrap;
    max-height: calc(100vh - 280px);
    overflow: auto;
  }
  .cmd {
    color: #22d3ee;
    margin-bottom: 6px;
  }
  .g {
    color: #34d399;
  }
  .r {
    color: #f87171;
  }
  .b {
    color: #93c5fd;
    font-weight: 600;
    margin-top: 6px;
  }
  .acts {
    margin-top: 10px;
    flex-wrap: wrap;
  }
  .small {
    font-size: 0.72rem;
  }
</style>
