import type { Graph } from '../canvas/graph';

export interface StarterNode {
  id: string;
  svc: string;
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  parent?: string;
  config?: Record<string, string | number | boolean>;
}

export interface ScenarioStep {
  goal: string;
  hint: string;
  check: (g: Graph) => boolean;
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: string;
  summary: string;
  story: string;
  lesson?: string;
  steps: ScenarioStep[];
  starter?: { nodes: StarterNode[]; edges: [string, string][] };
  /** Final requirement: no validation errors allowed. */
  noErrors?: boolean;
  debrief: string;
}

const inPrivate = (g: Graph, svc: string) => g.of(svc).some((n) => g.inPrivateSubnet(n));
const inPublic = (g: Graph, svc: string) => g.of(svc).some((n) => g.inPublicSubnet(n));
const vpcWith2AzPubPriv = (g: Graph) => g.of('vpc').some((v) => g.azsIn(v, true).size >= 2 && g.azsIn(v, false).size >= 2);

export const SCENARIOS: Scenario[] = [
  {
    id: 'static-site',
    title: 'Launch a static website',
    difficulty: 'Beginner',
    icon: 'globe',
    summary: 'Host a React/HTML site globally with S3, CloudFront and Route 53.',
    story: 'Your marketing team has a static site build (HTML/CSS/JS). They want it fast worldwide, on **HTTPS**, at `www.acme.com`, and security insists the bucket stays **private**.',
    lesson: 'aws-s3',
    steps: [
      { goal: 'Add an **S3 bucket** to hold the site files', hint: 'Find S3 under Storage in the palette and drag it onto the canvas.', check: (g) => g.has('s3') },
      { goal: 'Put **CloudFront** in front of the bucket (CloudFront → S3)', hint: 'Add CloudFront, then drag from its right-hand handle onto the S3 node.', check: (g) => g.chain('cloudfront', 's3') },
      { goal: 'Point a **Route 53** record at CloudFront', hint: 'Route 53 → CloudFront creates an alias record for www.acme.com.', check: (g) => g.chain('route53', 'cloudfront') },
      { goal: 'Connect **Users** to your domain', hint: 'Users resolve the name through DNS: Users → Route 53.', check: (g) => g.chain('users', 'route53', 'cloudfront', 's3') },
      { goal: 'Keep the bucket **private** (public access off)', hint: 'Select the S3 node and make sure “Allow public access” is off. CloudFront reads it via Origin Access Control.', check: (g) => g.of('s3').length > 0 && g.of('s3').every((s) => !s.config.public) }
    ],
    noErrors: true,
    debrief: 'This is the classic **S3 + CloudFront + Route 53** pattern. CloudFront caches at the edge, terminates HTTPS with an ACM certificate, and uses Origin Access Control so only it can read the bucket. Open the **Terraform** tab to see the OAC and distribution config.'
  },
  {
    id: 'serverless-api',
    title: 'Build a serverless REST API',
    difficulty: 'Beginner',
    icon: 'lambda',
    summary: 'API Gateway + Lambda + DynamoDB: the “hello world” of serverless.',
    story: 'You are building a to-do API for a mobile app. Traffic is spiky and unpredictable, and the team never wants to patch a server. Build a fully serverless backend.',
    lesson: 'aws-apigw',
    steps: [
      { goal: 'Add **API Gateway** as the HTTPS front door', hint: 'API Gateway is under “Edge & APIs”.', check: (g) => g.has('apigw') },
      { goal: 'Route requests to a **Lambda** function', hint: 'Connect API Gateway → Lambda (a proxy integration).', check: (g) => g.chain('apigw', 'lambda') },
      { goal: 'Persist to-dos in **DynamoDB**', hint: 'Lambda → DynamoDB. Pay-per-request mode suits spiky traffic.', check: (g) => g.chain('apigw', 'lambda', 'dynamodb') },
      { goal: 'Let **Users** call the API', hint: 'Users → API Gateway.', check: (g) => g.chain('users', 'apigw') },
      { goal: 'Ship Lambda logs to **CloudWatch**', hint: 'Lambda → CloudWatch. Every function should have logs and an error alarm.', check: (g) => g.linked('lambda', 'cloudwatch') },
      { goal: 'Bonus: protect the API with a **Cognito** JWT authorizer', hint: 'API Gateway → Cognito represents the authorizer.', check: (g) => g.linked('apigw', 'cognito') }
    ],
    noErrors: true,
    debrief: 'No servers, no idle cost, and it scales to thousands of requests per second automatically. The generated Terraform shows how API Gateway needs an **integration**, a **route** and a **lambda_permission** so it’s allowed to invoke your function.'
  },
  {
    id: 'vpc-foundations',
    title: 'Design a production VPC',
    difficulty: 'Beginner',
    icon: 'network',
    summary: 'Public and private subnets across two AZs, with internet and NAT gateways.',
    story: 'Before any app can launch, the platform team needs a standard network: two Availability Zones, public subnets for load balancers, private subnets for apps and data, and outbound internet for patching.',
    lesson: 'aws-vpc',
    steps: [
      { goal: 'Create a **VPC**', hint: 'Drag a VPC onto the canvas. It’s a resizable container.', check: (g) => g.has('vpc') },
      { goal: 'Add **two public subnets** in different AZs', hint: 'Drop two subnets inside the VPC. In the inspector, toggle “Public subnet” and set AZ a and b.', check: (g) => g.of('vpc').some((v) => g.azsIn(v, true).size >= 2) },
      { goal: 'Add **two private subnets** in different AZs', hint: 'Two more subnets, public off, AZs a and b. Use distinct CIDRs!', check: vpcWith2AzPubPriv },
      { goal: 'Attach an **Internet Gateway** to the VPC', hint: 'The IGW goes inside the VPC but outside any subnet.', check: (g) => g.of('igw').some((i) => g.parent(i)?.svc === 'vpc') },
      { goal: 'Give private subnets outbound internet with a **NAT Gateway**', hint: 'A NAT Gateway lives in a *public* subnet.', check: (g) => inPublic(g, 'natgw') }
    ],
    noErrors: true,
    debrief: 'This two-AZ, public/private layout is the backbone of most AWS workloads. Check the Terraform: route tables are what make a subnet public (0.0.0.0/0 → IGW) or private-with-egress (0.0.0.0/0 → NAT).'
  },
  {
    id: 'three-tier',
    title: 'Classic three-tier web app',
    difficulty: 'Intermediate',
    icon: 'layers',
    summary: 'Load balancer, auto-scaled EC2 app tier and a Multi-AZ RDS database.',
    story: 'A legacy Java app is moving to AWS (“lift and shift”). It needs to survive an AZ outage. The network is already built for you, so wire up the tiers.',
    lesson: 'aws-ec2',
    starter: {
      nodes: [
        { id: 'vpc', svc: 'vpc', name: 'prod-vpc', x: 220, y: 40, w: 760, h: 520 },
        { id: 'igw', svc: 'igw', name: 'igw', x: 20, y: 40, parent: 'vpc' },
        { id: 'pa', svc: 'subnet', name: 'public-a', x: 130, y: 30, w: 280, h: 140, parent: 'vpc', config: { public: true, az: 'a', cidr: '10.0.1.0/24' } },
        { id: 'pb', svc: 'subnet', name: 'public-b', x: 450, y: 30, w: 280, h: 140, parent: 'vpc', config: { public: true, az: 'b', cidr: '10.0.2.0/24' } },
        { id: 'aa', svc: 'subnet', name: 'private-a', x: 130, y: 200, w: 280, h: 140, parent: 'vpc', config: { public: false, az: 'a', cidr: '10.0.11.0/24' } },
        { id: 'ab', svc: 'subnet', name: 'private-b', x: 450, y: 200, w: 280, h: 140, parent: 'vpc', config: { public: false, az: 'b', cidr: '10.0.12.0/24' } },
        { id: 'da', svc: 'subnet', name: 'data-a', x: 130, y: 360, w: 280, h: 140, parent: 'vpc', config: { public: false, az: 'a', cidr: '10.0.13.0/24' } },
        { id: 'db', svc: 'subnet', name: 'data-b', x: 450, y: 360, w: 280, h: 140, parent: 'vpc', config: { public: false, az: 'b', cidr: '10.0.3.0/24' } },
        { id: 'users', svc: 'users', name: 'Users', x: 40, y: 120 }
      ],
      edges: []
    },
    steps: [
      { goal: 'Put an internet-facing **ALB** in a public subnet', hint: 'Drop the ALB into public-a (it spans both public subnets).', check: (g) => inPublic(g, 'alb') },
      { goal: 'Run the app on **EC2** in a private subnet', hint: 'Drop EC2 into private-a. Set desired instances to 2+.', check: (g) => inPrivate(g, 'ec2') },
      { goal: 'Wire **Users → ALB → EC2**', hint: 'Draw both connections.', check: (g) => g.chain('users', 'alb', 'ec2') },
      { goal: 'Add an **RDS** database in a data subnet', hint: 'Drop RDS into data-a and connect EC2 → RDS.', check: (g) => inPrivate(g, 'rds') && g.chain('ec2', 'rds') },
      { goal: 'Make the database **Multi-AZ**', hint: 'Select the RDS node and enable Multi-AZ standby.', check: (g) => g.of('rds').some((r) => r.config.multiAz === true) },
      { goal: 'Run at least **2 EC2 instances**', hint: 'Inspector → Instances (Auto Scaling desired) ≥ 2.', check: (g) => g.of('ec2').some((e) => Number(e.config.count) >= 2) }
    ],
    noErrors: true,
    debrief: 'Each tier is isolated by subnet and security group: only the ALB is public, only the app can reach the DB. Losing an AZ loses half the instances (the ASG replaces them), and RDS fails over to its standby in ~60–120 seconds.'
  },
  {
    id: 'event-pipeline',
    title: 'Event-driven image pipeline',
    difficulty: 'Intermediate',
    icon: 'workflow',
    summary: 'S3 uploads trigger processing through a buffered queue with a DLQ.',
    story: 'Users upload photos. Each upload must be resized and its metadata stored. Uploads come in bursts of thousands, and a bad file must never block the rest.',
    lesson: 'aws-messaging',
    steps: [
      { goal: 'Uploads land in an **S3** bucket', hint: 'Users → S3 (think pre-signed URL uploads).', check: (g) => g.chain('users', 's3') },
      { goal: 'S3 events go to an **SQS** queue', hint: 'S3 → SQS (event notification). The queue absorbs bursts.', check: (g) => g.chain('s3', 'sqs') },
      { goal: 'A **Lambda** consumes the queue', hint: 'SQS → Lambda (event source mapping).', check: (g) => g.chain('s3', 'sqs', 'lambda') },
      { goal: 'Store metadata in **DynamoDB**', hint: 'Lambda → DynamoDB.', check: (g) => g.chain('sqs', 'lambda', 'dynamodb') },
      { goal: 'Enable a **dead-letter queue** on SQS', hint: 'Select the queue → Dead-letter queue on.', check: (g) => g.of('sqs').some((q) => q.config.dlq === true) },
      { goal: 'Notify the team via **SNS** when processing finishes', hint: 'Lambda → SNS.', check: (g) => g.linked('lambda', 'sns') }
    ],
    noErrors: true,
    debrief: 'Queue-based decoupling means spikes just grow the queue instead of failing requests, and failures retry automatically before landing in the DLQ. Set the queue’s visibility timeout to at least 6× the function timeout.'
  },
  {
    id: 'scheduled-job',
    title: 'Nightly report job',
    difficulty: 'Beginner',
    icon: 'calendar',
    summary: 'A cron-style Lambda that writes a report to S3 and alarms on failure.',
    story: 'Finance wants a CSV report generated every night at 3am, saved to S3. If the job fails, on-call should be paged.',
    lesson: 'aws-lambda',
    steps: [
      { goal: 'Add an **EventBridge** rule on a schedule', hint: 'Set the schedule in the inspector, e.g. `cron(0 3 * * ? *)`.', check: (g) => g.of('eventbridge').some((e) => String(e.config.schedule).trim().length > 0) },
      { goal: 'It triggers a **Lambda**', hint: 'EventBridge → Lambda.', check: (g) => g.chain('eventbridge', 'lambda') },
      { goal: 'Lambda writes the report to **S3**', hint: 'Lambda → S3.', check: (g) => g.chain('eventbridge', 'lambda', 's3') },
      { goal: 'Add a **CloudWatch** alarm on Lambda errors', hint: 'Lambda → CloudWatch.', check: (g) => g.linked('lambda', 'cloudwatch') },
      { goal: 'The alarm pages on-call through **SNS**', hint: 'CloudWatch → SNS (alarm action).', check: (g) => g.chain('lambda', 'cloudwatch', 'sns') }
    ],
    noErrors: true,
    debrief: 'EventBridge Scheduler/rules replace cron servers entirely. The alarm → SNS pattern is the standard way to get paged for anything in AWS.'
  },
  {
    id: 'fanout',
    title: 'Order fan-out with SNS + SQS',
    difficulty: 'Intermediate',
    icon: 'git-branch',
    summary: 'One event, many independent consumers: the pub/sub fan-out pattern.',
    story: 'When an order is placed, billing, shipping and analytics all need to know independently, so a slow analytics job never delays shipping.',
    lesson: 'aws-messaging',
    steps: [
      { goal: 'Orders arrive via **API Gateway → Lambda**', hint: 'Users → API Gateway → Lambda.', check: (g) => g.chain('apigw', 'lambda') },
      { goal: 'The function publishes to an **SNS topic**', hint: 'Lambda → SNS.', check: (g) => g.chain('apigw', 'lambda', 'sns') },
      { goal: 'Subscribe **two SQS queues** to the topic', hint: 'SNS → SQS twice (e.g. “billing” and “shipping”).', check: (g) => g.of('sns').some((s) => g.out(s.id).filter((t) => t.svc === 'sqs').length >= 2) },
      { goal: 'Each queue has its own **consumer Lambda**', hint: 'SQS → Lambda for each queue.', check: (g) => g.of('sqs').filter((q) => g.out(q.id).some((t) => t.svc === 'lambda')).length >= 2 }
    ],
    noErrors: true,
    debrief: 'SNS fans out; each SQS queue gives its consumer an independent buffer, retry policy and DLQ. Adding a new consumer later is just another subscription, with no change to the publisher.'
  },
  {
    id: 'container-app',
    title: 'Containerised app on Fargate',
    difficulty: 'Intermediate',
    icon: 'boxes',
    summary: 'CI pushes to ECR, ECS Fargate runs it privately behind an ALB.',
    story: 'Your team has Dockerised a Node.js API. Ship it to AWS with no servers to manage, private networking, and a proper image registry. The VPC is ready for you.',
    lesson: 'aws-ecs',
    starter: {
      nodes: [
        { id: 'vpc', svc: 'vpc', name: 'app-vpc', x: 260, y: 20, w: 720, h: 400 },
        { id: 'igw', svc: 'igw', name: 'igw', x: 20, y: 40, parent: 'vpc' },
        { id: 'pa', svc: 'subnet', name: 'public-a', x: 120, y: 30, w: 270, h: 150, parent: 'vpc', config: { public: true, az: 'a', cidr: '10.0.1.0/24' } },
        { id: 'pb', svc: 'subnet', name: 'public-b', x: 420, y: 30, w: 270, h: 150, parent: 'vpc', config: { public: true, az: 'b', cidr: '10.0.2.0/24' } },
        { id: 'aa', svc: 'subnet', name: 'private-a', x: 120, y: 220, w: 270, h: 150, parent: 'vpc', config: { public: false, az: 'a', cidr: '10.0.11.0/24' } },
        { id: 'ab', svc: 'subnet', name: 'private-b', x: 420, y: 220, w: 270, h: 150, parent: 'vpc', config: { public: false, az: 'b', cidr: '10.0.12.0/24' } }
      ],
      edges: []
    },
    steps: [
      { goal: 'Create an **ECR** repository', hint: 'ECR is a regional service, so keep it outside the VPC.', check: (g) => g.has('ecr') },
      { goal: 'A **Developer / CI** pipeline pushes images to it', hint: 'Developer → ECR (docker push).', check: (g) => g.chain('developer', 'ecr') },
      { goal: 'Run an **ECS Fargate** service in a private subnet', hint: 'Drop ECS Fargate into private-a.', check: (g) => inPrivate(g, 'ecs') },
      { goal: 'ECS pulls its image from ECR', hint: 'ECR → ECS.', check: (g) => g.chain('ecr', 'ecs') },
      { goal: 'Expose it with an internet-facing **ALB**', hint: 'ALB in a public subnet, then Users → ALB → ECS.', check: (g) => inPublic(g, 'alb') && g.chain('users', 'alb', 'ecs') },
      { goal: 'Give private tasks outbound access with a **NAT Gateway** (or VPC endpoint)', hint: 'Tasks in private subnets need a path to ECR. Add a NAT Gateway in a public subnet.', check: (g) => inPublic(g, 'natgw') || g.has('vpce') }
    ],
    noErrors: true,
    debrief: 'This is the most common container setup on AWS. Fargate tasks get private IPs, the ALB is the only public entry point, and images are pulled from ECR via NAT (or cheaper, via ECR + S3 VPC endpoints).'
  },
  {
    id: 'eks-platform',
    title: 'Kubernetes platform on EKS',
    difficulty: 'Advanced',
    icon: 'ship-wheel',
    summary: 'A production-ready EKS cluster across AZs with ingress, registry and observability.',
    story: 'Platform engineering is standardising on Kubernetes. Build the AWS foundation for an EKS cluster that app teams will deploy onto.',
    lesson: 'aws-eks',
    steps: [
      { goal: 'Build a **VPC** with public and private subnets in **two AZs**', hint: 'Four subnets: public-a, public-b, private-a, private-b.', check: vpcWith2AzPubPriv },
      { goal: 'Attach an **Internet Gateway** and a **NAT Gateway**', hint: 'IGW in the VPC; NAT in a public subnet.', check: (g) => g.has('igw') && inPublic(g, 'natgw') },
      { goal: 'Create the **EKS** cluster with nodes in private subnets', hint: 'Drop EKS into a private subnet.', check: (g) => inPrivate(g, 'eks') },
      { goal: 'Pull images from **ECR**', hint: 'ECR → EKS.', check: (g) => g.chain('ecr', 'eks') },
      { goal: 'Expose services through an **ALB** (AWS Load Balancer Controller)', hint: 'ALB in a public subnet, Users → ALB → EKS.', check: (g) => inPublic(g, 'alb') && g.chain('users', 'alb', 'eks') },
      { goal: 'Ship metrics and logs to **CloudWatch** (Container Insights)', hint: 'EKS → CloudWatch.', check: (g) => g.linked('eks', 'cloudwatch') }
    ],
    noErrors: true,
    debrief: 'EKS runs the control plane for you across three AZs. Your nodes live in private subnets; the AWS Load Balancer Controller turns Kubernetes Ingress objects into ALBs. Next steps in the real world: IRSA / Pod Identity for per-pod IAM, Karpenter for node autoscaling.'
  },
  {
    id: 'tf-backend',
    title: 'Terraform remote state backend',
    difficulty: 'Beginner',
    icon: 'file-code',
    summary: 'A versioned, private S3 bucket that stores team Terraform state.',
    story: 'Three engineers are running `terraform apply` from their laptops with local state files. Chaos. Set up a shared remote backend.',
    lesson: 'tf-state',
    steps: [
      { goal: 'Create an **S3 bucket** named something like `tf-state`', hint: 'Rename the node in the inspector.', check: (g) => g.of('s3').some((s) => /state/i.test(s.name)) },
      { goal: 'Enable **versioning** so old state can be recovered', hint: 'Inspector → Versioning on.', check: (g) => g.of('s3').some((s) => /state/i.test(s.name) && s.config.versioning === true) },
      { goal: 'Ensure the bucket is **not public**', hint: 'State files often contain secrets. Public access off!', check: (g) => g.of('s3').filter((s) => /state/i.test(s.name)).every((s) => !s.config.public) && g.of('s3').some((s) => /state/i.test(s.name)) },
      { goal: 'Engineers / CI read & write state (**Developer → S3**)', hint: 'Developer → S3.', check: (g) => g.chain('developer', 's3') },
      { goal: 'Access through a least-privilege **IAM role**', hint: 'Add an IAM Role. In real life CI assumes it via OIDC.', check: (g) => g.has('iam') }
    ],
    noErrors: false,
    debrief: 'Since Terraform 1.11 the S3 backend can lock state natively with `use_lockfile = true`, so no DynamoDB table is needed (the old DynamoDB lock table is deprecated). Look at `providers.tf` in the Terraform tab for the backend block.'
  },
  {
    id: 'secure-api',
    title: 'Hardened API with private data',
    difficulty: 'Advanced',
    icon: 'shield-check',
    summary: 'WAF, Cognito, a VPC-attached Lambda, RDS and Secrets Manager.',
    story: 'A fintech API needs defence in depth: filtered at the edge, authenticated users only, database never exposed, and no credentials in code.',
    lesson: 'aws-iam',
    steps: [
      { goal: '**WAF** protects **API Gateway**', hint: 'WAF → API Gateway.', check: (g) => g.chain('waf', 'apigw') },
      { goal: 'API Gateway validates JWTs from **Cognito**', hint: 'API Gateway → Cognito.', check: (g) => g.linked('apigw', 'cognito') },
      { goal: 'A **Lambda** runs in a **private subnet** of a VPC', hint: 'Build a VPC with a private subnet (and a second AZ) and drop Lambda in.', check: (g) => inPrivate(g, 'lambda') && g.chain('apigw', 'lambda') },
      { goal: 'It queries **RDS** in a private subnet', hint: 'Lambda → RDS, with RDS in a private subnet.', check: (g) => inPrivate(g, 'rds') && g.chain('lambda', 'rds') },
      { goal: 'DB credentials come from **Secrets Manager**', hint: 'Lambda → Secrets Manager. Needs a NAT Gateway or VPC endpoint to reach it!', check: (g) => g.chain('lambda', 'secrets') },
      { goal: 'Private egress via a **VPC endpoint** or NAT', hint: 'Add a VPC Endpoint (service: secretsmanager) inside the VPC, or a NAT Gateway in a public subnet.', check: (g) => g.has('vpce') || inPublic(g, 'natgw') }
    ],
    noErrors: true,
    debrief: 'Every layer narrows the blast radius: WAF filters bad traffic, Cognito authenticates, the Lambda and database have no public IPs, and secrets rotate without code changes. VPC endpoints keep AWS API calls off the internet entirely.'
  }
];

export const SCENARIO: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
