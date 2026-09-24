import type { Block, QuizQuestion, WidgetId, DiagramNode, DiagramEdge } from '../types';

// Authoring helpers so lesson files read like content, not JSON.

export const text = (...lines: string[]): Block => ({ type: 'text', md: lines.join('\n') });
export const tip = (md: string, title?: string): Block => ({ type: 'callout', variant: 'tip', md, title });
export const warn = (md: string, title?: string): Block => ({ type: 'callout', variant: 'warn', md, title });
export const info = (md: string, title?: string): Block => ({ type: 'callout', variant: 'info', md, title });
export const mistake = (md: string, title?: string): Block => ({ type: 'callout', variant: 'error', md, title });
export const example = (md: string, title?: string): Block => ({ type: 'callout', variant: 'example', md, title });
export const code = (lang: Extract<Block, { type: 'code' }>['lang'], src: string, file?: string, caption?: string): Block => ({ type: 'code', lang, code: src, file, caption });
export const widget = (w: WidgetId): Block => ({ type: 'widget', widget: w });
export const tabs = (...t: [string, Block[]][]): Block => ({ type: 'tabs', tabs: t.map(([label, blocks]) => ({ label, blocks })) });
export const accordion = (...t: [string, Block[]][]): Block => ({ type: 'accordion', items: t.map(([title, blocks]) => ({ title, blocks })) });
export const carousel = (...t: [string, Block[]][]): Block => ({ type: 'carousel', slides: t.map(([title, blocks]) => ({ title, blocks })) });
export const quiz = (id: string, questions: QuizQuestion[]): Block => ({ type: 'quiz', id, questions });
export const q = (question: string, options: string[], answer: number, explain: string): QuizQuestion => ({ q: question, options, answer, explain });
export const docs = (...links: [string, string][]): Block => ({ type: 'docs', links: links.map(([title, url]) => ({ title, url })) });
export const terms = (...t: [string, string][]): Block => ({ type: 'keyterms', terms: t.map(([term, def]) => ({ term, def })) });
export const cards = (...items: { title: string; icon?: string; md: string; color?: string }[]): Block => ({ type: 'cards', items });
export const table = (columns: string[], ...rows: string[][]): Block => ({ type: 'compare', columns, rows });
export const term = (lines: { cmd?: string; out?: string }[], title?: string): Block => ({ type: 'terminal', lines, title });
export const challenge = (scenario: string, md: string): Block => ({ type: 'challenge', scenario, md });
export const diagram = (nodes: DiagramNode[], edges: DiagramEdge[], height?: number, caption?: string): Block => ({ type: 'diagram', nodes, edges, height, caption });

export const AWS = 'https://docs.aws.amazon.com';
export const TF = 'https://developer.hashicorp.com/terraform';
export const K8S = 'https://kubernetes.io/docs';
