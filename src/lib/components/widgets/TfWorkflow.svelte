<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Icon from '../Icon.svelte';
  import { highlight } from '../../highlight';
  import { scrollable } from '../../actions';

  type Attrs = Record<string, string | number | boolean>;
  interface Res {
    addr: string;
    enabled: boolean;
    attrs: Attrs;
    forceNew: string[];
  }

  let cfg = $state<Res[]>([
    { addr: 'aws_s3_bucket.assets', enabled: true, attrs: { bucket: 'acme-assets-dev', force_destroy: false }, forceNew: ['bucket'] },
    { addr: 'aws_dynamodb_table.orders', enabled: false, attrs: { name: 'orders', billing_mode: 'PAY_PER_REQUEST', hash_key: 'id' }, forceNew: ['name', 'hash_key'] },
    { addr: 'aws_lambda_function.api', enabled: false, attrs: { function_name: 'orders-api', runtime: 'python3.13', memory_size: 256 }, forceNew: ['function_name'] }
  ]);

  let tfstate = $state<Record<string, Attrs>>({});
  let initialized = $state(false);
  let out = $state<string[]>(['# Edit the configuration, then run the workflow: init → plan → apply']);
  let planned = $state(false);
  let serial = $state(0);

  const esc = (v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v));
  const hcl = $derived(
    cfg
      .filter((r) => r.enabled)
      .map((r) => {
        const [type, name] = r.addr.split('.');
        const w = Math.max(...Object.keys(r.attrs).map((k) => k.length));
        const body = Object.entries(r.attrs)
          .map(([k, v]) => `  ${k.padEnd(w)} = ${esc(v)}`)
          .join('\n');
        return `resource "${type}" "${name}" {\n${body}\n}`;
      })
      .join('\n\n') || '# (no resources)'
  );

  type Change = { addr: string; action: 'create' | 'update' | 'replace' | 'delete'; diffs: string[] };

  function diff(): Change[] {
    const changes: Change[] = [];
    for (const r of cfg) {
      const cur = tfstate[r.addr];
      if (r.enabled && !cur) changes.push({ addr: r.addr, action: 'create', diffs: Object.entries(r.attrs).map(([k, v]) => `+ ${k} = ${esc(v)}`) });
      else if (!r.enabled && cur) changes.push({ addr: r.addr, action: 'delete', diffs: [] });
      else if (r.enabled && cur) {
        const d = Object.entries(r.attrs).filter(([k, v]) => cur[k] !== v);
        if (d.length) {
          const replace = d.some(([k]) => r.forceNew.includes(k));
          changes.push({
            addr: r.addr,
            action: replace ? 'replace' : 'update',
            diffs: d.map(([k, v]) => `~ ${k} = ${esc(cur[k])} -> ${esc(v)}${r.forceNew.includes(k) ? ' # forces replacement' : ''}`)
          });
        }
      }
    }
    return changes;
  }

  const pending = $derived(diff());

  function print(lines: string[]) {
    out = lines;
  }

  function init() {
    initialized = true;
    print([
      '$ terraform init',
      '',
      'Initializing the backend...',
      'Initializing provider plugins...',
      '- Finding hashicorp/aws versions matching "~> 6.0"...',
      '- Installing hashicorp/aws v6.x...',
      '',
      'Terraform has been successfully initialized!'
    ]);
  }

  function need() {
    if (!initialized) {
      print(['$ terraform plan', '', 'Error: Inconsistent dependency lock file', '', '  The provider hashicorp/aws is not installed.', '  Run "terraform init" to install all required providers.']);
      return false;
    }
    return true;
  }

  function planLines(changes: Change[]) {
    if (!changes.length) return ['No changes. Your infrastructure matches the configuration.'];
    const sym = { create: '+', update: '~', replace: '-/+', delete: '-' };
    const verb = { create: 'will be created', update: 'will be updated in-place', replace: 'must be replaced', delete: 'will be destroyed' };
    const lines = ['Terraform will perform the following actions:', ''];
    for (const c of changes) {
      lines.push(`  # ${c.addr} ${verb[c.action]}`);
      lines.push(`  ${sym[c.action]} resource "${c.addr.split('.')[0]}" "${c.addr.split('.')[1]}" {`);
      c.diffs.forEach((d) => lines.push(`      ${d}`));
      lines.push('    }', '');
    }
    const add = changes.filter((c) => c.action === 'create' || c.action === 'replace').length;
    const chg = changes.filter((c) => c.action === 'update').length;
    const del = changes.filter((c) => c.action === 'delete' || c.action === 'replace').length;
    lines.push(`Plan: ${add} to add, ${chg} to change, ${del} to destroy.`);
    return lines;
  }

  function plan() {
    if (!need()) return;
    planned = true;
    print(['$ terraform plan', '', ...planLines(pending)]);
  }

  function apply() {
    if (!need()) return;
    const changes = pending;
    const lines = ['$ terraform apply', '', ...planLines(changes)];
    if (!changes.length) return print(lines);
    lines.push('', 'Do you want to perform these actions? yes', '');
    for (const c of changes) {
      const r = cfg.find((x) => x.addr === c.addr)!;
      if (c.action === 'delete') {
        lines.push(`${c.addr}: Destroying...`, `${c.addr}: Destruction complete after 1s`);
        delete tfstate[c.addr];
      } else {
        if (c.action === 'replace') lines.push(`${c.addr}: Destroying...`, `${c.addr}: Destruction complete after 1s`);
        lines.push(`${c.addr}: ${c.action === 'update' ? 'Modifying' : 'Creating'}...`, `${c.addr}: ${c.action === 'update' ? 'Modifications' : 'Creation'} complete after 2s`);
        tfstate[c.addr] = { ...r.attrs };
      }
    }
    tfstate = { ...tfstate };
    serial++;
    const add = changes.filter((c) => c.action === 'create' || c.action === 'replace').length;
    const chg = changes.filter((c) => c.action === 'update').length;
    const del = changes.filter((c) => c.action === 'delete' || c.action === 'replace').length;
    lines.push('', `Apply complete! Resources: ${add} added, ${chg} changed, ${del} destroyed.`);
    planned = false;
    print(lines);
  }

  function destroy() {
    if (!need()) return;
    const addrs = Object.keys(tfstate);
    if (!addrs.length) return print(['$ terraform destroy', '', 'No changes. No objects need to be destroyed.']);
    const lines = ['$ terraform destroy', '', ...addrs.map((a) => `  - ${a}`), '', `Plan: 0 to add, 0 to change, ${addrs.length} to destroy.`, ''];
    addrs.forEach((a) => lines.push(`${a}: Destroying...`, `${a}: Destruction complete after 1s`));
    lines.push('', `Destroy complete! Resources: ${addrs.length} destroyed.`);
    tfstate = {};
    serial++;
    print(lines);
  }

  function cls(t: string) {
    const s = t.trim();
    if (s.startsWith('$')) return 'cmd';
    if (/^\+|created|complete!|successfully|Creation complete/.test(s)) return 'g';
    if (/^- aws_|destroyed|Destroying|Destruction|Error/.test(s)) return 'r';
    if (/^~|^-\/\+|updated|replaced|Modif/.test(s)) return 'y';
    if (/^Plan:|^#/.test(s)) return 'b';
    return '';
  }
</script>

<WidgetFrame title="The Terraform core workflow">
  <div class="grid">
    <fieldset class="edit">
      <legend class="eyebrow">1 · Write the configuration</legend>
      {#each cfg as r}
        <div class="res" class:off={!r.enabled}>
          <label class="head"><input type="checkbox" bind:checked={r.enabled} /> <code>{r.addr}</code><span class="sr-only">{r.enabled ? '' : ' (not in configuration)'}</span></label>
          {#if r.enabled}
            <div class="attrs">
              {#each Object.keys(r.attrs) as k}
                <label>
                  <span>{k}{#if r.forceNew.includes(k)}<span aria-hidden="true"> *</span><span class="sr-only"> (changing this forces replacement)</span>{/if}</span>
                  {#if typeof r.attrs[k] === 'boolean'}
                    <input type="checkbox" checked={r.attrs[k] === true} onchange={(e) => (r.attrs[k] = e.currentTarget.checked)} />
                  {:else if typeof r.attrs[k] === 'number'}
                    <select class="input" bind:value={r.attrs[k]}>{#each [128, 256, 512, 1024] as m}<option value={m}>{m}</option>{/each}</select>
                  {:else}
                    <input class="input" bind:value={r.attrs[k]} />
                  {/if}
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
      <p class="faint tiny" aria-hidden="true">* Changing this argument forces the resource to be destroyed and re-created.</p>
    </fieldset>

    <div class="side">
      <p class="eyebrow">main.tf</p>
      <pre class="hcl" use:scrollable><code>{@html highlight(hcl, 'hcl')}</code></pre>
      <p class="eyebrow">terraform.tfstate · serial {serial}</p>
      <ul class="state" aria-label="Resources in state">
        {#each Object.keys(tfstate) as a (a)}
          <li class="sr fade-in"><Icon name="check" size={13} /> {a}</li>
        {:else}
          <li class="faint">Empty: nothing is managed yet</li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="cmds" role="group" aria-label="Terraform commands">
    <span class="eyebrow">2 · Plan and 3 · Apply</span>
    <button class="btn sm" class:primary={!initialized} onclick={init}>terraform init</button>
    <button class="btn sm" class:primary={initialized && !planned && pending.length > 0} onclick={plan}>plan</button>
    <button class="btn sm" class:primary={planned && pending.length > 0} onclick={apply}>apply</button>
    <button class="btn sm danger" onclick={destroy}>destroy</button>
    <span class="spacer"></span>
    {#if initialized}<span class="chip">{pending.length} pending change{pending.length === 1 ? '' : 's'}</span>{/if}
  </div>
  <div class="term" use:scrollable role="log" aria-live="polite" aria-label="Terminal output">
    {#each out as l, i (i)}<div class={cls(l)}>{l || '\u00a0'}</div>{/each}
  </div>
</WidgetFrame>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 700px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  .res {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    margin-top: 8px;
    background: var(--surface);
  }
  .res.off {
    border-style: dashed;
    background: none;
  }
  .res.off code {
    color: var(--text-2);
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
  }
  .side .eyebrow {
    margin: 0;
  }
  .hcl:focus-visible,
  .term:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: -2px;
  }
  .head {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .attrs {
    display: grid;
    gap: 5px;
    margin-top: 8px;
  }
  .attrs label {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 0.76rem;
    color: var(--text-2);
  }
  .attrs .input {
    padding: 4px 8px;
    font-family: var(--mono);
    font-size: 0.78rem;
  }
  input[type='checkbox'] {
    accent-color: var(--accent);
    justify-self: start;
  }
  .tiny {
    font-size: 0.74rem;
    margin: 6px 0 0;
  }
  .hcl {
    margin: 6px 0 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #0b0f1c;
    color: #d6deeb;
    font-size: 0.74rem;
    max-height: 220px;
    overflow: auto;
  }
  .hcl code {
    background: none;
    border: 0;
    padding: 0;
  }
  .state {
    list-style: none;
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px dashed var(--border-strong);
    font-family: var(--mono);
    font-size: 0.76rem;
    min-height: 44px;
  }
  .sr {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ok-fg);
  }
  .cmds {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 14px 0 8px;
  }
  .cmds .eyebrow {
    margin-right: 6px;
  }
  .cmds .btn {
    font-family: var(--mono);
    font-weight: 500;
  }
  .term {
    background: #070a13;
    color: #c8d1e6;
    border-radius: 10px;
    padding: 10px 14px;
    font-family: var(--mono);
    font-size: 0.76rem;
    max-height: 260px;
    overflow: auto;
    white-space: pre-wrap;
  }
  .cmd {
    color: #22d3ee;
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
</style>
