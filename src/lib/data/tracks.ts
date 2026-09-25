import type { Track } from './types';

export const TRACKS: Track[] = [
  {
    id: 'core',
    provider: 'core',
    title: 'Cloud Foundations',
    blurb: 'The vocabulary every cloud engineer needs: service models, regions, IaC, containers and Kubernetes.',
    color: '#22d3ee',
    lessons: ['cloud-101', 'regions-azs', 'iac-101', 'containers-101', 'k8s-101']
  },
  {
    id: 'aws-core',
    provider: 'aws',
    title: 'AWS Essentials',
    blurb: 'Identity, networking, virtual machines and storage: the building blocks under everything else.',
    color: '#ff9900',
    lessons: ['aws-iam', 'aws-vpc', 'aws-vpc-security', 'aws-ec2', 'aws-s3']
  },
  {
    id: 'aws-compute',
    provider: 'aws',
    title: 'Serverless & Containers',
    blurb: 'Lambda, API Gateway, ECR, ECS/Fargate and EKS: modern ways to run code on AWS.',
    color: '#f97316',
    lessons: ['aws-lambda', 'aws-apigw', 'aws-ecr', 'aws-ecs', 'aws-eks']
  },
  {
    id: 'aws-data',
    provider: 'aws',
    title: 'Data, Messaging & Operations',
    blurb: 'Databases, queues and events, the edge, and keeping it all observable.',
    color: '#5b8def',
    lessons: ['aws-databases', 'aws-messaging', 'aws-edge', 'aws-observability']
  },
  {
    id: 'terraform',
    provider: 'terraform',
    title: 'Terraform',
    blurb: 'Infrastructure as code from first resource to reusable modules, remote state and CI pipelines.',
    color: '#8b5cf6',
    lessons: ['tf-intro', 'tf-hcl', 'tf-workflow', 'tf-state', 'tf-deps', 'tf-meta', 'tf-modules', 'tf-aws']
  }
];

export const TRACK: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
