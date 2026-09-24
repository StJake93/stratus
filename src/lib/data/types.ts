// Content model. Lessons are pure data rendered by <Blocks/>, so adding content never needs new UI code.

export type ProviderId = 'aws' | 'terraform' | 'azure' | 'gcp';

export type WidgetId =
  | 'shared-responsibility'
  | 'cidr'
  | 'lambda-cost'
  | 'autoscaling'
  | 's3-classes'
  | 'k8s-scheduler'
  | 'tf-workflow'
  | 'tf-drift'
  | 'tf-foreach'
  | 'iam-eval'
  | 'sg-nacl'
  | 'region-latency'
  | 'queue-sim';

export interface DiagramNode {
  id: string;
  label: string;
  x: number; // 0..100 (percent of width)
  y: number; // 0..100 (percent of height)
  icon?: string; // service id or lucide-ish key
  color?: string;
  note?: string; // markdown revealed on click
  group?: boolean; // rendered as a container box
  w?: number; // container width (percent)
  h?: number; // container height (percent)
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  flow?: boolean; // animated packets
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export type Block =
  | { type: 'text'; md: string }
  | { type: 'callout'; variant: 'tip' | 'warn' | 'info' | 'error' | 'example'; title?: string; md: string }
  | { type: 'tabs'; tabs: { label: string; blocks: Block[] }[] }
  | { type: 'accordion'; items: { title: string; blocks: Block[] }[] }
  | { type: 'carousel'; slides: { title: string; blocks: Block[] }[] }
  | { type: 'code'; lang: 'hcl' | 'json' | 'bash' | 'yaml' | 'text' | 'dockerfile' | 'python' | 'js'; code: string; file?: string; caption?: string }
  | { type: 'diagram'; nodes: DiagramNode[]; edges: DiagramEdge[]; height?: number; caption?: string }
  | { type: 'widget'; widget: WidgetId }
  | { type: 'quiz'; id: string; questions: QuizQuestion[] }
  | { type: 'terminal'; title?: string; lines: { cmd?: string; out?: string }[] }
  | { type: 'compare'; columns: string[]; rows: string[][] }
  | { type: 'cards'; items: { title: string; icon?: string; md: string; color?: string }[] }
  | { type: 'challenge'; scenario: string; md: string }
  | { type: 'docs'; links: { title: string; url: string }[] }
  | { type: 'keyterms'; terms: { term: string; def: string }[] };

export interface LessonStep {
  title: string;
  blocks: Block[];
}

export interface Lesson {
  id: string;
  track: string;
  title: string;
  summary: string;
  icon: string;
  minutes: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: LessonStep[];
}

export interface Track {
  id: string;
  provider: ProviderId | 'core';
  title: string;
  blurb: string;
  color: string;
  lessons: string[];
}
