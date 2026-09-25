<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Range from '../ui/Range.svelte';
  import Icon from '../Icon.svelte';
  import { settings } from '../../stores/settings.svelte';

  const CAP = 4; // pods per node (think: CPU requests)
  type Node = { id: number; up: boolean };
  type Pod = { id: number; node: number | null; ver: number; st: 'Pending' | 'Creating' | 'Running' | 'Terminating' };

  let replicas = $state(5);
  let version = $state(1);
  let nodes = $state<Node[]>([{ id: 1, up: true }, { id: 2, up: true }, { id: 3, up: true }]);
  let pods = $state<Pod[]>([]);
  let events = $state<string[]>([]);
  // The control loop auto-updates, so it can be paused (WCAG 2.2.2).
  let running = $state(!settings.reduced);
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
      ev(`${lost.length} pod(s) lost with the node. The ReplicaSet is recreating them.`);
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
      ev(`Rolling update: replacing pod-${old.id} (v${old.ver} to v${version})`);
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
    if (!running) return;
    const t = setInterval(tick, 700);
    return () => clearInterval(t);
  });

  function toggleNode(n: Node) {
    n.up = !n.up;
    ev(n.up ? `node-${n.id} is Ready` : `node-${n.id} is NotReady, so its pods will be evicted`);
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
    ev(`node-${n.id} drained and removed`);
  }
  function rollout() {
    version++;
    ev(`kubectl set image to v${version}: rolling update started`);
  }

  const pending = $derived(pods.filter((p) => p.st === 'Pending').length);
  const runningPods = $derived(pods.filter((p) => p.st === 'Running').length);
</script>

<WidgetFrame kind="Simulation" title="Kubernetes scheduler playground">
  {#snippet actions()}
    <button class="btn sm" onclick={() => (running = !running)}><Icon name={running ? 'pause' : 'play'} size={14} /> {running ? 'Pause' : 'Resume'}<span class="sr-only"> cluster simulation</span></button>
  {/snippet}
  <div class="ctlrow">
    <div class="grow"><Range label="Deployment replicas" bind:value={replicas} min={0} max={16} /></div>
    <button class="btn sm" onclick={rollout}><Icon name="refresh-cw" size={14} /> Roll out v{version + 1}</button>
    <button class="btn sm" onclick={addNode}><Icon name="server" size={14} /> Add node</button>
    <button class="btn sm ghost" onclick={removeNode} disabled={nodes.length <= 1}>Remove node</button>
  </div>

  <div class="svc">
    <Icon name="split" size={16} /> <strong>Service</strong> <span class="muted">my-app load-balances to {runningPods} ready pod{runningPods === 1 ? '' : 's'}</span>
    <span class="spacer"></span>
    <span class="chip">{runningPods} Running</span>
    {#if pending}<span class="chip warn">{pending} Pending</span>{/if}
    {#if !running}<span class="chip">Paused</span>{/if}
  </div>

  <ul class="nodes" aria-label="Cluster nodes">
    {#each nodes as n (n.id)}
      <li class="node" class:down={!n.up}>
        <header>
          <Icon name="server" size={15} /> node-{n.id}
          <span class="spacer"></span>
          <button class="btn sm ghost kill" onclick={() => toggleNode(n)} aria-label={n.up ? `Simulate failure of node-${n.id}` : `Recover node-${n.id}`} title={n.up ? 'Simulate node failure' : 'Recover node'}>
            <Icon name={n.up ? 'skull' : 'refresh-cw'} size={14} />
          </button>
        </header>
        <div class="slots" aria-hidden="true">
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
        <footer>{n.up ? `${load(n.id)} of ${CAP} pod slots used` : 'NotReady'}</footer>
      </li>
    {/each}
  </ul>

  {#if pending}
    <div class="pend">
      <span class="pp" aria-hidden="true">
        {#each pods.filter((p) => p.st === 'Pending') as p (p.id)}
          <span class="pod pending v{p.ver % 3}"><Icon name="box" size={13} /></span>
        {/each}
      </span>
      <span>{pending} pod{pending === 1 ? ' is' : 's are'} Pending: no node has free capacity. Add a node, or let the Cluster Autoscaler or Karpenter do it.</span>
    </div>
  {/if}

  <div role="log" aria-label="Cluster events">
    <ul class="log">{#each events as e, i (e + i)}<li>{e}</li>{/each}</ul>
  </div>
</WidgetFrame>

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
    background: var(--accent-2-soft);
    border: 1px solid color-mix(in srgb, var(--accent-2-fg) 35%, transparent);
    font-size: 0.86rem;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .chip.warn {
    color: var(--warn-fg);
  }
  .nodes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
  .node {
    border-radius: 12px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    padding: 8px;
    transition:
      background 0.3s,
      border-color 0.3s;
  }
  .node.down {
    border: 1px dashed var(--err);
    background: var(--err-soft);
  }
  .node.down footer {
    color: var(--err-fg);
    font-weight: 700;
  }
  .node header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: var(--mono);
  }
  .kill {
    min-width: 30px;
    padding: 5px;
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
    border: 1px dashed var(--border-strong);
  }
  .pod {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-radius: 8px;
    font-size: 0.74rem;
    font-weight: 700;
    color: #ffffff;
    background: #2f5fc9;
    animation: pop 0.3s var(--ease);
  }
  .pod.v2 {
    background: #6d28d9;
  }
  .pod.v0 {
    background: #0369a1;
  }
  .pod.creating {
    outline: 2px dashed #ffffff;
    outline-offset: -4px;
  }
  .pod.terminating {
    opacity: 0.45;
    transform: scale(0.85);
    transition: all 0.4s;
  }
  .pod.pending {
    width: 30px;
    height: 30px;
    display: inline-flex;
    outline: 2px dashed #ffffff;
    outline-offset: -4px;
  }
  @keyframes pop {
    from {
      transform: scale(0.3);
    }
  }
  .node footer {
    font-size: 0.74rem;
    color: var(--text-2);
    text-align: right;
  }
  .pend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--warn-soft);
    font-size: 0.82rem;
  }
  .pp {
    display: inline-flex;
    gap: 4px;
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 12px 0 0;
    font-family: var(--mono);
    font-size: 0.76rem;
    color: var(--text-2);
  }
  .log li:first-child {
    color: var(--text);
  }
</style>
