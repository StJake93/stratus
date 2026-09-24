import type { Lesson } from '../types';
import { text, tip, warn, info, mistake, example, code, widget, tabs, accordion, carousel, quiz, q, docs, cards, table, diagram, challenge, AWS } from './h';

export const AWS_DATA: Lesson[] = [
  // ------------------------------------------------------------------
  {
    id: 'aws-databases',
    track: 'aws-data',
    title: 'Databases: RDS, Aurora & DynamoDB',
    summary: 'Relational vs key-value, high availability, read replicas, and data modelling for DynamoDB.',
    icon: 'database',
    minutes: 16,
    level: 'Intermediate',
    steps: [
      {
        title: 'Pick the right database',
        blocks: [
          text('AWS offers purpose-built databases. The first decision is usually **relational vs non-relational**.'),
          table(
            ['', 'RDS / Aurora (relational)', 'DynamoDB (key-value / document)'],
            ['Data model', 'Tables, joins, SQL, strong schema', 'Items addressed by key, flexible attributes'],
            ['Scaling', 'Vertical + read replicas', 'Horizontal, virtually unlimited'],
            ['Queries', 'Ad-hoc SQL, complex joins', 'Known access patterns by key / index'],
            ['Networking', 'Lives in your VPC subnets', 'Regional endpoint (use a gateway endpoint)'],
            ['Ops', 'Instance sizes, maintenance windows', 'Serverless — no instances'],
            ['Great for', 'Transactions, reporting, existing apps', 'High-scale apps, serverless, sessions, IoT']
          ),
          cards(
            { title: 'ElastiCache / MemoryDB', icon: 'gauge', color: '#5b8def', md: 'In-memory Valkey/Redis for caching and sub-ms reads.' },
            { title: 'Aurora DSQL', icon: 'earth', color: '#a371f7', md: 'Serverless, distributed SQL with multi-region active-active.' },
            { title: 'OpenSearch', icon: 'search', color: '#22b8cf', md: 'Full-text search, log analytics and vector search.' },
            { title: 'Redshift', icon: 'layers', color: '#e0488f', md: 'Petabyte-scale data warehouse for analytics.' }
          )
        ]
      },
      {
        title: 'RDS & Aurora in depth',
        blocks: [
          diagram(
            [
              { id: 'a', label: 'AZ a', x: 4, y: 8, group: true, w: 44, h: 84, color: '#5b8def' },
              { id: 'b', label: 'AZ b', x: 52, y: 8, group: true, w: 44, h: 84, color: '#5b8def' },
              { id: 'app', label: 'App', x: 26, y: 26, icon: 'ecs' },
              { id: 'p', label: 'Primary', x: 26, y: 72, icon: 'rds', note: 'The **primary** takes all writes. Automated backups + point-in-time recovery up to 35 days.' },
              { id: 's', label: 'Standby', x: 74, y: 72, icon: 'rds', color: '#94a3b8', note: '**Multi-AZ standby**: synchronous replica in another AZ. Not readable (in the classic setup) — it exists purely for automatic failover, typically 60–120 s.' },
              { id: 'r', label: 'Read replica', x: 74, y: 26, icon: 'rds', note: '**Read replicas** use asynchronous replication to scale reads (reporting, analytics). Can be cross-region for DR.' }
            ],
            [
              { from: 'app', to: 'p', label: 'writes', flow: true },
              { from: 'p', to: 's', label: 'sync', flow: true },
              { from: 'p', to: 'r', label: 'async', dashed: true },
              { from: 'app', to: 'r', label: 'reads', dashed: true }
            ],
            300
          ),
          accordion(
            ['Multi-AZ vs read replicas', [text('**Multi-AZ = availability** (failover). **Read replicas = scalability** (more read throughput). Production databases usually need Multi-AZ; add replicas when reads are the bottleneck.')]],
            ['Why Aurora?', [text('Aurora separates compute from a distributed storage layer that keeps **six copies across three AZs**. Faster failover, up to 15 low-lag replicas, storage that auto-grows, and **Aurora Serverless v2** that scales capacity in fine-grained steps.')]],
            ['Credentials', [text('Let RDS manage the master password in **Secrets Manager** (`manage_master_user_password = true`) with automatic rotation. Apps read it at runtime — no passwords in Terraform state or code.')]],
            ['RDS Proxy', [text('Pools and shares connections — essential when hundreds of Lambda invocations would otherwise open hundreds of database connections.')]]
          ),
          code('hcl', `resource "aws_db_subnet_group" "main" {
  name       = "main"
  subnet_ids = [aws_subnet.data_a.id, aws_subnet.data_b.id] # at least 2 AZs
}

resource "aws_db_instance" "orders" {
  identifier                  = "orders"
  engine                      = "postgres"
  engine_version              = "17"
  instance_class              = "db.t4g.medium"
  allocated_storage           = 50
  storage_encrypted           = true
  multi_az                    = true
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  username                    = "app"
  manage_master_user_password = true
  backup_retention_period     = 14
  deletion_protection         = true
}`, 'rds.tf')
        ]
      },
      {
        title: 'DynamoDB & access-pattern design',
        blocks: [
          text('DynamoDB tables have a **primary key**: a *partition key* (hashed to spread data across partitions) and optionally a *sort key* (orders items within a partition). You design keys around **how you will read the data**, not around entities.'),
          tabs(
            ['Keys', [table(['pk', 'sk', 'attributes'], ['`CUSTOMER#42`', '`PROFILE`', 'name, email'], ['`CUSTOMER#42`', '`ORDER#2025-09-01#981`', 'total, status'], ['`CUSTOMER#42`', '`ORDER#2025-09-14#1002`', 'total, status']), text('One `Query` on `pk = CUSTOMER#42 AND begins_with(sk, "ORDER#")` returns a customer’s orders, sorted by date. That’s **single-table design**.')]],
            ['Indexes', [text('- **GSI** (global secondary index): a different partition/sort key over the same data, e.g. look up orders by `status`.', '- **LSI**: same partition key, alternative sort key — must be defined at table creation.')]],
            ['Capacity', [text('- **On-demand**: pay per request, instant scaling. Great default.', '- **Provisioned** (+ auto scaling): cheaper for steady, predictable traffic.')]],
            ['Extras', [text('- **Streams**: change feed → Lambda (event-driven)', '- **TTL**: auto-expire items (sessions, carts)', '- **Global tables**: multi-region, active-active replication', '- **PITR**: point-in-time restore for the last 35 days')]]
          ),
          warn('`Scan` reads the entire table and is slow and expensive at scale. If you find yourself scanning, you probably need a better key design or a GSI.'),
          mistake('Using a low-cardinality partition key like `status = "PENDING"`. Everything lands on one partition — a **hot partition** — and throughput suffers.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-databases', [
            q('Your RDS primary’s AZ fails. What gives automatic failover?', ['A read replica', 'Multi-AZ standby', 'Automated backups', 'RDS Proxy'], 1, 'Multi-AZ is for availability; replicas are for read scaling.'),
            q('Thousands of Lambda invocations exhaust database connections. Fix?', ['Bigger Lambda memory', 'RDS Proxy', 'Read replicas', 'Turn off Multi-AZ'], 1, 'RDS Proxy pools and reuses connections.'),
            q('Best DynamoDB partition key for an orders table with millions of customers?', ['order status', 'customer ID', 'country', 'a boolean “isPaid”'], 1, 'High-cardinality keys spread load evenly.'),
            q('Which DynamoDB operation should you avoid on large tables in hot paths?', ['GetItem', 'Query', 'Scan', 'PutItem'], 2, 'Scan reads everything.')
          ]),
          challenge('three-tier', 'Put a Multi-AZ RDS database behind an auto-scaled application tier.'),
          docs(['Amazon RDS user guide', AWS + '/AmazonRDS/latest/UserGuide/Welcome.html'], ['Multi-AZ deployments', AWS + '/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html'], ['Amazon Aurora', AWS + '/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html'], ['DynamoDB core components', AWS + '/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html'], ['DynamoDB best practices', AWS + '/amazondynamodb/latest/developerguide/best-practices.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-messaging',
    track: 'aws-data',
    title: 'Messaging & events: SQS, SNS, EventBridge',
    summary: 'Decouple services with queues, topics and event buses — and orchestrate with Step Functions.',
    icon: 'inbox',
    minutes: 16,
    level: 'Intermediate',
    steps: [
      {
        title: 'Why decouple?',
        blocks: [
          text('When service A calls service B directly, B’s slowness or failure becomes A’s problem. Putting a **queue or event bus** between them means producers and consumers can scale, fail and deploy independently.'),
          widget('queue-sim'),
          info('Asynchronous messaging trades immediate responses for resilience. Use it for work that doesn’t need an answer in the same HTTP request: emails, image processing, order fulfilment, analytics.')
        ]
      },
      {
        title: 'Three tools, three shapes',
        blocks: [
          tabs(
            ['SQS — queues', [text('**Point-to-point.** Producers send messages; consumers poll and delete them after processing. Each message is processed by one consumer.'), table(['', 'Standard', 'FIFO'], ['Ordering', 'Best-effort', 'Strict (per message group)'], ['Delivery', 'At-least-once', 'Exactly-once processing'], ['Throughput', 'Nearly unlimited', 'High, but capped per group/queue']), tip('Set the **visibility timeout** above your processing time (≥ 6× the Lambda timeout for Lambda consumers), otherwise messages reappear and get processed twice.')]],
            ['SNS — topics', [text('**Pub/sub fan-out.** Publish once; SNS pushes a copy to every subscriber: SQS queues, Lambda functions, HTTP endpoints, email, SMS. Subscription **filter policies** let each subscriber receive only the messages it cares about.')]],
            ['EventBridge — event bus', [text('**Content-based routing.** Services put structured events on a bus; **rules** match on event content and route to targets. Also receives events from AWS services and SaaS partners, and runs **schedules** (EventBridge Scheduler).'), code('json', `{
  "source": ["com.acme.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": { "total": [{ "numeric": [">", 500] }] }
}`, 'rule-pattern.json', 'Route only high-value orders to the fraud-check service.')]]
          ),
          diagram(
            [
              { id: 'api', label: 'Orders API', x: 8, y: 50, icon: 'lambda' },
              { id: 'sns', label: 'SNS topic', x: 34, y: 50, icon: 'sns', note: 'One publish → many independent deliveries. Each subscriber gets its own copy.' },
              { id: 'q1', label: 'billing queue', x: 62, y: 18, icon: 'sqs', note: 'Each queue buffers work for one consumer, with its own retry policy and DLQ.' },
              { id: 'q2', label: 'shipping queue', x: 62, y: 50, icon: 'sqs' },
              { id: 'q3', label: 'analytics queue', x: 62, y: 82, icon: 'sqs' },
              { id: 'f1', label: 'billing fn', x: 90, y: 18, icon: 'lambda' },
              { id: 'f2', label: 'shipping fn', x: 90, y: 50, icon: 'lambda' },
              { id: 'f3', label: 'analytics fn', x: 90, y: 82, icon: 'lambda' }
            ],
            [
              { from: 'api', to: 'sns', flow: true },
              { from: 'sns', to: 'q1', flow: true },
              { from: 'sns', to: 'q2', flow: true },
              { from: 'sns', to: 'q3', flow: true },
              { from: 'q1', to: 'f1' },
              { from: 'q2', to: 'f2' },
              { from: 'q3', to: 'f3' }
            ],
            300,
            'The SNS → SQS fan-out pattern: adding a new consumer never touches the publisher.'
          )
        ]
      },
      {
        title: 'Failure handling & orchestration',
        blocks: [
          accordion(
            ['Dead-letter queues', [text('After `maxReceiveCount` failed attempts, SQS moves the message to a **DLQ**. Alarm on DLQ depth, inspect the message, fix the bug, then **redrive** messages back to the source queue.'), code('hcl', `resource "aws_sqs_queue" "orders_dlq" {
  name                      = "orders-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "orders" {
  name                       = "orders"
  visibility_timeout_seconds = 60
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 5
  })
}`, 'queues.tf')]],
            ['Idempotency', [text('At-least-once delivery means **duplicates happen**. Make consumers idempotent — e.g. record processed message IDs in DynamoDB with a conditional write, so a replay does nothing.')]],
            ['Step Functions', [text('When a process has many steps, branches, retries and waits (“charge card → reserve stock → ship → email”), model it as a **Step Functions** state machine instead of chaining queues. You get visual execution history, built-in retries/catch, and 200+ direct service integrations.')]]
          ),
          example('Ticketing platform on sale day: API Gateway writes purchase requests straight into SQS (no Lambda in the hot path). A fleet of consumers drains the queue at a rate the payments provider can handle. Users see “you’re in the queue” instead of errors.'),
          quiz('aws-messaging', [
            q('One event must reach billing, shipping and analytics independently. Best pattern?', ['One SQS queue shared by all three', 'SNS topic fanning out to three SQS queues', 'Three direct HTTP calls', 'DynamoDB scan'], 1, 'Each consumer gets its own buffered copy.'),
            q('Messages are processed twice. Likely cause?', ['Visibility timeout shorter than processing time', 'FIFO queue', 'DLQ enabled', 'Long polling'], 0, 'The message became visible again before the first consumer deleted it.'),
            q('You need to route events by their content (e.g. total > 500). Which service?', ['SQS', 'SNS without filters', 'EventBridge rules', 'Kinesis'], 2, 'EventBridge rules match on event fields. (SNS filter policies can also do simpler attribute filtering.)'),
            q('What should you build so that duplicate deliveries are harmless?', ['Bigger queues', 'Idempotent consumers', 'FIFO everywhere', 'Longer retention'], 1, 'Idempotency makes at-least-once delivery safe.')
          ]),
          challenge('event-pipeline', 'Build a burst-proof image pipeline: S3 → SQS → Lambda → DynamoDB with a DLQ and SNS notifications.'),
          challenge('fanout', 'Fan out order events to independent billing and shipping consumers.'),
          docs(['Amazon SQS', AWS + '/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html'], ['SQS dead-letter queues', AWS + '/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html'], ['Amazon SNS', AWS + '/sns/latest/dg/welcome.html'], ['Amazon EventBridge', AWS + '/eventbridge/latest/userguide/eb-what-is.html'], ['AWS Step Functions', AWS + '/step-functions/latest/dg/welcome.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-edge',
    track: 'aws-data',
    title: 'The edge: CloudFront, Route 53 & WAF',
    summary: 'DNS, content delivery, TLS certificates and protecting apps at the edge.',
    icon: 'zap',
    minutes: 12,
    level: 'Intermediate',
    steps: [
      {
        title: 'Route 53: DNS and traffic routing',
        blocks: [
          text('**Route 53** hosts your DNS zones and answers queries from 100% SLA-backed, globally distributed name servers. Beyond simple records it can route traffic intelligently.'),
          table(
            ['Routing policy', 'What it does'],
            ['Simple', 'One record, one answer'],
            ['Weighted', 'Split traffic by percentage — canary releases'],
            ['Latency', 'Send users to the region with the lowest latency'],
            ['Failover', 'Primary/secondary with health checks — disaster recovery'],
            ['Geolocation / Geoproximity', 'Route by user location — compliance, localisation']
          ),
          tip('**Alias records** point your domain (even the zone apex, `acme.com`) at CloudFront, ALBs, API Gateway or S3 — free queries, and they follow the target’s IPs automatically.')
        ]
      },
      {
        title: 'CloudFront: the CDN',
        blocks: [
          carousel(
            ['Edge caching', [text('Users hit the nearest of 600+ edge locations. Cache hits are served locally in milliseconds; misses go to your **origin** (S3, ALB, API Gateway, any HTTP server) over the AWS backbone.')]],
            ['Cache behaviours', [text('Different path patterns get different rules: `/static/*` cached for a year, `/api/*` not cached and forwarded with headers and cookies. **Cache policies** control the cache key; **origin request policies** control what’s forwarded.')]],
            ['Security', [text('Free HTTPS with **ACM certificates** (must be in `us-east-1` for CloudFront), **Origin Access Control** for private S3, AWS WAF integration, and built-in Shield Standard DDoS protection.')]],
            ['Compute at the edge', [text('**CloudFront Functions** (lightweight JS: redirects, header rewrites) and **Lambda@Edge** (heavier logic, auth, A/B testing) run code close to users.')]]
          ),
          diagram(
            [
              { id: 'u', label: 'Users', x: 6, y: 50, icon: 'users' },
              { id: 'r53', label: 'Route 53', x: 24, y: 20, icon: 'route53' },
              { id: 'waf', label: 'WAF', x: 24, y: 82, icon: 'waf', note: '**AWS WAF** rules block SQL injection, XSS, bad bots and abusive IPs before they reach your app. Start with AWS Managed Rules.' },
              { id: 'cf', label: 'CloudFront', x: 46, y: 50, icon: 'cloudfront' },
              { id: 's3', label: 'S3 (static)', x: 78, y: 20, icon: 's3' },
              { id: 'alb', label: 'ALB (/api)', x: 78, y: 80, icon: 'alb' }
            ],
            [
              { from: 'u', to: 'r53', dashed: true, label: 'DNS' },
              { from: 'u', to: 'cf', flow: true, label: 'HTTPS' },
              { from: 'waf', to: 'cf', dashed: true, label: 'protects' },
              { from: 'cf', to: 's3', label: '/*', flow: true },
              { from: 'cf', to: 'alb', label: '/api/*', flow: true }
            ],
            300,
            'One domain, two origins: static assets from S3 and API calls to the ALB — all through a single CloudFront distribution.'
          ),
          warn('The ACM certificate for a CloudFront distribution **must be created in `us-east-1`**, whatever region your app runs in. In Terraform, use a second aliased provider for that region.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-edge', [
            q('You want to send 10% of traffic to a new version. Which Route 53 policy?', ['Failover', 'Weighted', 'Geolocation', 'Simple'], 1, 'Weighted records split traffic by ratio.'),
            q('Where must the ACM certificate for CloudFront live?', ['Any region', 'The origin’s region', 'us-east-1', 'eu-west-1'], 2, 'CloudFront only reads certificates from us-east-1.'),
            q('Which blocks SQL-injection attempts before they reach your ALB?', ['Security groups', 'AWS WAF', 'NACLs', 'Route 53'], 1, 'WAF inspects HTTP requests at layer 7.'),
            q('Why use an alias record instead of a CNAME for CloudFront?', ['Aliases work at the zone apex and are free to query', 'CNAMEs are deprecated', 'Aliases are faster to create', 'CloudFront rejects CNAMEs'], 0, 'CNAMEs can’t be used at the apex; alias queries to AWS resources are free.')
          ]),
          challenge('static-site', 'Build the classic CloudFront + private S3 + Route 53 website.'),
          docs(['Route 53 routing policies', AWS + '/Route53/latest/DeveloperGuide/routing-policy.html'], ['What is CloudFront?', AWS + '/AmazonCloudFront/latest/DeveloperGuide/Introduction.html'], ['Origin Access Control', AWS + '/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html'], ['AWS WAF', AWS + '/waf/latest/developerguide/waf-chapter.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-observability',
    track: 'aws-data',
    title: 'Observability & operations',
    summary: 'CloudWatch metrics, logs and alarms, CloudTrail audit trails, tracing and tagging.',
    icon: 'activity',
    minutes: 12,
    level: 'Intermediate',
    steps: [
      {
        title: 'The three pillars on AWS',
        blocks: [
          cards(
            { title: 'Metrics', icon: 'gauge', color: '#d6a50b', md: '**CloudWatch Metrics**: numeric time series (CPU, latency, errors, queue depth). Most services publish them automatically; add custom metrics via the Embedded Metric Format.' },
            { title: 'Logs', icon: 'file-text', color: '#22b8cf', md: '**CloudWatch Logs**: log groups & streams, retention policies, and **Logs Insights** for SQL-like queries across logs.' },
            { title: 'Traces', icon: 'route', color: '#a371f7', md: '**X-Ray / Application Signals** (built on OpenTelemetry): follow a single request across API Gateway, Lambda, databases and queues.' }
          ),
          code('text', `fields @timestamp, @message
| filter @message like /ERROR/
| stats count(*) as errors by bin(5m)
| sort errors desc`, 'Logs Insights query', 'Count errors in 5-minute buckets across every log stream in a group.'),
          tip('Set **log retention** on every log group (Terraform: `retention_in_days`). The default is “never expire”, and logs quietly become one of the bigger line items on the bill.')
        ]
      },
      {
        title: 'Alarms that wake the right people',
        blocks: [
          text('An **alarm** watches a metric and changes state (OK → ALARM) when a threshold is breached for N periods. Actions: notify an SNS topic (→ email, Slack, PagerDuty), trigger Auto Scaling, or recover an instance.'),
          code('hcl', `resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "orders-api-5xx"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  dimensions          = { ApiId = aws_apigatewayv2_api.orders.id }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 5
  datapoints_to_alarm = 3
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.oncall.arn]
}`, 'alarms.tf'),
          accordion(
            ['What should I alarm on?', [text('Alarm on **symptoms users feel** — error rate, latency (p99), queue age, DLQ depth — rather than every CPU spike. Too many noisy alarms and people stop reading them.')]],
            ['Composite alarms', [text('Combine alarms with AND/OR logic to reduce noise, e.g. page only if errors are high **and** latency is high.')]],
            ['Anomaly detection', [text('Let CloudWatch learn a metric’s normal daily/weekly pattern and alarm on deviations instead of fixed thresholds.')]]
          )
        ]
      },
      {
        title: 'Audit, governance & cost',
        blocks: [
          tabs(
            ['CloudTrail', [text('Records **every API call** in your account: who, what, when, from where. Essential for security investigations (“who deleted this bucket?”). Send an organization trail to a locked-down S3 bucket in a separate log-archive account.')]],
            ['AWS Config', [text('Tracks resource configuration over time and evaluates **rules** (e.g. “S3 buckets must block public access”), flagging non-compliant resources.')]],
            ['Tagging', [text('Tag everything with owner, environment, cost centre and application. Tags drive **cost allocation**, access control (ABAC) and automation. Terraform’s provider-level `default_tags` makes this painless.')]],
            ['Cost tools', [text('**Cost Explorer**, **Budgets** (alerts before you overspend), **Cost Anomaly Detection** and **Compute Optimizer** right-sizing recommendations.')]]
          ),
          mistake('No budget alerts on a new account. A forgotten NAT Gateway or a runaway loop can burn money for weeks unnoticed. Create an **AWS Budget** with email alerts on day one.'),
          quiz('aws-observability', [
            q('Who deleted the production bucket at 3am? Which service answers this?', ['CloudWatch Metrics', 'CloudTrail', 'X-Ray', 'Cost Explorer'], 1, 'CloudTrail logs every API call with the caller identity.'),
            q('Which is the best alarm for a queue-based worker?', ['CPU > 50%', 'Age of oldest message / DLQ depth', 'Number of log lines', 'Memory of the queue'], 1, 'Queue age and DLQ depth reflect real user impact.'),
            q('Default CloudWatch Logs retention is…', ['7 days', '30 days', 'Never expire', '1 year'], 2, 'Always set retention explicitly.')
          ]),
          docs(['What is CloudWatch?', AWS + '/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html'], ['CloudWatch Logs Insights', AWS + '/AmazonCloudWatch/latest/logs/AnalyzingLogData.html'], ['AWS CloudTrail', AWS + '/awscloudtrail/latest/userguide/cloudtrail-user-guide.html'], ['Tagging best practices', AWS + '/whitepapers/latest/tagging-best-practices/tagging-best-practices.html'], ['AWS Budgets', AWS + '/cost-management/latest/userguide/budgets-managing-costs.html'])
        ]
      }
    ]
  }
];
