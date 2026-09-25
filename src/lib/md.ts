// Tiny markdown subset renderer for lesson copy: paragraphs, lists, **bold**, *italic*, `code`, [links](url).
// Input is authored content (not user input), but we still escape HTML first.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
      // External links open in a new tab, so say so for screen reader users (WCAG 3.2.5 advisory).
      const ext = /^https?:/.test(url);
      return ext
        ? `<a class="lnk" href="${url}" target="_blank" rel="noopener">${text}<span class="sr-only"> (opens in a new tab)</span></a>`
        : `<a class="lnk" href="${url}">${text}</a>`;
    });
}

const cache = new Map<string, string>();

export function md(src: string): string {
  const hit = cache.get(src);
  if (hit) return hit;
  const lines = src.trim().split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const ul = /^[-•]\s+(.*)/.exec(line);
    const ol = /^\d+[.)]\s+(.*)/.exec(line);
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
    } else if (!line) {
      flushPara();
      closeList();
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  const html = out.join('');
  cache.set(src, html);
  return html;
}

/** Plain text version of inline markdown, for aria-labels and document titles. */
export function plain(src: string): string {
  return src
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/** Inline markdown only (no paragraph wrapper), for places like <legend> that can't contain <p>. */
export const mdInline = (src: string): string => inline(src.trim());
