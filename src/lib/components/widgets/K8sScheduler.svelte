<script lang="ts">
  import Range from '../ui/Range.svelte';
  import Icon from '../Icon.svelte';

  const CAP = 4; // pods per node (think: CPU requests)
  type Node = { id: number; up: boolean };
  type Pod = { id: number; node: number | null; ver: number; st: 'Pending' | 'Creating' | 'Running' | 'Terminating' };

  let replicas = $state(5);
  let version = $state(1);
  let nodes = $state<Node[]>([{ id: 1, up: true }, { id: 2, up: true }, { id: 3, up: true }]);
  let pods = $state<Pod[]>([]);
  let events = $state<string[]>([]);
  let pid = 1;
  let nid = 4;

  const ev = (s: string) => (events = [s, ...events].slice(0, 6));
  const load = (n: number) => pods.filter((p) => p.node === n && p.st !== 'Terminating').length;

  function tick() {
    // 1. Terminating pods disappear.
    pods = pods.filter((p) => p.st !== 'Terminating');
    // 2. Pods on dead nodes are lost.
    const dead = new Set(nodes.filter((n) => !n.up).map((n) => n.id));
    const lost = pods.filter((p) => p.node !== null && dead.has(p.node));
    if (lost.length) {
      pods = pods.filter((p) => !lost.includes(p));
      ev(`${lost.length} pod(s) lost with node — ReplicaSet recreating`);
    }
    // 3. Creating → Running.
    pods = pods.map((p) => (p.st === 'Creating' ? { ...p, st: 'Running' } : p));
    // 4. Reconcile replica count.
    const live = pods.filter((p) => p.st !== 'Terminating');
    if (live.length < replicas) {
      for (let i = live.length; i < replicas; i++) pods.push({ id: pid++, node: null, ver: version, st: 'Pending' });
    } else if (live.length > replicas) {
      const extra = live.length - replicas;
      const victims = [...live].sort((a, b) => (a.st === 'Pending' ? -1 : 1) - (b.st === 'Pending' ? -1 : 1)).slice(0, extra);
      pods = pods.map((p) => (victims.includes(p) ? { ...p, st: 'Terminating' } : p));
      ev(`Scaled down: terminating ${extra} pod(s)`);
    }
    // 5. Rolling update: replace one old pod at a time once everything is Running.
    const old = pods.find((p) => p.ver !== version && p.st === 'Running');
    if (old && pods.every((p) => p.st === 'Running' || p.ver !== version)) {
      pods = pods.map((p) => (p === old ? { ...p, st: 'Terminating' } : p));
      pods.push({ id: pid++, node: null, ver: version, st: 'Pending' });
      ev(`Rolling update: replacing pod-${old.id} (v${old.ver} → v${version})`);
    }
    // 6. Schedule pending pods onto the least-loaded ready node.
    for (const p of pods) {
      if (p.st !== 'Pending') continue;
      const cand = nodes.filter((n) => n.up && load(n.id) < CAP).sort((a, b) => load(a.id) - load(b.id))[0];
      if (cand) {
        p.node = cand.id;
        p.st = 'Creating';
      }
    }
    pods = [...pods];
  }

  $effect(() => {
    const t = setInterval(tick, 700);
    return () => clearInterval(t);
  });

  function toggleNode(n: Node) {
    n.up = !n.up;
    ev(n.up ? `node-${n.id} is Ready` : `node-${n.id} NotReady — evicting pods`);
  }
  function addNode() {
    nodes.push({ id: nid++, up: true });
    ev(`node-${nid - 1} joined the cluster`);
  }
  function removeNode() {
    const n = nodes[nodes.length - 1];
    if (!n || nodes.length <= 1) return;
    nodes = nodes.slice(0, -1);
    pods = pods.map((p) => (p.node === n.id ? { ...p, node: null, st: 'Pending' } : p));
    ev(`node-${n.id} drained & removed`);
  }
  function rollout() {
    version++;
    ev(`kubectl set image → v${version}: rolling update started`);
  }

  const pending = $derived(pods.filter((p) => p.st === 'Pending').length);
  const running = $derived(pods.filter((p) => p.st === 'Running').length);
</script>

<div class="wbox">
  <div class="whead"><span class="wtag">Simulation</span><h4>Kubernetes scheduler playground</h4></div>
  <div class="ctlrow">
    <div class="grow"><Range label="Deployment replicas" bind:value={replicas} min={0} max={16} /></div>
    <button class="btn sm" onclick={rollout}><Icon name="refresh-cw" size={14} /> Roll out v{version + 1}</button>
    <button class="btn sm" onclick={addNode}><Icon name="server" size={14} /> Add node</button>
    <button class="btn sm ghost" onclick={removeNode} disabled={nodes.length <= 1}>Remove node</button>
  </div>

  <div class="svc">
    <Icon name="split" size={16} /> <strong>Service</strong> <span class="faint">my-app · load-balances to {running} ready pod{running === 1 ? '' : 's'}</span>
    <span class="spacer"></span>
    <span class="chip">{running} Running</span>
    {#if pending}<span class="chip warn">{pending} Pending</span>{/if}
  </div>

  <div class="nodes">
    {#each nodes as n (n.id)}
      <div class="node" class:down={!n.up}>
        <header>
          <Icon name="server" size={15} /> node-{n.id}
          <span class="spacer"></span>
          <button class="btn sm ghost" onclick={() => toggleNode(n)} title={n.up ? 'Simulate node failure' : 'Recover node'}>
            <Icon name={n.up ? 'skull' : 'refresh-cw'} size={14} />
          </button>
        </header>
        <div class="slots">
          {#each Array(CAP) as _, s}
            {@const p = pods.filter((p) => p.node === n.id)[s]}
            <div class="slot">
              {#if p}
                <div class="pod v{p.ver % 3} {p.st.toLowerCase()}" title="pod-{p.id} · {p.st}">
                  <Icon name="box" size={14} /><span>v{p.ver}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        <footer>{n.up ? `${load(n.id)}/${CAP} pods` : 'NotReady'}</footer>
      </div>
    {/each}
  </div>

  {#if pending}
    <div class="pend">
      {#each pods.filter((p) => p.st === 'Pending') as p (p.id)}
        <span class="pod pending v{p.ver % 3}"><Icon name="box" size={13} /></span>
      {/each}
      <span class="faint">Pending: no node has free capacity. Add a node (or let the Cluster Autoscaler / Karpenter do it).</span>
    </div>
  {/if}

  <ul class="log">{#each events as e, i (e + i)}<li>{e}</li>{/each}</ul>
</div>

<style>
  .ctlrow {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ctlrow .btn {
    margin-bottom: 12px;
  }
  .grow {
    flex: 1;
    min-width: 200px;
  }
  .svc {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 10px;
    background: rgba(34, 211, 238, 0.08);
    border: 1px solid rgba(34, 211, 238, 0.3);
    font-size: 0.85rem;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .chip.warn {
    color: var(--warn);
  }
  .nodes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }
  .node {
    border-radius: 12px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    padding: 8px;
    transition:
      opacity 0.3s,
      border-color 0.3s;
  }
  .node.down {
    opacity: 0.5;
    border-color: var(--err);
    background: var(--err-soft);
  }
  .node header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: var(--mono);
  }
  .slots {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
    margin: 6px 0;
  }
  .slot {
    height: 36px;
    border-radius: 8px;
    border: 1px dashed var(--border);
  }
  .pod {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    color: white;
    background: #326ce5;
    animation: pop 0.3s var(--ease);
  }
  .pod.v2 {
    background: #8b5cf6;
  }
  .pod.v0 {
    background: #0ea5e9;
  }
  .pod.creating {
    opacity: 0.55;
  }
  .pod.terminating {
    opacity: 0.3;
    transform: scale(0.85);
    transition: all 0.4s;
  }
  .pod.pending {
    width: 30px;
    height: 30px;
    display: inline-flex;
    opacity: 0.6;
    border: 1px dashed white;
  }
  @keyframes pop {
    from {
      transform: scale(0.3);
    }
  }
  .node footer {
    font-size: 0.72rem;
    color: var(--text-3);
    text-align: right;
  }
  .pend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin-top: 12px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--warn-soft);
    font-size: 0.8rem;
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    font-family: var(--mono);
    font-size: 0.74rem;
    color: var(--text-3);
  }
  .log li:first-child {
    color: var(--text);
  }
</style>
