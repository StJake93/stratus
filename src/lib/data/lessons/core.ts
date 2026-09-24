import type { Lesson } from '../types';
import { text, tip, warn, info, mistake, example, code, widget, tabs, accordion, carousel, quiz, q, docs, terms, cards, table, term, diagram, AWS, TF, K8S } from './h';

export const CORE: Lesson[] = [
  // ------------------------------------------------------------------
  {
    id: 'cloud-101',
    track: 'core',
    title: 'What is the cloud, really?',
    summary: 'Renting computers by the second: service models, the shared responsibility model and why teams move to cloud.',
    icon: 'cloud',
    minutes: 10,
    level: 'Beginner',
    steps: [
      {
        title: 'Someone else’s computer — on demand',
        blocks: [
          text(
            'Cloud computing is the **on-demand delivery of IT resources over the internet with pay-as-you-go pricing**. Instead of buying servers, racking them and waiting weeks, you call an API and get compute, storage or a database in seconds — and stop paying the moment you delete it.',
            '',
            'Every provider (AWS, Microsoft Azure, Google Cloud) offers the same core promise:'
          ),
          cards(
            { title: 'Elasticity', icon: 'scale', md: 'Scale up for Black Friday, scale down at 3am. Capacity follows demand automatically.', color: '#22d3ee' },
            { title: 'Pay per use', icon: 'dollar-sign', md: 'Trade big upfront capital spend for small variable costs. No idle hardware.', color: '#34d399' },
            { title: 'Global in minutes', icon: 'earth', md: 'Deploy to data centres on every continent without signing a single lease.', color: '#a371f7' },
            { title: 'Managed services', icon: 'sparkles', md: 'Let the provider run databases, queues and Kubernetes so you can focus on your product.', color: '#ff9900' }
          ),
          example('A startup launches with a single small database and a few functions costing a few dollars a month. When a TV feature sends 100× traffic overnight, the same architecture scales out automatically — then back down the next day.'),
          terms(
            ['Region', 'A geographic area (e.g. Sydney) containing multiple isolated data centre groups.'],
            ['Managed service', 'A service where the provider operates the underlying servers, patching and availability for you.'],
            ['API', 'Everything in the cloud is an API call — the console, CLI and Terraform all call the same APIs.'],
            ['Elasticity', 'Automatically adding or removing capacity to match demand.']
          )
        ]
      },
      {
        title: 'IaaS, PaaS, SaaS & serverless',
        blocks: [
          text('Cloud services sit on a spectrum. The further right you go, the less you manage — and the less you can customise.'),
          tabs(
            ['IaaS', [text('**Infrastructure as a Service** — virtual machines, disks and networks. You manage the OS upward.', '', '- AWS: **EC2**, EBS, VPC', '- Azure: Virtual Machines', '- GCP: Compute Engine'), tip('Choose IaaS when you need full control of the OS, special software, or are lifting-and-shifting existing servers.')]],
            ['PaaS', [text('**Platform as a Service** — you bring code or containers; the platform runs them.', '', '- AWS: Elastic Beanstalk, App Runner, **ECS on Fargate**', '- Azure: App Service, Container Apps', '- GCP: App Engine, Cloud Run')]],
            ['Serverless / FaaS', [text('**Functions as a Service** — upload a function, it runs on events. Scales to zero, billed per millisecond.', '', '- AWS: **Lambda**', '- Azure: Functions', '- GCP: Cloud Run functions'), info('“Serverless” doesn’t mean no servers — it means *you* never see or manage them.')]],
            ['SaaS', [text('**Software as a Service** — finished applications: email, CRM, observability tools. You just configure and use them.')]]
          ),
          widget('shared-responsibility')
        ]
      },
      {
        title: 'The shared responsibility model',
        blocks: [
          text(
            'Security in the cloud is a partnership. AWS phrases it as:',
            '',
            '- **AWS is responsible for security *of* the cloud** — physical data centres, hardware, the global network and the virtualisation layer.',
            '- **You are responsible for security *in* the cloud** — your data, IAM permissions, network rules, OS patches (for IaaS) and application code.'
          ),
          mistake('Assuming “it’s in the cloud, so it’s secure”. Most cloud breaches are customer misconfigurations: public S3 buckets, over-permissive IAM policies, or open security groups.'),
          accordion(
            ['What never moves to the provider?', [text('Your **data** and **who can access it** are always your responsibility, from IaaS all the way to SaaS. Classify data, encrypt it, and grant least-privilege access.')]],
            ['What does the Well-Architected Framework add?', [text('AWS’s [Well-Architected Framework](' + AWS + '/wellarchitected/latest/framework/welcome.html) organises best practice into six pillars: **Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization and Sustainability**. The linter in this app’s build canvas is inspired by it.')]]
          ),
          quiz('cloud-101', [
            q('A team runs a web app on EC2 instances. Who is responsible for patching the guest operating system?', ['AWS', 'The customer', 'Shared equally', 'Nobody — EC2 patches itself'], 1, 'EC2 is IaaS. AWS runs the hypervisor and hardware; the OS on the instance is yours to patch (tools like Systems Manager Patch Manager help).'),
            q('Which service model lets you upload a function that runs only when triggered and bills per millisecond?', ['IaaS', 'PaaS', 'FaaS / serverless', 'SaaS'], 2, 'Functions as a Service (AWS Lambda, Azure Functions, Cloud Run functions) run on events and scale to zero.'),
            q('What is ALWAYS the customer’s responsibility, even with SaaS?', ['Hypervisor security', 'Data and access management', 'Physical security', 'Hardware refresh'], 1, 'Your data and who is allowed to access it never becomes the provider’s job.'),
            q('Which is the best description of elasticity?', ['Paying up front for 3 years', 'Automatically matching capacity to demand', 'Running in multiple regions', 'Using open-source software'], 1, 'Elasticity means adding and removing capacity as demand changes — you pay only for what you use.')
          ]),
          docs(['Types of cloud computing', AWS + '/whitepapers/latest/aws-overview/types-of-cloud-computing.html'], ['Shared responsibility model', 'https://aws.amazon.com/compliance/shared-responsibility-model/'], ['Well-Architected Framework', AWS + '/wellarchitected/latest/framework/welcome.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'regions-azs',
    track: 'core',
    title: 'Regions, Availability Zones & the edge',
    summary: 'How the global infrastructure is laid out, and how it shapes latency, resilience and compliance.',
    icon: 'earth',
    minutes: 8,
    level: 'Beginner',
    steps: [
      {
        title: 'The building blocks of global infrastructure',
        blocks: [
          text('Cloud providers organise their data centres in a hierarchy. Understanding it is the key to designing for **high availability**.'),
          diagram(
            [
              { id: 'r', label: 'Region: ap-southeast-2', x: 4, y: 8, group: true, w: 70, h: 84, color: '#ff9900' },
              { id: 'a', label: 'AZ a', x: 16, y: 55, icon: 'building', color: '#ff9900', note: 'An **Availability Zone** is one or more discrete data centres with redundant power, networking and cooling. AZs in a region are miles apart but linked with low-latency fibre (single-digit ms).' },
              { id: 'b', label: 'AZ b', x: 39, y: 55, icon: 'building', color: '#ff9900', note: 'Because AZs fail independently, spreading your app across two or more AZs protects you from a single data centre outage.' },
              { id: 'c', label: 'AZ c', x: 62, y: 55, icon: 'building', color: '#ff9900', note: 'Most regions have 3+ AZs. AZ names like `ap-southeast-2a` are mapped randomly per account; use AZ IDs (`apse2-az1`) to line them up across accounts.' },
              { id: 'e', label: 'Edge location', x: 88, y: 30, icon: 'zap', color: '#22b8cf', note: '**Edge locations** (600+ worldwide) are small points of presence used by CloudFront (CDN), Route 53 (DNS) and Global Accelerator to get close to users.' },
              { id: 'u', label: 'Users', x: 88, y: 78, icon: 'users', color: '#94a3b8', note: 'Users connect to the nearest edge location, which then talks to your region over the AWS backbone.' }
            ],
            [
              { from: 'a', to: 'b', label: 'low-latency links', dashed: true },
              { from: 'b', to: 'c', dashed: true },
              { from: 'u', to: 'e', flow: true },
              { from: 'e', to: 'b', label: 'AWS backbone', flow: true }
            ],
            300
          ),
          terms(
            ['Region', 'A separate geographic area (e.g. `us-east-1`, `eu-west-1`). Regions are isolated from each other; data does not leave a region unless you move it.'],
            ['Availability Zone (AZ)', 'One or more data centres inside a region, isolated from failures in other AZs.'],
            ['Edge location', 'A CDN/DNS point of presence close to end users.'],
            ['Local Zone / Wavelength', 'Extensions that put AWS compute even closer to specific cities or 5G networks.']
          )
        ]
      },
      {
        title: 'Choosing a region',
        blocks: [
          text('Four factors drive region choice:', '', '1. **Latency** — be close to your users.', '2. **Data residency & compliance** — some data must stay in-country.', '3. **Service availability** — newer services launch in some regions first.', '4. **Price** — the same service can cost different amounts in different regions.'),
          widget('region-latency'),
          tip('Global services like IAM, Route 53 and CloudFront aren’t tied to one region; most others (EC2, Lambda, S3 buckets) are regional.')
        ]
      },
      {
        title: 'Designing for failure',
        blocks: [
          text('“Everything fails, all the time.” — Werner Vogels, Amazon CTO. Cloud architecture assumes components *will* fail and plans around it.'),
          table(
            ['Pattern', 'Protects against', 'Typical cost'],
            ['Single AZ', 'Nothing beyond a single server', '$'],
            ['**Multi-AZ** (2–3 AZs)', 'Data centre outage — the standard for production', '$$'],
            ['Multi-region (active/passive)', 'Whole-region outage, disaster recovery', '$$$'],
            ['Multi-region (active/active)', 'Region outage with near-zero downtime', '$$$$']
          ),
          info('Managed services often do multi-AZ for you: S3, DynamoDB, Lambda and SQS are automatically spread across AZs in a region.'),
          quiz('regions-azs', [
            q('Your app runs on two EC2 instances, both in `ap-southeast-2a`. What failure takes the whole app down?', ['A single instance crash', 'An outage of AZ a', 'An outage of another region', 'None — two instances are enough'], 1, 'Both instances share one AZ, so an AZ-level event takes both out. Spread instances across AZs.'),
            q('What connects users to CloudFront?', ['Availability Zones', 'Edge locations', 'VPC peering', 'Regions only'], 1, 'CloudFront caches content at edge locations close to users.'),
            q('A healthcare customer must keep patient data in Australia. What primarily drives their region choice?', ['Latency', 'Price', 'Data residency / compliance', 'Service count'], 2, 'Regulatory requirements usually override other factors.')
          ]),
          docs(['Regions and Availability Zones', AWS + '/AWSEC2/latest/UserGuide/using-regions-availability-zones.html'], ['AWS global infrastructure', 'https://aws.amazon.com/about-aws/global-infrastructure/'], ['Reliability pillar', AWS + '/wellarchitected/latest/reliability-pillar/welcome.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'iac-101',
    track: 'core',
    title: 'Infrastructure as Code',
    summary: 'Why teams stopped clicking in consoles — declarative vs imperative, and the IaC tool landscape.',
    icon: 'file-code',
    minutes: 9,
    level: 'Beginner',
    steps: [
      {
        title: 'From ClickOps to code',
        blocks: [
          text(
            '**Infrastructure as Code (IaC)** means describing your servers, networks and databases in text files, keeping them in Git, and letting a tool create the real resources.',
            '',
            'Clicking in the console (“ClickOps”) is fine for learning — but it doesn’t scale:'
          ),
          table(
            ['', 'ClickOps', 'Infrastructure as Code'],
            ['Repeatable', 'Hope you remember every setting', 'Same result every time'],
            ['Reviewable', 'No record of who changed what', 'Pull requests, diffs, history'],
            ['Environments', 'Rebuild dev/staging/prod by hand', 'Same code, different variables'],
            ['Disaster recovery', 'Days of archaeology', 'Re-apply the code'],
            ['Drift', 'Invisible', 'Detected on every plan']
          ),
          example('A team needs an identical staging environment for load testing. With IaC it’s `terraform workspace new staging && terraform apply` — then `destroy` when finished, paying only for the hours used.')
        ]
      },
      {
        title: 'Declarative vs imperative',
        blocks: [
          tabs(
            [
              'Declarative (what)',
              [
                text('You describe the **desired end state**. The tool figures out the steps to get there — and on the next run, only the difference.'),
                code('hcl', `resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs"
}`, 'main.tf', 'Terraform: “there should be a bucket called acme-logs”. Run it twice — nothing changes the second time.')
              ]
            ],
            [
              'Imperative (how)',
              [
                text('You write the **steps**. Running the script twice may fail or create duplicates unless you add your own checks.'),
                code('bash', `aws s3api create-bucket --bucket acme-logs \\
  --create-bucket-configuration LocationConstraint=ap-southeast-2
# run again → BucketAlreadyOwnedByYou error`, 'setup.sh')
              ]
            ]
          ),
          info('**Idempotent** = running the same thing many times produces the same result. Declarative IaC is idempotent by design.')
        ]
      },
      {
        title: 'The tool landscape',
        blocks: [
          cards(
            { title: 'Terraform / OpenTofu', icon: 'file-code', color: '#8b5cf6', md: 'Multi-cloud, declarative HCL, huge provider ecosystem. The most widely used IaC tool — and the focus of this app’s Terraform track.' },
            { title: 'AWS CloudFormation', icon: 'layers', color: '#ff9900', md: 'AWS-native, YAML/JSON templates, state managed by AWS. **AWS CDK** lets you write it in TypeScript/Python.' },
            { title: 'Azure Bicep / ARM', icon: 'layers', color: '#3b9cff', md: 'Azure-native declarative templates. Bicep is the friendlier language that compiles to ARM JSON.' },
            { title: 'Pulumi', icon: 'code-xml', color: '#e0488f', md: 'IaC in general-purpose languages (TypeScript, Python, Go) with a Terraform-like engine.' },
            { title: 'Ansible / Chef', icon: 'settings', color: '#94a3b8', md: '*Configuration management* — configures software inside servers. Complements rather than replaces provisioning tools.' }
          ),
          tip('Provisioning (create the VM) and configuration (install nginx on it) are different jobs. In the cloud-native world, **images** (AMIs, containers) and managed services have largely replaced heavy config management.'),
          quiz('iac-101', [
            q('What does “declarative” mean for IaC?', ['You write step-by-step commands', 'You describe the desired end state', 'You click in the console', 'You write Bash scripts'], 1, 'Declarative tools compare desired state to actual state and work out the changes.'),
            q('You run the same Terraform config twice with no edits. What happens on the second apply?', ['Everything is recreated', 'Duplicate resources are created', 'No changes', 'It errors'], 2, 'Declarative IaC is idempotent — reality already matches, so nothing changes.'),
            q('Which tool is AWS-only?', ['Terraform', 'Pulumi', 'CloudFormation', 'OpenTofu'], 2, 'CloudFormation (and CDK on top of it) only manages AWS resources.')
          ]),
          docs(['What is Infrastructure as Code?', TF + '/tutorials/aws-get-started/infrastructure-as-code'], ['Introduction to Terraform', TF + '/intro'], ['AWS CloudFormation', AWS + '/AWSCloudFormation/latest/UserGuide/Welcome.html'], ['Azure Bicep', 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'containers-101',
    track: 'core',
    title: 'Containers & images',
    summary: 'What a container is, how images and registries work, and why they took over deployment.',
    icon: 'box',
    minutes: 10,
    level: 'Beginner',
    steps: [
      {
        title: 'Shipping your app with everything it needs',
        blocks: [
          text(
            'A **container** packages your application together with its runtime, libraries and config into a single, portable unit. It runs the same on your laptop, in CI and in production — “works on my machine” solved.',
            '',
            'Containers share the host’s OS kernel, so they’re far lighter than virtual machines: they start in milliseconds and you can pack many onto one host.'
          ),
          table(
            ['', 'Virtual machine', 'Container'],
            ['Isolation', 'Full guest OS per VM (hypervisor)', 'Process-level, shared kernel'],
            ['Size', 'GBs', 'MBs'],
            ['Start time', 'Minutes', 'Milliseconds–seconds'],
            ['Density', 'Tens per host', 'Hundreds per host'],
            ['Unit of deploy', 'Machine image (AMI)', 'Container image']
          )
        ]
      },
      {
        title: 'Image → registry → runtime',
        blocks: [
          carousel(
            ['1 · Write a Dockerfile', [text('A **Dockerfile** is a recipe for building an image, layer by layer.'), code('dockerfile', `FROM public.ecr.aws/docker/library/node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]`, 'Dockerfile')]],
            ['2 · Build an image', [text('`docker build` executes each instruction and produces an immutable **image**, identified by a digest (`sha256:…`) and human-friendly **tags** like `v1.4.2`.'), term([{ cmd: 'docker build -t orders-api:1.4.2 .', out: '[+] Building 18.2s (10/10) FINISHED\n => naming to docker.io/library/orders-api:1.4.2' }])]],
            ['3 · Push to a registry', [text('A **registry** stores and serves images. On AWS that’s **Amazon ECR**; Azure has ACR; Google has Artifact Registry.'), term([{ cmd: 'docker tag orders-api:1.4.2 1234.dkr.ecr.ap-southeast-2.amazonaws.com/orders-api:1.4.2' }, { cmd: 'docker push 1234.dkr.ecr.ap-southeast-2.amazonaws.com/orders-api:1.4.2', out: '1.4.2: digest: sha256:9f2c…e1 size: 1789' }])]],
            ['4 · Run it anywhere', [text('An orchestrator (ECS, Kubernetes, Lambda, Cloud Run…) pulls the image from the registry and runs containers from it — as many copies as you need.')]]
          ),
          tip('Use small base images (`-slim`, distroless) and multi-stage builds. Smaller images pull faster, start faster and have fewer vulnerabilities.'),
          warn('Never bake secrets into images. Anyone who can pull the image can read every layer. Inject secrets at runtime from Secrets Manager or Parameter Store.')
        ]
      },
      {
        title: 'Who runs the containers?',
        blocks: [
          text('Running one container is easy. Running hundreds — with health checks, rolling updates, scaling and networking — needs an **orchestrator**.'),
          cards(
            { title: 'Amazon ECS', icon: 'boxes', color: '#f97316', md: 'AWS’s own orchestrator. Simple, deeply integrated. Run on EC2 or serverless **Fargate**.' },
            { title: 'Kubernetes (EKS/AKS/GKE)', icon: 'ship-wheel', color: '#326ce5', md: 'The open-source standard. Portable across clouds, enormous ecosystem, steeper learning curve.' },
            { title: 'Serverless containers', icon: 'rocket', color: '#22d3ee', md: 'AWS App Runner, Azure Container Apps, Google Cloud Run — hand over an image, get a URL.' },
            { title: 'Lambda container images', icon: 'lambda', color: '#ff9900', md: 'Package Lambda functions (up to 10 GB) as container images from ECR.' }
          ),
          quiz('containers-101', [
            q('What’s the main reason containers start faster than VMs?', ['They use SSDs', 'They share the host kernel instead of booting a full OS', 'They are written in Go', 'They skip networking'], 1, 'No guest OS boot — a container is just an isolated process.'),
            q('Where does ECS or EKS pull your image from?', ['S3', 'A container registry such as ECR', 'Your laptop', 'CloudFront'], 1, 'Images live in a registry; the orchestrator pulls by tag or digest.'),
            q('Which is a bad practice?', ['Multi-stage builds', 'Pinning image tags', 'Putting API keys in the Dockerfile', 'Scanning images'], 2, 'Secrets in image layers are readable by anyone with pull access.')
          ]),
          docs(['Docker overview', 'https://docs.docker.com/get-started/docker-overview/'], ['Containers on AWS', 'https://aws.amazon.com/containers/'], ['Amazon ECR', AWS + '/AmazonECR/latest/userguide/what-is-ecr.html'])
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  {
    id: 'k8s-101',
    track: 'core',
    title: 'Kubernetes fundamentals',
    summary: 'Pods, Deployments, Services and the control loop — explained with a live scheduler you can break.',
    icon: 'ship-wheel',
    minutes: 14,
    level: 'Intermediate',
    steps: [
      {
        title: 'Desired state, continuously enforced',
        blocks: [
          text(
            '**Kubernetes** (K8s) is an open-source platform for running containers across a cluster of machines. Its superpower is the **control loop**: you declare the desired state (“run 5 copies of v2”), and controllers continuously work to make reality match — restarting crashed containers, rescheduling from failed nodes, rolling out updates.',
            '',
            'Sound familiar? It’s the same declarative idea as Terraform, applied to running workloads.'
          ),
          diagram(
            [
              { id: 'cp', label: 'Control plane', x: 4, y: 6, group: true, w: 36, h: 88, color: '#326ce5' },
              { id: 'api', label: 'API server', x: 22, y: 25, icon: 'webhook', color: '#326ce5', note: 'The **kube-apiserver** is the front door. `kubectl`, CI pipelines and controllers all talk to it.' },
              { id: 'etcd', label: 'etcd', x: 12, y: 70, icon: 'database', color: '#326ce5', note: '**etcd** is the key-value store holding all cluster state — the source of truth.' },
              { id: 'sch', label: 'Scheduler', x: 32, y: 70, icon: 'shuffle', color: '#326ce5', note: 'The **scheduler** picks a node for each new pod based on resource requests, affinity and taints.' },
              { id: 'nodes', label: 'Worker nodes', x: 50, y: 6, group: true, w: 46, h: 88, color: '#34d399' },
              { id: 'k1', label: 'kubelet', x: 62, y: 30, icon: 'cpu', color: '#34d399', note: 'The **kubelet** on each node starts containers for the pods assigned to it and reports their health.' },
              { id: 'p1', label: 'Pods', x: 84, y: 30, icon: 'boxes', color: '#34d399', note: 'A **pod** is the smallest deployable unit: one or more containers sharing a network namespace and storage.' },
              { id: 'k2', label: 'kube-proxy', x: 62, y: 72, icon: 'split', color: '#34d399', note: '**kube-proxy** (or an eBPF CNI) programs networking so Services route to healthy pods.' },
            ],
            [
              { from: 'api', to: 'etcd', label: 'stores state' },
              { from: 'sch', to: 'api', dashed: true },
              { from: 'api', to: 'k1', label: 'pod specs', flow: true },
              { from: 'k1', to: 'p1', label: 'runs' }
            ],
            320,
            'On EKS, AKS and GKE the control plane is fully managed — you only run (or even outsource) the worker nodes.'
          )
        ]
      },
      {
        title: 'The core objects',
        blocks: [
          accordion(
            ['Pod', [text('One or more containers scheduled together on the same node. Pods are **ephemeral** — they get new IPs when replaced. You rarely create them directly.')]],
            ['Deployment & ReplicaSet', [text('A **Deployment** declares “N replicas of this pod template”. It manages ReplicaSets to perform **rolling updates** and rollbacks.'), code('yaml', `apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 3
  selector:
    matchLabels: { app: orders-api }
  template:
    metadata:
      labels: { app: orders-api }
    spec:
      containers:
        - name: api
          image: 1234.dkr.ecr.ap-southeast-2.amazonaws.com/orders-api:1.4.2
          ports: [{ containerPort: 8080 }]
          resources:
            requests: { cpu: 250m, memory: 256Mi }`, 'deployment.yaml')]],
            ['Service', [text('A stable virtual IP and DNS name in front of a changing set of pods, selected by **labels**. Types: `ClusterIP` (internal), `NodePort`, `LoadBalancer` (provisions a cloud load balancer).')]],
            ['Ingress / Gateway API', [text('HTTP routing rules (hosts, paths, TLS) into Services. On EKS the **AWS Load Balancer Controller** turns Ingress objects into ALBs.')]],
            ['ConfigMap & Secret', [text('Inject configuration and sensitive values into pods as env vars or files, keeping images environment-agnostic.')]],
            ['Namespace', [text('A logical partition of the cluster — typically per team or per environment — with its own RBAC and quotas.')]]
          ),
          terms(['Label', 'Key/value tag on objects; Services and Deployments *select* pods by label.'], ['Resource requests', 'The CPU/memory a pod reserves; the scheduler uses them to bin-pack nodes.'], ['Rolling update', 'Replace pods gradually so the app stays available during a deploy.'])
        ]
      },
      {
        title: 'Play with the scheduler',
        blocks: [
          text('Try it: scale replicas above capacity (pods go **Pending**), kill a node (pods are **rescheduled**), then roll out a new version and watch pods replaced one-by-one.'),
          widget('k8s-scheduler'),
          tip('In real clusters, **Cluster Autoscaler** or **Karpenter** watches for Pending pods and adds nodes automatically, and the **Horizontal Pod Autoscaler** adjusts replicas from metrics like CPU.')
        ]
      },
      {
        title: 'Check your understanding',
        blocks: [
          quiz('k8s-101', [
            q('A node dies. What recreates its pods elsewhere?', ['etcd', 'The Deployment/ReplicaSet controllers noticing fewer replicas than desired', 'kube-proxy', 'Nothing — you must redeploy'], 1, 'Controllers constantly reconcile actual vs desired replica counts and create replacement pods, which the scheduler places on healthy nodes.'),
            q('Why do pods show as Pending?', ['The image is too large', 'No node has enough free resources to satisfy their requests', 'The Service is missing', 'The namespace is wrong'], 1, 'Pending usually means unschedulable: insufficient CPU/memory, or taints/affinity rules.'),
            q('What gives a stable address to a changing set of pods?', ['Pod IP', 'Service', 'ConfigMap', 'Node'], 1, 'Services select pods by label and provide a stable ClusterIP / DNS name.'),
            q('Which part of Kubernetes do EKS, AKS and GKE manage for you?', ['Your pods', 'The control plane', 'Your container images', 'Your YAML'], 1, 'Managed Kubernetes runs and scales the control plane (API server, etcd, scheduler) across AZs.')
          ]),
          docs(['Kubernetes overview', K8S + '/concepts/overview/'], ['Pods', K8S + '/concepts/workloads/pods/'], ['Deployments', K8S + '/concepts/workloads/controllers/deployment/'], ['Services', K8S + '/concepts/services-networking/service/'])
        ]
      }
    ]
  }
];
