<script lang="ts">
  import Icon from '../Icon.svelte';
  import { highlight } from '../../highlight';
  import { toast } from '../../stores/toast.svelte';
  import { scrollable } from '../../actions';

  let { code, lang = 'text', file, caption }: { code: string; lang?: string; file?: string; caption?: string } = $props();
  const html = $derived(highlight(code.replace(/^\n+|\s+$/g, ''), lang));
  const name = $derived(file ?? `${lang.toUpperCase()} snippet`);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.trim());
      toast.info('Copied to clipboard');
    } catch {
      toast.warn('Clipboard unavailable');
    }
  }
</script>

<figure class="code" aria-label={name}>
  <header>
    <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="file">{file ?? lang.toUpperCase()}</span>
    <button class="btn sm ghost" onclick={copy} aria-label="Copy {name}"><Icon name="copy" size={14} /></button>
  </header>
  <!-- Becomes focusable when lines overflow, so keyboard users can scroll them (WCAG 2.1.1). -->
  <pre use:scrollable><code>{@html html}</code></pre>
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .code {
    margin: 14px 0 18px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: #0b0f1c;
    overflow: hidden;
  }
  :global([data-theme='light']) .code {
    background: #111827;
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px 6px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: #a3adc2;
  }
  header .btn {
    color: #d6deeb;
  }
  header .btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .dots {
    display: flex;
    gap: 5px;
  }
  .dots i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #2a3146;
  }
  .file {
    flex: 1;
    font-family: var(--mono);
    font-size: 0.75rem;
  }
  pre {
    margin: 0;
    padding: 14px 16px;
    overflow-x: auto;
    font-size: 0.82rem;
    line-height: 1.65;
    color: #d6deeb;
  }
  pre:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: -2px;
  }
  pre code {
    background: none;
    border: 0;
    padding: 0;
    font-size: inherit;
  }
  figcaption {
    padding: 8px 14px;
    font-size: 0.8rem;
    color: #a3adc2;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  /* Token colours are checked against every code background by scripts/contrast.mjs. */
  :global(.t-com) {
    color: #8a96bb;
    font-style: italic;
  }
  :global(.t-str) {
    color: #a5e075;
  }
  :global(.t-kw) {
    color: #c792ea;
  }
  :global(.t-fn) {
    color: #82aaff;
  }
  :global(.t-attr) {
    color: #7fdbca;
  }
  :global(.t-num) {
    color: #f78c6c;
  }
  :global(.t-type) {
    color: #ffcb6b;
  }
  :global(.t-var) {
    color: #ffcb6b;
  }
</style>
