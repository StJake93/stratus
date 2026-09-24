// Framework-free view over the canvas graph, shared by the validator, scenarios and Terraform exporter.

export interface GNode {
  id: string;
  svc: string;
  name: string;
  config: Record<string, string | number | boolean>;
  parent: string | null;
}

export interface GEdge {
  id: string;
  source: string;
  target: string;
}

export class Graph {
  byId: Map<string, GNode>;

  constructor(
    public nodes: GNode[],
    public edges: GEdge[]
  ) {
    this.byId = new Map(nodes.map((n) => [n.id, n]));
  }

  of(svc: string) {
    return this.nodes.filter((n) => n.svc === svc);
  }
  has(svc: string, n = 1) {
    return this.of(svc).length >= n;
  }
  get(id: string | null | undefined) {
    return id ? this.byId.get(id) : undefined;
  }
  parent(n: GNode) {
    return this.get(n.parent);
  }
  subnetOf(n: GNode): GNode | undefined {
    const p = this.parent(n);
    return p?.svc === 'subnet' ? p : undefined;
  }
  vpcOf(n: GNode): GNode | undefined {
    let p = this.parent(n);
    while (p && p.svc !== 'vpc') p = this.parent(p);
    return p;
  }
  children(id: string) {
    return this.nodes.filter((n) => n.parent === id);
  }
  descendants(id: string): GNode[] {
    return this.children(id).flatMap((c) => [c, ...this.descendants(c.id)]);
  }
  out(id: string) {
    return this.edges.filter((e) => e.source === id).map((e) => this.byId.get(e.target)!).filter(Boolean);
  }
  in(id: string) {
    return this.edges.filter((e) => e.target === id).map((e) => this.byId.get(e.source)!).filter(Boolean);
  }
  degree(id: string) {
    return this.edges.filter((e) => e.source === id || e.target === id).length;
  }
  /** Is there an edge from any `a` node to any `b` node? */
  linked(a: string, b: string) {
    return this.edges.some((e) => this.byId.get(e.source)?.svc === a && this.byId.get(e.target)?.svc === b);
  }
  /** Path of services exists via edges, e.g. chain('users','cloudfront','s3'). */
  chain(...svcs: string[]) {
    let frontier = this.of(svcs[0]);
    for (const s of svcs.slice(1)) {
      frontier = frontier.flatMap((n) => this.out(n.id)).filter((n) => n.svc === s);
      if (!frontier.length) return false;
    }
    return true;
  }
  isPublic(subnet: GNode | undefined) {
    return !!subnet && subnet.config.public === true;
  }
  inPrivateSubnet(n: GNode) {
    const s = this.subnetOf(n);
    return !!s && !this.isPublic(s);
  }
  inPublicSubnet(n: GNode) {
    return this.isPublic(this.subnetOf(n));
  }
  subnetsIn(vpc: GNode) {
    return this.children(vpc.id).filter((c) => c.svc === 'subnet');
  }
  azsIn(vpc: GNode, pub?: boolean) {
    return new Set(
      this.subnetsIn(vpc)
        .filter((s) => pub === undefined || this.isPublic(s) === pub)
        .map((s) => s.config.az)
    );
  }
}
