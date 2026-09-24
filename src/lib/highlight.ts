// Lightweight regex highlighter — enough for HCL, JSON, YAML, bash, Dockerfile, Python and JS snippets.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Rule = [cls: string, re: RegExp];

const COMMON_STR: Rule = ['str', /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y];
const NUM: Rule = ['num', /\b\d+(?:\.\d+)?\b/y];

const LANGS: Record<string, Rule[]> = {
  hcl: [
    ['com', /(?:#|\/\/).*|\/\*[\s\S]*?\*\//y],
    ['str', /<<-?EOT[\s\S]*?EOT|"(?:[^"\\]|\\.)*"/y],
    ['kw', /\b(?:resource|data|variable|output|locals|module|provider|terraform|backend|required_providers|dynamic|content|lifecycle|moved|import|removed|check|for_each|count|depends_on|for|in|if|each|self|var|local|null|true|false)\b/y],
    ['fn', /\b[a-z_][a-z0-9_]*(?=\()/y],
    ['attr', /\b[a-zA-Z_][\w-]*(?=\s*=[^=])/y],
    NUM,
    ['type', /\b(?:string|number|bool|list|map|set|object|tuple|any)\b/y]
  ],
  json: [
    ['attr', /"(?:[^"\\]|\\.)*"(?=\s*:)/y],
    COMMON_STR,
    ['kw', /\b(?:true|false|null)\b/y],
    NUM
  ],
  yaml: [
    ['com', /#.*/y],
    ['attr', /[\w.\-/]+(?=:\s|:$)/y],
    COMMON_STR,
    ['kw', /\b(?:true|false|null)\b/y],
    NUM
  ],
  bash: [
    ['com', /#.*/y],
    COMMON_STR,
    ['kw', /\b(?:terraform|aws|docker|kubectl|git|export|cd|echo|curl|npm|sam|helm|eksctl)\b/y],
    ['attr', /(?<![\w-])--?[\w-]+/y],
    ['var', /\$\{?[\w]+\}?/y]
  ],
  dockerfile: [
    ['com', /#.*/y],
    ['kw', /\b(?:FROM|RUN|CMD|COPY|ADD|WORKDIR|ENV|EXPOSE|ENTRYPOINT|ARG|USER|AS)\b/y],
    COMMON_STR,
    NUM
  ],
  python: [
    ['com', /#.*/y],
    COMMON_STR,
    ['kw', /\b(?:def|return|import|from|as|if|else|elif|for|in|while|class|try|except|with|None|True|False|async|await|lambda)\b/y],
    ['fn', /\b[a-zA-Z_]\w*(?=\()/y],
    NUM
  ],
  js: [
    ['com', /\/\/.*|\/\*[\s\S]*?\*\//y],
    ['str', /`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ['kw', /\b(?:const|let|var|function|return|import|from|export|default|async|await|if|else|new|class|true|false|null|undefined)\b/y],
    ['fn', /\b[a-zA-Z_]\w*(?=\()/y],
    NUM
  ],
  text: []
};

export function highlight(code: string, lang: string): string {
  const rules = LANGS[lang] ?? [];
  if (!rules.length) return esc(code);
  let out = '';
  let i = 0;
  let plain = '';
  outer: while (i < code.length) {
    for (const [cls, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length) {
        // Only match identifiers at word boundaries to avoid colouring substrings.
        out += esc(plain) + `<span class="t-${cls}">${esc(m[0])}</span>`;
        plain = '';
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i++];
  }
  return out + esc(plain);
}
