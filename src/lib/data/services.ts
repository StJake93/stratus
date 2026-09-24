// Building blocks for the canvas. Each service knows where it may live (placement),
// what it may connect to (links), how it is configured, and its Terraform resource type.

export type Category =
  | 'edge'
  | 'network'
  | 'compute'
  | 'containers'
  | 'storage'
  | 'database'
  | 'integration'
  | 'security'
  | 'monitoring'
  | 'actors';

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: 'actors', label: 'Actors', color: '#94a3b8' },
  { id: 'network', label: 'Networking', color: 'var(--c-network)' },
  { id: 'edge', label: 'Edge & APIs', color: 'var(--c-edge)' },
  { id: 'compute', label: 'Compute', color: 'var(--c-compute)' },
  { id: 'containers', label: 'Containers', color: 'var(--c-containers)' },
  { id: 'storage', label: 'Storage', color: 'var(--c-storage)' },
  { id: 'database', label: 'Databases', color: 'var(--c-database)' },
  { id: 'integration', label: 'Integration', color: 'var(--c-integration)' },
  { id: 'security', label: 'Security & Identity', color: 'var(--c-security)' },
  { id: 'monitoring', label: 'Observability', color: 'var(--c-monitoring)' }
];

/**
 * - `region`: regional/global managed service; lives outside any VPC.
 * - `subnet`: must be placed inside a subnet.
 * - `vpc`: must be placed directly inside a VPC (not a subnet).
 * - `optional-subnet`: may run inside a subnet or outside the VPC (e.g. Lambda).
 * - `anywhere`: actors / external things.
 */
export type Placement = 'region' | 'subnet' | 'vpc' | 'optional-subnet' | 'anywhere';

export interface ConfigField {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'toggle';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  default: string | number | boolean;
  help?: string;
}

export interface Service {
  id: string;
  name: string;
  full: string;
  category: Category;
  icon: string;
  blurb: string;
  docs: string;
  tf: string;
  placement: Placement;
  group?: boolean; // container node (VPC / Subnet)
  links?: Record<string, string>; // targetServiceId -> relationship label
  config?: ConfigField[];
}

const D = 'https://docs.aws.amazon.com';

export const SERVICES: Service[] = [
  // ---------- actors ----------
  {
    id: 'users',
    name: 'Users',
    full: 'Internet users',
    category: 'actors',
    icon: 'users',
    blurb: 'People (or clients) on the internet calling your application.',
    docs: `${D}/whitepapers/latest/aws-overview/introduction.html`,
    tf: '',
    placement: 'anywhere',
    links: { route53: 'resolves via', cloudfront: 'HTTPS', apigw: 'HTTPS', alb: 'HTTP/S', cognito: 'signs in', s3: 'downloads', ec2: 'SSH/HTTP' }
  },
  {
    id: 'developer',
    name: 'Developer',
    full: 'Developer / CI pipeline',
    category: 'actors',
    icon: 'terminal',
    blurb: 'A developer laptop or CI/CD pipeline that builds and pushes artifacts.',
    docs: `${D}/codepipeline/latest/userguide/welcome.html`,
    tf: '',
    placement: 'anywhere',
    links: { ecr: 'docker push', s3: 'uploads', lambda: 'deploys' }
  },

  // ---------- network ----------
  {
    id: 'vpc',
    name: 'VPC',
    full: 'Amazon Virtual Private Cloud',
    category: 'network',
    icon: 'network',
    blurb: 'Your own isolated virtual network in a region. Everything network-attached lives inside one.',
    docs: `${D}/vpc/latest/userguide/what-is-amazon-vpc.html`,
    tf: 'aws_vpc',
    placement: 'region',
    group: true,
    config: [{ key: 'cidr', label: 'CIDR block', type: 'select', options: ['10.0.0.0/16', '10.1.0.0/16', '172.16.0.0/16', '192.168.0.0/20'], default: '10.0.0.0/16', help: 'The private IP range for the whole VPC. /16 gives 65,536 addresses.' }]
  },
  {
    id: 'subnet',
    name: 'Subnet',
    full: 'VPC Subnet',
    category: 'network',
    icon: 'layout-grid',
    blurb: 'A slice of the VPC range pinned to one Availability Zone. Public subnets route to an Internet Gateway.',
    docs: `${D}/vpc/latest/userguide/configure-subnets.html`,
    tf: 'aws_subnet',
    placement: 'vpc',
    group: true,
    config: [
      { key: 'public', label: 'Public subnet', type: 'toggle', default: false, help: 'Public = has a route to an Internet Gateway (0.0.0.0/0 → igw).' },
      { key: 'az', label: 'Availability Zone', type: 'select', options: ['a', 'b', 'c'], default: 'a' },
      { key: 'cidr', label: 'CIDR block', type: 'select', options: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24', '10.0.11.0/24', '10.0.12.0/24', '10.0.13.0/24'], default: '10.0.1.0/24' }
    ]
  },
  {
    id: 'igw',
    name: 'Internet GW',
    full: 'Internet Gateway',
    category: 'network',
    icon: 'globe',
    blurb: 'Attaches to a VPC to allow traffic between public subnets and the internet.',
    docs: `${D}/vpc/latest/userguide/VPC_Internet_Gateway.html`,
    tf: 'aws_internet_gateway',
    placement: 'vpc'
  },
  {
    id: 'natgw',
    name: 'NAT GW',
    full: 'NAT Gateway',
    category: 'network',
    icon: 'arrow-up-right',
    blurb: 'Lets resources in private subnets reach out to the internet without being reachable from it. Lives in a public subnet.',
    docs: `${D}/vpc/latest/userguide/vpc-nat-gateway.html`,
    tf: 'aws_nat_gateway',
    placement: 'subnet'
  },
  {
    id: 'vpce',
    name: 'VPC Endpoint',
    full: 'VPC Gateway / Interface Endpoint',
    category: 'network',
    icon: 'plug',
    blurb: 'Private path from your VPC to AWS services (S3, DynamoDB, ECR…) without traversing the internet or a NAT.',
    docs: `${D}/vpc/latest/privatelink/concepts.html`,
    tf: 'aws_vpc_endpoint',
    placement: 'vpc',
    links: { s3: 'private route', dynamodb: 'private route', ecr: 'private route', sqs: 'private route', secrets: 'private route' },
    config: [{ key: 'service', label: 'Service', type: 'select', options: ['s3', 'dynamodb', 'ecr.api', 'sqs', 'secretsmanager'], default: 's3' }]
  },

  // ---------- edge ----------
  {
    id: 'route53',
    name: 'Route 53',
    full: 'Amazon Route 53',
    category: 'edge',
    icon: 'signpost',
    blurb: 'Managed DNS. Maps names like app.example.com to your load balancers, distributions and APIs.',
    docs: `${D}/Route53/latest/DeveloperGuide/Welcome.html`,
    tf: 'aws_route53_record',
    placement: 'region',
    links: { cloudfront: 'alias', alb: 'alias', apigw: 'alias', ec2: 'A record' },
    config: [{ key: 'domain', label: 'Domain', type: 'text', default: 'app.example.com' }]
  },
  {
    id: 'cloudfront',
    name: 'CloudFront',
    full: 'Amazon CloudFront',
    category: 'edge',
    icon: 'zap-fast',
    blurb: 'Global CDN. Caches content at 600+ edge locations close to your users.',
    docs: `${D}/AmazonCloudFront/latest/DeveloperGuide/Introduction.html`,
    tf: 'aws_cloudfront_distribution',
    placement: 'region',
    links: { s3: 'origin', alb: 'origin', apigw: 'origin', lambda: 'function URL origin' },
    config: [{ key: 'priceClass', label: 'Price class', type: 'select', options: ['PriceClass_100', 'PriceClass_200', 'PriceClass_All'], default: 'PriceClass_100' }]
  },
  {
    id: 'apigw',
    name: 'API Gateway',
    full: 'Amazon API Gateway',
    category: 'edge',
    icon: 'webhook',
    blurb: 'Managed front door for HTTP/REST/WebSocket APIs: routing, auth, throttling.',
    docs: `${D}/apigateway/latest/developerguide/welcome.html`,
    tf: 'aws_apigatewayv2_api',
    placement: 'region',
    links: { lambda: 'integration', sqs: 'service integration', dynamodb: 'service integration', stepfunctions: 'starts execution', alb: 'VPC link', ecs: 'VPC link', cognito: 'JWT authorizer' },
    config: [{ key: 'type', label: 'API type', type: 'select', options: ['HTTP', 'REST', 'WEBSOCKET'], default: 'HTTP', help: 'HTTP APIs are cheaper and simpler; REST APIs add usage plans, API keys, request validation.' }]
  },
  {
    id: 'alb',
    name: 'ALB',
    full: 'Application Load Balancer',
    category: 'edge',
    icon: 'split',
    blurb: 'Layer-7 load balancer that routes HTTP(S) requests across targets in multiple AZs.',
    docs: `${D}/elasticloadbalancing/latest/application/introduction.html`,
    tf: 'aws_lb',
    placement: 'subnet',
    links: { ec2: 'target group', ecs: 'target group', eks: 'ingress', lambda: 'target group' },
    config: [
      { key: 'internal', label: 'Internal (not internet-facing)', type: 'toggle', default: false },
      { key: 'https', label: 'HTTPS listener (ACM cert)', type: 'toggle', default: true }
    ]
  },

  // ---------- compute ----------
  {
    id: 'ec2',
    name: 'EC2',
    full: 'Amazon EC2 instance',
    category: 'compute',
    icon: 'server',
    blurb: 'Virtual servers. You choose the instance type, OS image (AMI) and manage the OS.',
    docs: `${D}/ec2/latest/UserGuide/concepts.html`,
    tf: 'aws_instance',
    placement: 'subnet',
    links: { rds: 'SQL', dynamodb: 'SDK', s3: 'SDK', sqs: 'sends', sns: 'publishes', elasticache: 'cache', secrets: 'reads', cloudwatch: 'logs & metrics', efs: 'mounts' },
    config: [
      { key: 'type', label: 'Instance type', type: 'select', options: ['t3.micro', 't3.small', 't3.medium', 'm7g.large', 'c7g.xlarge', 'r7g.large'], default: 't3.micro' },
      { key: 'count', label: 'Instances (Auto Scaling desired)', type: 'number', min: 1, max: 20, default: 2 },
      { key: 'ami', label: 'OS image', type: 'select', options: ['Amazon Linux 2023', 'Ubuntu 24.04', 'Windows Server 2022'], default: 'Amazon Linux 2023' }
    ]
  },
  {
    id: 'lambda',
    name: 'Lambda',
    full: 'AWS Lambda function',
    category: 'compute',
    icon: 'lambda',
    blurb: 'Run code without servers. Triggered by events, billed per request and per millisecond.',
    docs: `${D}/lambda/latest/dg/welcome.html`,
    tf: 'aws_lambda_function',
    placement: 'optional-subnet',
    links: { dynamodb: 'reads/writes', rds: 'SQL', s3: 'reads/writes', sqs: 'sends', sns: 'publishes', eventbridge: 'puts events', secrets: 'reads', cloudwatch: 'logs', elasticache: 'cache', stepfunctions: 'starts', lambda: 'invokes', efs: 'mounts' },
    config: [
      { key: 'runtime', label: 'Runtime', type: 'select', options: ['python3.13', 'nodejs22.x', 'java21', 'provided.al2023', 'container image'], default: 'python3.13' },
      { key: 'memory', label: 'Memory (MB)', type: 'number', min: 128, max: 10240, step: 64, default: 512, help: 'CPU scales proportionally with memory.' },
      { key: 'timeout', label: 'Timeout (s)', type: 'number', min: 1, max: 900, default: 15 },
      { key: 'arch', label: 'Architecture', type: 'select', options: ['arm64', 'x86_64'], default: 'arm64' }
    ]
  },
  {
    id: 'stepfunctions',
    name: 'Step Functions',
    full: 'AWS Step Functions',
    category: 'integration',
    icon: 'workflow',
    blurb: 'Visual workflows that orchestrate Lambda, ECS and 200+ AWS services with retries and branching.',
    docs: `${D}/step-functions/latest/dg/welcome.html`,
    tf: 'aws_sfn_state_machine',
    placement: 'region',
    links: { lambda: 'task', dynamodb: 'task', sqs: 'task', sns: 'task', ecs: 'run task' },
    config: [{ key: 'type', label: 'Workflow type', type: 'select', options: ['STANDARD', 'EXPRESS'], default: 'STANDARD' }]
  },

  // ---------- containers ----------
  {
    id: 'ecr',
    name: 'ECR',
    full: 'Amazon Elastic Container Registry',
    category: 'containers',
    icon: 'package',
    blurb: 'Private Docker/OCI image registry. ECS, EKS and Lambda pull images from here.',
    docs: `${D}/AmazonECR/latest/userguide/what-is-ecr.html`,
    tf: 'aws_ecr_repository',
    placement: 'region',
    links: { ecs: 'image pull', eks: 'image pull', lambda: 'container image' },
    config: [
      { key: 'scan', label: 'Scan on push', type: 'toggle', default: true },
      { key: 'mutable', label: 'Mutable tags', type: 'toggle', default: false, help: 'Immutable tags stop someone overwriting v1.2.3 with different code.' }
    ]
  },
  {
    id: 'ecs',
    name: 'ECS Fargate',
    full: 'Amazon ECS service on Fargate',
    category: 'containers',
    icon: 'boxes',
    blurb: 'Run containers without managing servers. A service keeps N tasks running and registers them with a load balancer.',
    docs: `${D}/AmazonECS/latest/developerguide/AWS_Fargate.html`,
    tf: 'aws_ecs_service',
    placement: 'subnet',
    links: { rds: 'SQL', dynamodb: 'SDK', s3: 'SDK', sqs: 'sends', sns: 'publishes', elasticache: 'cache', secrets: 'reads', cloudwatch: 'logs', efs: 'mounts' },
    config: [
      { key: 'tasks', label: 'Desired tasks', type: 'number', min: 1, max: 50, default: 2 },
      { key: 'cpu', label: 'Task CPU', type: 'select', options: ['256', '512', '1024', '2048'], default: '512' },
      { key: 'memory', label: 'Task memory (MiB)', type: 'select', options: ['512', '1024', '2048', '4096'], default: '1024' }
    ]
  },
  {
    id: 'eks',
    name: 'EKS',
    full: 'Amazon Elastic Kubernetes Service',
    category: 'containers',
    icon: 'ship-wheel',
    blurb: 'Managed Kubernetes control plane. You run pods on managed node groups or Fargate.',
    docs: `${D}/eks/latest/userguide/what-is-eks.html`,
    tf: 'aws_eks_cluster',
    placement: 'subnet',
    links: { rds: 'SQL', dynamodb: 'SDK', s3: 'SDK', sqs: 'sends', elasticache: 'cache', secrets: 'reads', cloudwatch: 'Container Insights', efs: 'CSI mount' },
    config: [
      { key: 'version', label: 'Kubernetes version', type: 'select', options: ['1.33', '1.32', '1.31'], default: '1.33' },
      { key: 'nodes', label: 'Nodes (managed node group)', type: 'number', min: 1, max: 20, default: 3 },
      { key: 'nodeType', label: 'Node instance type', type: 'select', options: ['t3.medium', 'm7g.large', 'c7g.xlarge'], default: 'm7g.large' }
    ]
  },

  // ---------- storage ----------
  {
    id: 's3',
    name: 'S3',
    full: 'Amazon S3 bucket',
    category: 'storage',
    icon: 'archive',
    blurb: 'Object storage with 11 nines of durability. Static sites, data lakes, backups, Terraform state.',
    docs: `${D}/AmazonS3/latest/userguide/Welcome.html`,
    tf: 'aws_s3_bucket',
    placement: 'region',
    links: { lambda: 'event notification', sqs: 'event notification', sns: 'event notification', eventbridge: 'events' },
    config: [
      { key: 'versioning', label: 'Versioning', type: 'toggle', default: true },
      { key: 'public', label: 'Allow public access', type: 'toggle', default: false, help: 'Almost always keep this off — serve public content through CloudFront instead.' },
      { key: 'class', label: 'Default storage class', type: 'select', options: ['STANDARD', 'INTELLIGENT_TIERING', 'STANDARD_IA', 'GLACIER_IR'], default: 'STANDARD' }
    ]
  },
  {
    id: 'efs',
    name: 'EFS',
    full: 'Amazon Elastic File System',
    category: 'storage',
    icon: 'folder-tree',
    blurb: 'Shared NFS file system that many instances, containers or functions can mount at once.',
    docs: `${D}/efs/latest/ug/whatisefs.html`,
    tf: 'aws_efs_file_system',
    placement: 'region'
  },

  // ---------- database ----------
  {
    id: 'rds',
    name: 'RDS',
    full: 'Amazon RDS database',
    category: 'database',
    icon: 'database',
    blurb: 'Managed relational databases (PostgreSQL, MySQL…). AWS handles patching, backups and failover.',
    docs: `${D}/AmazonRDS/latest/UserGuide/Welcome.html`,
    tf: 'aws_db_instance',
    placement: 'subnet',
    config: [
      { key: 'engine', label: 'Engine', type: 'select', options: ['postgres', 'mysql', 'mariadb'], default: 'postgres' },
      { key: 'class', label: 'Instance class', type: 'select', options: ['db.t4g.micro', 'db.t4g.medium', 'db.m7g.large', 'db.r7g.large'], default: 'db.t4g.micro' },
      { key: 'multiAz', label: 'Multi-AZ standby', type: 'toggle', default: false, help: 'Synchronous standby in a second AZ with automatic failover.' },
      { key: 'storage', label: 'Storage (GiB)', type: 'number', min: 20, max: 1000, default: 20 }
    ]
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    full: 'Amazon DynamoDB table',
    category: 'database',
    icon: 'table',
    blurb: 'Serverless key-value / document database with single-digit millisecond latency at any scale.',
    docs: `${D}/amazondynamodb/latest/developerguide/Introduction.html`,
    tf: 'aws_dynamodb_table',
    placement: 'region',
    links: { lambda: 'stream trigger' },
    config: [
      { key: 'billing', label: 'Capacity mode', type: 'select', options: ['PAY_PER_REQUEST', 'PROVISIONED'], default: 'PAY_PER_REQUEST' },
      { key: 'pk', label: 'Partition key', type: 'text', default: 'pk' },
      { key: 'stream', label: 'Streams enabled', type: 'toggle', default: false }
    ]
  },
  {
    id: 'elasticache',
    name: 'ElastiCache',
    full: 'Amazon ElastiCache (Valkey/Redis)',
    category: 'database',
    icon: 'gauge',
    blurb: 'In-memory cache for sub-millisecond reads, sessions and leaderboards.',
    docs: `${D}/AmazonElastiCache/latest/dg/WhatIs.html`,
    tf: 'aws_elasticache_cluster',
    placement: 'subnet',
    config: [{ key: 'node', label: 'Node type', type: 'select', options: ['cache.t4g.micro', 'cache.m7g.large'], default: 'cache.t4g.micro' }]
  },

  // ---------- integration ----------
  {
    id: 'sqs',
    name: 'SQS',
    full: 'Amazon Simple Queue Service',
    category: 'integration',
    icon: 'inbox',
    blurb: 'Durable message queue that decouples producers from consumers and absorbs traffic spikes.',
    docs: `${D}/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html`,
    tf: 'aws_sqs_queue',
    placement: 'region',
    links: { lambda: 'event source mapping' },
    config: [
      { key: 'fifo', label: 'FIFO queue', type: 'toggle', default: false, help: 'Strict ordering + exactly-once processing, lower throughput.' },
      { key: 'dlq', label: 'Dead-letter queue', type: 'toggle', default: true },
      { key: 'visibility', label: 'Visibility timeout (s)', type: 'number', min: 0, max: 43200, default: 30 }
    ]
  },
  {
    id: 'sns',
    name: 'SNS',
    full: 'Amazon Simple Notification Service',
    category: 'integration',
    icon: 'megaphone',
    blurb: 'Pub/sub topics that fan a single message out to many subscribers (queues, functions, email, SMS).',
    docs: `${D}/sns/latest/dg/welcome.html`,
    tf: 'aws_sns_topic',
    placement: 'region',
    links: { sqs: 'subscription', lambda: 'subscription' }
  },
  {
    id: 'eventbridge',
    name: 'EventBridge',
    full: 'Amazon EventBridge',
    category: 'integration',
    icon: 'radio',
    blurb: 'Serverless event bus. Route events by content-based rules, or run things on a schedule.',
    docs: `${D}/eventbridge/latest/userguide/eb-what-is.html`,
    tf: 'aws_cloudwatch_event_rule',
    placement: 'region',
    links: { lambda: 'rule target', sqs: 'rule target', sns: 'rule target', stepfunctions: 'rule target', ecs: 'run task' },
    config: [{ key: 'schedule', label: 'Schedule (optional)', type: 'text', default: '', help: 'e.g. rate(5 minutes) or cron(0 3 * * ? *)' }]
  },

  // ---------- security ----------
  {
    id: 'iam',
    name: 'IAM Role',
    full: 'AWS IAM role',
    category: 'security',
    icon: 'key',
    blurb: 'An identity with permissions that a service (Lambda, EC2, ECS task…) assumes to call other AWS APIs.',
    docs: `${D}/IAM/latest/UserGuide/id_roles.html`,
    tf: 'aws_iam_role',
    placement: 'region',
    links: { lambda: 'execution role', ec2: 'instance profile', ecs: 'task role', eks: 'cluster role', stepfunctions: 'execution role' }
  },
  {
    id: 'cognito',
    name: 'Cognito',
    full: 'Amazon Cognito user pool',
    category: 'security',
    icon: 'user-check',
    blurb: 'User sign-up/sign-in and JWT issuance for your apps.',
    docs: `${D}/cognito/latest/developerguide/what-is-amazon-cognito.html`,
    tf: 'aws_cognito_user_pool',
    placement: 'region'
  },
  {
    id: 'secrets',
    name: 'Secrets Mgr',
    full: 'AWS Secrets Manager',
    category: 'security',
    icon: 'lock',
    blurb: 'Stores and rotates database passwords, API keys and other secrets.',
    docs: `${D}/secretsmanager/latest/userguide/intro.html`,
    tf: 'aws_secretsmanager_secret',
    placement: 'region'
  },
  {
    id: 'waf',
    name: 'WAF',
    full: 'AWS WAF web ACL',
    category: 'security',
    icon: 'shield',
    blurb: 'Web application firewall — blocks SQL injection, bots and abusive IPs in front of CloudFront, ALB or API Gateway.',
    docs: `${D}/waf/latest/developerguide/waf-chapter.html`,
    tf: 'aws_wafv2_web_acl',
    placement: 'region',
    links: { cloudfront: 'protects', alb: 'protects', apigw: 'protects' }
  },

  // ---------- monitoring ----------
  {
    id: 'cloudwatch',
    name: 'CloudWatch',
    full: 'Amazon CloudWatch',
    category: 'monitoring',
    icon: 'activity',
    blurb: 'Metrics, logs, dashboards and alarms for everything in your account.',
    docs: `${D}/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html`,
    tf: 'aws_cloudwatch_metric_alarm',
    placement: 'region',
    links: { sns: 'alarm action' }
  }
];

export const SERVICE: Record<string, Service> = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

export function defaultConfig(id: string): Record<string, string | number | boolean> {
  return Object.fromEntries((SERVICE[id]?.config ?? []).map((f) => [f.key, f.default]));
}

export function categoryColor(c: Category) {
  return CATEGORIES.find((x) => x.id === c)?.color ?? 'var(--accent)';
}

/** Why a specific pairing is invalid — shown as an error toast so learners understand the rule. */
export const BAD_LINKS: Record<string, string> = {
  'users->rds': 'Databases should never be exposed straight to the internet. Put an application tier (Lambda, ECS, EC2) in between.',
  'users->dynamodb': 'Clients don’t talk to DynamoDB directly in a typical design — route through API Gateway + Lambda so you control auth and validation.',
  'users->lambda': 'Lambda functions aren’t called directly by browsers here. Put API Gateway (or an ALB) in front as the HTTP entry point.',
  'users->ecs': 'Expose containers through an Application Load Balancer, not directly.',
  'users->eks': 'Expose Kubernetes workloads through a load balancer / ingress.',
  's3->rds': 'S3 can’t write into a database. Use S3 → Lambda (event notification) → RDS.',
  'sqs->dynamodb': 'Queues don’t push into tables. Add a Lambda consumer: SQS → Lambda → DynamoDB.',
  'sqs->rds': 'Queues need a consumer. Try SQS → Lambda → RDS.',
  'route53->s3': 'You *can* alias Route 53 to an S3 website endpoint, but best practice is Route 53 → CloudFront → S3 (HTTPS + private bucket).',
  'cloudfront->rds': 'CloudFront origins must speak HTTP. Databases sit behind your app tier.',
  'cloudfront->dynamodb': 'CloudFront origins must speak HTTP. Put API Gateway in front of your data.',
  'apigw->rds': 'API Gateway can’t speak SQL. Use a Lambda integration that queries RDS.',
  'alb->rds': 'Load balancers distribute HTTP traffic to compute, not databases.',
  'alb->s3': 'ALBs target instances, IPs, Lambda or containers — not buckets. Use CloudFront for S3.',
  'ecr->ec2': 'EC2 can pull images, but in this lab connect ECR to ECS/EKS/Lambda which consume images natively.',
  'igw->rds': 'An Internet Gateway attaches to the VPC; it isn’t wired to individual resources. Place it inside the VPC instead.',
  'natgw->users': 'NAT gateways only allow *outbound* connections. Inbound internet traffic needs an ALB in a public subnet.'
};

export function linkLabel(from: string, to: string): string | undefined {
  return SERVICE[from]?.links?.[to];
}
