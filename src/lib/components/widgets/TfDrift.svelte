<script lang="ts">
  import Icon from '../Icon.svelte';

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
    msg = `Someone resized the instance to ${web.real} in the AWS console. Terraform doesn't know yet — state still says ${web.state}.`;
    out = [];
  }
  function consoleDelete() {
    web.real = null;
    msg = 'Someone terminated the instance by hand. State still thinks it exists.';
    out = [];
  }
  function consoleBucket() {
    bucket.real = 'acme-reports';
    msg = 'A teammate created an S3 bucket by clicking in the console. It exists in AWS but not in code or state — it is unmanaged.';
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
        lines.push(`Note: Objects have changed outside of Terraform — ${r.addr}.${r.attr}: "${r.state}" → ${r.real ? `"${r.real}"` : '(deleted)'}`);
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
  const show = (v: Val) => v ?? '—';
</script>

<div class="wbox">
  <div class="whead">
    <span class="wtag">Scenario</span><h4>Drift: code vs state vs reality</h4>
    <span class="spacer"></span>
    <button class="btn sm ghost" onclick={reset}><Icon name="rotate-ccw" size={14} /> Reset</button>
  </div>

  <div class="tbl">
    <div class="th"></div>
    <div class="th"><Icon name="file-code" size={14} /> Code (.tf)</div>
    <div class="th"><Icon name="database" size={14} /> State</div>
    <div class="th"><Icon name="cloud" size={14} /> Real AWS</div>
    {#each rows as r}
      <div class="addr">{r.addr}<small>{r.attr}</small></div>
      <div class="cell" class:none={r.code === null}>{show(r.code)}</div>
      <div class="cell" class:none={r.state === null} class:bad={r.state !== r.real}>{show(r.state)}</div>
      <div class="cell" class:none={r.real === null} class:bad={r.real !== r.code}>{show(r.real)}</div>
    {/each}
  </div>

  <p class="msg"><Icon name="info" size={15} /> {msg}</p>

  <div class="acts">
    <span class="eyebrow">Out-of-band changes</span>
    <button class="btn sm" onclick={consoleResize}><Icon name="mouse-pointer-2" size={13} /> Resize in console</button>
    <button class="btn sm" onclick={consoleDelete}><Icon name="trash" size={13} /> Terminate by hand</button>
    <button class="btn sm" onclick={consoleBucket}><Icon name="archive" size={13} /> Click-ops a bucket</button>
  </div>
  <div class="acts">
    <span class="eyebrow">Your response</span>
    <button class="btn sm" onclick={() => plan(false)}>terraform plan</button>
    <button class="btn sm" onclick={() => plan(true)}>terraform apply</button>
    <button class="btn sm" onclick={adoptCode} disabled={!web.real || web.real === web.code}>Adopt change in code</button>
    <button class="btn sm" onclick={writeImport} disabled={!bucket.real || bucket.code !== null}>Write import block</button>
  </div>

  {#if out.length}
    <div class="term fade-in">
      {#each out as l, i (i)}<div class:g={/^\s*\+|complete|import/.test(l)} class:y={/~|changed outside|Note/.test(l)} class:b={/^Plan:/.test(l)}>{l || ' '}</div>{/each}
    </div>
  {/if}
</div>

<style>
  .tbl {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr 1fr;
    gap: 6px;
    font-size: 0.84rem;
  }
  .th {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 0.78rem;
    color: var(--text-2);
  }
  .addr {
    font-family: var(--mono);
    font-size: 0.78rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .addr small {
    color: var(--text-3);
  }
  .cell {
    padding: 8px 10px;
    border-radius: 9px;
    font-family: var(--mono);
    font-size: 0.8rem;
    background: var(--ok-soft);
    border: 1px solid rgba(52, 211, 153, 0.35);
    transition: all 0.3s;
  }
  .cell.bad {
    background: var(--warn-soft);
    border-color: rgba(251, 191, 36, 0.5);
  }
  .cell.none {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text-3);
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
    color: var(--info);
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
    color: #c8d1e6;
    border-radius: 10px;
    padding: 10px 14px;
    font-family: var(--mono);
    font-size: 0.76rem;
    white-space: pre-wrap;
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
  @media (max-width: 600px) {
    .tbl {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .th:first-child,
    .addr {
      grid-column: 1 / -1;
    }
  }
</style>
