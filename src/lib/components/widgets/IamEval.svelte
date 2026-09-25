<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Icon from '../Icon.svelte';
  import { highlight } from '../../highlight';
  import { scrollable } from '../../actions';

  interface Stmt {
    sid: string;
    effect: 'Allow' | 'Deny';
    action: string;
    resource: string;
    on: boolean;
  }

  let stmts = $state<Stmt[]>([
    { sid: 'ReadReports', effect: 'Allow', action: 's3:GetObject', resource: 'arn:aws:s3:::reports/*', on: true },
    { sid: 'DevBucketsFull', effect: 'Allow', action: 's3:*', resource: 'arn:aws:s3:::dev-*/*', on: true },
    { sid: 'NeverDelete', effect: 'Deny', action: 's3:DeleteObject', resource: '*', on: true },
    { sid: 'QueryOrders', effect: 'Allow', action: 'dynamodb:Query', resource: 'arn:aws:dynamodb:*:*:table/orders', on: false }
  ]);

  const actions = ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 'dynamodb:Query', 'dynamodb:DeleteItem', 'ec2:TerminateInstances'];
  const resources = [
    'arn:aws:s3:::reports/q3.csv',
    'arn:aws:s3:::dev-sandbox/test.txt',
    'arn:aws:s3:::prod-data/users.json',
    'arn:aws:dynamodb:ap-southeast-2:123456789012:table/orders',
    'arn:aws:ec2:ap-southeast-2:123456789012:instance/i-0abc'
  ];
  let action = $state('s3:GetObject');
  let resource = $state(resources[0]);

  const glob = (p: string) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const matches = (s: Stmt) => s.on && glob(s.action).test(action) && glob(s.resource).test(resource);

  const matched = $derived(stmts.filter(matches));
  const verdict = $derived(
    matched.some((s) => s.effect === 'Deny')
      ? { kind: 'deny', title: 'Explicit deny', text: 'A matching Deny statement always wins, no matter how many Allows match.' }
      : matched.some((s) => s.effect === 'Allow')
        ? { kind: 'allow', title: 'Allowed', text: 'At least one Allow matched and no Deny matched.' }
        : { kind: 'implicit', title: 'Implicit deny', text: 'Nothing matched. In IAM everything is denied by default unless explicitly allowed.' }
  );

  const json = $derived(
    JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: stmts.filter((s) => s.on).map((s) => ({ Sid: s.sid, Effect: s.effect, Action: s.action, Resource: s.resource }))
      },
      null,
      2
    )
  );
</script>

<WidgetFrame title="IAM policy evaluator">
  <div class="grid">
    <fieldset>
      <legend class="eyebrow">Identity policy statements</legend>
      <div class="stmts">
        {#each stmts as s}
          <label class="stmt" class:hit={matches(s)} class:deny={s.effect === 'Deny'}>
            <input type="checkbox" bind:checked={s.on} />
            <span class="eff">{s.effect}</span>
            <span class="body"><code>{s.action}</code><small>{s.resource}</small></span>
            {#if matches(s)}<span class="m">Matches</span>{/if}
          </label>
        {/each}
      </div>
      <details>
        <summary>View as JSON</summary>
        <pre class="json" use:scrollable><code>{@html highlight(json, 'json')}</code></pre>
      </details>
    </fieldset>
    <div>
      <p class="eyebrow">Request</p>
      <label class="fld">Action <select class="input" bind:value={action}>{#each actions as a}<option>{a}</option>{/each}</select></label>
      <label class="fld">Resource <select class="input" bind:value={resource}>{#each resources as r}<option>{r}</option>{/each}</select></label>

      <ol class="flow" aria-label="Evaluation order">
        <li class="step" class:lit={matched.some((s) => s.effect === 'Deny')}><Icon name="shield" size={14} /> Any explicit Deny?{#if matched.some((s) => s.effect === 'Deny')}<span class="sr-only"> Yes, this decides.</span>{/if}</li>
        <li class="step" class:lit={verdict.kind === 'allow'}><Icon name="check" size={14} /> Any Allow?{#if verdict.kind === 'allow'}<span class="sr-only"> Yes, this decides.</span>{/if}</li>
        <li class="step" class:lit={verdict.kind === 'implicit'}><Icon name="lock" size={14} /> Default: deny{#if verdict.kind === 'implicit'}<span class="sr-only"> This decides.</span>{/if}</li>
      </ol>
      <div aria-live="polite">
        {#key verdict.kind + action + resource}
          <div class="verdict {verdict.kind} fade-in">
            <Icon name={verdict.kind === 'allow' ? 'circle-check' : 'circle-x'} size={22} />
            <div><strong>{verdict.title}</strong><p>{verdict.text}</p></div>
          </div>
        {/key}
      </div>
    </div>
  </div>
</WidgetFrame>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 18px;
  }
  @media (max-width: 700px) {
    .grid {
      grid-template-columns: 1fr;
    }
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
  .stmts {
    display: grid;
    gap: 6px;
    margin: 6px 0 10px;
  }
  .stmt {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    transition: all 0.2s;
  }
  .stmt.hit {
    border: 2px solid var(--ok);
    background: var(--ok-soft);
  }
  .stmt.hit.deny {
    border-color: var(--err);
    background: var(--err-soft);
  }
  .eff {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    width: 44px;
    color: var(--ok-fg);
  }
  .deny .eff {
    color: var(--err-fg);
  }
  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .body small {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-2);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .body code {
    align-self: flex-start;
  }
  .m {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text);
  }
  details summary {
    cursor: pointer;
    min-height: 28px;
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .json:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: -2px;
  }
  .json {
    margin: 6px 0 0;
    padding: 10px;
    border-radius: 10px;
    background: #0b0f1c;
    color: #d6deeb;
    font-size: 0.72rem;
    overflow: auto;
    max-height: 220px;
  }
  .json code {
    background: none;
    border: 0;
    padding: 0;
  }
  .eyebrow {
    margin: 0;
  }
  .fld {
    display: grid;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-2);
    margin: 6px 0 10px;
  }
  .fld .input {
    font-family: var(--mono);
    font-size: 0.76rem;
  }
  .flow {
    list-style: none;
    padding: 0;
    margin: 0 0 10px;
    display: flex;
    gap: 4px;
  }
  .step {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text-2);
    transition: all 0.3s;
    text-align: center;
  }
  .step.lit {
    background: var(--accent-soft);
    color: var(--text);
    box-shadow: inset 0 0 0 2px var(--accent-strong);
  }
  .verdict {
    display: flex;
    gap: 12px;
    padding: 14px;
    border-radius: 12px;
  }
  .verdict p {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--text-2);
  }
  .verdict.allow {
    background: var(--ok-soft);
    color: var(--ok-fg);
  }
  .verdict.deny {
    background: var(--err-soft);
    color: var(--err-fg);
  }
  .verdict.implicit {
    background: var(--warn-soft);
    color: var(--warn-fg);
  }
</style>
