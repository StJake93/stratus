import type { Lesson } from '../types';
import { text, tip, warn, info, mistake, example, code, widget, tabs, accordion, carousel, quiz, q, docs, terms, cards, table, term, diagram, challenge, AWS } from './h';

export const AWS_COMPUTE: Lesson[] = [
  // ------------------------------------------------------------------
  {
    id: 'aws-lambda',
    track: 'aws-compute',
    title: 'AWS Lambda',
    summary: 'Event-driven functions: triggers, the execution lifecycle, cold starts, concurrency and cost.',
    icon: 'lambda',
    minutes: 16,
    level: 'Beginner',
    steps: [
      {
        title: 'Code that runs on events',
        blocks: [
          text(
            '**AWS Lambda** runs your code in response to events: an HTTP request, a file landing in S3, a message on a queue, a schedule. You upload a function; AWS handles servers, scaling, patching and availability across AZs.',
            '',
            'You pay per request and per **GB-second** of execution (memory × duration). Idle functions cost nothing.'
          ),
          code('python', `import json, os, boto3

table = boto3.resource("dynamodb").Table(os.environ["ORDERS_TABLE"])  # init: runs once per environment

def handler(event, context):                                        # runs on every invocation
    order = json.loads(event["body"])
    table.put_item(Item={"pk": order["id"], **order})
    return {"statusCode": 201, "body": json.dumps({"ok": True})}`, 'app.py', 'Code outside the handler runs once per execution environment and is reused, so put SDK clients there.'),
          terms(['Handler', 'The function Lambda calls with the `event` and `context`.'], ['Runtime', 'Managed language environment (Python, Node.js, Java, .NET, Ruby) or a custom runtime / container image.'], ['Execution role', 'The IAM role the function assumes to call other AWS services.'], ['Layer', 'A zip of shared libraries attached to many functions.'])
        ]
      },
      {
        title: 'Triggers: how functions get invoked',
        blocks: [
          tabs(
            ['Synchronous', [text('The caller waits for the result.', '', '- **API Gateway**, **ALB**, Function URLs', '- CloudFront (Lambda@Edge)', '- Direct `Invoke` from SDK/CLI'), info('Errors go straight back to the caller, who decides whether to retry.')]],
            ['Asynchronous', [text('Lambda queues the event and returns immediately.', '', '- **S3** event notifications', '- **SNS**, **EventBridge** rules & schedules'), tip('Lambda retries async failures twice. Configure an **on-failure destination** or DLQ so failed events aren’t silently lost.')]],
            ['Poll-based (event source mappings)', [text('Lambda polls a stream or queue and invokes you with **batches**.', '', '- **SQS** queues', '- **DynamoDB Streams**, **Kinesis**, Kafka'), warn('With SQS, if a batch fails, the whole batch returns to the queue. Enable **partial batch responses** so only failed messages are retried.')]]
          ),
          diagram(
            [
              { id: 'api', label: 'API Gateway', x: 10, y: 18, icon: 'apigw' },
              { id: 's3', label: 'S3 upload', x: 10, y: 50, icon: 's3' },
              { id: 'sqs', label: 'SQS', x: 10, y: 82, icon: 'sqs' },
              { id: 'eb', label: 'EventBridge', x: 34, y: 92, icon: 'eventbridge' },
              { id: 'fn', label: 'Lambda', x: 50, y: 50, icon: 'lambda', note: 'The same function code can be wired to many triggers, and each delivers a differently-shaped `event` object.' },
              { id: 'db', label: 'DynamoDB', x: 84, y: 25, icon: 'dynamodb' },
              { id: 'sns', label: 'SNS', x: 84, y: 75, icon: 'sns' }
            ],
            [
              { from: 'api', to: 'fn', label: 'sync', flow: true },
              { from: 's3', to: 'fn', label: 'async', flow: true },
              { from: 'sqs', to: 'fn', label: 'poll', flow: true },
              { from: 'eb', to: 'fn', label: 'schedule' },
              { from: 'fn', to: 'db' },
              { from: 'fn', to: 'sns' }
            ],
            300
          )
        ]
      },
      {
        title: 'Lifecycle, cold starts & concurrency',
        blocks: [
          carousel(
            ['Init (cold start)', [text('On the first request (or when scaling out), Lambda creates a new **execution environment**: downloads your code, starts the runtime and runs your init code. This adds latency, typically 100 ms to a few seconds depending on runtime and package size.')]],
            ['Invoke (warm)', [text('Subsequent requests reuse the warm environment. Each environment handles **one request at a time**; concurrent requests get more environments.')]],
            ['Shutdown', [text('Idle environments are eventually frozen and reclaimed. You never control exactly when.')]],
            ['Taming cold starts', [text('- Keep deployment packages small; lazy-load heavy libraries', '- Prefer lighter runtimes (Node.js, Python) for latency-sensitive APIs', '- **Provisioned concurrency** keeps N environments pre-initialised', '- **SnapStart** (Java, Python, .NET) snapshots the initialised environment')]]
          ),
          widget('lambda-cost'),
          tip('Memory is also your CPU dial: more memory = proportionally more vCPU. For CPU-bound work, a larger memory setting often finishes so much faster that it costs *less*. Try the **Lambda Power Tuning** tool to find the sweet spot.')
        ]
      },
      {
        title: 'Deploying Lambda with Terraform',
        blocks: [
          code('hcl', `data "archive_file" "orders" {
  type        = "zip"
  source_dir  = "\${path.module}/src"
  output_path = "\${path.module}/build/orders.zip"
}

resource "aws_lambda_function" "orders" {
  function_name    = "orders-api"
  role             = aws_iam_role.orders_fn.arn
  runtime          = "python3.13"
  handler          = "app.handler"
  architectures    = ["arm64"]
  memory_size      = 512
  timeout          = 10
  filename         = data.archive_file.orders.output_path
  source_code_hash = data.archive_file.orders.output_base64sha256

  environment {
    variables = {
      ORDERS_TABLE = aws_dynamodb_table.orders.name
    }
  }
}

resource "aws_cloudwatch_log_group" "orders" {
  name              = "/aws/lambda/\${aws_lambda_function.orders.function_name}"
  retention_in_days = 14
}`, 'lambda.tf', '`source_code_hash` makes Terraform redeploy only when the code actually changes.'),
          accordion(
            ['Limits worth knowing', [table(['Limit', 'Value'], ['Max timeout', '15 minutes'], ['Memory', '128 MB – 10,240 MB'], ['Zip package (unzipped)', '250 MB'], ['Container image', '10 GB'], ['/tmp storage', '512 MB – 10 GB'], ['Default concurrency (per region)', '1,000 (raisable)'])]],
            ['When NOT to use Lambda', [text('- Long-running jobs over 15 minutes → ECS/Fargate, AWS Batch', '- Steady, high-throughput workloads where always-on containers are cheaper', '- Workloads needing persistent connections or local state')]]
          ),
          mistake('Putting a VPC-attached Lambda in a private subnet with no NAT Gateway or VPC endpoints, then wondering why calls to S3/DynamoDB time out. Only attach Lambda to a VPC when it must reach private resources (like RDS).')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-lambda', [
            q('Where should you create an SDK client in a Lambda function?', ['Inside the handler, every call', 'Outside the handler, in init code', 'In a Lambda layer only', 'It doesn’t matter'], 1, 'Init code runs once per environment and is reused by warm invocations.'),
            q('Traffic is 500 req/s with 200 ms average duration. Roughly how many concurrent executions?', ['50', '100', '500', '2,500'], 1, 'Concurrency ≈ 500 × 0.2 s = 100.'),
            q('An S3-triggered function fails twice after retries. How do you avoid losing the event?', ['Increase memory', 'Configure an on-failure destination or DLQ', 'Use provisioned concurrency', 'Switch to x86'], 1, 'Async invocations need a failure destination to capture events that exhaust retries.'),
            q('A job takes 40 minutes. Is Lambda suitable?', ['Yes, with 10 GB memory', 'No, because the maximum timeout is 15 minutes', 'Yes, with provisioned concurrency', 'Only in us-east-1'], 1, 'Split the work (Step Functions) or use ECS/Fargate or AWS Batch.')
          ]),
          challenge('scheduled-job', 'Build a nightly report job: EventBridge schedule → Lambda → S3, with a CloudWatch alarm that pages on-call.'),
          docs(['What is AWS Lambda?', AWS + '/lambda/latest/dg/welcome.html'], ['Lambda execution environment', AWS + '/lambda/latest/dg/lambda-runtime-environment.html'], ['Lambda concurrency', AWS + '/lambda/latest/dg/lambda-concurrency.html'], ['Lambda quotas', AWS + '/lambda/latest/dg/gettingstarted-limits.html'], ['Terraform: aws_lambda_function', 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-apigw',
    track: 'aws-compute',
    title: 'API Gateway & serverless APIs',
    summary: 'HTTP vs REST APIs, integrations, auth, throttling, and the canonical serverless stack.',
    icon: 'webhook',
    minutes: 12,
    level: 'Beginner',
    steps: [
      {
        title: 'The front door for your APIs',
        blocks: [
          text('**Amazon API Gateway** is a fully managed service for publishing APIs. It handles TLS, routing, authorisation, throttling, CORS and request validation, then forwards requests to an **integration**, usually Lambda.'),
          table(
            ['', 'HTTP API', 'REST API', 'WebSocket API'],
            ['Best for', 'Most new APIs', 'Advanced API management', 'Real-time, two-way apps'],
            ['Price', 'Lowest', 'Higher', 'Per message + minute'],
            ['Auth', 'JWT, Lambda, IAM', 'Cognito, Lambda, IAM, API keys', 'Lambda, IAM'],
            ['Extras', 'Simple, fast', 'Usage plans, request validation, caching, WAF', 'Connection management']
          ),
          tip('Start with an **HTTP API** unless you specifically need REST API features like usage plans, API keys or response caching.')
        ]
      },
      {
        title: 'The serverless web stack',
        blocks: [
          diagram(
            [
              { id: 'u', label: 'Mobile / web', x: 7, y: 50, icon: 'users' },
              { id: 'cog', label: 'Cognito', x: 30, y: 15, icon: 'cognito', note: 'Users sign in with **Cognito** and receive a JWT. API Gateway validates the token on every request, so there is no auth code in your function.' },
              { id: 'api', label: 'API Gateway', x: 30, y: 60, icon: 'apigw', note: 'Routes like `GET /orders/{id}` map to integrations. Throttling protects your backend from floods.' },
              { id: 'fn', label: 'Lambda', x: 58, y: 60, icon: 'lambda', note: 'Business logic. One function per route, or one “monolith” function with an internal router. Both are common.' },
              { id: 'db', label: 'DynamoDB', x: 86, y: 40, icon: 'dynamodb', note: 'Pay-per-request tables scale instantly with spiky API traffic.' },
              { id: 'cw', label: 'CloudWatch', x: 86, y: 85, icon: 'cloudwatch', note: 'Access logs from API Gateway + function logs + metrics and alarms.' }
            ],
            [
              { from: 'u', to: 'cog', label: 'sign in', dashed: true },
              { from: 'u', to: 'api', label: 'HTTPS + JWT', flow: true },
              { from: 'api', to: 'cog', label: 'verify', dashed: true },
              { from: 'api', to: 'fn', label: 'proxy', flow: true },
              { from: 'fn', to: 'db', flow: true },
              { from: 'fn', to: 'cw', dashed: true }
            ],
            300
          ),
          code('hcl', `resource "aws_apigatewayv2_api" "orders" {
  name          = "orders"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "orders" {
  api_id                 = aws_apigatewayv2_api.orders.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.orders.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create" {
  api_id    = aws_apigatewayv2_api.orders.id
  route_key = "POST /orders"
  target    = "integrations/\${aws_apigatewayv2_integration.orders.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.orders.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.orders.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_apigatewayv2_api.orders.execution_arn}/*/*"
}`, 'api.tf'),
          mistake('Forgetting the `aws_lambda_permission`. API Gateway returns **500 Internal Server Error** because it isn’t allowed to invoke your function: the resource-based policy on the function is missing.')
        ]
      },
      {
        title: 'Hardening & operating the API',
        blocks: [
          accordion(
            ['Throttling', [text('Account-level and per-route limits (requests per second + burst). Clients over the limit get **429 Too Many Requests**. Protects downstream databases from stampedes.')]],
            ['CORS', [text('Browsers calling your API from another domain need CORS headers. HTTP APIs have built-in CORS configuration.')]],
            ['Custom domains', [text('Map `api.acme.com` with an ACM certificate and a Route 53 alias record instead of the random `execute-api` URL.')]],
            ['Direct service integrations', [text('Skip Lambda entirely for simple cases: API Gateway can write straight to SQS, EventBridge, Step Functions or DynamoDB.')]]
          ),
          example('A food-delivery startup uses `POST /orders` → Lambda → DynamoDB for writes, and pushes order events to EventBridge. Downstream services (kitchen display, courier dispatch, analytics) subscribe independently.'),
          quiz('aws-apigw', [
            q('API Gateway returns 500 and the Lambda logs show no invocations. Most likely cause?', ['Lambda timeout', 'Missing lambda_permission for API Gateway', 'DynamoDB throttling', 'CORS'], 1, 'Without the resource-based permission, API Gateway can’t invoke the function at all.'),
            q('Which API type is cheapest and simplest for a new JSON API with JWT auth?', ['REST API', 'HTTP API', 'WebSocket API', 'GraphQL via AppSync'], 1, 'HTTP APIs support JWT authorizers natively at lower cost.'),
            q('What status code do throttled clients receive?', ['403', '429', '500', '503'], 1, '429 Too Many Requests.')
          ]),
          challenge('serverless-api', 'Assemble the canonical serverless API: API Gateway → Lambda → DynamoDB, with logs and optional Cognito auth.'),
          docs(['What is API Gateway?', AWS + '/apigateway/latest/developerguide/welcome.html'], ['Choosing HTTP vs REST', AWS + '/apigateway/latest/developerguide/http-api-vs-rest.html'], ['JWT authorizers', AWS + '/apigateway/latest/developerguide/http-api-jwt-authorizer.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-ecr',
    track: 'aws-compute',
    title: 'ECR: container registry',
    summary: 'Store, scan and version container images, and push them from CI.',
    icon: 'package',
    minutes: 10,
    level: 'Beginner',
    steps: [
      {
        title: 'Your private image registry',
        blocks: [
          text('**Amazon Elastic Container Registry (ECR)** is a fully managed Docker/OCI registry. ECS, EKS, Lambda, App Runner and your laptop all pull images from it using IAM for authentication.'),
          terms(['Registry', 'One per account per region: `<account>.dkr.ecr.<region>.amazonaws.com`.'], ['Repository', 'Holds all versions of one image, e.g. `orders-api`.'], ['Tag', 'A human label like `1.4.2` or `latest` pointing at an image.'], ['Digest', 'The immutable content hash `sha256:…`, the true identity of an image.']),
          cards(
            { title: 'Image scanning', icon: 'search', color: '#f25f5c', md: 'Scan on push for CVEs; **enhanced scanning** with Amazon Inspector re-scans continuously.' },
            { title: 'Lifecycle policies', icon: 'trash', color: '#94a3b8', md: 'Expire untagged images or keep only the last N. Registries fill up fast.' },
            { title: 'Replication', icon: 'earth', color: '#22b8cf', md: 'Replicate images cross-region / cross-account for DR and multi-region deploys.' },
            { title: 'Pull-through cache', icon: 'download', color: '#3fb950', md: 'Cache public images (Docker Hub, GHCR) in ECR to avoid rate limits.' }
          )
        ]
      },
      {
        title: 'Push an image',
        blocks: [
          term(
            [
              { cmd: 'aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com', out: 'Login Succeeded' },
              { cmd: 'docker build --platform linux/arm64 -t orders-api:1.4.2 .', out: '[+] Building 21.4s (12/12) FINISHED' },
              { cmd: 'docker tag orders-api:1.4.2 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/orders-api:1.4.2' },
              { cmd: 'docker push 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/orders-api:1.4.2', out: 'The push refers to repository [123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/orders-api]\n5f70bf18a086: Pushed\n1.4.2: digest: sha256:3b1a9c…d4 size: 1570' }
            ],
            'push-image.sh'
          ),
          code('hcl', `resource "aws_ecr_repository" "orders" {
  name                 = "orders-api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "orders" {
  repository = aws_ecr_repository.orders.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 30 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}`, 'ecr.tf'),
          tip('Use **immutable tags** and deploy by version (or digest), never `latest`. Then “what’s running in prod?” always has a precise answer, and rollbacks are just redeploying the previous tag.'),
          warn('Building on an Apple Silicon Mac produces `arm64` images by default. If your ECS tasks or EKS nodes are x86, build with `--platform linux/amd64`, or run Graviton for better price/performance.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-ecr', [
            q('Which uniquely and permanently identifies an image’s content?', ['Tag', 'Repository name', 'Digest', 'Registry URL'], 2, 'Tags can move (if mutable); the sha256 digest is the content itself.'),
            q('How does ECS authenticate to pull from ECR?', ['Docker Hub credentials', 'The task execution IAM role', 'A password in the task definition', 'ECR is public'], 1, 'The execution role needs ECR pull permissions.'),
            q('Why enable tag immutability?', ['Faster pulls', 'Prevents a tag like v1.2.0 being overwritten with different code', 'Cheaper storage', 'Required for scanning'], 1, 'Immutable tags make deployments reproducible and auditable.')
          ]),
          docs(['What is Amazon ECR?', AWS + '/AmazonECR/latest/userguide/what-is-ecr.html'], ['Pushing an image', AWS + '/AmazonECR/latest/userguide/docker-push-ecr-image.html'], ['Lifecycle policies', AWS + '/AmazonECR/latest/userguide/LifecyclePolicies.html'], ['Image scanning', AWS + '/AmazonECR/latest/userguide/image-scanning.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-ecs',
    track: 'aws-compute',
    title: 'ECS & Fargate',
    summary: 'Clusters, task definitions and services: run containers without managing servers.',
    icon: 'boxes',
    minutes: 15,
    level: 'Intermediate',
    steps: [
      {
        title: 'ECS building blocks',
        blocks: [
          text('**Amazon Elastic Container Service (ECS)** is AWS’s own container orchestrator: simpler than Kubernetes and deeply integrated with IAM, ALB, CloudWatch and Secrets Manager.'),
          accordion(
            ['Cluster', [text('A logical grouping of capacity. With **Fargate** there are no servers in it at all; it’s just a namespace.')]],
            ['Task definition', [text('A versioned blueprint (like a docker-compose file): image, CPU/memory, ports, env vars, secrets, IAM roles, log config.')]],
            ['Task', [text('A running instance of a task definition: one or more containers scheduled together.')]],
            ['Service', [text('Keeps **N tasks** running, replaces failed ones, performs rolling deployments and registers tasks with a load balancer target group.')]],
            ['Capacity provider', [text('Where tasks run: **Fargate** (serverless), **Fargate Spot** (up to 70% cheaper, interruptible), or EC2 Auto Scaling groups you manage.')]]
          ),
          table(['', 'Fargate', 'EC2 launch type'], ['Servers to manage', 'None', 'You patch & scale the instances'], ['Pricing', 'Per task vCPU/GB-second', 'Per instance (can be cheaper at high density)'], ['GPUs / special hardware', 'No', 'Yes'], ['Best for', 'Most workloads', 'Very large or specialised fleets'])
        ]
      },
      {
        title: 'Two IAM roles you must not confuse',
        blocks: [
          cards(
            { title: 'Task execution role', icon: 'settings', color: '#94a3b8', md: 'Used by **the ECS agent** to pull the image from ECR, fetch secrets and write logs to CloudWatch. Your code never uses it.' },
            { title: 'Task role', icon: 'key', color: '#ff9900', md: 'Used by **your application code** to call AWS APIs (S3, DynamoDB, SQS…). Give it least-privilege permissions.' }
          ),
          code('hcl', `resource "aws_ecs_task_definition" "api" {
  family                   = "orders-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn # pull image, read secrets, ship logs
  task_role_arn            = aws_iam_role.orders_task.arn   # what the app itself may do

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([{
    name         = "api"
    image        = "\${aws_ecr_repository.orders.repository_url}:1.4.2"
    essential    = true
    portMappings = [{ containerPort = 8080 }]
    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = aws_secretsmanager_secret.db.arn
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/orders-api"
        awslogs-region        = "ap-southeast-2"
        awslogs-stream-prefix = "api"
      }
    }
  }])
}`, 'task.tf')
        ]
      },
      {
        title: 'Services, networking & deployments',
        blocks: [
          text('With the `awsvpc` network mode each task gets **its own ENI and private IP** in your subnets, and its own security group. The ALB target group uses `target_type = "ip"`.'),
          code('hcl', `resource "aws_ecs_service" "api" {
  name            = "orders-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}`, 'service.tf'),
          carousel(
            ['Rolling update', [text('Default. ECS starts new tasks, waits for them to pass ALB health checks, then drains old ones. Control speed with `minimumHealthyPercent` / `maximumPercent`.')]],
            ['Circuit breaker', [text('If new tasks keep failing to start or pass health checks, the deployment is marked failed and **automatically rolled back**.')]],
            ['Blue/green', [text('ECS now supports native blue/green deployments: stand up the new version alongside the old, shift traffic, and roll back instantly if alarms fire.')]]
          ),
          mistake('Tasks stuck in `PROVISIONING`/`PENDING` with “CannotPullContainerError”: tasks in private subnets have no route to ECR. Add a NAT Gateway or VPC endpoints for `ecr.api`, `ecr.dkr` and S3 (image layers live in S3).')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('aws-ecs', [
            q('Your app gets AccessDenied writing to S3, but the image pulled fine. Which role needs the S3 permission?', ['Task execution role', 'Task role', 'Service-linked role', 'The ALB role'], 1, 'App code uses the task role; the execution role is only for ECS itself.'),
            q('What keeps 3 copies of a task running and replaces failed ones?', ['Task definition', 'ECS service', 'Cluster', 'Capacity provider'], 1, 'Services maintain desired count and integrate with load balancers.'),
            q('With awsvpc networking on Fargate, what target type does the ALB target group need?', ['instance', 'ip', 'lambda', 'alb'], 1, 'Each task has its own IP, so targets are IPs.'),
            q('A deploy keeps failing health checks. What rolls it back automatically?', ['Auto Scaling', 'Deployment circuit breaker', 'CloudTrail', 'Route 53 failover'], 1, 'The circuit breaker detects failed deployments and can roll back.')
          ]),
          challenge('container-app', 'Ship a Dockerised API: CI pushes to ECR, ECS Fargate runs it privately behind an ALB.'),
          docs(['What is Amazon ECS?', AWS + '/AmazonECS/latest/developerguide/Welcome.html'], ['AWS Fargate', AWS + '/AmazonECS/latest/developerguide/AWS_Fargate.html'], ['Task IAM roles', AWS + '/AmazonECS/latest/developerguide/task-iam-roles.html'], ['Deployment circuit breaker', AWS + '/AmazonECS/latest/developerguide/deployment-circuit-breaker.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'aws-eks',
    track: 'aws-compute',
    title: 'EKS: Kubernetes on AWS',
    summary: 'Managed control plane, node options, networking, IAM for pods and ingress with the ALB controller.',
    icon: 'ship-wheel',
    minutes: 16,
    level: 'Advanced',
    steps: [
      {
        title: 'What EKS manages (and what it doesn’t)',
        blocks: [
          text('**Amazon EKS** runs a certified, upstream Kubernetes control plane for you, with API servers and etcd spread across three AZs, patched and scaled by AWS. You choose how worker capacity is provided.'),
          table(
            ['Option', 'You manage', 'Good for'],
            ['**EKS Auto Mode**', 'Almost nothing: AWS manages nodes, scaling and core add-ons', 'Teams wanting K8s without node ops'],
            ['**Managed node groups**', 'Choose instance types; AWS handles provisioning & updates', 'Most production clusters'],
            ['**Karpenter**', 'NodePool rules; Karpenter launches right-sized nodes on demand', 'Cost-efficient, bursty workloads'],
            ['**Fargate profiles**', 'Nothing: one micro-VM per pod', 'Isolated, low-ops workloads (no DaemonSets)'],
            ['Self-managed nodes', 'Everything', 'Special AMIs / edge cases']
          ),
          info('EKS has a per-cluster hourly fee on top of compute. Many organisations run a few shared clusters rather than one per team.')
        ]
      },
      {
        title: 'AWS integrations that make EKS work',
        blocks: [
          accordion(
            ['VPC CNI: pods get VPC IPs', [text('The **Amazon VPC CNI** plugin gives every pod an IP from your subnet. Pods are first-class VPC citizens (security groups for pods, direct routing), but they **consume IPs fast**. Size private subnets generously (/19 or /20) or enable prefix delegation.')]],
            ['Pod-level IAM', [text('Never give nodes broad IAM permissions. Use **EKS Pod Identity** (or the older **IRSA**) to map a Kubernetes service account to an IAM role, so each workload gets only what it needs.'), code('hcl', `resource "aws_eks_pod_identity_association" "orders" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "orders"
  service_account = "orders-api"
  role_arn        = aws_iam_role.orders_pod.arn
}`, 'pod-identity.tf')]],
            ['AWS Load Balancer Controller', [text('Watches Kubernetes `Ingress` and `Service type: LoadBalancer` objects and provisions **ALBs/NLBs** for them automatically.'), code('yaml', `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
    - host: api.acme.com
      http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service: { name: orders-api, port: { number: 80 } }`, 'ingress.yaml')]],
            ['Access control', [text('**EKS access entries** map IAM principals to Kubernetes permissions, managed through the EKS API (and Terraform) instead of hand-editing the old `aws-auth` ConfigMap.')]],
            ['Add-ons', [text('Managed add-ons keep core components (VPC CNI, CoreDNS, kube-proxy, EBS CSI driver, Pod Identity agent) versioned and patched.')]]
          ),
          tip('Subnet tags matter: tag public subnets `kubernetes.io/role/elb = 1` and private subnets `kubernetes.io/role/internal-elb = 1` so the load balancer controller knows where to place ALBs.')
        ]
      },
      {
        title: 'Cluster in Terraform',
        blocks: [
          code('hcl', `resource "aws_eks_cluster" "main" {
  name     = "platform"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.33"

  access_config {
    authentication_mode = "API"
  }

  vpc_config {
    subnet_ids              = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    endpoint_private_access = true
    endpoint_public_access  = true
  }
}

resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "general"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  instance_types  = ["m7g.large"]
  ami_type        = "AL2023_ARM_64_STANDARD"

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }
}`, 'eks.tf', 'In practice most teams use the community terraform-aws-modules/eks module, which wires up IAM, add-ons and access entries.'),
          warn('Upgrading Kubernetes versions is a recurring chore: EKS versions reach end of standard support roughly 14 months after release. Upgrade the control plane one minor version at a time, then node groups and add-ons.'),
          quiz('aws-eks', [
            q('Pods keep failing to schedule with “insufficient IP addresses”. Likely cause?', ['CoreDNS crash', 'Subnets too small for VPC CNI pod IPs', 'IAM role missing', 'Wrong Kubernetes version'], 1, 'Each pod consumes a VPC IP. Use larger subnets or prefix delegation.'),
            q('How should a pod get permission to read one S3 bucket?', ['Node instance role with S3 full access', 'Access keys in a Kubernetes Secret', 'EKS Pod Identity / IRSA mapping its service account to a scoped IAM role', 'Make the bucket public'], 2, 'Pod-level IAM gives least privilege per workload.'),
            q('Which component turns a Kubernetes Ingress into an ALB?', ['kube-proxy', 'AWS Load Balancer Controller', 'Karpenter', 'CoreDNS'], 1, 'The controller reconciles Ingress objects into ALBs.'),
            q('What does EKS manage for you?', ['Your pods', 'The Kubernetes control plane', 'Your Helm charts', 'Your container images'], 1, 'API servers and etcd across AZs, plus nodes too if you use Auto Mode.')
          ]),
          challenge('eks-platform', 'Lay the AWS foundation for a production EKS platform: multi-AZ VPC, private nodes, ECR, ALB ingress and CloudWatch.'),
          docs(['What is Amazon EKS?', AWS + '/eks/latest/userguide/what-is-eks.html'], ['EKS Auto Mode', AWS + '/eks/latest/userguide/automode.html'], ['EKS Pod Identity', AWS + '/eks/latest/userguide/pod-identities.html'], ['AWS Load Balancer Controller', AWS + '/eks/latest/userguide/aws-load-balancer-controller.html'], ['EKS Best Practices Guide', AWS + '/eks/latest/best-practices/introduction.html'])
        ]
      }
    ]
  }
];
