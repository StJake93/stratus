export type ToastKind = 'ok' | 'err' | 'warn' | 'info' | 'xp';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  ttl: number;
}

class Toasts {
  items = $state<Toast[]>([]);
  #id = 0;

  push(kind: ToastKind, title: string, body?: string, ttl = 4200) {
    // Collapse exact duplicates that fire in quick succession (e.g. repeated invalid drags).
    if (this.items.some((t) => t.title === title && t.body === body)) return;
    const id = ++this.#id;
    this.items = [...this.items.slice(-3), { id, kind, title, body, ttl }];
    setTimeout(() => this.dismiss(id), ttl);
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }

  ok = (t: string, b?: string) => this.push('ok', t, b);
  err = (t: string, b?: string) => this.push('err', t, b, 6000);
  warn = (t: string, b?: string) => this.push('warn', t, b, 5500);
  info = (t: string, b?: string) => this.push('info', t, b);
  xp = (t: string, b?: string) => this.push('xp', t, b, 3000);
}

export const toast = new Toasts();
