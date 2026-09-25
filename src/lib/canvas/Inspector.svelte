<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { SERVICE, categoryColor, linkLabel } from '../data/services';
  import { board, type FlowNode } from './board.svelte';

  const node = $derived(board.nodes.find((n) => n.id === board.selected));
  const s = $derived(node ? SERVICE[node.data.svc] : undefined);
  const issues = $derived(node ? board.issues.filter((i) => i.node === node.id) : []);
  const tfAddrs = $derived(node ? board.terraform.resources.filter((r) => r.node === node.id).map((r) => r.addr) : []);
  const connections = $derived(node ? board.edges.filter((e) => e.source === node.id || e.target === node.id) : []);
  const nameOf = (id: string) => board.nodes.find((n) => n.id === id)?.data.name ?? id;

  // Containers this node could move into: every VPC or subnet except itself and its own descendants.
  const containers = $derived.by(() => {
    if (!node) return [];
    const banned = new Set([node.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of board.nodes)
        if (n.parentId && banned.has(n.parentId) && !banned.has(n.id)) {
          banned.add(n.id);
          grew = true;
        }
    }
    return board.nodes.filter((n) => n.type === 'group' && !banned.has(n.id));
  });
  const containerLabel = (g: FlowNode) => (g.data.svc === 'vpc' ? `VPC ${g.data.name}` : `${g.data.config.public ? 'Public' : 'Private'} subnet ${g.data.name} (AZ ${g.data.config.az})`);

  // Valid connection targets from this node (in either direction), excluding existing links.
  const targets = $derived.by(() => {
    if (!node || s?.group) return [];
    return board.nodes
      .filter((n) => n.id !== node.id && n.type !== 'group' && !connections.some((e) => e.source === n.id || e.target === n.id))
      .map((n) => ({ n, out: linkLabel(node.data.svc, n.data.svc), inn: linkLabel(n.data.svc, node.data.svc) }))
      .filter((x) => x.out || x.inn);
  });
  let connectTo = $state('');
  function connect() {
    if (!node || !connectTo) return;
    board.connect(node.id, connectTo);
    connectTo = '';
  }
</script>

{#if node && s}
  <div class="insp fade-in">
    <header style:--c={categoryColor(s.category)}>
      <span class="ic" aria-hidden="true"><Icon name={s.icon} size={22} /></span>
      <div>
        <p class="eyebrow">{s.full}</p>
        <label class="sr-only" for="insp-name">Name</label>
        <input id="insp-name" class="name" value={node.data.name} onchange={(e) => board.update(node.id, { name: e.currentTarget.value.trim() || node.data.name })} />
      </div>
    </header>
    <p class="blurb">{s.blurb}</p>

    <section class="sect" aria-labelledby="insp-place">
      <h3 class="eyebrow" id="insp-place">Placement</h3>
      <label class="field">
        <span>Place in</span>
        <select class="input" value={node.parentId ?? ''} onchange={(e) => board.moveInto(node.id, e.currentTarget.value || null)}>
          <option value="">Region (outside any VPC)</option>
          {#each containers as g (g.id)}<option value={g.id}>{containerLabel(g)}</option>{/each}
        </select>
      </label>
      <p class="help">
        {s.placement === 'subnet' ? 'Needs a subnet.' : s.placement === 'vpc' ? 'Belongs directly in a VPC.' : s.placement === 'optional-subnet' ? 'Can run outside the VPC, or in a private subnet.' : s.placement === 'region' ? 'Regional service: keep it outside the VPC.' : 'Lives outside AWS.'}
        You can also drag it on the canvas.
      </p>
      {#if s.group}
        <div class="size">
          <label class="field"><span>Width</span><input class="input" type="number" min="160" step="20" value={node.width ?? 250} onchange={(e) => board.resize(node.id, Number(e.currentTarget.value), node.height ?? 160)} /></label>
          <label class="field"><span>Height</span><input class="input" type="number" min="110" step="20" value={node.height ?? 160} onchange={(e) => board.resize(node.id, node.width ?? 250, Number(e.currentTarget.value))} /></label>
        </div>
      {/if}
    </section>

    {#if s.config?.length}
      <section class="sect" aria-labelledby="insp-config">
        <h3 class="eyebrow" id="insp-config">Configuration</h3>
        <div class="fields">
          {#each s.config as f (f.key)}
            {@const v = node.data.config[f.key]}
            {@const helpId = f.help ? `help-${node.id}-${f.key}` : undefined}
            {#if f.type === 'toggle'}
              <div class="field inline">
                <span id="lbl-{node.id}-{f.key}">{f.label}</span>
                <button class="switch" class:on={v === true} role="switch" aria-checked={v === true} aria-labelledby="lbl-{node.id}-{f.key}" aria-describedby={helpId} onclick={() => board.setConfig(node.id, f.key, v !== true)}><i></i></button>
              </div>
            {:else}
              <label class="field">
                <span>{f.label}</span>
                {#if f.type === 'select'}
                  <select class="input" value={v} aria-describedby={helpId} onchange={(e) => board.setConfig(node.id, f.key, e.currentTarget.value)}>
                    {#each f.options ?? [] as o}<option value={o}>{o}</option>{/each}
                  </select>
                {:else if f.type === 'number'}
                  <input
                    class="input"
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step ?? 1}
                    value={v}
                    aria-describedby={helpId}
                    onchange={(e) => board.setConfig(node.id, f.key, Math.min(f.max ?? Infinity, Math.max(f.min ?? -Infinity, Number(e.currentTarget.value))))}
                  />
                {:else}
                  <input class="input" value={v} aria-describedby={helpId} onchange={(e) => board.setConfig(node.id, f.key, e.currentTarget.value)} />
                {/if}
              </label>
            {/if}
            {#if f.help}<p class="help" id={helpId}>{f.help}</p>{/if}
          {/each}
        </div>
      </section>
    {/if}

    {#if !s.group}
      <section class="sect" aria-labelledby="insp-conn">
        <h3 class="eyebrow" id="insp-conn">Connections</h3>
        {#if connections.length}
          <ul class="conns">
            {#each connections as e (e.id)}
              {@const outgoing = e.source === node.id}
              <li>
                <Icon name={outgoing ? 'arrow-up-right' : 'arrow-right'} size={13} />
                <span>{outgoing ? 'To' : 'From'} <button class="lnk" onclick={() => (board.selected = outgoing ? e.target : e.source)}>{nameOf(outgoing ? e.target : e.source)}</button> <span class="faint">({e.label})</span></span>
                <button class="rm" onclick={() => board.removeEdge(e.id)} aria-label="Remove the connection {outgoing ? 'to' : 'from'} {nameOf(outgoing ? e.target : e.source)}"><Icon name="x" size={14} /></button>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="help">No connections yet.</p>
        {/if}
        {#if targets.length}
          <div class="connect">
            <label class="field">
              <span>Connect to</span>
              <select class="input" bind:value={connectTo}>
                <option value="">Choose a component…</option>
                {#each targets as t (t.n.id)}<option value={t.n.id}>{t.n.data.name} ({t.out ?? `${t.inn}, incoming`})</option>{/each}
              </select>
            </label>
            <button class="btn sm" onclick={connect} disabled={!connectTo}><Icon name="link" size={14} /> Connect</button>
          </div>
        {:else if board.nodes.filter((n) => n.type !== 'group').length > 1}
          <p class="help">No other component on the canvas can connect to this one.</p>
        {/if}
      </section>
    {/if}

    {#if issues.length}
      <section class="sect" aria-labelledby="insp-issues">
        <h3 class="eyebrow" id="insp-issues">Issues</h3>
        {#each issues as i (i.key)}
          <div class="iss {i.level}"><strong><span class="sr-only">{i.level === 'error' ? 'Error' : i.level === 'warn' ? 'Warning' : 'Hint'}: </span>{i.title}</strong><p>{i.body}</p></div>
        {/each}
      </section>
    {/if}

    {#if tfAddrs.length}
      <section class="sect" aria-labelledby="insp-tf">
        <h3 class="eyebrow" id="insp-tf">Terraform resources</h3>
        <ul class="addrs">{#each tfAddrs as a}<li><code>{a}</code></li>{/each}</ul>
      </section>
    {/if}

    <div class="acts">
      <a class="btn sm" href={s.docs} target="_blank" rel="noopener"><Icon name="book-open" size={14} /> AWS docs<span class="sr-only"> for {s.full} (opens in a new tab)</span></a>
      <button class="btn sm danger" onclick={() => board.remove([node.id])}><Icon name="trash" size={14} /> Delete<span class="sr-only"> {node.data.name}</span></button>
    </div>
  </div>
{:else}
  <div class="empty">
    <Icon name="mouse-pointer-2" size={28} />
    <p>Select a component to configure it.</p>
    <ul>
      <li><strong>Add</strong> services from the palette (drag, or activate one)</li>
      <li><strong>Place</strong> them inside VPCs and subnets</li>
      <li><strong>Connect</strong> by dragging between handles, or from here</li>
      <li><kbd>Del</kbd> removes · <kbd>⌘Z</kbd> undoes</li>
    </ul>
  </div>
{/if}

<style>
  .insp {
    padding: 14px;
  }
  header {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  header > div {
    flex: 1;
    min-width: 0;
  }
  header .eyebrow {
    margin: 0;
  }
  .ic {
    width: 44px;
    height: 44px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 16%, transparent);
  }
  .name {
    width: 100%;
    font-size: 1.05rem;
    font-weight: 700;
    background: none;
    border: 1px solid var(--border-input);
    border-radius: 7px;
    padding: 3px 6px;
  }
  .name:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
  .blurb {
    font-size: 0.86rem;
    color: var(--text-2);
    margin: 10px 0 4px;
  }
  .sect {
    margin-top: 16px;
  }
  .sect > .eyebrow {
    margin: 0 0 6px;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
  }
  .fields {
    display: grid;
    gap: 4px;
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-2);
    margin-top: 6px;
  }
  .field.inline {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
  .field .input {
    padding: 6px 9px;
    font-size: 0.84rem;
  }
  .size {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .help {
    font-size: 0.76rem;
    color: var(--text-3);
    margin: 2px 0 0;
  }
  .switch {
    width: 42px;
    height: 24px;
    border-radius: 24px;
    border: 1px solid var(--border-input);
    padding: 0;
    background: var(--surface-3);
    position: relative;
    transition: background 0.2s;
  }
  .switch i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-2);
    transition:
      transform 0.25s var(--ease),
      background 0.2s;
  }
  .switch.on {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
  }
  .switch.on i {
    transform: translateX(18px);
    background: #ffffff;
  }
  .conns {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-2);
  }
  .conns li {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
  }
  .conns li > span {
    flex: 1;
  }
  .lnk {
    background: none;
    border: 0;
    padding: 0;
    color: var(--link);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .rm {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--text-2);
  }
  .rm:hover {
    color: var(--err-fg);
    background: var(--err-soft);
  }
  .connect {
    display: grid;
    gap: 6px;
    margin-top: 8px;
  }
  .connect .btn {
    justify-self: start;
  }
  .iss {
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 9px;
    font-size: 0.82rem;
    border-left: 4px solid;
  }
  .iss p {
    margin: 2px 0 0;
    color: var(--text-2);
  }
  .iss.error {
    background: var(--err-soft);
    border-color: var(--err);
  }
  .iss.warn {
    background: var(--warn-soft);
    border-color: var(--warn);
  }
  .iss.hint {
    background: var(--info-soft);
    border-color: var(--info);
  }
  .addrs {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
  }
  .addrs code {
    font-size: 0.74rem;
  }
  .acts {
    display: flex;
    gap: 6px;
    margin-top: 18px;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 36px 20px;
    color: var(--text-3);
  }
  .empty p {
    margin: 10px 0;
    color: var(--text-2);
  }
  .empty ul {
    list-style: none;
    padding: 0;
    font-size: 0.84rem;
    line-height: 1.9;
    color: var(--text-2);
  }
  kbd {
    font-family: var(--mono);
    font-size: 0.74rem;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--border-input);
  }
</style>
