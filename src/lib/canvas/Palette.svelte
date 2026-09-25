<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { SERVICES, CATEGORIES } from '../data/services';

  let q = $state('');
  let collapsed = $state<Record<string, boolean>>({});

  const groups = $derived(
    CATEGORIES.map((c) => ({
      ...c,
      items: SERVICES.filter((s) => s.category === c.id && (!q || `${s.name} ${s.full} ${s.blurb}`.toLowerCase().includes(q.toLowerCase())))
    })).filter((g) => g.items.length)
  );

  function dragStart(e: DragEvent, id: string) {
    e.dataTransfer?.setData('application/stratus', id);
    e.dataTransfer!.effectAllowed = 'copy';
  }
  function add(id: string) {
    window.dispatchEvent(new CustomEvent('stratus:add', { detail: id }));
  }
</script>

<aside class="palette" data-tour="palette" aria-label="Service palette">
  <div class="search">
    <Icon name="search" size={15} />
    <input type="search" placeholder="Search services…" bind:value={q} aria-label="Search services" />
  </div>
  <p class="hint" id="palette-hint">Drag onto the canvas, or activate a service to add it.</p>
  <div class="scroll focus-inset">
    {#each groups as g (g.id)}
      {@const open = !collapsed[g.id] || !!q}
      <section aria-labelledby="cat-{g.id}">
        <h2 class="cath">
          <button class="cat" id="cat-{g.id}" aria-expanded={open} aria-controls="items-{g.id}" onclick={() => (collapsed[g.id] = !collapsed[g.id])} style:--c={g.color}>
            <i aria-hidden="true"></i>{g.label}<span class="spacer"></span><Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
          </button>
        </h2>
        {#if open}
          <ul class="items" id="items-{g.id}">
            {#each g.items as s (s.id)}
              <li>
                <button class="tile" draggable="true" ondragstart={(e) => dragStart(e, s.id)} onclick={() => add(s.id)} style:--c={g.color} title={s.blurb} aria-label="Add {s.name} to the canvas" aria-describedby="palette-hint">
                  <span class="ic" aria-hidden="true"><Icon name={s.icon} size={18} /></span>
                  <span class="nm">{s.name}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}
    {#if !groups.length}<p class="none" role="status">No services match “{q}”.</p>{/if}
  </div>
</aside>

<style>
  .palette {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    border-right: 1px solid var(--border);
    background: var(--bg-2);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 12px 4px;
    padding: 6px 10px;
    border-radius: 10px;
    background: var(--surface);
    border: 1px solid var(--border-input);
    color: var(--text-2);
  }
  .search:focus-within {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
  .search input {
    flex: 1;
    min-width: 0;
    min-height: 24px;
    background: none;
    border: 0;
    outline: none;
    font-size: 0.86rem;
  }
  .hint {
    font-size: 0.76rem;
    color: var(--text-3);
    margin: 4px 14px 6px;
  }
  .cath {
    margin: 0;
    font-size: inherit;
    letter-spacing: normal;
  }
  .none {
    font-size: 0.84rem;
    color: var(--text-2);
    padding: 8px 4px;
  }
  .scroll {
    overflow-y: auto;
    padding: 0 10px 20px;
  }
  .cat {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 32px;
    padding: 6px 4px;
    background: none;
    border: 0;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-3);
  }
  .cat i {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--c);
  }
  .items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .tile {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 9px 4px 7px;
    border-radius: 11px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    cursor: grab;
    transition:
      transform 0.15s var(--ease),
      border-color 0.15s,
      background 0.15s;
  }
  .tile:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--c) 60%, transparent);
    background: color-mix(in srgb, var(--c) 8%, var(--surface));
  }
  .tile:active {
    cursor: grabbing;
  }
  .ic {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 16%, transparent);
  }
  .nm {
    font-size: 0.72rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
  }
</style>
