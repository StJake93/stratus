import { announce } from './announce.svelte';
import { plain } from '../md';

export type ToastKind = 'ok' | 'err' | 'warn' | 'info' | 'xp';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  /** Auto-dismiss after this many ms; 0 keeps it until dismissed. */
  ttl: number;
}

// Errors stay until dismissed and timers pause while a toast is hovered or focused (WCAG 2.2.1).
const TTL: Record<ToastKind, number> = { ok: 5000, info: 5000, xp: 3500, warn: 9000, err: 0 };

class Toasts {
  items = $state<Toast[]>([]);
  #id = 0;
  #timers = new Map<number, { handle: ReturnType<typeof setTimeout>; remaining: number; started: number }>();

  push(kind: ToastKind, title: string, body?: string) {
    // Collapse exact duplicates that fire in quick succession (e.g. repeated invalid drags).
    if (this.items.some((t) => t.title === title && t.body === body)) return;
    const id = ++this.#id;
    const ttl = TTL[kind];
    const dropped = this.items.slice(0, Math.max(0, this.items.length - 3));
    dropped.forEach((t) => this.#clear(t.id));
    this.items = [...this.items.slice(-3), { id, kind, title, body, ttl }];
    if (ttl) this.#arm(id, ttl);
    announce(`${title}${body ? `. ${plain(body)}` : ''}`, kind === 'err');
  }

  #arm(id: number, ms: number) {
    this.#timers.set(id, { handle: setTimeout(() => this.dismiss(id), ms), remaining: ms, started: Date.now() });
  }

  #clear(id: number) {
    const t = this.#timers.get(id);
    if (t) clearTimeout(t.handle);
    this.#timers.delete(id);
  }

  pause(id: number) {
    const t = this.#timers.get(id);
    if (!t) return;
    clearTimeout(t.handle);
    t.remaining = Math.max(0, t.remaining - (Date.now() - t.started));
  }

  resume(id: number) {
    const t = this.#timers.get(id);
    if (!t) return;
    this.#arm(id, Math.max(1500, t.remaining));
  }

  dismiss(id: number) {
    this.#clear(id);
    this.items = this.items.filter((t) => t.id !== id);
  }

  ok = (t: string, b?: string) => this.push('ok', t, b);
  err = (t: string, b?: string) => this.push('err', t, b);
  warn = (t: string, b?: string) => this.push('warn', t, b);
  info = (t: string, b?: string) => this.push('info', t, b);
  xp = (t: string, b?: string) => this.push('xp', t, b);
}

export const toast = new Toasts();
