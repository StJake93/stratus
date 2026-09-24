<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { SERVICE, categoryColor } from '../data/services';
  import { board } from './board.svelte';

  const node = $derived(board.nodes.find((n) => n.id === board.selected));
  const s = $derived(node ? SERVICE[node.data.svc] : undefined);
  const issues = $derived(node ? board.issues.filter((i) => i.node === node.id) : []);
  const conns = $derived(node ? { out: board.graph.out(node.id), in: board.graph.in(node.id) } : { out: [], in: [] });
  const tfAddrs = $derived(node ? board.terraform.resources.filter((r) => r.node === node.id).map((r) => r.addr) : []);
</script>

{#if node && s}
  <div class="insp fade-in">
    <header style:--c={categoryColor(s.category)}>
      <span class="ic"><Icon name={s.icon} size={22} /></span>
      <div>
        <span class="eyebrow">{s.full}</span>
        <input class="name" value={node.data.name} onchange={(e) => board.update(node.id, { name: e.currentTarget.value.trim() || node.data.name })} aria-label="Name" />
      </div>
    </header>
    <p class="blurb">{s.blurb}</p>

    {#if s.config?.length}
      <div class="fields">
        {#each s.config as f (f.key)}
          {@const v = node.data.config[f.key]}
          <label class="field" class:inline={f.type === 'toggle'}>
            <span>{f.label}</span>
            {#if f.type === 'toggle'}
              <button class="switch" class:on={v === true} role="switch" aria-checked={v === true} aria-label={f.label} onclick={() => board.setConfig(node.id, f.key, v !== true)}><i></i></button>
            {:else if f.type === 'select'}
              <select class="input" value={v} onchange={(e) => board.setConfig(node.id, f.key, e.currentTarget.value)}>
                {#each f.options ?? [] as o}<option value={o}>{o}</option>{/each}
              </select>
            {:else if f.type === 'number'}
              <input class="input" type="number" min={f.min} max={f.max} step={f.step ?? 1} value={v} onchange={(e) => board.setConfig(node.id, f.key, Math.min(f.max ?? Infinity, Math.max(f.min ?? -Infinity, Number(e.currentTarget.value))))} />
            {:else}
              <input class="input" value={v} onchange={(e) => board.setConfig(node.id, f.key, e.currentTarget.value)} />
            {/if}
          </label>
          {#if f.help}<p class="help">{f.help}</p>{/if}
        {/each}
      </div>
    {/if}

    {#if issues.length}
      <div class="sect">
        <span class="eyebrow">Issues</span>
        {#each issues as i (i.key)}
          <div class="iss {i.level}"><strong>{i.title}</strong><p>{i.body}</p></div>
        {/each}
      </div>
    {/if}

    {#if conns.in.length || conns.out.length}
      <div class="sect">
        <span class="eyebrow">Connections</span>
        <ul class="conns">
          {#each conns.in as c}<li><Icon name="arrow-right" size={12} /> from <button class="lnk" onclick={() => (board.selected = c.id)}>{c.name}</button></li>{/each}
          {#each conns.out as c}<li><Icon name="arrow-up-right" size={12} /> to <button class="lnk" onclick={() => (board.selected = c.id)}>{c.name}</button></li>{/each}
        </ul>
      </div>
    {/if}

    {#if tfAddrs.length}
      <div class="sect">
        <span class="eyebrow">Terraform resources</span>
        <div class="addrs">{#each tfAddrs as a}<code>{a}</code>{/each}</div>
      </div>
    {/if}

    <div class="acts">
      <a class="btn sm" href={s.docs} target="_blank" rel="noopener"><Icon name="book-open" size={14} /> AWS docs</a>
      <button class="btn sm danger" onclick={() => board.remove([node.id])}><Icon name="trash" size={14} /> Delete</button>
    </div>
  </div>
{:else}
  <div class="empty">
    <Icon name="mouse-pointer-2" size={28} />
    <p>Select a component to configure it.</p>
    <ul>
      <li><strong>Drag</strong> services from the palette</li>
      <li><strong>Drop</strong> them inside VPCs &amp; subnets</li>
      <li><strong>Connect</strong> by dragging between handles</li>
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
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 2px 5px;
    margin-left: -5px;
  }
  .name:hover,
  .name:focus {
    border-color: var(--border-strong);
    outline: none;
  }
  .blurb {
    font-size: 0.84rem;
    color: var(--text-2);
    margin: 10px 0 12px;
  }
  .fields {
    display: grid;
    gap: 4px;
  }
  .field {
    display: grid;
    gap: 4px;
    font-size: 0.78rem;
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
    font-size: 0.82rem;
  }
  .help {
    font-size: 0.72rem;
    color: var(--text-3);
    margin: 0;
  }
  .switch {
    width: 38px;
    height: 22px;
    border-radius: 22px;
    border: 0;
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
    background: white;
    transition: transform 0.25s var(--ease);
  }
  .switch.on {
    background: var(--accent);
  }
  .switch.on i {
    transform: translateX(16px);
  }
  .sect {
    margin-top: 16px;
  }
  .iss {
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 9px;
    font-size: 0.8rem;
    border-left: 3px solid;
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
  .conns {
    list-style: none;
    padding: 0;
    margin: 6px 0 0;
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .conns li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
  }
  .lnk {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent-2);
    font-weight: 600;
  }
  .addrs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }
  .addrs code {
    font-size: 0.72rem;
    align-self: flex-start;
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
    font-size: 0.82rem;
    line-height: 1.9;
  }
  kbd {
    font-family: var(--mono);
    font-size: 0.72rem;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--border-strong);
  }
</style>
