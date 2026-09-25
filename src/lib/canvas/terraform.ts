import { Graph, type GNode } from './graph';

// Converts the diagram into idiomatic (simplified) Terraform for the AWS provider.
// Goal: show how boxes & arrows map to resources & references, not to be a production module.

export interface TfFile {
  name: string;
  code: string;
}

export interface TfResource {
  addr: string;
  node: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'r_$1') || 'this';

const q = (v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v));

export function generate(g: Graph): { files: TfFile[]; resources: TfResource[] } {
  const names = new Map<string, string>();
  const used = new Set<string>();
  for (const n of g.nodes) {
    let base = slug(n.name || n.svc);
    let name = base;
    let i = 2;
    while (used.has(`${n.svc}:${name}`)) name = `${base}_${i++}`;
    used.add(`${n.svc}:${name}`);
    names.set(n.id, name);
  }
  const N = (n: GNode) => names.get(n.id)!;
  const SG = (n: GNode) => `${n.svc}_${N(n)}`;
  const resources: TfResource[] = [];
  const blocks: { section: string; code: string }[] = [];
  const outputs: string[] = [];
  const dataBlocks = new Set<string>();

  function res(section: string, node: GNode, type: string, name: string, body: string) {
    resources.push({ addr: `${type}.${name}`, node: node.id });
    blocks.push({ section, code: `resource "${type}" "${name}" {\n${body.replace(/^\n+|\s+$/g, '')}\n}` });
  }
  const lines = (...ls: (string | false | undefined)[]) => ls.filter((l) => l !== false && l !== undefined).join('\n');
  const tags = (n: GNode) => `  tags = {\n    Name = "${n.name}"\n  }`;

  // ---------- network ----------
  for (const v of g.of('vpc')) {
    res('Networking', v, 'aws_vpc', N(v), lines(`  cidr_block           = ${q(v.config.cidr)}`, '  enable_dns_hostnames = true', '', tags(v)));
    const igw = g.children(v.id).find((c) => c.svc === 'igw');
    if (igw) {
      res('Networking', igw, 'aws_internet_gateway', N(igw), `  vpc_id = aws_vpc.${N(v)}.id`);
    }
    const subs = g.subnetsIn(v);
    for (const s of subs) {
      res(
        'Networking',
        s,
        'aws_subnet',
        N(s),
        lines(
          `  vpc_id                  = aws_vpc.${N(v)}.id`,
          `  cidr_block              = ${q(s.config.cidr)}`,
          `  availability_zone       = "\${data.aws_region.current.region}${s.config.az}"`,
          s.config.public ? '  map_public_ip_on_launch = true' : false,
          '',
          tags(s)
        )
      );
      dataBlocks.add('data "aws_region" "current" {}');
    }
    const pubs = subs.filter((s) => s.config.public);
    if (igw && pubs.length) {
      const rt = `${N(v)}_public`;
      resources.push({ addr: `aws_route_table.${rt}`, node: igw.id });
      blocks.push({
        section: 'Networking',
        code: `resource "aws_route_table" "${rt}" {\n  vpc_id = aws_vpc.${N(v)}.id\n\n  route {\n    cidr_block = "0.0.0.0/0"\n    gateway_id = aws_internet_gateway.${N(igw)}.id\n  }\n}`
      });
      for (const s of pubs) {
        resources.push({ addr: `aws_route_table_association.${N(s)}`, node: s.id });
        blocks.push({
          section: 'Networking',
          code: `resource "aws_route_table_association" "${N(s)}" {\n  subnet_id      = aws_subnet.${N(s)}.id\n  route_table_id = aws_route_table.${rt}.id\n}`
        });
      }
    }
    for (const nat of g.descendants(v.id).filter((d) => d.svc === 'natgw')) {
      const sub = g.subnetOf(nat);
      res('Networking', nat, 'aws_eip', `${N(nat)}`, '  domain = "vpc"');
      res(
        'Networking',
        nat,
        'aws_nat_gateway',
        N(nat),
        lines(`  allocation_id = aws_eip.${N(nat)}.id`, sub ? `  subnet_id     = aws_subnet.${N(sub)}.id` : '  # subnet_id = <place me in a public subnet>', '', `  depends_on = [aws_internet_gateway.${igw ? N(igw) : 'main'}]`)
      );
      const privs = subs.filter((s) => !s.config.public);
      if (privs.length) {
        const rt = `${N(v)}_private`;
        resources.push({ addr: `aws_route_table.${rt}`, node: nat.id });
        blocks.push({
          section: 'Networking',
          code: `resource "aws_route_table" "${rt}" {\n  vpc_id = aws_vpc.${N(v)}.id\n\n  route {\n    cidr_block     = "0.0.0.0/0"\n    nat_gateway_id = aws_nat_gateway.${N(nat)}.id\n  }\n}`
        });
        for (const s of privs) {
          resources.push({ addr: `aws_route_table_association.${N(s)}`, node: s.id });
          blocks.push({ section: 'Networking', code: `resource "aws_route_table_association" "${N(s)}" {\n  subnet_id      = aws_subnet.${N(s)}.id\n  route_table_id = aws_route_table.${rt}.id\n}` });
        }
      }
    }
    for (const e of g.children(v.id).filter((d) => d.svc === 'vpce')) {
      const svc = String(e.config.service);
      const gw = svc === 's3' || svc === 'dynamodb';
      res(
        'Networking',
        e,
        'aws_vpc_endpoint',
        N(e),
        lines(
          `  vpc_id            = aws_vpc.${N(v)}.id`,
          `  service_name      = "com.amazonaws.\${data.aws_region.current.region}.${svc}"`,
          `  vpc_endpoint_type = "${gw ? 'Gateway' : 'Interface'}"`
        )
      );
      dataBlocks.add('data "aws_region" "current" {}');
    }
  }

  const subnetIds = (n: GNode) => {
    const v = g.vpcOf(n);
    const own = g.subnetOf(n);
    if (!v) return '[]';
    const sameKind = g.subnetsIn(v).filter((s) => !own || s.config.public === own.config.public);
    return `[${sameKind.map((s) => `aws_subnet.${N(s)}.id`).join(', ')}]`;
  };
  const sgFor = (n: GNode, port: number, from: string) => {
    const v = g.vpcOf(n);
    if (!v) return '';
    const name = SG(n);
    resources.push({ addr: `aws_security_group.${name}`, node: n.id });
    blocks.push({
      section: 'Security',
      code: `resource "aws_security_group" "${name}" {\n  name   = "${n.name}-sg"\n  vpc_id = aws_vpc.${N(v)}.id\n\n  ingress {\n    from_port   = ${port}\n    to_port     = ${port}\n    protocol    = "tcp"\n    ${from}\n  }\n\n  egress {\n    from_port   = 0\n    to_port     = 0\n    protocol    = "-1"\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}`
    });
    return `aws_security_group.${name}.id`;
  };

  // ---------- IAM helper ----------
  const roleFor = (n: GNode, principal: string) => {
    const r = `${n.svc}_${N(n)}`;
    resources.push({ addr: `aws_iam_role.${r}`, node: n.id });
    blocks.push({
      section: 'IAM',
      code: `resource "aws_iam_role" "${r}" {\n  name = "${n.name}-role"\n\n  assume_role_policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Effect    = "Allow"\n      Action    = "sts:AssumeRole"\n      Principal = { Service = "${principal}" }\n    }]\n  })\n}`
    });
    return `aws_iam_role.${r}.arn`;
  };

  // ---------- storage / data ----------
  for (const n of g.of('s3')) {
    res('Storage', n, 'aws_s3_bucket', N(n), `  bucket = "${slug(n.name).replace(/_/g, '-')}-\${random_id.suffix.hex}"`);
    dataBlocks.add('resource "random_id" "suffix" {\n  byte_length = 4\n}');
    if (n.config.versioning)
      res('Storage', n, 'aws_s3_bucket_versioning', N(n), `  bucket = aws_s3_bucket.${N(n)}.id\n\n  versioning_configuration {\n    status = "Enabled"\n  }`);
    if (!n.config.public)
      res(
        'Storage',
        n,
        'aws_s3_bucket_public_access_block',
        N(n),
        `  bucket                  = aws_s3_bucket.${N(n)}.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true`
      );
    const lambdas = g.out(n.id).filter((t) => t.svc === 'lambda');
    if (lambdas.length)
      res(
        'Storage',
        n,
        'aws_s3_bucket_notification',
        N(n),
        `  bucket = aws_s3_bucket.${N(n)}.id\n\n` +
          lambdas.map((l) => `  lambda_function {\n    lambda_function_arn = aws_lambda_function.${N(l)}.arn\n    events              = ["s3:ObjectCreated:*"]\n  }`).join('\n\n')
      );
    outputs.push(`output "${N(n)}_bucket" {\n  value = aws_s3_bucket.${N(n)}.bucket\n}`);
  }
  for (const n of g.of('efs')) res('Storage', n, 'aws_efs_file_system', N(n), `  encrypted = true\n\n${tags(n)}`);

  for (const n of g.of('dynamodb')) {
    res(
      'Data',
      n,
      'aws_dynamodb_table',
      N(n),
      lines(
        `  name         = "${n.name}"`,
        `  billing_mode = ${q(n.config.billing)}`,
        `  hash_key     = ${q(n.config.pk)}`,
        n.config.billing === 'PROVISIONED' ? '  read_capacity  = 5\n  write_capacity = 5' : false,
        n.config.stream ? '  stream_enabled   = true\n  stream_view_type = "NEW_AND_OLD_IMAGES"' : false,
        '',
        `  attribute {\n    name = ${q(n.config.pk)}\n    type = "S"\n  }`
      )
    );
  }
  for (const n of g.of('rds')) {
    const v = g.vpcOf(n);
    if (v) {
      const subs = g.subnetsIn(v).filter((s) => !s.config.public);
      const list = (subs.length ? subs : g.subnetsIn(v)).map((s) => `aws_subnet.${N(s)}.id`).join(', ');
      res('Data', n, 'aws_db_subnet_group', N(n), `  name       = "${slug(n.name).replace(/_/g, '-')}"\n  subnet_ids = [${list}]`);
    }
    const callers = g.in(n.id).filter((x) => ['lambda', 'ecs', 'ec2'].includes(x.svc) && !!g.vpcOf(x));
    const sg = v ? sgFor(n, n.config.engine === 'postgres' ? 5432 : 3306, callers.length ? `security_groups = [${callers.map((c) => `aws_security_group.${SG(c)}.id`).join(', ')}]` : `cidr_blocks = [aws_vpc.${N(v)}.cidr_block]`) : '';
    res(
      'Data',
      n,
      'aws_db_instance',
      N(n),
      lines(
        `  identifier                  = "${slug(n.name).replace(/_/g, '-')}"`,
        `  engine                      = ${q(n.config.engine)}`,
        `  instance_class              = ${q(n.config.class)}`,
        `  allocated_storage           = ${n.config.storage}`,
        `  multi_az                    = ${n.config.multiAz}`,
        '  username                    = "app"',
        '  manage_master_user_password = true # password lives in Secrets Manager',
        v ? `  db_subnet_group_name         = aws_db_subnet_group.${N(n)}.name` : false,
        sg ? `  vpc_security_group_ids      = [${sg}]` : false,
        '  skip_final_snapshot         = true'
      )
    );
  }
  for (const n of g.of('elasticache')) {
    res('Data', n, 'aws_elasticache_cluster', N(n), lines(`  cluster_id      = "${slug(n.name).replace(/_/g, '-')}"`, '  engine          = "valkey"', `  node_type       = ${q(n.config.node)}`, '  num_cache_nodes = 1'));
  }

  // ---------- integration ----------
  for (const n of g.of('sqs')) {
    if (n.config.dlq) res('Messaging', n, 'aws_sqs_queue', `${N(n)}_dlq`, `  name = "${n.name}-dlq${n.config.fifo ? '.fifo' : ''}"${n.config.fifo ? '\n  fifo_queue = true' : ''}`);
    res(
      'Messaging',
      n,
      'aws_sqs_queue',
      N(n),
      lines(
        `  name                       = "${n.name}${n.config.fifo ? '.fifo' : ''}"`,
        n.config.fifo ? '  fifo_queue                 = true' : false,
        `  visibility_timeout_seconds = ${n.config.visibility}`,
        n.config.dlq ? `\n  redrive_policy = jsonencode({\n    deadLetterTargetArn = aws_sqs_queue.${N(n)}_dlq.arn\n    maxReceiveCount     = 3\n  })` : false
      )
    );
  }
  for (const n of g.of('sns')) {
    res('Messaging', n, 'aws_sns_topic', N(n), `  name = "${n.name}"`);
    for (const t of g.out(n.id)) {
      const proto = t.svc === 'sqs' ? 'sqs' : 'lambda';
      const ref = t.svc === 'sqs' ? `aws_sqs_queue.${N(t)}.arn` : `aws_lambda_function.${N(t)}.arn`;
      res('Messaging', n, 'aws_sns_topic_subscription', `${N(n)}_to_${N(t)}`, `  topic_arn = aws_sns_topic.${N(n)}.arn\n  protocol  = "${proto}"\n  endpoint  = ${ref}`);
    }
  }
  for (const n of g.of('eventbridge')) {
    const sched = String(n.config.schedule || '');
    res('Messaging', n, 'aws_cloudwatch_event_rule', N(n), sched ? `  name                = "${n.name}"\n  schedule_expression = "${sched}"` : `  name = "${n.name}"\n\n  event_pattern = jsonencode({\n    source = ["com.example.orders"]\n  })`);
    for (const t of g.out(n.id)) {
      const ref = t.svc === 'lambda' ? `aws_lambda_function.${N(t)}.arn` : t.svc === 'sqs' ? `aws_sqs_queue.${N(t)}.arn` : t.svc === 'sns' ? `aws_sns_topic.${N(t)}.arn` : t.svc === 'stepfunctions' ? `aws_sfn_state_machine.${N(t)}.arn` : `aws_ecs_cluster.${N(t)}.arn`;
      res('Messaging', n, 'aws_cloudwatch_event_target', `${N(n)}_${N(t)}`, `  rule = aws_cloudwatch_event_rule.${N(n)}.name\n  arn  = ${ref}`);
    }
  }
  for (const n of g.of('stepfunctions')) {
    const role = roleFor(n, 'states.amazonaws.com');
    const first = g.out(n.id)[0];
    const def = first?.svc === 'lambda' ? `{\n    StartAt = "Invoke"\n    States = {\n      Invoke = {\n        Type     = "Task"\n        Resource = aws_lambda_function.${N(first)}.arn\n        Retry    = [{ ErrorEquals = ["States.ALL"], MaxAttempts = 3 }]\n        End      = true\n      }\n    }\n  }` : `{\n    StartAt = "Done"\n    States  = { Done = { Type = "Succeed" } }\n  }`;
    res('Messaging', n, 'aws_sfn_state_machine', N(n), `  name     = "${n.name}"\n  role_arn = ${role}\n  type     = ${q(n.config.type)}\n\n  definition = jsonencode(${def})`);
  }

  // ---------- containers ----------
  for (const n of g.of('ecr')) {
    res('Containers', n, 'aws_ecr_repository', N(n), lines(`  name                 = "${slug(n.name).replace(/_/g, '-')}"`, `  image_tag_mutability = "${n.config.mutable ? 'MUTABLE' : 'IMMUTABLE'}"`, '', `  image_scanning_configuration {\n    scan_on_push = ${n.config.scan}\n  }`));
    outputs.push(`output "${N(n)}_repository_url" {\n  value = aws_ecr_repository.${N(n)}.repository_url\n}`);
  }
  const imageFor = (n: GNode) => {
    const repo = g.in(n.id).find((x) => x.svc === 'ecr');
    return repo ? `"\${aws_ecr_repository.${N(repo)}.repository_url}:latest"` : '"public.ecr.aws/nginx/nginx:latest"';
  };
  for (const n of g.of('ecs')) {
    const alb = g.in(n.id).find((x) => x.svc === 'alb');
    const role = roleFor(n, 'ecs-tasks.amazonaws.com');
    res('Containers', n, 'aws_ecs_cluster', N(n), `  name = "${n.name}-cluster"`);
    res(
      'Containers',
      n,
      'aws_ecs_task_definition',
      N(n),
      `  family                   = "${n.name}"\n  requires_compatibilities = ["FARGATE"]\n  network_mode             = "awsvpc"\n  cpu                      = ${n.config.cpu}\n  memory                   = ${n.config.memory}\n  execution_role_arn       = ${role}\n\n  container_definitions = jsonencode([{\n    name         = "app"\n    image        = ${imageFor(n)}\n    essential    = true\n    portMappings = [{ containerPort = 8080 }]\n  }])`
    );
    const sg = sgFor(n, 8080, alb ? `security_groups = [aws_security_group.${SG(alb)}.id]` : 'cidr_blocks = ["10.0.0.0/8"]');
    res(
      'Containers',
      n,
      'aws_ecs_service',
      N(n),
      lines(
        `  name            = "${n.name}"`,
        `  cluster         = aws_ecs_cluster.${N(n)}.id`,
        `  task_definition = aws_ecs_task_definition.${N(n)}.arn`,
        `  desired_count   = ${n.config.tasks}`,
        '  launch_type     = "FARGATE"',
        '',
        `  network_configuration {\n    subnets         = ${subnetIds(n)}\n    security_groups = [${sg || ''}]\n  }`,
        alb ? `\n  load_balancer {\n    target_group_arn = aws_lb_target_group.${N(alb)}.arn\n    container_name   = "app"\n    container_port   = 8080\n  }` : false
      )
    );
  }
  for (const n of g.of('eks')) {
    const role = roleFor(n, 'eks.amazonaws.com');
    const nodeRole = `${N(n)}_nodes`;
    resources.push({ addr: `aws_iam_role.${nodeRole}`, node: n.id });
    blocks.push({ section: 'IAM', code: `resource "aws_iam_role" "${nodeRole}" {\n  name = "${n.name}-node-role"\n\n  assume_role_policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Effect    = "Allow"\n      Action    = "sts:AssumeRole"\n      Principal = { Service = "ec2.amazonaws.com" }\n    }]\n  })\n}` });
    const v = g.vpcOf(n);
    const all = v ? `[${g.subnetsIn(v).map((s) => `aws_subnet.${N(s)}.id`).join(', ')}]` : '[]';
    res('Containers', n, 'aws_eks_cluster', N(n), `  name     = "${n.name}"\n  role_arn = ${role}\n  version  = ${q(n.config.version)}\n\n  vpc_config {\n    subnet_ids = ${all}\n  }`);
    res(
      'Containers',
      n,
      'aws_eks_node_group',
      N(n),
      `  cluster_name    = aws_eks_cluster.${N(n)}.name\n  node_group_name = "default"\n  node_role_arn   = aws_iam_role.${nodeRole}.arn\n  subnet_ids      = ${subnetIds(n)}\n  instance_types  = [${q(n.config.nodeType)}]\n\n  scaling_config {\n    desired_size = ${n.config.nodes}\n    min_size     = 1\n    max_size     = ${Number(n.config.nodes) * 2}\n  }`
    );
  }

  // ---------- compute ----------
  for (const n of g.of('ec2')) {
    dataBlocks.add(
      'data "aws_ami" "al2023" {\n  most_recent = true\n  owners      = ["amazon"]\n\n  filter {\n    name   = "name"\n    values = ["al2023-ami-*-x86_64"]\n  }\n}'
    );
    const alb = g.in(n.id).find((x) => x.svc === 'alb');
    const sg = sgFor(n, 80, alb ? `security_groups = [aws_security_group.${SG(alb)}.id]` : 'cidr_blocks = ["0.0.0.0/0"]');
    const count = Number(n.config.count);
    res(
      'Compute',
      n,
      'aws_launch_template',
      N(n),
      lines(`  name_prefix   = "${n.name}-"`, '  image_id      = data.aws_ami.al2023.id', `  instance_type = ${q(n.config.type)}`, sg ? `  vpc_security_group_ids = [${sg}]` : false)
    );
    res(
      'Compute',
      n,
      'aws_autoscaling_group',
      N(n),
      lines(
        `  desired_capacity    = ${count}`,
        '  min_size            = 1',
        `  max_size            = ${Math.max(count * 2, 2)}`,
        `  vpc_zone_identifier = ${subnetIds(n)}`,
        alb ? `  target_group_arns   = [aws_lb_target_group.${N(alb)}.arn]` : false,
        '',
        `  launch_template {\n    id      = aws_launch_template.${N(n)}.id\n    version = "$Latest"\n  }`
      )
    );
  }
  for (const n of g.of('lambda')) {
    const role = roleFor(n, 'lambda.amazonaws.com');
    const image = n.config.runtime === 'container image' || g.in(n.id).some((x) => x.svc === 'ecr');
    const repo = g.in(n.id).find((x) => x.svc === 'ecr');
    const sub = g.subnetOf(n);
    const sg = sub ? sgFor(n, 443, `cidr_blocks = [aws_vpc.${N(g.vpcOf(n)!)}.cidr_block]`) : '';
    const env = g.out(n.id).filter((t) => ['dynamodb', 'sqs', 'sns', 's3'].includes(t.svc));
    res(
      'Compute',
      n,
      'aws_lambda_function',
      N(n),
      lines(
        `  function_name = "${n.name}"`,
        `  role          = ${role}`,
        image ? '  package_type  = "Image"' : `  runtime       = ${q(n.config.runtime)}\n  handler       = "app.handler"\n  filename      = "build/${N(n)}.zip"`,
        image ? `  image_uri     = ${repo ? `"\${aws_ecr_repository.${N(repo)}.repository_url}:latest"` : '"<account>.dkr.ecr.<region>.amazonaws.com/app:latest"'}` : false,
        `  memory_size   = ${n.config.memory}`,
        `  timeout       = ${n.config.timeout}`,
        `  architectures = [${q(n.config.arch)}]`,
        env.length
          ? `\n  environment {\n    variables = {\n${env
              .map((t) => {
                const ref = t.svc === 'dynamodb' ? `aws_dynamodb_table.${N(t)}.name` : t.svc === 'sqs' ? `aws_sqs_queue.${N(t)}.url` : t.svc === 's3' ? `aws_s3_bucket.${N(t)}.bucket` : `aws_sns_topic.${N(t)}.arn`;
                return `      ${N(t).toUpperCase()}_${t.svc === 'sqs' ? 'URL' : t.svc === 'sns' ? 'ARN' : 'NAME'} = ${ref}`;
              })
              .join('\n')}\n    }\n  }`
          : false,
        sub ? `\n  vpc_config {\n    subnet_ids         = ${subnetIds(n)}\n    security_group_ids = [${sg}]\n  }` : false
      )
    );
    for (const src of g.in(n.id)) {
      if (src.svc === 'sqs') res('Compute', n, 'aws_lambda_event_source_mapping', `${N(src)}_to_${N(n)}`, `  event_source_arn = aws_sqs_queue.${N(src)}.arn\n  function_name    = aws_lambda_function.${N(n)}.arn\n  batch_size       = 10`);
      if (src.svc === 'dynamodb') res('Compute', n, 'aws_lambda_event_source_mapping', `${N(src)}_to_${N(n)}`, `  event_source_arn  = aws_dynamodb_table.${N(src)}.stream_arn\n  function_name     = aws_lambda_function.${N(n)}.arn\n  starting_position = "LATEST"`);
      const principal = { s3: 's3.amazonaws.com', apigw: 'apigateway.amazonaws.com', sns: 'sns.amazonaws.com', eventbridge: 'events.amazonaws.com', alb: 'elasticloadbalancing.amazonaws.com' }[src.svc as string];
      if (principal)
        res('Compute', n, 'aws_lambda_permission', `${N(src)}_invoke_${N(n)}`, `  statement_id  = "Allow-${src.svc}"\n  action        = "lambda:InvokeFunction"\n  function_name = aws_lambda_function.${N(n)}.function_name\n  principal     = "${principal}"`);
    }
  }

  // ---------- edge ----------
  for (const n of g.of('alb')) {
    const sg = sgFor(n, n.config.https ? 443 : 80, 'cidr_blocks = ["0.0.0.0/0"]');
    res('Edge', n, 'aws_lb', N(n), lines(`  name               = "${slug(n.name).replace(/_/g, '-')}"`, '  load_balancer_type = "application"', `  internal           = ${n.config.internal === true}`, `  subnets            = ${subnetIds(n)}`, sg ? `  security_groups    = [${sg}]` : false));
    const v = g.vpcOf(n);
    const tgt = g.out(n.id)[0];
    res('Edge', n, 'aws_lb_target_group', N(n), lines(`  name        = "${slug(n.name).replace(/_/g, '-')}-tg"`, `  port        = ${tgt?.svc === 'ecs' ? 8080 : 80}`, '  protocol    = "HTTP"', `  target_type = "${tgt?.svc === 'lambda' ? 'lambda' : tgt?.svc === 'ecs' || tgt?.svc === 'eks' ? 'ip' : 'instance'}"`, v && tgt?.svc !== 'lambda' ? `  vpc_id      = aws_vpc.${N(v)}.id` : false));
    res(
      'Edge',
      n,
      'aws_lb_listener',
      N(n),
      lines(
        `  load_balancer_arn = aws_lb.${N(n)}.arn`,
        `  port              = ${n.config.https ? 443 : 80}`,
        `  protocol          = "${n.config.https ? 'HTTPS' : 'HTTP'}"`,
        n.config.https ? '  certificate_arn   = var.certificate_arn' : false,
        '',
        `  default_action {\n    type             = "forward"\n    target_group_arn = aws_lb_target_group.${N(n)}.arn\n  }`
      )
    );
    outputs.push(`output "${N(n)}_dns" {\n  value = aws_lb.${N(n)}.dns_name\n}`);
  }
  for (const n of g.of('apigw')) {
    res('Edge', n, 'aws_apigatewayv2_api', N(n), `  name          = "${n.name}"\n  protocol_type = "${n.config.type === 'WEBSOCKET' ? 'WEBSOCKET' : 'HTTP'}"`);
    res('Edge', n, 'aws_apigatewayv2_stage', N(n), `  api_id      = aws_apigatewayv2_api.${N(n)}.id\n  name        = "$default"\n  auto_deploy = true`);
    for (const t of g.out(n.id).filter((x) => x.svc === 'lambda')) {
      res('Edge', n, 'aws_apigatewayv2_integration', `${N(n)}_${N(t)}`, `  api_id                 = aws_apigatewayv2_api.${N(n)}.id\n  integration_type       = "AWS_PROXY"\n  integration_uri        = aws_lambda_function.${N(t)}.invoke_arn\n  payload_format_version = "2.0"`);
      res('Edge', n, 'aws_apigatewayv2_route', `${N(n)}_${N(t)}`, `  api_id    = aws_apigatewayv2_api.${N(n)}.id\n  route_key = "ANY /{proxy+}"\n  target    = "integrations/\${aws_apigatewayv2_integration.${N(n)}_${N(t)}.id}"`);
    }
    const auth = g.out(n.id).find((x) => x.svc === 'cognito');
    if (auth)
      res('Edge', n, 'aws_apigatewayv2_authorizer', N(n), `  api_id           = aws_apigatewayv2_api.${N(n)}.id\n  authorizer_type  = "JWT"\n  identity_sources = ["$request.header.Authorization"]\n  name             = "cognito"\n\n  jwt_configuration {\n    audience = ["app-client-id"]\n    issuer   = "https://\${aws_cognito_user_pool.${N(auth)}.endpoint}"\n  }`);
    outputs.push(`output "${N(n)}_url" {\n  value = aws_apigatewayv2_api.${N(n)}.api_endpoint\n}`);
  }
  for (const n of g.of('cloudfront')) {
    const origins = g.out(n.id);
    const o = origins[0];
    const s3 = o?.svc === 's3';
    if (s3)
      res('Edge', n, 'aws_cloudfront_origin_access_control', N(n), `  name                              = "${n.name}-oac"\n  origin_access_control_origin_type = "s3"\n  signing_behavior                  = "always"\n  signing_protocol                  = "sigv4"`);
    const domain = !o ? '"example.com"' : s3 ? `aws_s3_bucket.${N(o)}.bucket_regional_domain_name` : o.svc === 'alb' ? `aws_lb.${N(o)}.dns_name` : `replace(aws_apigatewayv2_api.${N(o)}.api_endpoint, "https://", "")`;
    res(
      'Edge',
      n,
      'aws_cloudfront_distribution',
      N(n),
      lines(
        '  enabled             = true',
        s3 ? '  default_root_object = "index.html"' : false,
        `  price_class         = ${q(n.config.priceClass)}`,
        '',
        `  origin {\n    origin_id   = "primary"\n    domain_name = ${domain}${s3 ? `\n    origin_access_control_id = aws_cloudfront_origin_access_control.${N(n)}.id` : `\n\n    custom_origin_config {\n      http_port              = 80\n      https_port             = 443\n      origin_protocol_policy = "https-only"\n      origin_ssl_protocols   = ["TLSv1.2"]\n    }`}\n  }`,
        '',
        `  default_cache_behavior {\n    target_origin_id       = "primary"\n    viewer_protocol_policy = "redirect-to-https"\n    allowed_methods        = ["GET", "HEAD"]\n    cached_methods         = ["GET", "HEAD"]\n    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized\n  }`,
        '',
        '  restrictions {\n    geo_restriction {\n      restriction_type = "none"\n    }\n  }',
        '',
        '  viewer_certificate {\n    cloudfront_default_certificate = true\n  }'
      )
    );
    outputs.push(`output "${N(n)}_domain" {\n  value = aws_cloudfront_distribution.${N(n)}.domain_name\n}`);
  }
  for (const n of g.of('route53')) {
    const t = g.out(n.id)[0];
    const alias =
      t?.svc === 'cloudfront'
        ? { name: `aws_cloudfront_distribution.${N(t)}.domain_name`, zone: `aws_cloudfront_distribution.${N(t)}.hosted_zone_id` }
        : t?.svc === 'alb'
          ? { name: `aws_lb.${N(t)}.dns_name`, zone: `aws_lb.${N(t)}.zone_id` }
          : null;
    dataBlocks.add(`data "aws_route53_zone" "main" {\n  name = "${String(n.config.domain).split('.').slice(-2).join('.')}"\n}`);
    res(
      'Edge',
      n,
      'aws_route53_record',
      N(n),
      lines(
        '  zone_id = data.aws_route53_zone.main.zone_id',
        `  name    = ${q(n.config.domain)}`,
        '  type    = "A"',
        alias ? `\n  alias {\n    name                   = ${alias.name}\n    zone_id                = ${alias.zone}\n    evaluate_target_health = true\n  }` : '  ttl     = 300\n  records = ["203.0.113.10"]'
      )
    );
  }

  // ---------- security / ops ----------
  for (const n of g.of('cognito')) res('Security', n, 'aws_cognito_user_pool', N(n), `  name = "${n.name}"\n\n  password_policy {\n    minimum_length = 12\n  }`);
  for (const n of g.of('secrets')) res('Security', n, 'aws_secretsmanager_secret', N(n), `  name = "${n.name}"`);
  for (const n of g.of('waf')) res('Security', n, 'aws_wafv2_web_acl', N(n), `  name  = "${n.name}"\n  scope = "${g.out(n.id).some((x) => x.svc === 'cloudfront') ? 'CLOUDFRONT' : 'REGIONAL'}"\n\n  default_action {\n    allow {}\n  }\n\n  visibility_config {\n    cloudwatch_metrics_enabled = true\n    metric_name                = "${N(n)}"\n    sampled_requests_enabled   = true\n  }\n\n  # rule { ... AWSManagedRulesCommonRuleSet ... }`);
  for (const n of g.of('iam')) {
    const t = g.out(n.id)[0];
    const principal = { lambda: 'lambda.amazonaws.com', ec2: 'ec2.amazonaws.com', ecs: 'ecs-tasks.amazonaws.com', eks: 'eks.amazonaws.com', stepfunctions: 'states.amazonaws.com' }[t?.svc ?? ''] ?? 'lambda.amazonaws.com';
    roleFor(n, principal);
  }
  for (const n of g.of('cloudwatch')) {
    const src = g.in(n.id)[0];
    const sns = g.out(n.id).find((x) => x.svc === 'sns');
    if (src?.svc === 'lambda')
      res('Observability', n, 'aws_cloudwatch_log_group', N(n), `  name              = "/aws/lambda/${src.name}"\n  retention_in_days = 14`);
    res(
      'Observability',
      n,
      'aws_cloudwatch_metric_alarm',
      N(n),
      lines(
        `  alarm_name          = "${n.name}"`,
        `  namespace           = "${src?.svc === 'lambda' ? 'AWS/Lambda' : src?.svc === 'sqs' ? 'AWS/SQS' : 'AWS/EC2'}"`,
        `  metric_name         = "${src?.svc === 'lambda' ? 'Errors' : src?.svc === 'sqs' ? 'ApproximateAgeOfOldestMessage' : 'CPUUtilization'}"`,
        '  statistic           = "Sum"',
        '  period              = 60',
        '  evaluation_periods  = 3',
        '  threshold           = 1',
        '  comparison_operator = "GreaterThanOrEqualToThreshold"',
        sns ? `  alarm_actions       = [aws_sns_topic.${N(sns)}.arn]` : false
      )
    );
  }

  // ---------- assemble files ----------
  const needsCert = g.of('alb').some((a) => a.config.https);
  const needsRandom = [...dataBlocks].some((d) => d.includes('random_id'));
  const providers = `terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }${needsRandom ? `\n    random = {\n      source  = "hashicorp/random"\n      version = "~> 3.6"\n    }` : ''}
  }

  # Remote state: S3 with native state locking
  # backend "s3" {
  #   bucket       = "my-tf-state"
  #   key          = "stratus/terraform.tfstate"
  #   region       = "ap-southeast-2"
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "stratus-lab"
      ManagedBy = "terraform"
    }
  }
}`;
  const vars = `variable "region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-2"
}${needsCert ? `\n\nvariable "certificate_arn" {\n  description = "ACM certificate for the HTTPS listener"\n  type        = string\n}` : ''}`;

  const sections = ['Networking', 'Security', 'IAM', 'Storage', 'Data', 'Messaging', 'Containers', 'Compute', 'Edge', 'Observability'];
  const main =
    (dataBlocks.size ? [...dataBlocks].join('\n\n') + '\n\n' : '') +
    sections
      .map((sec) => {
        const bs = blocks.filter((b) => b.section === sec);
        return bs.length ? `# ${'-'.repeat(8)} ${sec} ${'-'.repeat(Math.max(4, 50 - sec.length))}\n\n${bs.map((b) => b.code).join('\n\n')}` : '';
      })
      .filter(Boolean)
      .join('\n\n');

  const files: TfFile[] = [
    { name: 'main.tf', code: main || '# Drag services onto the canvas to generate Terraform.' },
    { name: 'variables.tf', code: vars },
    { name: 'outputs.tf', code: outputs.join('\n\n') || '# No outputs yet.' },
    { name: 'providers.tf', code: providers }
  ];
  // de-dup resource addresses (e.g. SG helpers shared across rules)
  const seen = new Set<string>();
  const uniq = resources.filter((r) => (seen.has(r.addr) ? false : (seen.add(r.addr), true)));
  return { files, resources: uniq };
}
