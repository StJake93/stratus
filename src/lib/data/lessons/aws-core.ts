import type { Lesson } from '../types';
import { text, tip, warn, info, mistake, example, code, widget, tabs, accordion, carousel, quiz, q, docs, terms, cards, table, term, diagram, challenge, AWS, TF } from './h';

export const AWS_CORE: Lesson[] = [
  // ------------------------------------------------------------------
  {
    id: 'aws-iam',
    track: 'aws-core',
    title: 'IAM: identity & permissions',
    summary: 'Users, roles, policies and how AWS decides “allow” or “deny” for every API call.',
    icon: 'key',
    minutes: 15,
    level: 'Beginner',
    steps: [
      {
        title: 'Every API call is authorised',
        blocks: [
          text(
            '**AWS Identity and Access Management (IAM)** answers one question for every single request to AWS: *is this principal allowed to perform this action on this resource, under these conditions?*',
            '',
            'Whether you click in the console, run the CLI, or Terraform applies a plan — it all becomes signed API calls evaluated by IAM.'
          ),
          cards(
            { title: 'Root user', icon: 'crown', color: '#f25f5c', md: 'The email you signed up with. Unlimited power. **Lock it away** with MFA and never use it day-to-day.' },
            { title: 'IAM users', icon: 'user', color: '#94a3b8', md: 'Long-lived identities with passwords/access keys. Increasingly discouraged — prefer federated SSO.' },
            { title: 'IAM roles', icon: 'key', color: '#ff9900', md: 'Identities *assumed* for temporary credentials by people (SSO), services (Lambda, EC2) or CI pipelines (OIDC).' },
            { title: 'Policies', icon: 'file-text', color: '#22d3ee', md: 'JSON documents listing `Effect`, `Action`, `Resource` and optional `Condition`s.' }
          ),
          tip('Modern best practice: humans sign in through **IAM Identity Center** (SSO) and get short-lived role credentials; workloads use **roles**; long-lived access keys are a last resort.')
        ]
      },
      {
        title: 'Anatomy of a policy',
        blocks: [
          code('json', `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOrdersTable",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:ap-southeast-2:123456789012:table/orders",
      "Condition": {
        "StringEquals": { "aws:PrincipalTag/team": "orders" }
      }
    }
  ]
}`, 'orders-read-policy.json'),
          accordion(
            ['Effect', [text('`Allow` or `Deny`. Everything starts implicitly denied; an explicit `Deny` beats any `Allow`.')]],
            ['Action', [text('Service-prefixed API operations such as `s3:GetObject` or `ec2:RunInstances`. Wildcards work (`s3:Get*`) but be careful.')]],
            ['Resource', [text('One or more **ARNs** (Amazon Resource Names): `arn:partition:service:region:account-id:resource`. Some actions only support `*`.')]],
            ['Condition', [text('Extra requirements: source IP, MFA present, tags, VPC endpoint, time of day, and more.')]],
            ['Principal', [text('Only in **resource-based policies** (e.g. S3 bucket policies, KMS key policies) — says *who* the statement applies to.')]]
          ),
          terms(['ARN', 'A globally unique resource identifier, e.g. `arn:aws:s3:::acme-logs`.'], ['Identity-based policy', 'Attached to a user, group or role.'], ['Resource-based policy', 'Attached to the resource itself (bucket, queue, key).'], ['Trust policy', 'The resource policy on a role that says who may *assume* it.'])
        ]
      },
      {
        title: 'How AWS evaluates a request',
        blocks: [
          text('Toggle statements and change the request to see how IAM reaches a decision. Remember the golden rule: **explicit deny → allow → implicit deny**.'),
          widget('iam-eval'),
          info('In multi-account setups, **Service Control Policies (SCPs)** from AWS Organizations and **permission boundaries** can further *limit* what a policy allows — they never grant anything themselves.')
        ]
      },
      {
        title: 'Roles for workloads',
        blocks: [
          text('A Lambda function needs to write to DynamoDB. You **never** put access keys in its code. Instead:'),
          carousel(
            ['1 · Trust policy', [text('The role says *who can assume it* — here, the Lambda service.'), code('hcl', `resource "aws_iam_role" "orders_fn" {
  name = "orders-fn"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}`, 'iam.tf')]],
            ['2 · Permissions policy', [text('Grant only what the function needs (least privilege).'), code('hcl', `resource "aws_iam_role_policy" "orders_fn" {
  role = aws_iam_role.orders_fn.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem", "dynamodb:GetItem"]
      Resource = aws_dynamodb_table.orders.arn
    }]
  })
}`, 'iam.tf')]],
            ['3 · Attach to the function', [text('Lambda assumes the role on every cold start and the SDK picks up temporary credentials automatically — rotated for you, never stored.'), code('hcl', `resource "aws_lambda_function" "orders" {
  function_name = "orders"
  role          = aws_iam_role.orders_fn.arn
  # ...
}`, 'lambda.tf')]]
          ),
          mistake('Granting `"Action": "*", "Resource": "*"` “just to get it working”. It usually stays that way. Start narrow and use **IAM Access Analyzer** to generate least-privilege policies from real activity.'),
          example('GitHub Actions deploying Terraform: configure an **OIDC identity provider** in IAM and a role that trusts your repo. The workflow exchanges its OIDC token for short-lived credentials — no secrets stored in GitHub.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-iam', [
            q('A user has one policy allowing `s3:*` and another denying `s3:DeleteObject`. Can they delete objects?', ['Yes — Allow is broader', 'No — explicit Deny always wins', 'Only in their own bucket', 'Only with MFA'], 1, 'Explicit Deny beats any number of Allows.'),
            q('What should an EC2 instance or Lambda use to call AWS APIs?', ['Access keys in environment variables', 'The root user', 'An IAM role', 'A hard-coded password'], 2, 'Roles provide automatically rotated temporary credentials.'),
            q('No policy mentions `sqs:SendMessage`. What happens when the user tries it?', ['Allowed', 'Implicitly denied', 'Allowed in the default VPC', 'Error: policy invalid'], 1, 'IAM is deny-by-default.'),
            q('What does a role’s trust policy define?', ['What the role can do', 'Who can assume the role', 'Which region it works in', 'Its password'], 1, 'Trust policy = who may assume; permissions policies = what it can do.')
          ]),
          challenge('secure-api', 'Put identity to work: build an API where Cognito authenticates users and a Lambda reads secrets — no credentials in code.'),
          docs(['What is IAM?', AWS + '/IAM/latest/UserGuide/introduction.html'], ['Policy evaluation logic', AWS + '/IAM/latest/UserGuide/reference_policies_evaluation-logic.html'], ['Security best practices in IAM', AWS + '/IAM/latest/UserGuide/best-practices.html'], ['Terraform: aws_iam_role', 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-vpc',
    track: 'aws-core',
    title: 'VPC networking',
    summary: 'CIDR blocks, subnets, route tables, internet & NAT gateways — the network under everything.',
    icon: 'network',
    minutes: 18,
    level: 'Beginner',
    steps: [
      {
        title: 'Your private slice of AWS',
        blocks: [
          text(
            'An **Amazon VPC** (Virtual Private Cloud) is a logically isolated virtual network in one region. EC2 instances, RDS databases, load balancers, EKS nodes — anything that needs an IP address — lives inside a VPC.',
            '',
            'Regional managed services like S3, DynamoDB, SQS and (by default) Lambda live *outside* your VPC and are reached via public AWS endpoints — or privately through **VPC endpoints**.'
          ),
          diagram(
            [
              { id: 'vpc', label: 'VPC 10.0.0.0/16', x: 12, y: 4, group: true, w: 76, h: 92, color: '#a371f7' },
              { id: 'pub', label: 'Public subnet (AZ a)', x: 16, y: 14, group: true, w: 32, h: 34, color: '#34d399' },
              { id: 'priv', label: 'Private subnet (AZ a)', x: 16, y: 58, group: true, w: 32, h: 34, color: '#60a5fa' },
              { id: 'pub2', label: 'Public subnet (AZ b)', x: 52, y: 14, group: true, w: 32, h: 34, color: '#34d399' },
              { id: 'priv2', label: 'Private subnet (AZ b)', x: 52, y: 58, group: true, w: 32, h: 34, color: '#60a5fa' },
              { id: 'net', label: 'Internet', x: 4, y: 28, icon: 'globe', color: '#94a3b8' },
              { id: 'igw', label: 'Internet GW', x: 12, y: 50, icon: 'igw', note: 'The **Internet Gateway** is attached to the VPC. Subnets whose route table sends `0.0.0.0/0` to it become **public**.' },
              { id: 'alb', label: 'ALB', x: 32, y: 32, icon: 'alb', note: 'Internet-facing load balancers sit in public subnets.' },
              { id: 'nat', label: 'NAT GW', x: 68, y: 32, icon: 'natgw', note: 'A **NAT Gateway** in a public subnet lets private resources initiate outbound connections (patches, APIs) without being reachable from the internet.' },
              { id: 'app', label: 'App servers', x: 32, y: 76, icon: 'ec2', note: 'Application servers live in **private** subnets — no public IPs, no inbound internet access.' },
              { id: 'db', label: 'Database', x: 68, y: 76, icon: 'rds', note: 'Databases go in private subnets too, reachable only from the app tier.' },
              { id: 's3', label: 'S3', x: 96, y: 50, icon: 's3', note: 'S3 is outside the VPC. Private subnets reach it via a NAT Gateway or, better, a free **gateway VPC endpoint**.' }
            ],
            [
              { from: 'net', to: 'igw', flow: true },
              { from: 'igw', to: 'alb', flow: true },
              { from: 'alb', to: 'app', label: 'HTTP', flow: true },
              { from: 'app', to: 'db', label: 'SQL' },
              { from: 'app', to: 'nat', label: 'outbound', dashed: true },
              { from: 'nat', to: 's3', dashed: true }
            ],
            400,
            'Click components to learn their role. This two-AZ, public/private layout is the standard starting point.'
          )
        ]
      },
      {
        title: 'CIDR blocks & subnets',
        blocks: [
          text(
            'A VPC gets an IPv4 range written in **CIDR** notation — e.g. `10.0.0.0/16`. The number after the slash is how many bits are fixed as the *network*; the rest are for hosts. Smaller number = bigger network.',
            '',
            'You carve the VPC range into **subnets**, each pinned to one Availability Zone.'
          ),
          widget('cidr'),
          table(
            ['CIDR', 'Addresses', 'Usable in AWS subnet', 'Typical use'],
            ['/16', '65,536', '—', 'Whole VPC'],
            ['/20', '4,096', '4,091', 'Large private subnet (EKS pods!)'],
            ['/24', '256', '251', 'Typical subnet'],
            ['/28', '16', '11', 'Smallest allowed']
          ),
          warn('Plan ranges up front. VPCs you might **peer** or connect via Transit Gateway must not overlap — `10.0.0.0/16` everywhere becomes a real problem later.')
        ]
      },
      {
        title: 'Routing: what makes a subnet public',
        blocks: [
          text('There is no “public” checkbox on a subnet. A subnet is public because its **route table** has a route to an Internet Gateway.'),
          tabs(
            ['Public route table', [table(['Destination', 'Target'], ['10.0.0.0/16', 'local'], ['0.0.0.0/0', '**igw-0abc…** (Internet Gateway)']), text('Instances also need a **public IP** to be reachable.')]],
            ['Private route table', [table(['Destination', 'Target'], ['10.0.0.0/16', 'local'], ['0.0.0.0/0', '**nat-0def…** (NAT Gateway)']), text('Outbound only. Nothing on the internet can start a connection in.')]],
            ['Isolated route table', [table(['Destination', 'Target'], ['10.0.0.0/16', 'local']), text('No internet at all — common for databases. Reach AWS services through VPC endpoints.')]]
          ),
          code('hcl', `resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}`, 'network.tf'),
          tip('NAT Gateways cost money per hour *and* per GB. For S3 and DynamoDB traffic, add free **gateway endpoints**; for other services, interface endpoints are often cheaper than pushing lots of data through NAT.'),
          example('For high availability, run **one NAT Gateway per AZ** and point each private subnet at the NAT in its own AZ — otherwise an AZ outage cuts egress for everyone.')
        ]
      },
      {
        title: 'Build it',
        blocks: [
          quiz('aws-vpc', [
            q('What makes a subnet “public”?', ['It has “public” in its name', 'Its route table has a route to an Internet Gateway', 'It uses a /24 CIDR', 'It contains a load balancer'], 1, 'Public = route to an IGW (plus public IPs on instances).'),
            q('Where must a NAT Gateway be placed?', ['In a private subnet', 'In a public subnet', 'Outside the VPC', 'In every subnet'], 1, 'The NAT needs its own route to the IGW so it can forward traffic out.'),
            q('How many usable IPs does a /24 subnet have in AWS?', ['256', '254', '251', '250'], 2, '256 minus the 5 addresses AWS reserves.'),
            q('Subnets in AWS span…', ['The whole region', 'Exactly one Availability Zone', 'Multiple regions', 'One edge location'], 1, 'Each AWS subnet lives in a single AZ — so use at least two for HA.')
          ]),
          challenge('vpc-foundations', 'Design a production-ready VPC: two AZs, public and private subnets, an Internet Gateway and a NAT Gateway.'),
          docs(['What is Amazon VPC?', AWS + '/vpc/latest/userguide/what-is-amazon-vpc.html'], ['Subnet CIDR blocks', AWS + '/vpc/latest/userguide/subnet-sizing.html'], ['Route tables', AWS + '/vpc/latest/userguide/VPC_Route_Tables.html'], ['NAT gateways', AWS + '/vpc/latest/userguide/vpc-nat-gateway.html'], ['Terraform AWS VPC module', 'https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-vpc-security',
    track: 'aws-core',
    title: 'Network security: SGs & NACLs',
    summary: 'Stateful security groups vs stateless network ACLs — trace packets and find out why connections hang.',
    icon: 'shield',
    minutes: 12,
    level: 'Intermediate',
    steps: [
      {
        title: 'Two layers of firewall',
        blocks: [
          text('VPCs give you two built-in traffic filters that work at different levels:'),
          table(
            ['', 'Security group', 'Network ACL'],
            ['Applies to', 'Network interfaces (instances, ENIs)', 'Whole subnets'],
            ['State', '**Stateful** — replies auto-allowed', '**Stateless** — replies need their own rule'],
            ['Rules', 'Allow only', 'Allow **and** deny'],
            ['Evaluation', 'All rules considered', 'Numbered, lowest first, first match wins'],
            ['Default', 'Deny all inbound, allow all outbound', 'Default NACL allows all']
          ),
          tip('Security groups can reference **other security groups** as a source (“allow 5432 from `app-sg`”). This is far more robust than IP ranges — instances come and go, the group membership follows.')
        ]
      },
      {
        title: 'Trace a packet',
        blocks: [
          text('Send packets from different sources and ports. Then try turning **off** the NACL outbound ephemeral-port rule and sending HTTPS again — this is the classic stateless gotcha.'),
          widget('sg-nacl'),
          mistake('Adding NACL inbound rules but forgetting outbound **ephemeral ports (1024–65535)**. The request gets in, the response can’t get out, and the connection just times out.')
        ]
      },
      {
        title: 'Security groups in Terraform',
        blocks: [
          code('hcl', `resource "aws_security_group" "app" {
  name   = "app"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
}

resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}`, 'security.tf', 'Newer AWS provider versions recommend separate rule resources over inline ingress/egress blocks.'),
          accordion(
            ['When should I use NACLs at all?', [text('Most teams rely on security groups and leave NACLs permissive. NACLs are useful as a coarse **guardrail**: blocking a known-bad IP range across a subnet, or enforcing that a data subnet can only talk to the app subnet.')]],
            ['What about AWS Network Firewall / WAF?', [text('**AWS WAF** filters HTTP traffic (SQL injection, bots) in front of CloudFront, ALB or API Gateway. **AWS Network Firewall** is a managed stateful firewall for deep packet inspection across VPCs.')]]
          ),
          quiz('aws-vpc-security', [
            q('A web server’s security group allows inbound 443. Do you need an outbound rule for the HTTPS responses?', ['Yes, allow outbound 443', 'Yes, allow ephemeral ports', 'No — security groups are stateful', 'Only for IPv6'], 2, 'Stateful: return traffic for allowed connections is automatically permitted.'),
            q('You need to block one malicious IP range for a whole subnet. Which tool?', ['Security group deny rule', 'Network ACL deny rule', 'IAM policy', 'Route table'], 1, 'Security groups can’t deny; NACLs can, at the subnet level.'),
            q('NACL rules 100 ALLOW 0.0.0.0/0 and 200 DENY 203.0.113.0/24 exist. Is 203.0.113.5 allowed?', ['Denied — deny always wins', 'Allowed — rule 100 matches first', 'Depends on the security group only', 'Neither — error'], 1, 'NACLs evaluate in number order and stop at the first match. Put denies at lower numbers!')
          ]),
          docs(['Security groups', AWS + '/vpc/latest/userguide/vpc-security-groups.html'], ['Network ACLs', AWS + '/vpc/latest/userguide/vpc-network-acls.html'], ['Compare SGs and NACLs', AWS + '/vpc/latest/userguide/infrastructure-security.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-ec2',
    track: 'aws-core',
    title: 'EC2, Auto Scaling & load balancers',
    summary: 'Virtual servers, instance families, AMIs, elastic scaling and the ALB — the classic web tier.',
    icon: 'server',
    minutes: 16,
    level: 'Beginner',
    steps: [
      {
        title: 'Virtual servers on demand',
        blocks: [
          text('**Amazon EC2** gives you virtual machines (“instances”) in seconds. You pick three main things:'),
          tabs(
            ['Instance type', [text('A family + generation + size, e.g. `m7g.large`:', '', '- **m** = general purpose, **c** = compute, **r** = memory, **t** = burstable, **g/p** = GPU', '- **7** = generation (newer is better value)', '- **g** = Graviton (AWS’s ARM chips — often ~20–40% better price/performance)', '- **large** = size; each step up roughly doubles CPU and RAM')]],
            ['AMI', [text('An **Amazon Machine Image** is the disk template: OS plus any pre-installed software. Use AWS-provided images (Amazon Linux 2023, Ubuntu) or bake your own “golden AMI” with a tool like EC2 Image Builder or Packer.')]],
            ['Storage & network', [text('- **EBS** volumes: network-attached block storage that persists independently of the instance', '- **Instance store**: fast local disk that is wiped on stop', '- Launched into a **subnet** with one or more **security groups**')]]
          ),
          table(['Pricing model', 'Best for', 'Discount vs on-demand'], ['On-Demand', 'Spiky, short-term, unknown', '—'], ['Savings Plans / Reserved', 'Steady baseline for 1–3 years', 'up to ~72%'], ['Spot', 'Fault-tolerant, interruptible batch/CI', 'up to ~90%']),
          tip('Use **user data** (a boot script) or a **launch template** to configure instances automatically — never hand-configure servers you can’t recreate.')
        ]
      },
      {
        title: 'Auto Scaling in action',
        blocks: [
          text('An **Auto Scaling group (ASG)** keeps a fleet of identical instances between a *min* and *max*, replaces unhealthy ones, and adds/removes capacity based on scaling policies. **Target tracking** is the simplest: “keep average CPU at 60%”.'),
          widget('autoscaling'),
          info('New instances take time to boot and pass health checks, so capacity lags demand. That’s why you keep headroom (a target below 100%) — and why scale-in is deliberately slower than scale-out.')
        ]
      },
      {
        title: 'Load balancing',
        blocks: [
          text('Clients shouldn’t know about individual instances. An **Elastic Load Balancer** gives one stable DNS name and spreads traffic across healthy targets in multiple AZs.'),
          cards(
            { title: 'Application LB (L7)', icon: 'split', color: '#22b8cf', md: 'HTTP/HTTPS/gRPC. Routes on host, path, headers. Targets: instances, IPs (containers), Lambda.' },
            { title: 'Network LB (L4)', icon: 'cable', color: '#a371f7', md: 'TCP/UDP/TLS at millions of requests per second, static IPs, ultra-low latency.' },
            { title: 'Gateway LB', icon: 'shield', color: '#f25f5c', md: 'Inserts third-party virtual appliances (firewalls) transparently into traffic flows.' }
          ),
          diagram(
            [
              { id: 'u', label: 'Users', x: 8, y: 50, icon: 'users' },
              { id: 'alb', label: 'ALB', x: 32, y: 50, icon: 'alb', note: 'Listens on 443 with an ACM certificate, terminates TLS, and forwards to a **target group**. Health checks remove failed targets automatically.' },
              { id: 'a', label: 'AZ a', x: 56, y: 12, group: true, w: 40, h: 36, color: '#ff9900' },
              { id: 'b', label: 'AZ b', x: 56, y: 54, group: true, w: 40, h: 36, color: '#ff9900' },
              { id: 'i1', label: 'i-01', x: 68, y: 32, icon: 'ec2' },
              { id: 'i2', label: 'i-02', x: 86, y: 32, icon: 'ec2' },
              { id: 'i3', label: 'i-03', x: 68, y: 74, icon: 'ec2' },
              { id: 'i4', label: 'i-04', x: 86, y: 74, icon: 'ec2', note: 'If AZ b fails, the ALB sends everything to AZ a while the ASG launches replacements.' }
            ],
            [
              { from: 'u', to: 'alb', flow: true },
              { from: 'alb', to: 'i1', flow: true },
              { from: 'alb', to: 'i3', flow: true },
              { from: 'alb', to: 'i2', dashed: true },
              { from: 'alb', to: 'i4', dashed: true }
            ],
            300
          ),
          code('hcl', `resource "aws_autoscaling_group" "web" {
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2
  vpc_zone_identifier = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  target_group_arns   = [aws_lb_target_group.web.arn]
  health_check_type   = "ELB"

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
}

resource "aws_autoscaling_policy" "cpu" {
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60
  }
}`, 'web.tf')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-ec2', [
            q('Which instance family is optimised for memory-heavy workloads like caches?', ['c7g', 'r7g', 't3', 'p5'], 1, '**r** = memory optimised.'),
            q('A CI pipeline runs builds that can safely be retried. Cheapest option?', ['On-Demand', 'Reserved Instances', 'Spot Instances', 'Dedicated Hosts'], 2, 'Spot offers deep discounts for interruptible work.'),
            q('Why put app instances in private subnets behind an ALB?', ['It’s required by EC2', 'Smaller attack surface — only the ALB is internet-facing', 'Private subnets are faster', 'To avoid needing security groups'], 1, 'Only the load balancer is exposed; instances accept traffic just from the ALB’s security group.'),
            q('What replaces an instance that fails its health check?', ['CloudWatch', 'The Auto Scaling group', 'The ALB', 'Route 53'], 1, 'The ALB stops routing to it; the ASG terminates and replaces it.')
          ]),
          challenge('three-tier', 'Wire up an ALB, an auto-scaled EC2 app tier and a Multi-AZ database that survives an AZ outage.'),
          docs(['EC2 instance types', AWS + '/ec2/latest/instancetypes/instance-types.html'], ['Auto Scaling groups', AWS + '/autoscaling/ec2/userguide/auto-scaling-groups.html'], ['Application Load Balancers', AWS + '/elasticloadbalancing/latest/application/introduction.html'], ['Terraform: aws_autoscaling_group', 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-s3',
    track: 'aws-core',
    title: 'S3 object storage',
    summary: 'Buckets, objects, storage classes, security and static website hosting with CloudFront.',
    icon: 'archive',
    minutes: 14,
    level: 'Beginner',
    steps: [
      {
        title: 'Buckets and objects',
        blocks: [
          text(
            '**Amazon S3** stores *objects* (files up to 50 TB each, with metadata) in *buckets*. It’s designed for **99.999999999% (11 nines) durability** by storing data redundantly across multiple AZs.',
            '',
            'It is not a file system: there are no real folders — just keys like `reports/2025/q3.csv`, where the slashes are part of the name.'
          ),
          terms(['Bucket', 'A container with a globally unique name, created in one region.'], ['Key', 'The object’s full name within the bucket.'], ['Prefix', 'The “folder-like” start of a key, useful for listing and permissions.'], ['Versioning', 'Keeps every version of an object — protects against overwrites and deletes.']),
          cards(
            { title: 'Static assets & sites', icon: 'globe', color: '#22b8cf', md: 'HTML, JS, images served via CloudFront.' },
            { title: 'Data lakes', icon: 'database', color: '#5b8def', md: 'Parquet/CSV queried by Athena, Glue, EMR, Redshift Spectrum.' },
            { title: 'Backups & archives', icon: 'archive', color: '#3fb950', md: 'Cheap, durable storage with Glacier classes.' },
            { title: 'Terraform state', icon: 'file-code', color: '#8b5cf6', md: 'The standard remote backend for Terraform on AWS.' }
          )
        ]
      },
      {
        title: 'Storage classes & lifecycle',
        blocks: [
          text('Not all data is equal. S3 offers classes that trade storage price against retrieval speed and cost.'),
          widget('s3-classes'),
          code('hcl', `resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "age-out-logs"
    status = "Enabled"
    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    expiration {
      days = 365
    }
  }
}`, 'logs.tf', 'Logs move to cheaper tiers as they age, then are deleted after a year.')
        ]
      },
      {
        title: 'Securing buckets',
        blocks: [
          text('New buckets are private, with **Block Public Access** on and **ACLs disabled** (Object Ownership: bucket owner enforced). Keep it that way. Control access with IAM policies and **bucket policies**.'),
          code('json', `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::acme-site/*",
    "Condition": {
      "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E2ABC" }
    }
  }]
}`, 'bucket-policy.json', 'Only one specific CloudFront distribution can read objects — the bucket itself stays private.'),
          accordion(
            ['Encryption', [text('All new objects are encrypted at rest by default (SSE-S3). Use **SSE-KMS** when you need key-level access control and audit trails in CloudTrail.')]],
            ['Versioning + MFA Delete + Object Lock', [text('Versioning protects against accidents; **Object Lock** (WORM) protects backups against ransomware and satisfies compliance retention rules.')]],
            ['Pre-signed URLs', [text('Let a browser upload or download a specific object for a limited time without making anything public — perfect for user uploads.')]]
          ),
          mistake('Making a bucket public to host a website. Use **CloudFront + Origin Access Control** instead: HTTPS, caching, custom domains, and the bucket stays private.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-s3', [
            q('How is S3 durability achieved?', ['RAID arrays in one data centre', 'Redundant storage across multiple AZs', 'Nightly tape backups', 'Replication to every region'], 1, 'Standard classes store data across a minimum of three AZs.'),
            q('Compliance requires 7-year retention; data is read maybe once a year with 12-hour notice. Best class?', ['S3 Standard', 'Standard-IA', 'Glacier Deep Archive', 'One Zone-IA'], 2, 'Deep Archive is the cheapest for rarely accessed long-term data with hours-level retrieval.'),
            q('Best way to serve a static site from S3?', ['Public bucket + website endpoint', 'CloudFront with Origin Access Control to a private bucket', 'EC2 proxy', 'Pre-signed URLs for every visitor'], 1, 'HTTPS, caching and a private bucket.'),
            q('What protects against someone accidentally overwriting an important object?', ['Lifecycle rules', 'Versioning', 'Transfer Acceleration', 'Storage class'], 1, 'With versioning you can restore any previous version.')
          ]),
          challenge('static-site', 'Host a global static website with a private S3 bucket, CloudFront and Route 53.'),
          docs(['What is Amazon S3?', AWS + '/AmazonS3/latest/userguide/Welcome.html'], ['Storage classes', AWS + '/AmazonS3/latest/userguide/storage-class-intro.html'], ['Blocking public access', AWS + '/AmazonS3/latest/userguide/access-control-block-public-access.html'], ['Terraform: aws_s3_bucket', 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket'], ['Terraform S3 backend', TF + '/language/backend/s3'])
        ]
      }
    ]
  }
];
