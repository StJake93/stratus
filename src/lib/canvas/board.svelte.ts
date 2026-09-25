import { MarkerType, type Edge, type Node, type Connection } from '@xyflow/svelte';
import { Graph, type GNode } from './graph';
import { validate, explainBadLink, type Issue } from './validate';
import { generate } from './terraform';
import { SERVICE, BAD_LINKS, defaultConfig, linkLabel } from '../data/services';
import { toast } from '../stores/toast.svelte';
import { announce } from '../stores/announce.svelte';
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
type Rect = { x1: number; y1: number; x2: number; y2: number };
const hit = (a: Rect, b: Rect, gap = 0) => a.x1 < b.x2 + gap && a.x2 > b.x1 - gap && a.y1 < b.y2 + gap && a.y2 > b.y1 - gap;
// Arrowheads show direction without relying on the animated packets or colour.
const ARROW = { type: MarkerType.ArrowClosed, width: 18, height: 18 };

function strip(n: FlowNode): FlowNode {
  // Persist only what we own; Svelte Flow recomputes measurements and selection.
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
        this.retarget();
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
    this.edges = st.edges.map(([a, b]) => ({ ...this.#edge(a, b, linkLabel(this.#svc(a), this.#svc(b))), ...this.#facing(a, b) }));
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

  #rect(n: FlowNode): Rect {
    const a = this.abs(n);
    const z = this.size(n);
    return { x1: a.x, y1: a.y, x2: a.x + z.w, y2: a.y + z.h };
  }

  /** Does a rectangle collide with any node that shares the given parent (null = top level)? */
  #taken(r: Rect, parentId: string | null) {
    return this.nodes.some((n) => (n.parentId ?? null) === parentId && hit(r, this.#rect(n), 4));
  }

  /**
   * Click-to-add (keyboard, tap or palette click). Drag-and-drop respects the drop point, but click-to-add
   * starts from the viewport centre, so find each service a free cell in a sensible home instead,
   * growing containers (and pushing later subnets down) when they are full. One undo step.
   */
  addAt(svc: string, center: { x: number; y: number }) {
    const s = SERVICE[svc];
    if (!s) return;
    this.checkpoint();
    const W = 108; // service node box
    const H = 96;
    const G = 12; // gap between cells
    const here = this.containerAt(center);
    const rootOf = (n: FlowNode) => {
      let r = n;
      while (r.parentId) r = this.nodes.find((x) => x.id === r.parentId) ?? r;
      return r;
    };
    const vpc = here ? rootOf(here) : this.nodes.find((n) => n.data.svc === 'vpc');
    const topLeft = (x: number, y: number) => ({ x: x + 52, y: y + 40 }); // add() offsets service nodes by (-52, -40)

    /** Grow a container by dh, pushing lower siblings down and growing its parent to match. */
    const growDown = (id: string, dh: number) => {
      const node = this.nodes.find((n) => n.id === id);
      if (!node || dh <= 0) return;
      const r = this.#rect(node);
      this.nodes = this.nodes.map((n) => {
        if (n.id === id) return { ...n, height: this.size(n).h + dh };
        if (n.parentId === node.parentId && n.parentId && n.id !== id) {
          const o = this.#rect(n);
          if (o.y1 >= r.y2 - 1 && o.x1 < r.x2 && o.x2 > r.x1) return { ...n, position: { x: n.position.x, y: n.position.y + dh } };
        }
        return n;
      });
      if (node.parentId) {
        const parent = this.nodes.find((n) => n.id === node.parentId)!;
        const pr = this.#rect(parent);
        const lowest = Math.max(...this.nodes.filter((n) => n.parentId === parent.id).map((n) => this.#rect(n).y2));
        if (lowest + 16 > pr.y2) growDown(parent.id, lowest + 16 - pr.y2);
      }
    };
    /** First free cell of a grid inside a container, without growing it; null if full. */
    const cellIn = (box: FlowNode, x0: number, y0: number, cw: number, ch: number): Rect | null => {
      const b = this.#rect(box);
      const cols = Math.max(1, Math.floor((b.x2 - b.x1 - x0 + G) / (cw + G)));
      for (let i = 0; i < 60; i++) {
        const x1 = b.x1 + x0 + (i % cols) * (cw + G);
        const y1 = b.y1 + y0 + Math.floor(i / cols) * (ch + G);
        const r = { x1, y1, x2: x1 + cw, y2: y1 + ch };
        if (r.y2 > b.y2 - 8) return null;
        if (!this.#taken(r, box.id)) return r;
      }
      return null;
    };
    /** Like cellIn, but grows the container downwards until a cell fits. */
    const cellGrow = (box: FlowNode, x0: number, y0: number, cw: number, ch: number): Rect => {
      const found = cellIn(box, x0, y0, cw, ch);
      if (found) return found;
      growDown(box.id, ch + G);
      return cellIn(this.nodes.find((n) => n.id === box.id)!, x0, y0, cw, ch) ?? { x1: 0, y1: 0, x2: cw, y2: ch };
    };

    let pt = center;
    if (svc === 'subnet' && vpc?.data.svc === 'vpc') {
      // Subnets fill the VPC in a grid, left to right then top to bottom.
      const r = cellGrow(vpc, 20, 50, 250, 160);
      pt = { x: (r.x1 + r.x2) / 2, y: (r.y1 + r.y2) / 2 };
    } else if (!s.group && s.placement === 'vpc' && vpc?.data.svc === 'vpc') {
      // Gateways and endpoints attach to the VPC itself: a column on its right edge, clear of the subnets.
      const vr = this.#rect(vpc);
      const groupsRight = Math.max(vr.x1, ...this.nodes.filter((n) => n.parentId === vpc.id && n.type === 'group').map((n) => this.#rect(n).x2));
      const x1 = Math.max(vr.x2 - W - 20, groupsRight + 20);
      if (x1 + W + 20 > vr.x2) this.nodes = this.nodes.map((n) => (n.id === vpc.id ? { ...n, width: x1 + W + 20 - vr.x1 } : n));
      let y1 = vr.y1 + 50;
      while (this.#taken({ x1, y1, x2: x1 + W, y2: y1 + H }, vpc.id)) y1 += H + G;
      if (y1 + H + 16 > vr.y2) growDown(vpc.id, y1 + H + 16 - vr.y2);
      pt = topLeft(x1, y1);
    } else if (!s.group && s.placement === 'subnet') {
      // Prefer public subnets for internet-facing services, private ones for everything else,
      // then the subnet under the centre, and take the first with room.
      const wantsPublic = svc === 'alb' || svc === 'natgw';
      const inNet = this.nodes.filter((n) => n.data.svc === 'subnet' && (!vpc || rootOf(n).id === vpc.id));
      const subs = inNet.sort(
        (a, b) =>
          Number((b.data.config.public === true) === wantsPublic) - Number((a.data.config.public === true) === wantsPublic) ||
          Number(b.id === here?.id) - Number(a.id === here?.id)
      );
      // Stay within the preferred kind of subnet (growing one if needed) and only fall back if none exist.
      const preferred = subs.filter((sb) => (sb.data.config.public === true) === wantsPublic);
      const pool = preferred.length ? preferred : subs;
      const free = pool.map((sb) => ({ sb, r: cellIn(sb, 14, 44, W, H) })).find((x) => x.r);
      if (free?.r) pt = topLeft(free.r.x1, free.r.y1);
      else if (pool[0]) {
        const r = cellGrow(pool[0], 14, 44, W, H);
        pt = topLeft(r.x1, r.y1);
      }
    } else {
      // Regional services, actors and new VPCs go at the top level in the first free slot:
      // a column left of the network if there is one, otherwise spiralling out from the centre.
      const tops = this.nodes.filter((n) => !n.parentId && n.type === 'group');
      const size = GROUP_SIZE[svc] ?? { w: W, h: H };
      const box = (x1: number, y1: number): Rect => ({ x1, y1, x2: x1 + size.w, y2: y1 + size.h });
      const candidates: Rect[] = [];
      if (tops.length) {
        const net = { x1: Math.min(...tops.map((n) => this.#rect(n).x1)), y1: Math.min(...tops.map((n) => this.#rect(n).y1)), x2: Math.max(...tops.map((n) => this.#rect(n).x2)) };
        if (s.group) candidates.push(box(net.x2 + 60, net.y1));
        else for (let c = 0; c < 4; c++) for (let k = 0; k < 10; k++) candidates.push(box(net.x1 - 40 - W - c * (W + 24), net.y1 + k * (H + 20)));
      }
      for (let ring = 0; ring < 7; ring++)
        for (let dx = -ring; dx <= ring; dx++)
          for (let dy = -ring; dy <= ring; dy++)
            if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) candidates.push(box(center.x - size.w / 2 + dx * (size.w + 24), center.y - size.h / 2 + dy * (size.h + 24)));
      const spot = candidates.find((r) => !this.#taken(r, null)) ?? candidates[0];
      pt = s.group ? { x: (spot.x1 + spot.x2) / 2, y: (spot.y1 + spot.y2) / 2 } : topLeft(spot.x1, spot.y1);
    }
    return this.add(svc, pt, false);
  }

  add(svc: string, at: { x: number; y: number }, checkpoint = true) {
    const s = SERVICE[svc];
    if (!s) return;
    if (checkpoint) this.checkpoint();
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
      // First two subnets default to public (one per AZ) and the rest private: the usual layout.
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
    announce(`Added ${s.name} "${name}" ${this.#where(node)}.`);
    this.#placementToast(node);
    return node;
  }

  #placementToast(n: FlowNode) {
    const s = SERVICE[n.data.svc];
    const parent = n.parentId ? this.nodes.find((m) => m.id === n.parentId) : undefined;
    if (s.placement === 'region' && parent && !s.group) toast.err(`${s.name} doesn't go in a VPC`, `${s.full} is a regional service reached over AWS APIs. Place it outside the VPC.`);
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
    return { id: `e-${source}-${target}`, source, target, type: 'flow', label, data: {}, markerEnd: ARROW };
  }

  /** Semantic connection check: returns the edge to add (possibly flipped) or null. */
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
      toast.info('Direction flipped', `Data flows from ${SERVICE[b].name} to ${SERVICE[a].name} (${label}).`);
    }
    if (!label) {
      toast.err(`Can't connect ${SERVICE[a]?.name} to ${SERVICE[b]?.name}`, explainBadLink(a, b, BAD_LINKS));
      return null;
    }
    this.checkpoint();
    queueMicrotask(() => this.save());
    // Always attach to the handles that face each other, whichever circle the drag started from.
    return { ...this.#edge(src, tgt, label), ...this.#facing(src, tgt) };
  }

  /** Connect two nodes without dragging (keyboard and single-pointer alternative, WCAG 2.5.7). */
  connect(source: string, target: string) {
    const e = this.beforeConnect({ source, target, sourceHandle: null, targetHandle: null });
    if (!e) return null;
    this.edges = [...this.edges, e];
    announce(`Connected ${this.#name(e.source)} to ${this.#name(e.target)} (${e.label}).`);
    return e;
  }

  #name(id: string) {
    return this.nodes.find((n) => n.id === id)?.data.name ?? id;
  }

  /** Handles on the sides of two nodes that face each other, so connectors meet the border circles squarely. */
  #facing(sourceId: string, targetId: string): { sourceHandle: string; targetHandle: string } {
    const a = this.nodes.find((n) => n.id === sourceId);
    const b = this.nodes.find((n) => n.id === targetId);
    if (!a || !b) return { sourceHandle: 'r', targetHandle: 'l' };
    const pa = this.abs(a);
    const sa = this.size(a);
    const pb = this.abs(b);
    const sb = this.size(b);
    const dx = pb.x + sb.w / 2 - (pa.x + sa.w / 2);
    const dy = pb.y + sb.h / 2 - (pa.y + sa.h / 2);
    if (Math.abs(dx) >= Math.abs(dy) * 0.9) return dx >= 0 ? { sourceHandle: 'r', targetHandle: 'l' } : { sourceHandle: 'l', targetHandle: 'r' };
    return dy >= 0 ? { sourceHandle: 'b', targetHandle: 't' } : { sourceHandle: 't', targetHandle: 'b' };
  }

  /** Re-point every edge at its facing handles after drags, moves and loads. Not an undo step. */
  retarget() {
    let changed = false;
    const next = this.edges.map((e) => {
      const h = this.#facing(e.source, e.target);
      if (h.sourceHandle === e.sourceHandle && h.targetHandle === e.targetHandle && e.markerEnd) return e;
      changed = true;
      return { ...e, ...h, markerEnd: ARROW };
    });
    if (changed) this.edges = next;
  }

  /** Human-readable placement, used in announcements and accessible names. */
  #where(n: FlowNode) {
    const p = n.parentId ? this.nodes.find((m) => m.id === n.parentId) : undefined;
    if (!p) return 'outside any VPC';
    const kind = p.data.svc === 'subnet' ? `${p.data.config.public ? 'public' : 'private'} subnet` : SERVICE[p.data.svc]?.name ?? 'container';
    return `in ${kind} ${p.data.name}`;
  }

  /** Move a node into a VPC or subnet (or out to the region) without dragging (WCAG 2.5.7). */
  moveInto(id: string, parentId: string | null) {
    const n = this.nodes.find((x) => x.id === id);
    if (!n || (n.parentId ?? null) === parentId) return;
    this.checkpoint();
    const updated: FlowNode = { ...n };
    const s = this.size(n);
    if (parentId) {
      const p = this.nodes.find((x) => x.id === parentId);
      if (!p) return;
      const ps = this.size(p);
      // Park it inside the container, staggered so repeated moves don't stack exactly.
      const k = this.nodes.filter((x) => x.parentId === parentId).length;
      updated.parentId = parentId;
      updated.position = { x: Math.max(10, Math.min(ps.w - s.w - 10, 24 + (k % 4) * 34)), y: Math.max(34, Math.min(ps.h - s.h - 10, 44 + (k % 3) * 26)) };
    } else {
      // Place it just outside the outermost container so it doesn't sit on top of the VPC.
      let root = n;
      while (root.parentId) root = this.nodes.find((x) => x.id === root.parentId) ?? root;
      const ra = this.abs(root);
      const a = this.abs(n);
      delete updated.parentId;
      updated.position = { x: ra.x - s.w - 60, y: a.y };
    }
    this.nodes = ordered(this.nodes.map((x) => (x.id === id ? updated : x)));
    this.retarget();
    this.save();
    announce(`Moved ${n.data.name} ${this.#where(updated)}.`);
    this.#placementToast(updated);
  }

  /** Resize a VPC or subnet from the inspector (alternative to dragging the resize handles). */
  resize(id: string, w: number, h: number) {
    this.checkpoint();
    this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, width: Math.max(160, Math.round(w)), height: Math.max(110, Math.round(h)) } : n));
    this.save();
  }

  /** Accessible name for a node on the canvas (xyflow puts it on the focusable node wrapper). */
  describe(n: FlowNode): string {
    const s = SERVICE[n.data.svc];
    const issues = this.issues.filter((i) => i.node === n.id);
    const count = (l: string) => issues.filter((i) => i.level === l).length;
    const parts = [`${n.data.name}, ${s?.full ?? n.data.svc}`, this.#where(n)];
    if (s?.group) parts.push(`contains ${this.nodes.filter((c) => c.parentId === n.id).length} items`);
    const e = count('error');
    const w = count('warn');
    const h = count('hint');
    parts.push(e || w || h ? [e && `${e} error${e > 1 ? 's' : ''}`, w && `${w} warning${w > 1 ? 's' : ''}`, h && `${h} hint${h > 1 ? 's' : ''}`].filter(Boolean).join(', ') : 'no issues');
    return parts.join('. ');
  }

  describeEdge(e: Edge): string {
    return `Connection from ${this.#name(e.source)} to ${this.#name(e.target)}${e.label ? `: ${e.label}` : ''}`;
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
    const e = this.edges.find((x) => x.id === id);
    this.checkpoint();
    this.edges = this.edges.filter((x) => x.id !== id);
    this.save();
    if (e) announce(`Removed the connection from ${this.#name(e.source)} to ${this.#name(e.target)}.`);
  }

  markApplied() {
    this.applied = this.terraform.resources.map((r) => r.addr);
    this.save();
  }
}

export const board = new Board();

// Handy for debugging in dev tools; stripped from production builds.
if (import.meta.env.DEV) (window as unknown as { __board: Board }).__board = board;
