import type { Edge, Node, Connection } from '@xyflow/svelte';
import { Graph, type GNode } from './graph';
import { validate, explainBadLink, type Issue } from './validate';
import { generate } from './terraform';
import { SERVICE, BAD_LINKS, defaultConfig, linkLabel } from '../data/services';
import { toast } from '../stores/toast.svelte';
import type { Scenario } from '../data/scenarios';

export interface SvcData extends Record<string, unknown> {
  svc: string;
  name: string;
  config: Record<string, string | number | boolean>;
}
export type FlowNode = Node<SvcData>;

const GROUP_SIZE: Record<string, { w: number; h: number }> = {
  vpc: { w: 620, h: 400 },
  subnet: { w: 250, h: 160 }
};

const uid = () => Math.random().toString(36).slice(2, 9);

function strip(n: FlowNode): FlowNode {
  // Persist only what we own — Svelte Flow recomputes measurements/selection.
  const { id, type, position, data, parentId, width, height, zIndex } = n;
  return { id, type, position, data, ...(parentId ? { parentId } : {}), ...(width ? { width } : {}), ...(height ? { height } : {}), ...(zIndex !== undefined ? { zIndex } : {}) } as FlowNode;
}

function depth(n: FlowNode, all: Map<string, FlowNode>): number {
  let d = 0;
  let p = n.parentId ? all.get(n.parentId) : undefined;
  while (p) {
    d++;
    p = p.parentId ? all.get(p.parentId) : undefined;
  }
  return d;
}

/** Svelte Flow requires parents to appear before their children. */
function ordered(nodes: FlowNode[]) {
  const map = new Map(nodes.map((n) => [n.id, n]));
  return [...nodes].sort((a, b) => depth(a, map) - depth(b, map));
}

class Board {
  nodes = $state.raw<FlowNode[]>([]);
  edges = $state.raw<Edge[]>([]);
  selected = $state<string | null>(null);
  key = $state('stratus.board.free');
  scenario = $state<Scenario | null>(null);
  applied = $state<string[]>([]); // resource addresses from the last simulated apply
  past: string[] = [];
  future: string[] = [];
  canUndo = $state(false);
  canRedo = $state(false);
  #saveTimer: ReturnType<typeof setTimeout> | undefined;

  graph = $derived(
    new Graph(
      this.nodes.map((n) => ({ id: n.id, svc: n.data.svc, name: n.data.name, config: n.data.config, parent: n.parentId ?? null }) satisfies GNode),
      this.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
    )
  );
  issues = $derived<Issue[]>(validate(this.graph));
  worst = $derived.by(() => {
    const m = new Map<string, Issue['level']>();
    const rank = { error: 0, warn: 1, hint: 2 };
    for (const i of this.issues) {
      if (!i.node) continue;
      const cur = m.get(i.node);
      if (!cur || rank[i.level] < rank[cur]) m.set(i.node, i.level);
    }
    return m;
  });
  terraform = $derived(generate(this.graph));

  // ---------- persistence ----------
  load(key: string, scenario: Scenario | null = null) {
    this.key = key;
    this.scenario = scenario;
    this.selected = null;
    this.past = [];
    this.future = [];
    this.#flags();
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw);
        this.nodes = ordered(s.nodes ?? []);
        this.edges = s.edges ?? [];
        this.applied = s.applied ?? [];
        return;
      }
    } catch {
      /* ignore corrupt saves */
    }
    this.applied = [];
    if (scenario?.starter) this.#loadStarter(scenario);
    else {
      this.nodes = [];
      this.edges = [];
    }
  }

  #loadStarter(s: Scenario) {
    const st = s.starter!;
    this.nodes = ordered(
      st.nodes.map((n) => {
        const svc = SERVICE[n.svc];
        const size = GROUP_SIZE[n.svc];
        return {
          id: n.id,
          type: svc.group ? 'group' : 'service',
          position: { x: n.x, y: n.y },
          data: { svc: n.svc, name: n.name, config: { ...defaultConfig(n.svc), ...(n.config ?? {}) } },
          ...(n.parent ? { parentId: n.parent } : {}),
          ...(size ? { width: n.w ?? size.w, height: n.h ?? size.h } : {})
        } as FlowNode;
      })
    );
    this.edges = st.edges.map(([a, b]) => this.#edge(a, b, linkLabel(this.#svc(a), this.#svc(b))));
  }

  save() {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(this.key, JSON.stringify({ nodes: this.nodes.map(strip), edges: this.edges, applied: this.applied }));
      } catch {
        /* storage full / private mode */
      }
    }, 250);
  }

  // ---------- history ----------
  #snap() {
    return JSON.stringify({ nodes: this.nodes.map(strip), edges: this.edges });
  }
  #flags() {
    this.canUndo = this.past.length > 0;
    this.canRedo = this.future.length > 0;
  }
  checkpoint() {
    this.past.push(this.#snap());
    if (this.past.length > 60) this.past.shift();
    this.future = [];
    this.#flags();
  }
  #restore(s: string) {
    const d = JSON.parse(s);
    this.nodes = d.nodes;
    this.edges = d.edges;
    this.selected = null;
    this.save();
  }
  undo() {
    const s = this.past.pop();
    if (!s) return;
    this.future.push(this.#snap());
    this.#restore(s);
    this.#flags();
  }
  redo() {
    const s = this.future.pop();
    if (!s) return;
    this.past.push(this.#snap());
    this.#restore(s);
    this.#flags();
  }

  reset() {
    this.checkpoint();
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* noop */
    }
    this.applied = [];
    if (this.scenario?.starter) this.#loadStarter(this.scenario);
    else {
      this.nodes = [];
      this.edges = [];
    }
    this.selected = null;
    this.save();
  }

  // ---------- geometry ----------
  #svc(id: string) {
    return this.nodes.find((n) => n.id === id)?.data.svc ?? '';
  }
  abs(n: FlowNode): { x: number; y: number } {
    let x = n.position.x;
    let y = n.position.y;
    let p = n.parentId ? this.nodes.find((m) => m.id === n.parentId) : undefined;
    while (p) {
      x += p.position.x;
      y += p.position.y;
      p = p.parentId ? this.nodes.find((m) => m.id === p!.parentId) : undefined;
    }
    return { x, y };
  }
  size(n: FlowNode) {
    return { w: n.width ?? n.measured?.width ?? 110, h: n.height ?? n.measured?.height ?? 90 };
  }
  /** Innermost group containing the point, excluding `skip` and its descendants. */
  containerAt(pt: { x: number; y: number }, skip?: string): FlowNode | undefined {
    const banned = new Set<string>();
    if (skip) {
      banned.add(skip);
      const walk = (id: string) =>
        this.nodes.filter((n) => n.parentId === id).forEach((c) => {
          banned.add(c.id);
          walk(c.id);
        });
      walk(skip);
    }
    const hits = this.nodes.filter((n) => {
      if (n.type !== 'group' || banned.has(n.id)) return false;
      const a = this.abs(n);
      const s = this.size(n);
      return pt.x >= a.x && pt.x <= a.x + s.w && pt.y >= a.y && pt.y <= a.y + s.h;
    });
    return hits.sort((a, b) => this.size(a).w * this.size(a).h - this.size(b).w * this.size(b).h)[0];
  }

  // ---------- mutations ----------
  #defaultName(svc: string) {
    const s = SERVICE[svc];
    const base = s.id === 'users' ? 'Users' : s.id === 'developer' ? 'CI pipeline' : s.name.toLowerCase().replace(/\s+/g, '-');
    const count = this.nodes.filter((n) => n.data.svc === svc).length;
    return count ? `${base}-${count + 1}` : base;
  }

  add(svc: string, at: { x: number; y: number }) {
    const s = SERVICE[svc];
    if (!s) return;
    this.checkpoint();
    const size = GROUP_SIZE[svc];
    const pos = size ? { x: at.x - size.w / 2, y: at.y - size.h / 2 } : { x: at.x - 52, y: at.y - 40 };
    const container = this.containerAt(at);
    const config = defaultConfig(svc);
    if (svc === 'subnet') {
      // Friendly defaults: alternate AZs and pick an unused CIDR in the VPC.
      const siblings = container ? this.nodes.filter((n) => n.parentId === container.id && n.data.svc === 'subnet') : [];
      config.az = ['a', 'b', 'c'][siblings.length % 2];
      const used = new Set(siblings.map((x) => x.data.config.cidr));
      const opts = s.config!.find((f) => f.key === 'cidr')!.options!;
      config.cidr = opts.find((o) => !used.has(o)) ?? opts[0];
      // First two subnets default to public (one per AZ), the rest private — the usual layout.
      config.public = siblings.length < 2;
    }
    let name = this.#defaultName(svc);
    if (svc === 'subnet') name = `${config.public ? 'public' : 'private'}-${config.az}`;
    const node: FlowNode = {
      id: `${svc}-${uid()}`,
      type: s.group ? 'group' : 'service',
      position: pos,
      data: { svc, name, config },
      ...(size ? { width: size.w, height: size.h } : {})
    };
    if (container) {
      const ca = this.abs(container);
      node.parentId = container.id;
      node.position = { x: pos.x - ca.x, y: pos.y - ca.y };
    }
    this.nodes = ordered([...this.nodes, node]);
    this.selected = node.id;
    this.save();
    this.#placementToast(node);
    return node;
  }

  #placementToast(n: FlowNode) {
    const s = SERVICE[n.data.svc];
    const parent = n.parentId ? this.nodes.find((m) => m.id === n.parentId) : undefined;
    if (s.placement === 'region' && parent && !s.group) toast.err(`${s.name} doesn't go in a VPC`, `${s.full} is a regional service reached over AWS APIs — place it outside the VPC.`);
    else if (s.placement === 'subnet' && parent?.data.svc !== 'subnet') toast.warn(`${s.name} needs a subnet`, `Drop ${s.name} inside a subnet (create a VPC and subnet first).`);
    else if (n.data.svc === 'subnet' && parent?.data.svc !== 'vpc') toast.warn('Subnets live inside a VPC', 'Create a VPC container first, then drop subnets inside it.');
  }

  /** Called after a drag ends: move the node into whichever container it was dropped on. */
  reparent(id: string) {
    const n = this.nodes.find((x) => x.id === id);
    if (!n) return;
    const a = this.abs(n);
    const s = this.size(n);
    const center = { x: a.x + s.w / 2, y: a.y + (n.type === 'group' ? 12 : s.h / 2) };
    const target = this.containerAt(n.type === 'group' ? a : center, id);
    const cur = n.parentId;
    if ((target?.id ?? undefined) === cur) {
      this.save();
      return;
    }
    const updated: FlowNode = { ...n };
    if (target) {
      const ta = this.abs(target);
      updated.parentId = target.id;
      updated.position = { x: a.x - ta.x, y: a.y - ta.y };
    } else {
      delete updated.parentId;
      updated.position = a;
    }
    this.nodes = ordered(this.nodes.map((x) => (x.id === id ? updated : x)));
    this.save();
    this.#placementToast(updated);
  }

  #edge(source: string, target: string, label?: string): Edge {
    return { id: `e-${source}-${target}`, source, target, type: 'flow', label, data: {} };
  }

  /** Semantic connection check — returns the edge to add (possibly flipped) or null. */
  beforeConnect(c: Connection): Edge | null {
    const a = this.#svc(c.source);
    const b = this.#svc(c.target);
    if (c.source === c.target) return null;
    if (SERVICE[a]?.group || SERVICE[b]?.group) {
      toast.info('Containers don’t take connections', 'VPCs and subnets express *placement*. Drag services inside them instead of drawing arrows.');
      return null;
    }
    if (this.edges.some((e) => (e.source === c.source && e.target === c.target) || (e.source === c.target && e.target === c.source))) return null;
    let label = linkLabel(a, b);
    let [src, tgt] = [c.source, c.target];
    if (!label && linkLabel(b, a)) {
      label = linkLabel(b, a);
      [src, tgt] = [c.target, c.source];
      toast.info('Direction flipped', `Data flows ${SERVICE[b].name} → ${SERVICE[a].name} (${label}).`);
    }
    if (!label) {
      toast.err(`Can't connect ${SERVICE[a]?.name} → ${SERVICE[b]?.name}`, explainBadLink(a, b, BAD_LINKS));
      return null;
    }
    this.checkpoint();
    queueMicrotask(() => this.save());
    return { ...this.#edge(src, tgt, label), sourceHandle: c.sourceHandle, targetHandle: c.targetHandle };
  }

  update(id: string, patch: Partial<SvcData>) {
    this.checkpoint();
    this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    this.save();
  }

  setConfig(id: string, key: string, value: string | number | boolean) {
    const n = this.nodes.find((x) => x.id === id);
    if (!n) return;
    const config = { ...n.data.config, [key]: value };
    const patch: Partial<SvcData> = { config };
    // keep auto-generated subnet names in sync with their settings
    if (n.data.svc === 'subnet' && /^(public|private)-[abc]$/.test(n.data.name) && (key === 'public' || key === 'az'))
      patch.name = `${config.public ? 'public' : 'private'}-${config.az}`;
    this.update(id, patch);
  }

  remove(ids: string[], edgeIds: string[] = []) {
    if (!ids.length && !edgeIds.length) return;
    this.checkpoint();
    const kill = new Set(ids);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of this.nodes)
        if (n.parentId && kill.has(n.parentId) && !kill.has(n.id)) {
          kill.add(n.id);
          grew = true;
        }
    }
    this.nodes = this.nodes.filter((n) => !kill.has(n.id));
    this.edges = this.edges.filter((e) => !kill.has(e.source) && !kill.has(e.target) && !edgeIds.includes(e.id));
    if (this.selected && kill.has(this.selected)) this.selected = null;
    this.save();
  }

  removeEdge(id: string) {
    this.checkpoint();
    this.edges = this.edges.filter((e) => e.id !== id);
    this.save();
  }

  markApplied() {
    this.applied = this.terraform.resources.map((r) => r.addr);
    this.save();
  }
}

export const board = new Board();

// Handy for debugging in dev tools; stripped from production builds.
if (import.meta.env.DEV) (window as unknown as { __board: Board }).__board = board;
