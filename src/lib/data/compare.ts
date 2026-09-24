// Cross-cloud concept map. Each concept lists the closest equivalent on each provider
// plus the Terraform resource you'd use — a Rosetta Stone for multi-cloud learners.

export interface Offering {
  name: string;
  blurb: string;
  docs: string;
  tf: string;
}

export interface Concept {
  id: string;
  title: string;
  icon: string;
  category: 'Compute' | 'Containers' | 'Storage' | 'Databases' | 'Networking' | 'Integration' | 'Security' | 'Operations' | 'Foundations';
  summary: string;
  aws: Offering;
  azure: Offering;
  gcp: Offering;
  differences: string[];
}

const AWS = 'https://docs.aws.amazon.com';
const AZ = 'https://learn.microsoft.com/en-us/azure';
const GCP = 'https://cloud.google.com';

export const CONCEPTS: Concept[] = [
  {
    id: 'hierarchy',
    title: 'Account & resource hierarchy',
    icon: 'folder-tree',
    category: 'Foundations',
    summary: 'How resources, billing and access boundaries are organised.',
    aws: { name: 'Organizations → Accounts', blurb: 'The **account** is the hard isolation & billing boundary. Group accounts in OUs under an Organization; apply guardrails with SCPs.', docs: `${AWS}/organizations/latest/userguide/orgs_introduction.html`, tf: 'aws_organizations_account' },
    azure: { name: 'Management groups → Subscriptions → Resource groups', blurb: '**Subscriptions** are billing/quota boundaries; every resource lives in a **resource group**. Policies inherit down the tree.', docs: `${AZ}/governance/management-groups/overview`, tf: 'azurerm_resource_group' },
    gcp: { name: 'Organization → Folders → Projects', blurb: 'The **project** is the core unit: resources, APIs, billing and IAM all attach to a project.', docs: `${GCP}/resource-manager/docs/cloud-platform-resource-hierarchy`, tf: 'google_project' },
    differences: ['Azure **resource groups** have no direct AWS equivalent — AWS relies on tags and CloudFormation stacks for grouping.', 'Many teams use one AWS account / GCP project / Azure subscription **per environment per workload**.']
  },
  {
    id: 'iam',
    title: 'Identity & access',
    icon: 'key',
    category: 'Security',
    summary: 'Who can do what to which resources.',
    aws: { name: 'IAM (users, roles, policies)', blurb: 'JSON **policies** attach to identities or resources. Services assume **roles** for temporary credentials. IAM Identity Center handles workforce SSO.', docs: `${AWS}/IAM/latest/UserGuide/introduction.html`, tf: 'aws_iam_role' },
    azure: { name: 'Microsoft Entra ID + Azure RBAC', blurb: 'Entra ID is the directory. **Role assignments** grant built-in or custom roles at a scope (management group → resource). Managed identities replace keys.', docs: `${AZ}/role-based-access-control/overview`, tf: 'azurerm_role_assignment' },
    gcp: { name: 'Cloud IAM', blurb: 'Bind **roles** to principals on a resource (org, folder, project, resource). **Service accounts** are identities for workloads.', docs: `${GCP}/iam/docs/overview`, tf: 'google_project_iam_member' },
    differences: ['AWS policies are fine-grained action lists; Azure and GCP lean on predefined **roles** assigned at a scope.', 'Workload identity: AWS IAM roles ↔ Azure managed identities ↔ GCP service accounts.']
  },
  {
    id: 'vm',
    title: 'Virtual machines',
    icon: 'server',
    category: 'Compute',
    summary: 'Rent a server by the second.',
    aws: { name: 'Amazon EC2', blurb: 'Hundreds of instance types; launch from AMIs; scale with Auto Scaling groups.', docs: `${AWS}/ec2/latest/UserGuide/concepts.html`, tf: 'aws_instance' },
    azure: { name: 'Azure Virtual Machines', blurb: 'VM sizes by series; scale with **Virtual Machine Scale Sets**.', docs: `${AZ}/virtual-machines/overview`, tf: 'azurerm_linux_virtual_machine' },
    gcp: { name: 'Compute Engine', blurb: 'Predefined or **custom machine types**; scale with managed instance groups.', docs: `${GCP}/compute/docs/overview`, tf: 'google_compute_instance' },
    differences: ['Auto scaling: EC2 Auto Scaling ↔ VM Scale Sets ↔ Managed Instance Groups.', 'Spot capacity: EC2 Spot ↔ Azure Spot VMs ↔ Spot VMs (formerly preemptible).']
  },
  {
    id: 'faas',
    title: 'Serverless functions',
    icon: 'lambda',
    category: 'Compute',
    summary: 'Event-driven code with no servers to manage.',
    aws: { name: 'AWS Lambda', blurb: 'Up to 15 min per invocation, 10 GB memory; triggered by 200+ AWS event sources.', docs: `${AWS}/lambda/latest/dg/welcome.html`, tf: 'aws_lambda_function' },
    azure: { name: 'Azure Functions', blurb: 'Triggers & bindings model; Consumption, Flex Consumption and Premium plans.', docs: `${AZ}/azure-functions/functions-overview`, tf: 'azurerm_linux_function_app' },
    gcp: { name: 'Cloud Run functions', blurb: 'Formerly Cloud Functions; now built on Cloud Run with Eventarc triggers.', docs: `${GCP}/functions/docs/concepts/overview`, tf: 'google_cloudfunctions2_function' },
    differences: ['Azure Functions **bindings** declaratively wire inputs/outputs; Lambda uses event source mappings and SDK calls.', 'Cold-start mitigations: Lambda provisioned concurrency / SnapStart ↔ Functions Premium always-ready ↔ Cloud Run min instances.']
  },
  {
    id: 'serverless-containers',
    title: 'Serverless containers',
    icon: 'rocket',
    category: 'Containers',
    summary: 'Hand over a container image, get a running service.',
    aws: { name: 'ECS on Fargate / App Runner', blurb: 'Fargate runs ECS (or EKS) tasks without servers. App Runner is the simplest “image → URL” path.', docs: `${AWS}/AmazonECS/latest/developerguide/AWS_Fargate.html`, tf: 'aws_ecs_service' },
    azure: { name: 'Azure Container Apps', blurb: 'Serverless containers on managed Kubernetes with KEDA autoscaling and Dapr.', docs: `${AZ}/container-apps/overview`, tf: 'azurerm_container_app' },
    gcp: { name: 'Cloud Run', blurb: 'Request-driven containers that scale to zero; the flagship GCP serverless platform.', docs: `${GCP}/run/docs/overview/what-is-cloud-run`, tf: 'google_cloud_run_v2_service' },
    differences: ['Cloud Run and Container Apps scale to zero by default; ECS services keep a desired count running.']
  },
  {
    id: 'registry',
    title: 'Container registry',
    icon: 'package',
    category: 'Containers',
    summary: 'Private storage for container images.',
    aws: { name: 'Amazon ECR', blurb: 'Private & public repositories, scan on push, lifecycle policies, cross-region replication.', docs: `${AWS}/AmazonECR/latest/userguide/what-is-ecr.html`, tf: 'aws_ecr_repository' },
    azure: { name: 'Azure Container Registry (ACR)', blurb: 'Geo-replication, ACR Tasks for building images in the cloud.', docs: `${AZ}/container-registry/container-registry-intro`, tf: 'azurerm_container_registry' },
    gcp: { name: 'Artifact Registry', blurb: 'Stores container images *and* language packages (npm, Maven, Python).', docs: `${GCP}/artifact-registry/docs/overview`, tf: 'google_artifact_registry_repository' },
    differences: ['ECR has one repository per image name; ACR and Artifact Registry are registries containing many repositories.']
  },
  {
    id: 'k8s',
    title: 'Managed Kubernetes',
    icon: 'ship-wheel',
    category: 'Containers',
    summary: 'A managed control plane for running Kubernetes workloads.',
    aws: { name: 'Amazon EKS', blurb: 'Managed control plane across 3 AZs; managed node groups, Fargate, Karpenter, EKS Auto Mode.', docs: `${AWS}/eks/latest/userguide/what-is-eks.html`, tf: 'aws_eks_cluster' },
    azure: { name: 'Azure Kubernetes Service (AKS)', blurb: 'Free control plane tier; node pools; deep Entra ID integration.', docs: `${AZ}/aks/what-is-aks`, tf: 'azurerm_kubernetes_cluster' },
    gcp: { name: 'Google Kubernetes Engine (GKE)', blurb: 'From the creators of Kubernetes; **Autopilot** mode manages nodes for you.', docs: `${GCP}/kubernetes-engine/docs/concepts/kubernetes-engine-overview`, tf: 'google_container_cluster' },
    differences: ['Hands-off node management: EKS Auto Mode ↔ AKS Automatic ↔ GKE Autopilot.', 'Pod-level cloud identity: EKS Pod Identity / IRSA ↔ AKS Workload Identity ↔ GKE Workload Identity Federation.']
  },
  {
    id: 'object',
    title: 'Object storage',
    icon: 'archive',
    category: 'Storage',
    summary: 'Durable, virtually unlimited storage for files and blobs.',
    aws: { name: 'Amazon S3', blurb: 'Buckets of objects; storage classes from Standard to Glacier Deep Archive; 11 nines durability.', docs: `${AWS}/AmazonS3/latest/userguide/Welcome.html`, tf: 'aws_s3_bucket' },
    azure: { name: 'Azure Blob Storage', blurb: 'Containers inside a **storage account**; Hot, Cool, Cold and Archive tiers.', docs: `${AZ}/storage/blobs/storage-blobs-introduction`, tf: 'azurerm_storage_container' },
    gcp: { name: 'Cloud Storage', blurb: 'Buckets with Standard, Nearline, Coldline and Archive classes; Autoclass.', docs: `${GCP}/storage/docs/introduction`, tf: 'google_storage_bucket' },
    differences: ['Azure adds a **storage account** layer above containers (which also hosts files, queues and tables).', 'Auto-tiering: S3 Intelligent-Tiering ↔ Blob lifecycle management ↔ Cloud Storage Autoclass.']
  },
  {
    id: 'sql',
    title: 'Managed relational database',
    icon: 'database',
    category: 'Databases',
    summary: 'PostgreSQL / MySQL / SQL Server without managing servers.',
    aws: { name: 'Amazon RDS / Aurora', blurb: 'RDS for common engines; **Aurora** is AWS’s cloud-native MySQL/PostgreSQL-compatible engine.', docs: `${AWS}/AmazonRDS/latest/UserGuide/Welcome.html`, tf: 'aws_db_instance' },
    azure: { name: 'Azure SQL Database / Database for PostgreSQL', blurb: 'Azure SQL for SQL Server workloads; Flexible Server for PostgreSQL and MySQL.', docs: `${AZ}/azure-sql/database/sql-database-paas-overview`, tf: 'azurerm_postgresql_flexible_server' },
    gcp: { name: 'Cloud SQL / AlloyDB', blurb: 'Cloud SQL for MySQL, PostgreSQL, SQL Server; AlloyDB for high-performance PostgreSQL.', docs: `${GCP}/sql/docs/introduction`, tf: 'google_sql_database_instance' },
    differences: ['High availability: RDS Multi-AZ ↔ zone-redundant HA ↔ Cloud SQL regional HA.']
  },
  {
    id: 'nosql',
    title: 'NoSQL / key-value database',
    icon: 'table',
    category: 'Databases',
    summary: 'Massively scalable, schemaless data stores.',
    aws: { name: 'Amazon DynamoDB', blurb: 'Serverless key-value & document DB; single-digit ms latency; on-demand or provisioned capacity.', docs: `${AWS}/amazondynamodb/latest/developerguide/Introduction.html`, tf: 'aws_dynamodb_table' },
    azure: { name: 'Azure Cosmos DB', blurb: 'Multi-model, globally distributed; multiple APIs (NoSQL, MongoDB, Cassandra…).', docs: `${AZ}/cosmos-db/introduction`, tf: 'azurerm_cosmosdb_account' },
    gcp: { name: 'Firestore / Bigtable', blurb: 'Firestore for documents & mobile apps; Bigtable for huge wide-column workloads.', docs: `${GCP}/firestore/docs/overview`, tf: 'google_firestore_database' },
    differences: ['Cosmos DB offers five tunable consistency levels; DynamoDB offers eventual or strong reads per request.']
  },
  {
    id: 'vnet',
    title: 'Virtual network',
    icon: 'network',
    category: 'Networking',
    summary: 'Your private, isolated network in the cloud.',
    aws: { name: 'Amazon VPC', blurb: '**Regional**; subnets are pinned to one AZ; public/private determined by route tables.', docs: `${AWS}/vpc/latest/userguide/what-is-amazon-vpc.html`, tf: 'aws_vpc' },
    azure: { name: 'Azure Virtual Network (VNet)', blurb: '**Regional**; subnets span all zones in the region; NSGs filter traffic.', docs: `${AZ}/virtual-network/virtual-networks-overview`, tf: 'azurerm_virtual_network' },
    gcp: { name: 'VPC network', blurb: '**Global** VPC; subnets are regional and span zones.', docs: `${GCP}/vpc/docs/vpc`, tf: 'google_compute_network' },
    differences: ['Scope differs! AWS subnets = one AZ; Azure subnets = whole region; GCP VPCs are global with regional subnets.', 'Firewalls: Security Groups + NACLs ↔ Network Security Groups ↔ VPC firewall rules.']
  },
  {
    id: 'lb',
    title: 'Load balancing',
    icon: 'split',
    category: 'Networking',
    summary: 'Distribute traffic across healthy backends.',
    aws: { name: 'Elastic Load Balancing (ALB / NLB)', blurb: 'ALB for HTTP(S) at layer 7; NLB for TCP/UDP at layer 4.', docs: `${AWS}/elasticloadbalancing/latest/userguide/what-is-load-balancing.html`, tf: 'aws_lb' },
    azure: { name: 'Application Gateway / Load Balancer / Front Door', blurb: 'App Gateway (L7 + WAF, regional), Load Balancer (L4), Front Door (global L7).', docs: `${AZ}/load-balancer/load-balancer-overview`, tf: 'azurerm_application_gateway' },
    gcp: { name: 'Cloud Load Balancing', blurb: 'Global external Application Load Balancer with a single anycast IP; regional and internal variants.', docs: `${GCP}/load-balancing/docs/load-balancing-overview`, tf: 'google_compute_url_map' },
    differences: ['GCP’s global L7 load balancer gives one IP worldwide; AWS achieves similar with CloudFront or Global Accelerator in front of regional ALBs.']
  },
  {
    id: 'cdn',
    title: 'CDN & edge',
    icon: 'zap',
    category: 'Networking',
    summary: 'Cache content close to users worldwide.',
    aws: { name: 'Amazon CloudFront', blurb: '600+ points of presence; Lambda@Edge & CloudFront Functions; Origin Access Control for S3.', docs: `${AWS}/AmazonCloudFront/latest/DeveloperGuide/Introduction.html`, tf: 'aws_cloudfront_distribution' },
    azure: { name: 'Azure Front Door', blurb: 'Global CDN + L7 load balancing + WAF in one service.', docs: `${AZ}/frontdoor/front-door-overview`, tf: 'azurerm_cdn_frontdoor_profile' },
    gcp: { name: 'Cloud CDN', blurb: 'Enabled on the global external Application Load Balancer.', docs: `${GCP}/cdn/docs/overview`, tf: 'google_compute_backend_bucket' },
    differences: ['GCP Cloud CDN is a feature of the load balancer rather than a standalone distribution.']
  },
  {
    id: 'dns',
    title: 'DNS',
    icon: 'signpost',
    category: 'Networking',
    summary: 'Authoritative DNS hosting and routing policies.',
    aws: { name: 'Amazon Route 53', blurb: 'Hosted zones, alias records to AWS resources, latency/geo/failover routing, health checks.', docs: `${AWS}/Route53/latest/DeveloperGuide/Welcome.html`, tf: 'aws_route53_record' },
    azure: { name: 'Azure DNS / Traffic Manager', blurb: 'Azure DNS hosts zones; Traffic Manager does DNS-based traffic routing.', docs: `${AZ}/dns/dns-overview`, tf: 'azurerm_dns_a_record' },
    gcp: { name: 'Cloud DNS', blurb: 'Managed public and private zones with routing policies.', docs: `${GCP}/dns/docs/overview`, tf: 'google_dns_record_set' },
    differences: ['Route 53 alias records can point at AWS resources for free and resolve at the zone apex.']
  },
  {
    id: 'queue',
    title: 'Message queue',
    icon: 'inbox',
    category: 'Integration',
    summary: 'Decouple producers and consumers with durable queues.',
    aws: { name: 'Amazon SQS', blurb: 'Standard (at-least-once) and FIFO queues; dead-letter queues; Lambda event source.', docs: `${AWS}/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html`, tf: 'aws_sqs_queue' },
    azure: { name: 'Azure Service Bus / Queue Storage', blurb: 'Service Bus for enterprise messaging (sessions, transactions); Queue Storage for simple queues.', docs: `${AZ}/service-bus-messaging/service-bus-messaging-overview`, tf: 'azurerm_servicebus_queue' },
    gcp: { name: 'Pub/Sub (pull subscriptions) / Cloud Tasks', blurb: 'Pub/Sub subscriptions act as queues; Cloud Tasks for explicit task dispatch.', docs: `${GCP}/pubsub/docs/overview`, tf: 'google_pubsub_subscription' },
    differences: ['GCP unifies queueing and pub/sub in Pub/Sub; AWS splits them into SQS and SNS.']
  },
  {
    id: 'pubsub',
    title: 'Pub/sub & event routing',
    icon: 'radio',
    category: 'Integration',
    summary: 'Fan events out to many subscribers and route by content.',
    aws: { name: 'Amazon SNS / EventBridge', blurb: 'SNS for fan-out topics; EventBridge for content-based routing, schedules and SaaS events.', docs: `${AWS}/eventbridge/latest/userguide/eb-what-is.html`, tf: 'aws_sns_topic' },
    azure: { name: 'Azure Event Grid / Service Bus topics', blurb: 'Event Grid routes events from Azure services and custom sources.', docs: `${AZ}/event-grid/overview`, tf: 'azurerm_eventgrid_topic' },
    gcp: { name: 'Pub/Sub / Eventarc', blurb: 'Pub/Sub topics; Eventarc routes events from Google services to Cloud Run.', docs: `${GCP}/eventarc/docs/overview`, tf: 'google_pubsub_topic' },
    differences: ['Workflow orchestration: Step Functions ↔ Logic Apps / Durable Functions ↔ Workflows.']
  },
  {
    id: 'secrets',
    title: 'Secrets management',
    icon: 'lock',
    category: 'Security',
    summary: 'Store and rotate credentials and keys.',
    aws: { name: 'AWS Secrets Manager / KMS', blurb: 'Secrets Manager stores and rotates secrets; KMS manages encryption keys.', docs: `${AWS}/secretsmanager/latest/userguide/intro.html`, tf: 'aws_secretsmanager_secret' },
    azure: { name: 'Azure Key Vault', blurb: 'One service for secrets, keys and certificates.', docs: `${AZ}/key-vault/general/overview`, tf: 'azurerm_key_vault' },
    gcp: { name: 'Secret Manager / Cloud KMS', blurb: 'Versioned secrets with IAM; Cloud KMS for keys.', docs: `${GCP}/secret-manager/docs/overview`, tf: 'google_secret_manager_secret' },
    differences: ['Azure Key Vault combines what AWS splits into Secrets Manager, KMS and ACM.']
  },
  {
    id: 'monitoring',
    title: 'Monitoring & logging',
    icon: 'activity',
    category: 'Operations',
    summary: 'Metrics, logs, traces, dashboards and alerts.',
    aws: { name: 'Amazon CloudWatch / X-Ray', blurb: 'Metrics, Logs, alarms, dashboards; X-Ray / Application Signals for tracing.', docs: `${AWS}/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html`, tf: 'aws_cloudwatch_metric_alarm' },
    azure: { name: 'Azure Monitor / Application Insights', blurb: 'Log Analytics workspaces with KQL queries; App Insights for APM.', docs: `${AZ}/azure-monitor/overview`, tf: 'azurerm_monitor_metric_alert' },
    gcp: { name: 'Cloud Monitoring / Cloud Logging', blurb: 'Google Cloud Observability suite, including Cloud Trace.', docs: `${GCP}/monitoring/docs/monitoring-overview`, tf: 'google_monitoring_alert_policy' },
    differences: ['Audit logs: CloudTrail ↔ Azure Activity Log ↔ Cloud Audit Logs.']
  },
  {
    id: 'iac',
    title: 'Native Infrastructure as Code',
    icon: 'file-code',
    category: 'Operations',
    summary: 'Each cloud’s own IaC — and Terraform works across all of them.',
    aws: { name: 'CloudFormation / CDK', blurb: 'YAML/JSON templates deployed as stacks; CDK generates them from TypeScript, Python and more.', docs: `${AWS}/AWSCloudFormation/latest/UserGuide/Welcome.html`, tf: 'provider "aws"' },
    azure: { name: 'Bicep / ARM templates', blurb: 'Bicep is a concise DSL compiling to ARM JSON; deployment stacks manage lifecycle.', docs: `${AZ}/azure-resource-manager/bicep/overview`, tf: 'provider "azurerm"' },
    gcp: { name: 'Infrastructure Manager', blurb: 'Google’s managed service for running **Terraform** configurations.', docs: `${GCP}/infrastructure-manager/docs/overview`, tf: 'provider "google"' },
    differences: ['Terraform uses the **same workflow** everywhere — only the provider and resource types change.']
  }
];

export const CONCEPT: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));
