<script lang="ts">
  import Icon from '../Icon.svelte';

  const sources = [
    { id: 'internet', label: 'Internet user', ip: '198.51.100.7', internal: false },
    { id: 'attacker', label: 'Known bad IP', ip: '203.0.113.66', internal: false },
    { id: 'bastion', label: 'Bastion host (in VPC)', ip: '10.0.1.10', internal: true }
  ];
  const ports = [
    { p: 443, name: 'HTTPS' },
    { p: 22, name: 'SSH' },
    { p: 5432, name: 'PostgreSQL' }
  ];

  let src = $state('internet');
  let port = $state(443);
  // rule toggles
  let naclBlockBad = $state(false);
  let naclEphemeral = $state(true);
  let sgHttps = $state(true);
  let sgSsh = $state(true);

  type Hop = { name: string; icon: string; ok: boolean; why: string };
  let hops = $state<Hop[]>([]);
  let shown = $state(0);
  let running = $state(false);

  function evaluate(): Hop[] {
    const s = sources.find((x) => x.id === src)!;
    const out: Hop[] = [];
    // NACL inbound (stateless, rules evaluated lowest number first)
    let naclIn: Hop;
    if (naclBlockBad && s.id === 'attacker') naclIn = { name: 'NACL inbound', icon: 'layout-grid', ok: false, why: 'Rule 90 DENY 203.0.113.0/24 matched first (lowest number wins).' };
    else if (port === 443) naclIn = { name: 'NACL inbound', icon: 'layout-grid', ok: true, why: 'Rule 100 ALLOW tcp/443 from 0.0.0.0/0.' };
    else if (port === 22 && s.internal) naclIn = { name: 'NACL inbound', icon: 'layout-grid', ok: true, why: 'Rule 110 ALLOW tcp/22 from 10.0.0.0/16.' };
    else if (port === 5432 && s.internal) naclIn = { name: 'NACL inbound', icon: 'layout-grid', ok: true, why: 'Rule 120 ALLOW tcp/5432 from 10.0.0.0/16.' };
    else naclIn = { name: 'NACL inbound', icon: 'layout-grid', ok: false, why: 'No numbered rule matched → final * DENY.' };
    out.push(naclIn);
    if (!naclIn.ok) return out;

    // Security group (stateful, allow-only)
    let sg: Hop;
    if (port === 443 && sgHttps) sg = { name: 'Security group', icon: 'shield', ok: true, why: 'Inbound rule allows tcp/443 from 0.0.0.0/0.' };
    else if (port === 22 && sgSsh && s.internal) sg = { name: 'Security group', icon: 'shield', ok: true, why: 'Inbound rule allows tcp/22 from the bastion SG.' };
    else sg = { name: 'Security group', icon: 'shield', ok: false, why: 'Security groups only have ALLOW rules; nothing allows this, so it is dropped.' };
    out.push(sg);
    if (!sg.ok) return out;

    out.push({ name: 'Instance', icon: 'server', ok: true, why: `Request reaches the app on port ${port}. It sends a response.` });
    out.push({ name: 'SG outbound', icon: 'shield', ok: true, why: 'Stateful: return traffic for an allowed connection is automatically allowed.' });
    out.push(
      naclEphemeral
        ? { name: 'NACL outbound', icon: 'layout-grid', ok: true, why: 'Rule 100 ALLOW tcp/1024-65535 (ephemeral ports) outbound.' }
        : { name: 'NACL outbound', icon: 'layout-grid', ok: false, why: 'Stateless! The response goes to an ephemeral port on the client and no outbound rule allows it. The connection hangs.' }
    );
    return out;
  }

  async function send() {
    hops = evaluate();
    shown = 0;
    running = true;
    for (let i = 1; i <= hops.length; i++) {
      await new Promise((r) => setTimeout(r, 420));
      shown = i;
    }
    running = false;
  }

  const final = $derived(!running && shown && shown === hops.length ? hops.every((h) => h.ok) : null);
</script>

<div class="wbox">
  <div class="whead"><span class="wtag">Simulation</span><h4>Security groups vs network ACLs</h4></div>
  <div class="grid">
    <div>
      <span class="eyebrow">Packet</span>
      <div class="pick">
        {#each sources as s}<button class:on={src === s.id} onclick={() => (src = s.id)}>{s.label}<small>{s.ip}</small></button>{/each}
      </div>
      <div class="pick">
        {#each ports as p}<button class:on={port === p.p} onclick={() => (port = p.p)}>{p.name}<small>tcp/{p.p}</small></button>{/each}
      </div>
      <span class="eyebrow">Rules</span>
      <label class="tg"><input type="checkbox" bind:checked={naclBlockBad} /> NACL rule 90: DENY 203.0.113.0/24 inbound</label>
      <label class="tg"><input type="checkbox" bind:checked={naclEphemeral} /> NACL outbound: ALLOW ephemeral ports 1024-65535</label>
      <label class="tg"><input type="checkbox" bind:checked={sgHttps} /> SG inbound: ALLOW 443 from 0.0.0.0/0</label>
      <label class="tg"><input type="checkbox" bind:checked={sgSsh} /> SG inbound: ALLOW 22 from bastion-sg</label>
      <button class="btn primary sm send" onclick={send} disabled={running}><Icon name="play" size={14} /> Send packet</button>
    </div>
    <div class="path">
      {#each hops as h, i}
        {#if i < shown}
          <div class="hop fade-in" class:bad={!h.ok}>
            <span class="ic"><Icon name={h.icon} size={16} /></span>
            <div><strong>{h.name} {h.ok ? '✓' : '✗'}</strong><p>{h.why}</p></div>
          </div>
        {/if}
      {:else}
        <p class="faint">Choose a source and port, then send a packet to trace it through the subnet's NACL and the instance's security group.</p>
      {/each}
      {#if final !== null}
        <div class="res fade-in" class:ok={final}>{final ? 'Round trip succeeded' : 'Traffic blocked'}</div>
      {/if}
    </div>
  </div>
  <div class="cmp">
    <div><strong>Security group</strong> — instance/ENI level · <em>stateful</em> · allow rules only · all rules evaluated</div>
    <div><strong>Network ACL</strong> — subnet level · <em>stateless</em> · allow &amp; deny · numbered, first match wins</div>
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 18px;
  }
  @media (max-width: 700px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
  .pick {
    display: flex;
    gap: 6px;
    margin: 6px 0 10px;
    flex-wrap: wrap;
  }
  .pick button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 7px 10px;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.8rem;
    font-weight: 600;
    text-align: left;
  }
  .pick button small {
    font-family: var(--mono);
    font-size: 0.68rem;
    color: var(--text-3);
    font-weight: 400;
  }
  .pick button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .tg {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-2);
    margin: 5px 0;
  }
  .tg input {
    accent-color: var(--accent);
  }
  .send {
    margin-top: 10px;
  }
  .path {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hop {
    display: flex;
    gap: 10px;
    padding: 9px 11px;
    border-radius: 10px;
    background: var(--ok-soft);
    border-left: 3px solid var(--ok);
  }
  .hop.bad {
    background: var(--err-soft);
    border-left-color: var(--err);
  }
  .hop p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .hop strong {
    font-size: 0.84rem;
  }
  .ic {
    display: grid;
    padding-top: 2px;
  }
  .res {
    text-align: center;
    font-weight: 700;
    padding: 8px;
    border-radius: 10px;
    background: var(--err);
    color: white;
  }
  .res.ok {
    background: var(--ok);
    color: #06281c;
  }
  .cmp {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 14px;
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .cmp div {
    padding: 9px 11px;
    border-radius: 10px;
    background: var(--surface-2);
  }
  @media (max-width: 600px) {
    .cmp {
      grid-template-columns: 1fr;
    }
  }
</style>
