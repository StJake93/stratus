import { Graph, type GNode } from './graph';
import { SERVICE } from '../data/services';

export type Level = 'error' | 'warn' | 'hint';

export interface Issue {
  key: string;
  level: Level;
  node?: string;
  title: string;
  body: string;
  docs?: string;
}

const REGIONAL_TARGETS = new Set(['s3', 'dynamodb', 'sqs', 'sns', 'eventbridge', 'secrets', 'ecr', 'stepfunctions', 'cloudwatch']);
const COMPUTE = new Set(['ec2', 'lambda', 'ecs', 'eks']);

/** Architecture linter: each rule teaches one real-world AWS constraint or best practice. */
export function validate(g: Graph): Issue[] {
  const out: Issue[] = [];
  const add = (i: Issue) => out.push(i);
  const nm = (n: GNode) => n.name || SERVICE[n.svc]?.name;

  for (const n of g.nodes) {
    const s = SERVICE[n.svc];
    if (!s) continue;
    const parent = g.parent(n);
    const subnet = g.subnetOf(n);
    const vpc = g.vpcOf(n);

    // ---------- placement ----------
    if (s.placement === 'subnet' && !subnet)
      add({
        key: `place-subnet-${n.id}`,
        level: 'error',
        node: n.id,
        title: `${nm(n)} must be inside a subnet`,
        body: `${s.full} gets network interfaces with private IPs, so it has to live in a subnet of a VPC. Drag it into a subnet.`,
        docs: s.docs
      });
    if (s.placement === 'vpc' && parent?.svc !== 'vpc')
      add({
        key: `place-vpc-${n.id}`,
        level: 'error',
        node: n.id,
        title: `${nm(n)} belongs directly in a VPC`,
        body:
          n.svc === 'subnet'
            ? 'Subnets are carved out of a VPC’s CIDR range. Drop the subnet inside a VPC (and not inside another subnet).'
            : `${s.full} attaches to the VPC as a whole, not to a single subnet. Place it inside the VPC, outside any subnet.`,
        docs: s.docs
      });
    if (s.placement === 'region' && parent && !s.group)
      add({
        key: `place-region-${n.id}`,
        level: 'error',
        node: n.id,
        title: `${nm(n)} doesn't live inside a VPC`,
        body: `${s.full} is a regional managed service reached over AWS APIs. Move it outside the VPC, and use a VPC endpoint if private access is needed.`,
        docs: s.docs
      });
    if (n.svc === 'vpc' && parent)
      add({ key: `vpc-nested-${n.id}`, level: 'error', node: n.id, title: 'VPCs cannot be nested', body: 'Each VPC is a separate network. Connect VPCs with peering or a Transit Gateway instead.', docs: s.docs });
    if (s.placement === 'anywhere' && parent)
      add({ key: `actor-in-vpc-${n.id}`, level: 'warn', node: n.id, title: `${nm(n)} sit outside AWS`, body: 'Actors represent people or systems on the internet. Keep them outside the VPC.' });

    // ---------- networking ----------
    if (n.svc === 'subnet' && vpc) {
      if (g.isPublic(n) && !g.children(vpc.id).some((c) => c.svc === 'igw'))
        add({
          key: `pub-no-igw-${n.id}`,
          level: 'error',
          node: n.id,
          title: 'Public subnet without an Internet Gateway',
          body: 'A subnet is only “public” if its route table sends 0.0.0.0/0 to an Internet Gateway. Add an Internet Gateway to the VPC.',
          docs: SERVICE.igw.docs
        });
      if (g.children(n.id).length === 0)
        add({ key: `empty-subnet-${n.id}`, level: 'hint', node: n.id, title: `${nm(n)} is empty`, body: 'Drop compute, databases or load balancers into this subnet, or remove it.' });
    }
    if (n.svc === 'natgw' && subnet && !g.isPublic(subnet))
      add({
        key: `nat-private-${n.id}`,
        level: 'error',
        node: n.id,
        title: 'NAT Gateway must be in a public subnet',
        body: 'The NAT Gateway itself needs a route to the Internet Gateway so it can forward private traffic out. Move it to a public subnet.',
        docs: SERVICE.natgw.docs
      });
    if (n.svc === 'vpc') {
      const subs = g.subnetsIn(n);
      if (subs.length && g.azsIn(n).size < 2)
        add({
          key: `single-az-${n.id}`,
          level: 'warn',
          node: n.id,
          title: 'Everything is in one Availability Zone',
          body: 'If that AZ has an outage your whole app goes down. Create subnets in at least two AZs (set the AZ in the inspector).',
          docs: 'https://docs.aws.amazon.com/whitepapers/latest/real-time-communication-on-aws/high-availability-and-scalability-on-aws.html'
        });
      const cidrs = subs.map((s) => s.config.cidr);
      const dup = cidrs.find((c, i) => cidrs.indexOf(c) !== i);
      if (dup)
        add({
          key: `dup-cidr-${n.id}`,
          level: 'error',
          node: n.id,
          title: `Overlapping subnet CIDR ${dup}`,
          body: 'Two subnets in the same VPC cannot share an address range. Pick a different CIDR for one of them in the inspector.',
          docs: SERVICE.subnet.docs
        });
    }

    // ---------- load balancer ----------
    if (n.svc === 'alb' && vpc) {
      const pub = n.config.internal !== true;
      if (pub && subnet && !g.isPublic(subnet))
        add({
          key: `alb-private-${n.id}`,
          level: 'error',
          node: n.id,
          title: 'Internet-facing ALB in a private subnet',
          body: 'An internet-facing load balancer needs public subnets so clients can reach it. Move it to a public subnet, or mark it internal.',
          docs: SERVICE.alb.docs
        });
      if (g.azsIn(vpc, pub ? true : undefined).size < 2)
        add({
          key: `alb-azs-${n.id}`,
          level: 'warn',
          node: n.id,
          title: 'ALB needs subnets in two AZs',
          body: `An Application Load Balancer must be attached to subnets in at least two Availability Zones. Add another ${pub ? 'public ' : ''}subnet in a different AZ.`,
          docs: SERVICE.alb.docs
        });
      if (!g.out(n.id).some((t) => COMPUTE.has(t.svc)))
        add({ key: `alb-no-target-${n.id}`, level: 'warn', node: n.id, title: 'ALB has no targets', body: 'Connect the load balancer to EC2, ECS, EKS or Lambda so it has somewhere to send traffic.' });
    }

    // ---------- compute ----------
    if (COMPUTE.has(n.svc)) {
      if (g.inPublicSubnet(n) && n.svc !== 'lambda')
        add({
          key: `compute-public-${n.id}`,
          level: 'hint',
          node: n.id,
          title: `${nm(n)} is in a public subnet`,
          body: 'Best practice: keep application servers in private subnets and expose them through a load balancer in public subnets.'
        });
      if (g.inPublicSubnet(n) && n.svc === 'lambda')
        add({
          key: `lambda-public-${n.id}`,
          level: 'warn',
          node: n.id,
          title: 'Lambda in a public subnet has no internet',
          body: 'VPC-attached Lambda functions never receive public IPs, so a public subnet does not give them internet access. Use private subnets plus a NAT Gateway (or VPC endpoints).',
          docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html'
        });
      const needsEgress =g.out(n.id).some((t) => REGIONAL_TARGETS.has(t.svc)) || n.svc === 'ecs' || n.svc === 'eks';
      if (g.inPrivateSubnet(n) && needsEgress && vpc) {
        const hasNat = g.descendants(vpc.id).some((d) => d.svc === 'natgw');
        const hasEndpoint = g.children(vpc.id).some((d) => d.svc === 'vpce');
        if (!hasNat && !hasEndpoint)
          add({
            key: `no-egress-${n.id}`,
            level: 'warn',
            node: n.id,
            title: `${nm(n)} can't reach AWS APIs`,
            body: `It's in a private subnet with no NAT Gateway or VPC endpoint, so calls to ${n.svc === 'ecs' || n.svc === 'eks' ? 'ECR (image pulls) and ' : ''}regional services will time out. Add a NAT Gateway in a public subnet, or VPC endpoints.`,
            docs: SERVICE.natgw.docs
          });
      }
      if (n.svc === 'lambda' && g.in(n.id).length === 0 && !g.nodes.some((x) => x.svc === 'eventbridge'))
        add({ key: `lambda-no-trigger-${n.id}`, level: 'hint', node: n.id, title: `What triggers ${nm(n)}?`, body: 'Lambda runs in response to events. Connect a trigger: API Gateway, SQS, S3, EventBridge, SNS or DynamoDB Streams.', docs: 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-invocation.html' });
      if ((n.svc === 'ecs' || n.svc === 'eks') && !g.in(n.id).some((x) => x.svc === 'ecr'))
        add({ key: `no-image-${n.id}`, level: 'hint', node: n.id, title: `Where does ${nm(n)} get its image?`, body: 'Containers run images pulled from a registry. Add an ECR repository and connect it (ECR → service).', docs: SERVICE.ecr.docs });
      if (n.svc === 'eks' && vpc && g.azsIn(vpc).size < 2)
        add({ key: `eks-azs-${n.id}`, level: 'error', node: n.id, title: 'EKS requires subnets in two AZs', body: 'The EKS control plane needs subnets in at least two Availability Zones. Add a second subnet in another AZ.', docs: SERVICE.eks.docs });
      if (n.svc === 'ec2' && Number(n.config.count) === 1 && g.in(n.id).some((x) => x.svc === 'alb'))
        add({ key: `ec2-single-${n.id}`, level: 'hint', node: n.id, title: 'Only one instance behind the ALB', body: 'A load balancer shines with 2+ instances across AZs. Increase the Auto Scaling desired count.' });
    }

    // ---------- data ----------
    if (n.svc === 'rds') {
      if (g.inPublicSubnet(n))
        add({ key: `rds-public-${n.id}`, level: 'warn', node: n.id, title: 'Database in a public subnet', body: 'Databases should live in private subnets and only accept connections from your application’s security group.', docs: SERVICE.rds.docs });
      if (vpc && g.azsIn(vpc, false).size < 2 && g.azsIn(vpc).size < 2)
        add({ key: `rds-subnetgroup-${n.id}`, level: 'warn', node: n.id, title: 'DB subnet group needs two AZs', body: 'RDS requires a DB subnet group covering at least two Availability Zones, even for single-AZ instances.', docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html' });
      if (!n.config.multiAz)
        add({ key: `rds-multiaz-${n.id}`, level: 'hint', node: n.id, title: 'Consider Multi-AZ for production', body: 'A Multi-AZ standby gives automatic failover if the primary’s AZ fails.' });
      if (g.in(n.id).length === 0)
        add({ key: `rds-unused-${n.id}`, level: 'hint', node: n.id, title: `Nothing talks to ${nm(n)}`, body: 'Connect your application tier (Lambda / ECS / EC2) to the database.' });
    }
    if (n.svc === 's3' && n.config.public === true)
      add({
        key: `s3-public-${n.id}`,
        level: 'warn',
        node: n.id,
        title: 'Public S3 bucket',
        body: 'Public buckets are a leading cause of data leaks. Keep Block Public Access on and serve content through CloudFront with Origin Access Control.',
        docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html'
      });
    if (n.svc === 's3' && g.in(n.id).some((x) => x.svc === 'users'))
      add({ key: `s3-direct-${n.id}`, level: 'hint', node: n.id, title: 'Serve S3 content via CloudFront', body: 'Users hitting S3 directly miss out on edge caching, HTTPS on custom domains and keeping the bucket private.' });
    if (n.svc === 'sqs' && !g.out(n.id).length)
      add({ key: `sqs-no-consumer-${n.id}`, level: 'hint', node: n.id, title: `${nm(n)} has no consumer`, body: 'Messages will pile up. Connect a consumer such as Lambda (SQS → Lambda).' });
    if (n.svc === 'sqs' && n.config.dlq === false)
      add({ key: `sqs-dlq-${n.id}`, level: 'hint', node: n.id, title: 'No dead-letter queue', body: 'Without a DLQ, a “poison” message that always fails will be retried until it expires. Enable a DLQ to capture failures.' });
    if (n.svc === 'ecr' && n.config.mutable === true)
      add({ key: `ecr-mutable-${n.id}`, level: 'hint', node: n.id, title: 'Mutable image tags', body: 'Immutable tags guarantee that `v1.4.2` always means the same image, for safer rollbacks and audits.' });
    if (n.svc === 'cloudfront' && !g.out(n.id).length)
      add({ key: `cf-no-origin-${n.id}`, level: 'error', node: n.id, title: 'CloudFront needs an origin', body: 'Connect the distribution to an origin: an S3 bucket, ALB or API Gateway.' });
    if (n.svc === 'apigw' && !g.out(n.id).length)
      add({ key: `apigw-no-int-${n.id}`, level: 'warn', node: n.id, title: 'API has no integration', body: 'Connect API Gateway to a backend, typically a Lambda function.' });
    if (n.svc === 'igw' && vpc && !g.subnetsIn(vpc).some((s) => g.isPublic(s)))
      add({ key: `igw-unused-${n.id}`, level: 'hint', node: n.id, title: 'No public subnets use this gateway', body: 'Mark a subnet as public (inspector) so its route table points at the Internet Gateway.' });

    // orphan
    if (!s.group && !['igw', 'iam', 'cloudwatch', 'vpce'].includes(n.svc) && g.degree(n.id) === 0 && g.nodes.length > 1)
      add({ key: `orphan-${n.id}`, level: 'hint', node: n.id, title: `${nm(n)} isn't connected`, body: 'Drag from one of its handles to another component to show how data flows.' });
  }

  const order = { error: 0, warn: 1, hint: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export function explainBadLink(from: string, to: string, bad: Record<string, string>): string {
  const specific = bad[`${from}->${to}`];
  if (specific) return specific;
  const s = SERVICE[from];
  const targets = Object.keys(s?.links ?? {})
    .map((t) => SERVICE[t]?.name)
    .filter(Boolean);
  if (!targets.length) return `${s?.name ?? from} doesn’t initiate connections in this model. Try connecting *into* it instead.`;
  return `${s.name} → ${SERVICE[to]?.name ?? to} isn’t a typical integration. ${s.name} usually connects to: ${targets.slice(0, 7).join(', ')}.`;
}
