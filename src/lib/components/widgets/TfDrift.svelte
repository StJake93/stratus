<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Icon from '../Icon.svelte';
  import { scrollable } from '../../actions';

  type Val = string | null; // null = does not exist
  interface Row {
    addr: string;
    attr: string;
    code: Val;
    state: Val;
    real: Val;
  }

  const fresh = (): Row[] => [
    { addr: 'aws_instance.web', attr: 'instance_type', code: 't3.micro', state: 't3.micro', real: 't3.micro' },
    { addr: 'aws_s3_bucket.reports', attr: 'bucket', code: null, state: null, real: null }
  ];
  let rows = $state<Row[]>(fresh());
  let msg = $state('Everything is in sync: code, state and the real AWS account agree.');
  let out = $state<string[]>([]);
  let importBlock = $state(false);

  const web = $derived(rows[0]);
  const bucket = $derived(rows[1]);

  function consoleResize() {
    web.real = web.real === 't3.large' ? 't3.xlarge' : 't3.large';
    msg = `Someone resized the instance to ${web.real} in the AWS console. Terraform doesn't know yet: state still says ${web.state}.`;
    out = [];
  }
  function consoleDelete() {
    web.real = null;
    msg = 'Someone terminated the instance by hand. State still thinks it exists.';
    out = [];
  }
  function consoleBucket() {
    bucket.real = 'acme-reports';
    msg = 'A teammate created an S3 bucket by clicking in the console. It exists in AWS but not in code or state, so it is unmanaged.';
    out = [];
  }
  function adoptCode() {
    if (web.real) web.code = web.real;
    msg = `You updated main.tf to instance_type = "${web.code}" so the code reflects reality.`;
    out = [];
  }
  function writeImport() {
    bucket.code = 'acme-reports';
    importBlock = true;
    msg = 'You wrote a resource block and an import block { to = aws_s3_bucket.reports, id = "acme-reports" }.';
    out = [];
  }

  function plan(applying = false) {
    // 1. refresh: state picks up reality
    const lines: string[] = ['$ terraform ' + (applying ? 'apply' : 'plan'), '', 'Refreshing state...'];
    for (const r of rows) {
      if (r.state !== null && r.state !== r.real) {
        lines.push(`Note: Objects have changed outside of Terraform. ${r.addr}.${r.attr}: "${r.state}" → ${r.real ? `"${r.real}"` : '(deleted)'}`);
        r.state = r.real;
      }
    }
    lines.push('');
    let add = 0,
      chg = 0,
      imp = 0;
    for (const r of rows) {
      if (r.code === null) continue;
      if (r.state === null && r.real !== null && importBlock && r === bucket) {
        lines.push(`  # ${r.addr} will be imported`, `    resource "aws_s3_bucket" "reports" { bucket = "${r.real}" }`);
        imp++;
      } else if (r.state === null) {
        lines.push(`  # ${r.addr} will be created`, `  + ${r.attr} = "${r.code}"`);
        add++;
      } else if (r.state !== r.code) {
        lines.push(`  # ${r.addr} will be updated in-place`, `  ~ ${r.attr} = "${r.state}" -> "${r.code}"`);
        chg++;
      }
    }
    if (!add && !chg && !imp) lines.push('No changes. Your infrastructure matches the configuration.');
    else lines.push('', `Plan: ${imp ? `${imp} to import, ` : ''}${add} to add, ${chg} to change, 0 to destroy.`);

    if (applying && (add || chg || imp)) {
      for (const r of rows) {
        if (r.code === null) continue;
        r.real = r.code;
        r.state = r.code;
      }
      importBlock = false;
      lines.push('', `Apply complete! Resources: ${imp ? `${imp} imported, ` : ''}${add} added, ${chg} changed, 0 destroyed.`);
      msg = 'Code, state and reality agree again.';
    } else if (!applying) {
      const unmanaged = rows.find((r) => r.real !== null && r.code === null);
      msg = unmanaged
        ? `Notice the plan says nothing about ${unmanaged.real}: Terraform only manages what is in its state. Unmanaged resources are invisible to it.`
        : chg
          ? 'Plan wants to revert the manual change back to what the code says. Either apply (revert) or update the code to adopt the change.'
          : add
            ? 'The resource is gone, so Terraform plans to create it again.'
            : msg;
    }
    out = lines;
  }

  function reset() {
    rows = fresh();
    importBlock = false;
    out = [];
    msg = 'Everything is in sync: code, state and the real AWS account agree.';
  }
</script>

<WidgetFrame kind="Scenario" title="Drift: code vs state vs reality">
  {#snippet actions()}
    <button class="btn sm ghost" onclick={reset}><Icon name="rotate-ccw" size={14} /> Reset<span class="sr-only"> drift scenario</span></button>
  {/snippet}

  <div class="tbl-wrap" use:scrollable>
    <table class="tbl">
      <caption class="sr-only">Each managed attribute as written in code, recorded in state, and actually deployed in AWS. Out-of-sync values are marked.</caption>
      <thead>
        <tr>
          <th scope="col"><span class="sr-only">Resource</span></th>
          <th scope="col"><Icon name="file-code" size={14} /> Code (.tf)</th>
          <th scope="col"><Icon name="database" size={14} /> State</th>
          <th scope="col"><Icon name="cloud" size={14} /> Real AWS</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r}
          <tr>
            <th scope="row" class="addr">{r.addr}<small>{r.attr}</small></th>
            {@render cell(r.code, false)}
            {@render cell(r.state, r.state !== r.real)}
            {@render cell(r.real, r.real !== r.code)}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="msg" aria-live="polite"><Icon name="info" size={15} /> <span>{msg}</span></p>

  <div class="acts" role="group" aria-labelledby="drift-oob">
    <span class="eyebrow" id="drift-oob">Out-of-band changes</span>
    <button class="btn sm" onclick={consoleResize}><Icon name="mouse-pointer-2" size={13} /> Resize in console</button>
    <button class="btn sm" onclick={consoleDelete}><Icon name="trash" size={13} /> Terminate by hand</button>
    <button class="btn sm" onclick={consoleBucket}><Icon name="archive" size={13} /> Click-ops a bucket</button>
  </div>
  <div class="acts" role="group" aria-labelledby="drift-resp">
    <span class="eyebrow" id="drift-resp">Your response</span>
    <button class="btn sm" onclick={() => plan(false)}>terraform plan</button>
    <button class="btn sm" onclick={() => plan(true)}>terraform apply</button>
    <button class="btn sm" onclick={adoptCode} disabled={!web.real || web.real === web.code}>Adopt change in code</button>
    <button class="btn sm" onclick={writeImport} disabled={!bucket.real || bucket.code !== null}>Write import block</button>
  </div>

  {#if out.length}
    <div class="term fade-in" use:scrollable role="log" aria-label="Terminal output">
      {#each out as l, i (i)}<div class:g={/^\s*\+|complete|import/.test(l)} class:y={/~|changed outside|Note/.test(l)} class:b={/^Plan:/.test(l)}>{l || '\u00a0'}</div>{/each}
    </div>
  {/if}
</WidgetFrame>

{#snippet cell(v: Val, drift: boolean)}
  <td class="cell" class:none={v === null} class:bad={drift}>
    {#if drift}<Icon name="triangle-alert" size={13} />{/if}
    {v ?? 'None'}{#if drift}<span class="sr-only"> (out of sync)</span>{/if}
  </td>
{/snippet}

<style>
  .tbl-wrap {
    overflow-x: auto;
  }
  .tbl {
    width: 100%;
    border-collapse: separate;
    border-spacing: 6px;
    font-size: 0.84rem;
  }
  thead th {
    text-align: left;
    font-weight: 700;
    font-size: 0.78rem;
    color: var(--text-2);
    white-space: nowrap;
  }
  thead th :global(svg) {
    vertical-align: -2px;
    margin-right: 4px;
  }
  .addr {
    text-align: left;
    font-family: var(--mono);
    font-size: 0.78rem;
    font-weight: 600;
  }
  .addr small {
    display: block;
    color: var(--text-2);
    font-weight: 400;
  }
  .cell {
    padding: 8px 10px;
    border-radius: 9px;
    font-family: var(--mono);
    font-size: 0.8rem;
    background: var(--ok-soft);
    border: 1px solid rgba(52, 211, 153, 0.45);
    transition: all 0.3s;
  }
  .cell.bad {
    background: var(--warn-soft);
    border: 2px dashed var(--warn);
    color: var(--warn-fg);
    font-weight: 700;
  }
  .cell.bad :global(svg) {
    vertical-align: -2px;
    margin-right: 3px;
  }
  .cell.none {
    background: var(--surface);
    border-color: var(--border-strong);
    color: var(--text-2);
    font-style: italic;
  }
  .msg {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 12px;
    margin: 14px 0 10px;
    border-radius: 10px;
    background: var(--info-soft);
    font-size: 0.88rem;
  }
  .msg :global(svg) {
    flex: none;
    margin-top: 3px;
    color: var(--info-fg);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .acts .eyebrow {
    width: 150px;
  }
  .term {
    margin-top: 8px;
    background: #070a13;
    color: #d6deeb;
    border-radius: 10px;
    padding: 10px 14px;
    font-family: var(--mono);
    font-size: 0.76rem;
    white-space: pre-wrap;
  }
  .term:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: -2px;
  }
  .g {
    color: #34d399;
  }
  .y {
    color: #fbbf24;
  }
  .b {
    color: #93c5fd;
    font-weight: 600;
  }
</style>
