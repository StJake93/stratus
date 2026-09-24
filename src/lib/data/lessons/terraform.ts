import type { Lesson } from '../types';
import { text, tip, warn, info, mistake, example, code, widget, tabs, accordion, carousel, quiz, q, docs, terms, cards, table, term, diagram, challenge, TF } from './h';

const REG = 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs';

export const TERRAFORM: Lesson[] = [
  // ------------------------------------------------------------------
  {
    id: 'tf-intro',
    track: 'terraform',
    title: 'Terraform in 10 minutes',
    summary: 'Providers, resources and the plan/apply loop — how Terraform turns code into cloud.',
    icon: 'file-code',
    minutes: 10,
    level: 'Beginner',
    steps: [
      {
        title: 'How Terraform works',
        blocks: [
          text(
            '**Terraform** reads `.tf` files describing the infrastructure you want, compares that with what it has recorded in **state**, and calls cloud APIs to close the gap.',
            '',
            'It knows nothing about AWS itself — that knowledge lives in **providers**: plugins that map resource types like `aws_s3_bucket` to API calls. There are providers for AWS, Azure, Google Cloud, Kubernetes, GitHub, Datadog, Cloudflare and thousands more.'
          ),
          diagram(
            [
              { id: 'code', label: '.tf files', x: 10, y: 30, icon: 'file-code', color: '#8b5cf6', note: 'Your **configuration**, written in HCL and stored in Git.' },
              { id: 'core', label: 'Terraform Core', x: 38, y: 50, icon: 'cpu', color: '#8b5cf6', note: '**Core** builds a dependency graph, diffs desired vs current state, and produces a plan.' },
              { id: 'state', label: 'State', x: 10, y: 75, icon: 'database', color: '#8b5cf6', note: '**State** maps each resource in code to a real object ID (e.g. bucket name, instance ID).' },
              { id: 'prov', label: 'AWS provider', x: 64, y: 50, icon: 'plug', color: '#ff9900', note: 'The **provider** plugin knows how to create, read, update and delete each AWS resource type.' },
              { id: 'aws', label: 'AWS APIs', x: 90, y: 50, icon: 'cloud', color: '#ff9900' }
            ],
            [
              { from: 'code', to: 'core', label: 'desired' },
              { from: 'state', to: 'core', label: 'known' },
              { from: 'core', to: 'prov', label: 'CRUD', flow: true },
              { from: 'prov', to: 'aws', flow: true }
            ],
            260
          ),
          terms(['Provider', 'Plugin that talks to one platform’s API (`hashicorp/aws`).'], ['Resource', 'Something Terraform creates and manages (`resource "aws_vpc" "main"`).'], ['Data source', 'Something Terraform only **reads** (`data "aws_ami" "al2023"`).'], ['State', 'Terraform’s record of what it manages — `terraform.tfstate`.'], ['Plan', 'The computed list of changes needed to reach the desired state.'], ['Module', 'A reusable directory of `.tf` files.'])
        ]
      },
      {
        title: 'Your first configuration',
        blocks: [
          code('hcl', `terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

resource "aws_s3_bucket" "site" {
  bucket = "acme-site-dev-7f3a"

  tags = {
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}`, 'main.tf'),
          text('A resource block has a **type** (`aws_s3_bucket`), a **local name** (`site`) and **arguments**. Together, type and name form its **address**: `aws_s3_bucket.site` — unique within a module.'),
          term([
            { cmd: 'terraform init', out: 'Initializing provider plugins...\n- Installing hashicorp/aws v6.x...\nTerraform has been successfully initialized!' },
            { cmd: 'terraform plan', out: '  # aws_s3_bucket.site will be created\n  + resource "aws_s3_bucket" "site" {\n      + bucket = "acme-site-dev-7f3a"\n      + arn    = (known after apply)\n    }\n\nPlan: 1 to add, 0 to change, 0 to destroy.' },
            { cmd: 'terraform apply -auto-approve', out: 'aws_s3_bucket.site: Creating...\naws_s3_bucket.site: Creation complete after 2s [id=acme-site-dev-7f3a]\n\nApply complete! Resources: 1 added, 0 changed, 0 destroyed.' }
          ]),
          info('`(known after apply)` means the value is computed by AWS during creation — like an ARN or an instance ID.')
        ]
      },
      {
        title: 'Terraform, OpenTofu & HCP',
        blocks: [
          cards(
            { title: 'Terraform CLI', icon: 'terminal', color: '#8b5cf6', md: 'The open core you run locally or in CI. Licensed under the Business Source License since v1.6.' },
            { title: 'OpenTofu', icon: 'git-branch', color: '#f5c518', md: 'A Linux Foundation open-source fork of Terraform 1.5. Largely compatible configuration and workflow.' },
            { title: 'HCP Terraform', icon: 'cloud', color: '#22d3ee', md: 'HashiCorp’s managed service: remote state, remote runs, policy as code (Sentinel/OPA), private registry.' }
          ),
          quiz('tf-intro', [
            q('What does a Terraform provider do?', ['Stores state', 'Translates resource definitions into a specific platform’s API calls', 'Formats code', 'Hosts the registry'], 1, 'Providers contain all the platform-specific CRUD logic.'),
            q('What is the address of `resource "aws_vpc" "main" {}`?', ['main', 'aws_vpc', 'aws_vpc.main', 'vpc.main'], 2, 'TYPE.NAME'),
            q('Which command downloads providers?', ['terraform plan', 'terraform init', 'terraform get-providers', 'terraform apply'], 1, '`init` installs providers and modules and configures the backend.')
          ]),
          docs(['What is Terraform?', TF + '/intro'], ['Get started with AWS', TF + '/tutorials/aws-get-started'], ['AWS provider docs', REG], ['Terraform language overview', TF + '/language'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-hcl',
    track: 'terraform',
    title: 'HCL: variables, outputs & expressions',
    summary: 'Inputs, outputs, locals, types, functions and conditionals — the Terraform language.',
    icon: 'code-xml',
    minutes: 14,
    level: 'Beginner',
    steps: [
      {
        title: 'Inputs: variables',
        blocks: [
          text('**Input variables** parameterise configuration so the same code serves dev, staging and prod.'),
          code('hcl', `variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "instance_count" {
  type    = number
  default = 2
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "db_password" {
  type      = string
  sensitive = true # redacted in plan output
}`, 'variables.tf'),
          tabs(
            ['.tfvars file', [code('hcl', `environment    = "prod"
instance_count = 6
tags = {
  CostCentre = "ecommerce"
}`, 'prod.tfvars'), code('bash', 'terraform plan -var-file=prod.tfvars')]],
            ['CLI flag', [code('bash', 'terraform plan -var="environment=dev"')]],
            ['Environment variable', [code('bash', 'export TF_VAR_environment=staging\nterraform plan')]]
          ),
          info('Precedence (lowest → highest): defaults → `terraform.tfvars` → `*.auto.tfvars` → `-var-file` → `-var` flags. `TF_VAR_*` env vars sit just above defaults.')
        ]
      },
      {
        title: 'Locals, outputs & references',
        blocks: [
          code('hcl', `locals {
  name_prefix = "acme-\${var.environment}"
  common_tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_s3_bucket" "assets" {
  bucket = "\${local.name_prefix}-assets"
  tags   = local.common_tags
}

output "assets_bucket_arn" {
  description = "ARN of the assets bucket"
  value       = aws_s3_bucket.assets.arn
}`, 'main.tf'),
          table(['Reference', 'Meaning'], ['`var.environment`', 'An input variable'], ['`local.name_prefix`', 'A local value (computed once, reused)'], ['`aws_s3_bucket.assets.arn`', 'An attribute of a managed resource'], ['`data.aws_region.current.region`', 'An attribute of a data source'], ['`module.vpc.private_subnets`', 'An output of a child module']),
          tip('Outputs are how modules expose values to callers, and how you surface useful info (URLs, IDs) after `apply`. Read them with `terraform output`.')
        ]
      },
      {
        title: 'Types, expressions & functions',
        blocks: [
          accordion(
            ['Types', [text('`string`, `number`, `bool`, plus collections `list(...)`, `set(...)`, `map(...)` and structural `object({...})`, `tuple([...])`.'), code('hcl', `variable "subnets" {
  type = map(object({
    cidr   = string
    az     = string
    public = bool
  }))
}`)]],
            ['Conditionals', [code('hcl', `instance_type = var.environment == "prod" ? "m7g.large" : "t4g.small"
count         = var.enable_nat ? 1 : 0`)]],
            ['for expressions', [code('hcl', `upper_names = [for n in var.names : upper(n)]
by_az       = { for k, s in var.subnets : s.az => s.cidr if !s.public }`)]],
            ['Splat', [code('hcl', `subnet_ids = aws_subnet.private[*].id`)]],
            ['Useful functions', [text('`merge`, `lookup`, `concat`, `flatten`, `cidrsubnet`, `jsonencode`, `templatefile`, `try`, `coalesce`, `format`, `toset`. Test them live with `terraform console`.'), code('bash', `$ terraform console
> cidrsubnet("10.0.0.0/16", 8, 3)
"10.0.3.0/24"`)]]
          ),
          mistake('Hard-coding values that differ per environment (instance sizes, CIDRs, domain names). Promote them to variables early — retrofitting later means touching every environment at once.'),
          quiz('tf-hcl', [
            q('Where do you declare a value computed from other values, used several times in a module?', ['variable', 'locals', 'output', 'data'], 1, 'Locals are named expressions internal to the module.'),
            q('Which has the highest precedence?', ['Default value', 'terraform.tfvars', '-var command-line flag', 'TF_VAR_ env var'], 2, 'Command-line -var / -var-file flags win.'),
            q('What does `sensitive = true` on a variable do?', ['Encrypts state', 'Redacts the value in CLI output', 'Stores it in Secrets Manager', 'Prevents it from being used'], 1, 'It only hides the value in output — it still appears in state in plain text! Protect state accordingly.'),
            q('What does `cidrsubnet("10.0.0.0/16", 8, 2)` return?', ['10.0.2.0/24', '10.0.0.2/16', '10.2.0.0/24', '10.0.8.0/24'], 0, 'Add 8 bits to /16 → /24, and take the network numbered 2.')
          ]),
          docs(['Input variables', TF + '/language/values/variables'], ['Output values', TF + '/language/values/outputs'], ['Local values', TF + '/language/values/locals'], ['Expressions', TF + '/language/expressions'], ['Built-in functions', TF + '/language/functions'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-workflow',
    track: 'terraform',
    title: 'The core workflow: init, plan, apply',
    summary: 'Drive a simulated Terraform — creates, in-place updates, replacements and destroys.',
    icon: 'square-terminal',
    minutes: 12,
    level: 'Beginner',
    steps: [
      {
        title: 'Write → Plan → Apply',
        blocks: [
          text('Every Terraform change follows the same loop. Try it: enable resources, change arguments, and watch how the **plan** describes each change. Notice which argument changes force a **replacement** (`-/+`).'),
          widget('tf-workflow'),
          table(['Symbol', 'Meaning'], ['`+`', 'create'], ['`~`', 'update in place'], ['`-/+`', 'destroy and re-create (replacement)'], ['`-`', 'destroy'], ['`<=`', 'read (data source)'])
        ]
      },
      {
        title: 'Reading plans like a pro',
        blocks: [
          accordion(
            ['Why do some changes force replacement?', [text('Some arguments can’t be changed on a live resource because the underlying API doesn’t allow it — e.g. an S3 bucket’s name or an RDS instance’s `engine`. The provider marks these as **ForceNew**, so Terraform must destroy and recreate.')]],
            ['Protecting critical resources', [code('hcl', `resource "aws_db_instance" "orders" {
  # ...
  lifecycle {
    prevent_destroy = true
  }
}`, 'rds.tf', 'Terraform refuses any plan that would destroy this resource.')]],
            ['Saved plans in CI', [code('bash', `terraform plan -out=tfplan   # in the PR: post the plan for review
terraform apply tfplan       # after approval: apply exactly what was reviewed`), text('Applying a saved plan guarantees no surprises between review and apply.')]],
            ['Targeting & refresh-only', [text('`-target=ADDRESS` limits a run to specific resources (for emergencies, not routine use). `terraform plan -refresh-only` shows drift without proposing changes.')]]
          ),
          mistake('Skimming a plan and typing `yes`. Always scan for `-/+` and `-` lines: an innocent-looking rename can replace a database. Search the plan for “must be replaced”.'),
          example('A pull request changes `instance_type` on a launch template. CI posts the plan as a PR comment: `~ update in-place`. A reviewer spots a second line: `-/+ aws_db_instance.orders (forces replacement)` caused by an accidental `engine_version` downgrade — caught before it hit prod.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('tf-workflow', [
            q('What does `terraform plan` change in AWS?', ['Creates resources', 'Nothing — it only proposes changes', 'Deletes drift', 'Uploads state'], 1, 'Plan is read-only (it may refresh state in memory).'),
            q('A plan line shows `-/+`. What will happen?', ['In-place update', 'Destroy then create a new object', 'Import', 'No-op'], 1, 'Replacement — the old object is destroyed (or created-before-destroyed with `create_before_destroy`).'),
            q('You ran `terraform plan` without `init`. What happens?', ['It works', 'It errors: providers/backend not initialised', 'It downloads providers automatically', 'It applies'], 1, '`init` must run first in any new working directory.'),
            q('How do you ensure the apply matches the reviewed plan exactly?', ['Run plan twice', 'Save it with -out and apply that file', 'Use -auto-approve', 'Use -target'], 1, 'Saved plan files are applied verbatim.')
          ]),
          docs(['The core Terraform workflow', TF + '/intro/core-workflow'], ['terraform plan', TF + '/cli/commands/plan'], ['terraform apply', TF + '/cli/commands/apply'], ['lifecycle meta-argument', TF + '/language/meta-arguments/lifecycle'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-state',
    track: 'terraform',
    title: 'State, backends & drift',
    summary: 'What state is, remote backends with locking, drift detection, imports and refactoring.',
    icon: 'database',
    minutes: 15,
    level: 'Intermediate',
    steps: [
      {
        title: 'What state is for',
        blocks: [
          text('Terraform state is a JSON file mapping each resource address to the real object it manages, plus attributes and dependency metadata. Without it, Terraform couldn’t know that `aws_s3_bucket.assets` *is* the bucket `acme-prod-assets`.'),
          code('json', `{
  "version": 4,
  "serial": 42,
  "resources": [{
    "mode": "managed",
    "type": "aws_s3_bucket",
    "name": "assets",
    "instances": [{
      "attributes": {
        "id": "acme-prod-assets",
        "arn": "arn:aws:s3:::acme-prod-assets",
        "region": "ap-southeast-2"
      }
    }]
  }]
}`, 'terraform.tfstate (excerpt)'),
          warn('State can contain **secrets in plain text** (database passwords, private keys). Treat it as sensitive: encrypted storage, tight IAM, never commit it to Git.')
        ]
      },
      {
        title: 'Remote state for teams',
        blocks: [
          text('Local state breaks down the moment two people (or a person and CI) work on the same infrastructure. A **remote backend** stores state centrally and **locks** it during operations so two applies can’t collide.'),
          code('hcl', `terraform {
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "prod/network/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true # S3-native locking — no DynamoDB table needed
  }
}`, 'backend.tf'),
          tabs(
            ['S3 native locking', [text('Recent Terraform versions (1.11+) lock state with a lock file stored next to it in S3 using conditional writes. This replaces the older **DynamoDB lock table**, which is now deprecated.')]],
            ['Bucket hygiene', [text('- **Versioning on** — recover from corruption or bad applies', '- **Block Public Access** + encryption (SSE-KMS)', '- Separate state files per environment / component (smaller blast radius)', '- Bootstrap the state bucket itself once, separately')]],
            ['Other backends', [text('HCP Terraform, Azure Blob Storage (`azurerm`), Google Cloud Storage (`gcs`), Kubernetes, Consul and more.')]]
          ),
          challenge('tf-backend', 'Design the S3 state bucket your team will share.')
        ]
      },
      {
        title: 'Drift, imports & refactoring',
        blocks: [
          text('**Drift** happens when real infrastructure changes outside Terraform — someone clicks in the console. Play with the scenario below.'),
          widget('tf-drift'),
          accordion(
            ['Import existing resources', [code('hcl', `import {
  to = aws_s3_bucket.reports
  id = "acme-reports"
}

resource "aws_s3_bucket" "reports" {
  bucket = "acme-reports"
}`, 'imports.tf'), text('Run `terraform plan -generate-config-out=generated.tf` to have Terraform write the resource block for you.')]],
            ['Rename without destroying: moved blocks', [code('hcl', `moved {
  from = aws_s3_bucket.log
  to   = aws_s3_bucket.logs
}`), text('Without this, renaming a resource in code looks like “destroy old, create new”.')]],
            ['Stop managing something: removed blocks', [code('hcl', `removed {
  from = aws_s3_bucket.legacy
  lifecycle {
    destroy = false # forget it, but leave it running
  }
}`)]],
            ['CLI state surgery (last resort)', [code('bash', `terraform state list
terraform state show aws_instance.web
terraform state mv aws_instance.web module.app.aws_instance.web
terraform state rm aws_instance.old`)]]
          ),
          quiz('tf-state', [
            q('Two engineers run `apply` at the same time against the same S3 state. What prevents corruption?', ['Versioning', 'State locking', 'Encryption', 'Workspaces'], 1, 'Locking ensures only one operation writes state at a time.'),
            q('Someone resized an instance in the console. What will the next plan propose?', ['Nothing — Terraform ignores it', 'Revert it to match the code', 'Delete the instance', 'Import the change automatically'], 1, 'Terraform refreshes, detects drift, and plans to restore the configured value.'),
            q('You renamed `aws_s3_bucket.log` to `aws_s3_bucket.logs`. How do you avoid Terraform destroying the bucket?', ['terraform taint', 'A moved block', 'prevent_destroy', '-refresh-only'], 1, 'moved tells Terraform it’s the same object under a new address.'),
            q('Why must state be protected like a secret?', ['It’s large', 'It can contain plaintext sensitive values', 'It contains your AWS password', 'It’s required by law'], 1, 'Attributes such as generated passwords can end up in state.')
          ]),
          docs(['State', TF + '/language/state'], ['S3 backend', TF + '/language/backend/s3'], ['Import', TF + '/language/import'], ['Refactoring with moved', TF + '/language/modules/develop/refactoring'], ['Manage resource drift', TF + '/tutorials/state/resource-drift'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-deps',
    track: 'terraform',
    title: 'Dependencies & data sources',
    summary: 'The resource graph, implicit vs explicit dependencies, and reading existing infrastructure.',
    icon: 'git-branch',
    minutes: 10,
    level: 'Intermediate',
    steps: [
      {
        title: 'The dependency graph',
        blocks: [
          text('Terraform builds a **directed graph** of resources from the references between them, then creates independent resources **in parallel** (10 at a time by default) and dependent ones in order.'),
          diagram(
            [
              { id: 'vpc', label: 'aws_vpc.main', x: 12, y: 50, icon: 'vpc' },
              { id: 'igw', label: 'aws_internet_gateway', x: 40, y: 18, icon: 'igw' },
              { id: 'sa', label: 'aws_subnet.a', x: 40, y: 50, icon: 'subnet' },
              { id: 'sb', label: 'aws_subnet.b', x: 40, y: 82, icon: 'subnet' },
              { id: 'rt', label: 'aws_route_table', x: 66, y: 18, icon: 'route', color: '#a371f7', note: 'Depends on the VPC **and** the IGW because it references both IDs.' },
              { id: 'alb', label: 'aws_lb.web', x: 88, y: 66, icon: 'alb', note: 'Created only after **both** subnets exist, because `subnets = [aws_subnet.a.id, aws_subnet.b.id]`.' }
            ],
            [
              { from: 'vpc', to: 'igw' },
              { from: 'vpc', to: 'sa' },
              { from: 'vpc', to: 'sb' },
              { from: 'igw', to: 'rt' },
              { from: 'sa', to: 'alb' },
              { from: 'sb', to: 'alb' }
            ],
            280,
            'Arrows show "must exist before". Subnets a and b are created in parallel. Destroy happens in reverse order.'
          ),
          code('bash', 'terraform graph | dot -Tsvg > graph.svg', undefined, 'Render your real graph with Graphviz.')
        ]
      },
      {
        title: 'Implicit vs explicit dependencies',
        blocks: [
          tabs(
            ['Implicit (preferred)', [text('Referencing another resource’s attribute automatically creates a dependency.'), code('hcl', `resource "aws_subnet" "a" {
  vpc_id     = aws_vpc.main.id   # ← implicit dependency on the VPC
  cidr_block = "10.0.1.0/24"
}`)]],
            ['Explicit: depends_on', [text('Use only when there is a hidden dependency Terraform can’t see from references — e.g. an app needs an IAM policy attached *before* it starts, but never references the policy.'), code('hcl', `resource "aws_instance" "app" {
  # ...
  depends_on = [aws_iam_role_policy.app_s3]
}`)]]
          ),
          mistake('Sprinkling `depends_on` everywhere “to be safe”. It makes plans slower and more conservative (values become unknown until apply). Prefer passing real attributes.')
        ]
      },
      {
        title: 'Data sources: read, don’t manage',
        blocks: [
          text('A **data source** queries something that exists already — created by another team, another Terraform state, or AWS itself.'),
          code('hcl', `data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }
}

data "aws_vpc" "shared" {
  tags = { Name = "shared-services" }
}

resource "aws_instance" "bastion" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t4g.micro"
  subnet_id     = one(data.aws_subnets.shared_public.ids)
}`, 'data.tf'),
          tip('To share values between separate Terraform stacks, prefer data sources that look things up by tag, or SSM Parameter Store, over `terraform_remote_state` — it avoids giving one stack read access to another’s entire state.'),
          quiz('tf-deps', [
            q('How does Terraform know to create a VPC before its subnet?', ['Alphabetical order', 'File order', 'The subnet references aws_vpc.main.id', 'You must use depends_on'], 2, 'References create implicit dependencies.'),
            q('When should you use depends_on?', ['Always', 'For hidden dependencies not expressed through references', 'Never', 'Only for modules'], 1, 'It’s an escape hatch for dependencies Terraform can’t infer.'),
            q('What does a data source do?', ['Creates a resource', 'Reads information about existing infrastructure', 'Deletes a resource', 'Stores state'], 1, 'Data sources are read-only lookups.')
          ]),
          docs(['Resource dependencies', TF + '/tutorials/configuration-language/dependencies'], ['depends_on', TF + '/language/meta-arguments/depends_on'], ['Data sources', TF + '/language/data-sources'], ['terraform graph', TF + '/cli/commands/graph'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-meta',
    track: 'terraform',
    title: 'count, for_each & lifecycle',
    summary: 'Create many resources from one block — and avoid the index-shift trap.',
    icon: 'layers',
    minutes: 12,
    level: 'Intermediate',
    steps: [
      {
        title: 'Many resources from one block',
        blocks: [
          tabs(
            ['count', [text('Creates N copies, addressed by **index**: `aws_instance.web[0]`, `[1]`, … Best for identical copies or on/off toggles.'), code('hcl', `resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = data.aws_ami.al2023.id
  instance_type = "t4g.small"
  tags          = { Name = "web-\${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat ? 1 : 0   # conditional resource
  # ...
}`)]],
            ['for_each', [text('Creates one copy per **map key or set member**, addressed by key: `aws_subnet.private["a"]`. Best when items have identities.'), code('hcl', `variable "private_subnets" {
  default = {
    a = "10.0.11.0/24"
    b = "10.0.12.0/24"
    c = "10.0.13.0/24"
  }
}

resource "aws_subnet" "private" {
  for_each          = var.private_subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = "ap-southeast-2\${each.key}"
}`)]]
          ),
          text('Now see why `for_each` is usually the safer choice:'),
          widget('tf-foreach')
        ]
      },
      {
        title: 'Dynamic blocks & lifecycle',
        blocks: [
          accordion(
            ['dynamic blocks', [text('Generate repeated **nested blocks** (not resources) from a collection.'), code('hcl', `resource "aws_security_group" "web" {
  name   = "web"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = [80, 443]
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}`)]],
            ['create_before_destroy', [text('For replacements, build the new object first, then destroy the old — zero-downtime swaps for launch templates, certificates and the like.')]],
            ['prevent_destroy', [text('Refuse any plan that destroys this resource. Guard rail for databases and state buckets.')]],
            ['ignore_changes', [text('Ignore drift on specific attributes managed elsewhere — e.g. `desired_count` changed by autoscaling.'), code('hcl', `resource "aws_ecs_service" "api" {
  # ...
  lifecycle {
    ignore_changes = [desired_count]
  }
}`)]],
            ['replace_triggered_by', [text('Force replacement when another resource changes — e.g. recreate instances when their launch template changes.')]]
          ),
          quiz('tf-meta', [
            q('You remove the middle element of a list used with `count`. What happens?', ['Only that resource is destroyed', 'Later resources shift index and get replaced/updated', 'Nothing', 'Terraform errors'], 1, 'Index-based addressing shifts everything after the removed item.'),
            q('Best choice for subnets keyed by AZ?', ['count', 'for_each over a map', 'dynamic block', 'depends_on'], 1, 'Stable keys = stable addresses.'),
            q('Autoscaling changes an ECS service’s desired_count; Terraform keeps reverting it. Fix?', ['prevent_destroy', 'lifecycle ignore_changes = [desired_count]', 'depends_on', 'count = 0'], 1, 'Tell Terraform another system owns that attribute.'),
            q('Which lifecycle setting stops a production DB from ever being destroyed by Terraform?', ['create_before_destroy', 'prevent_destroy', 'ignore_changes', 'replace_triggered_by'], 1, 'Any plan destroying it will error.')
          ]),
          docs(['count', TF + '/language/meta-arguments/count'], ['for_each', TF + '/language/meta-arguments/for_each'], ['dynamic blocks', TF + '/language/expressions/dynamic-blocks'], ['lifecycle', TF + '/language/meta-arguments/lifecycle'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-modules',
    track: 'terraform',
    title: 'Modules & project structure',
    summary: 'Package infrastructure into reusable modules, use the public registry, and structure environments.',
    icon: 'puzzle',
    minutes: 14,
    level: 'Intermediate',
    steps: [
      {
        title: 'What is a module?',
        blocks: [
          text('Every directory of `.tf` files is a module. The one you run `terraform` in is the **root module**; modules it calls are **child modules**. A module has inputs (variables), outputs, and hides the resources in between.'),
          code('text', `modules/
  service/
    main.tf         # ECS service, target group, log group, IAM
    variables.tf    # name, image, cpu, memory, subnets…
    outputs.tf      # service_name, target_group_arn
    versions.tf     # required_providers
envs/
  dev/
    main.tf         # module "orders" { source = "../../modules/service" … }
    backend.tf
  prod/
    main.tf
    backend.tf`, 'repository layout'),
          code('hcl', `module "orders" {
  source = "../../modules/service"

  name    = "orders"
  image   = "\${aws_ecr_repository.orders.repository_url}:1.4.2"
  cpu     = 512
  memory  = 1024
  subnets = module.vpc.private_subnets
}

output "orders_url" {
  value = module.orders.url
}`, 'envs/prod/main.tf')
        ]
      },
      {
        title: 'The public registry',
        blocks: [
          text('The [Terraform Registry](https://registry.terraform.io) hosts thousands of community modules. The `terraform-aws-modules` collection is widely used for VPCs, EKS, RDS and more.'),
          code('hcl', `module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "prod"
  cidr = "10.0.0.0/16"
  azs  = ["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false # one per AZ for HA
}`, 'vpc.tf', 'Dozens of resources — subnets, route tables, NATs, EIPs — from one block.'),
          tip('Always **pin module versions**. An unpinned registry module can change underneath you on the next `init -upgrade`.'),
          cards(
            { title: 'Good module', icon: 'check', color: '#34d399', md: 'Does one job, has sensible defaults, validated inputs, useful outputs and a README with examples.' },
            { title: 'Warning signs', icon: 'triangle-alert', color: '#fbbf24', md: 'A module per single resource (a thin wrapper), or a giant “everything” module with 200 variables.' }
          )
        ]
      },
      {
        title: 'Environments: workspaces vs directories',
        blocks: [
          table(
            ['', 'CLI workspaces', 'Directory per environment'],
            ['How', '`terraform workspace new prod` — same code, separate state', '`envs/dev`, `envs/prod` each with own backend & tfvars'],
            ['Differences between envs', 'Only via variables / `terraform.workspace`', 'Can differ structurally'],
            ['Isolation', 'Same backend & credentials', 'Separate backends, often separate AWS accounts'],
            ['Best for', 'Short-lived copies (feature envs)', 'Long-lived dev/staging/prod']
          ),
          info('Many teams layer tools on top: **Terragrunt** to keep environment configuration DRY, or **HCP Terraform / Spacelift / Atlantis** for PR-driven runs and policy checks.'),
          quiz('tf-modules', [
            q('How does a parent module read a value from a child module?', ['var.child_value', 'module.NAME.OUTPUT', 'data.module', 'local.module'], 1, 'Child modules expose outputs; parents reference `module.<name>.<output>`.'),
            q('Why pin a registry module’s version?', ['Faster downloads', 'Avoid unexpected changes from new releases', 'Required by AWS', 'To enable state locking'], 1, 'Pinned versions make runs reproducible.'),
            q('Prod must live in a separate AWS account with its own state bucket. Best approach?', ['CLI workspaces', 'Directory (or stack) per environment', 'count = 2', 'One giant module'], 1, 'Separate root modules give full isolation.')
          ]),
          docs(['Modules overview', TF + '/language/modules'], ['Module development', TF + '/language/modules/develop'], ['Terraform Registry: AWS modules', 'https://registry.terraform.io/namespaces/terraform-aws-modules'], ['Workspaces', TF + '/language/state/workspaces'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'tf-aws',
    track: 'terraform',
    title: 'Terraform on AWS in practice',
    summary: 'Provider auth, multiple regions & accounts, tagging, secrets, and CI/CD with GitHub Actions + OIDC.',
    icon: 'rocket',
    minutes: 15,
    level: 'Advanced',
    steps: [
      {
        title: 'Authentication & provider configuration',
        blocks: [
          text('The AWS provider uses the standard AWS credential chain: environment variables, shared config/SSO profiles, then IAM roles (EC2/ECS/CI). **Never put access keys in `.tf` files.**'),
          code('hcl', `provider "aws" {
  region = var.region

  assume_role {
    role_arn = "arn:aws:iam::\${var.account_id}:role/terraform-deployer"
  }

  default_tags {
    tags = {
      Project    = "orders"
      Owner      = "platform-team"
      ManagedBy  = "terraform"
      Repository = "github.com/acme/infra"
    }
  }
}

# A second, aliased provider — e.g. ACM certs for CloudFront must be in us-east-1
provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "site" {
  provider          = aws.use1
  domain_name       = "www.acme.com"
  validation_method = "DNS"
}`, 'providers.tf'),
          tip('`default_tags` tags every taggable resource the provider creates — the easiest win for cost allocation and ownership.')
        ]
      },
      {
        title: 'Secrets without leaking them',
        blocks: [
          accordion(
            ['Let AWS generate & store it', [text('Prefer options where the secret never passes through Terraform, e.g. RDS `manage_master_user_password = true` — the password is created and rotated in Secrets Manager.')]],
            ['Reference, don’t embed', [text('Pass secret **ARNs** to ECS/Lambda and let them fetch values at runtime. Terraform only ever sees the ARN.')]],
            ['Ephemeral values & write-only arguments', [text('Newer Terraform versions add **ephemeral resources** and **write-only arguments** so a secret can be fetched and passed to a provider without ever being stored in plan or state files.')]],
            ['Scanning', [text('Run **tflint**, **checkov** or **trivy** in CI to catch hard-coded secrets and insecure settings (public buckets, open security groups) before merge.')]]
          ),
          mistake('Committing `terraform.tfvars` containing passwords, or a local `terraform.tfstate`, to Git. Add both to `.gitignore` and use a remote backend from day one.')
        ]
      },
      {
        title: 'CI/CD: plan on PR, apply on merge',
        blocks: [
          carousel(
            ['1 · Trust GitHub via OIDC', [text('Create an IAM OIDC provider for `token.actions.githubusercontent.com` and a role whose trust policy only allows **your repo and branch**.'), code('hcl', `data "aws_iam_policy_document" "gha_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:acme/infra:*"]
    }
  }
}`, 'oidc.tf')]],
            ['2 · Plan on pull request', [code('yaml', `name: terraform
on:
  pull_request:
  push:
    branches: [main]
permissions:
  id-token: write   # needed for OIDC
  contents: read
  pull-requests: write
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-terraform
          aws-region: ap-southeast-2
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -input=false
      - run: terraform fmt -check && terraform validate
      - run: terraform plan -input=false -out=tfplan`, '.github/workflows/terraform.yml')]],
            ['3 · Apply on merge', [text('On push to `main`, re-run plan and `terraform apply tfplan` — ideally gated by a GitHub **environment** with required reviewers for production.')]],
            ['4 · Guard rails', [text('- Separate roles: read-only for plan, write for apply', '- Policy as code (OPA/Conftest, Sentinel) to block risky changes', '- Drift detection: a scheduled `plan -detailed-exitcode` that alerts on changes')]]
          ),
          example('A platform team manages 40 AWS accounts. Each workload has its own root module and state file; GitHub Actions assumes a per-account deploy role via OIDC. No human has standing admin access to production — changes flow only through reviewed PRs.'),
          quiz('tf-aws', [
            q('How should CI authenticate to AWS for Terraform?', ['Long-lived access keys in repo secrets', 'OIDC federation to an IAM role', 'The root user', 'Hard-coded in the provider block'], 1, 'OIDC gives short-lived credentials with no stored secrets.'),
            q('You need an ACM certificate for CloudFront while your stack runs in ap-southeast-2. How?', ['Impossible', 'An aliased provider for us-east-1', 'Create it in ap-southeast-2', 'Use a data source'], 1, 'Use `provider = aws.use1` on that resource.'),
            q('Which setting tags every resource consistently?', ['locals', 'default_tags in the provider', 'lifecycle', 'depends_on'], 1, 'Provider-level default_tags apply to all taggable resources.'),
            q('Best place for a database password used by ECS?', ['terraform.tfvars in Git', 'Secrets Manager, referenced by ARN in the task definition', 'Container image', 'Resource tags'], 1, 'Runtime retrieval keeps it out of code and images.')
          ]),
          challenge('container-app', 'Draw a containerised app on the canvas and open the **Terraform** tab to see the generated ECS, ALB and IAM configuration.'),
          docs(['AWS provider authentication', REG + '#authentication-and-configuration'], ['default_tags', REG + '#default_tags-configuration-block'], ['Provider aliases', TF + '/language/providers/configuration#alias-multiple-provider-configurations'], ['Automate Terraform with GitHub Actions', TF + '/tutorials/automation/github-actions'], ['GitHub OIDC with AWS', 'https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services'])
        ]
      }
    ]
  }
];
