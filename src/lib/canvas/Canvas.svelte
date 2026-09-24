<script lang="ts">
  import { SvelteFlow, Background, BackgroundVariant, Controls, MiniMap, Panel, useSvelteFlow, ConnectionMode, type Edge } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import ServiceNode from './ServiceNode.svelte';
  import GroupNode from './GroupNode.svelte';
  import FlowEdge from './FlowEdge.svelte';
  import Icon from '../components/Icon.svelte';
  import { board, type FlowNode } from './board.svelte';
  import { SERVICE, categoryColor } from '../data/services';
  import { settings } from '../stores/settings.svelte';
  import { progress } from '../stores/progress.svelte';
  import { toast } from '../stores/toast.svelte';

  const nodeTypes = { service: ServiceNode, group: GroupNode };
  const edgeTypes = { flow: FlowEdge };
  const { screenToFlowPosition, fitView } = useSvelteFlow();

  let wrap: HTMLDivElement;
  let dragOver = $state(false);

  // Persist any change (drags, resizes, edits) — debounced inside the store.
  $effect(() => {
    board.nodes;
    board.edges;
    board.save();
  });

  function ondrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const svc = e.dataTransfer?.getData('application/stratus');
    if (!svc) return;
    board.add(svc, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }

  $effect(() => {
    const onAdd = (e: Event) => {
      const svc = (e as CustomEvent<string>).detail;
      const r = wrap.getBoundingClientRect();
      const jitter = () => (Math.random() - 0.5) * 80;
      board.add(svc, screenToFlowPosition({ x: r.left + r.width / 2 + jitter(), y: r.top + r.height / 2 + jitter() }));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? board.redo() : board.undo();
      }
    };
    window.addEventListener('stratus:add', onAdd);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('stratus:add', onAdd);
      window.removeEventListener('keydown', onKey);
    };
  });

  const counts = $derived({
    error: board.issues.filter((i) => i.level === 'error').length,
    warn: board.issues.filter((i) => i.level === 'warn').length
  });

  function validateNow() {
    if (!board.nodes.length) return toast.info('Nothing to validate yet', 'Drag some services onto the canvas first.');
    if (counts.error) return toast.err(`${counts.error} error${counts.error > 1 ? 's' : ''} found`, 'Open the Issues tab to see what to fix and why.');
    if (counts.warn) return toast.warn(`Valid, with ${counts.warn} warning${counts.warn > 1 ? 's' : ''}`, 'It would deploy, but review the warnings for best practice.');
    toast.ok('Architecture looks great!', 'No errors or warnings. Check the Terraform tab to see it as code.');
    if (board.nodes.length >= 4) progress.recordBuild();
  }

  const minimapColor = (n: { type?: string; data: Record<string, unknown> }) => (n.type === "group" ? "transparent" : categoryColor(SERVICE[n.data.svc as string]?.category ?? "compute"));
</script>

<div
  class="canvas"
  class:over={dragOver}
  bind:this={wrap}
  role="application"
  aria-label="Infrastructure canvas"
  data-tour="canvas"
  ondragover={(e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dragOver = true;
  }}
  ondragleave={() => (dragOver = false)}
  {ondrop}
>
  <SvelteFlow
    bind:nodes={board.nodes}
    bind:edges={board.edges}
    {nodeTypes}
    {edgeTypes}
    colorMode={settings.theme}
    connectionMode={ConnectionMode.Loose}
    zIndexMode="auto"
    fitView
    fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
    minZoom={0.2}
    maxZoom={2}
    snapGrid={[10, 10]}
    deleteKey={['Backspace', 'Delete']}
    proOptions={{ hideAttribution: true }}
    onbeforeconnect={(c) => board.beforeConnect(c) ?? false}
    onnodedragstart={() => board.checkpoint()}
    onnodedragstop={({ nodes }) => nodes.forEach((n) => board.reparent(n.id))}
    onnodeclick={({ node }) => (board.selected = node.id)}
    onpaneclick={() => (board.selected = null)}
    onbeforedelete={async ({ nodes, edges }: { nodes: FlowNode[]; edges: Edge[] }) => {
      board.remove(
        nodes.map((n) => n.id),
        edges.map((e) => e.id)
      );
      return false;
    }}
  >
    <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
    <Controls showLock={false} />
    <MiniMap pannable zoomable nodeColor={minimapColor} maskColor={settings.theme === "dark" ? "rgba(10,13,23,0.6)" : "rgba(240,243,250,0.7)"} />
    <Panel position="top-center">
      <div class="toolbar glass" data-tour="toolbar">
        <button class="btn sm ghost" onclick={() => board.undo()} disabled={!board.canUndo} title="Undo (⌘Z)"><Icon name="undo-2" size={15} /></button>
        <button class="btn sm ghost" onclick={() => board.redo()} disabled={!board.canRedo} title="Redo (⇧⌘Z)"><Icon name="redo-2" size={15} /></button>
        <span class="sep"></span>
        <button class="btn sm ghost" onclick={() => fitView({ padding: 0.25, duration: 400 })} title="Fit to screen"><Icon name="maximize-2" size={15} /></button>
        <button
          class="btn sm ghost"
          onclick={() => {
            if (board.nodes.length && confirm('Clear the canvas? (You can undo this.)')) board.reset();
          }}
          title="Clear canvas"><Icon name="eraser" size={15} /></button
        >
        <span class="sep"></span>
        <button class="btn sm validate" class:bad={counts.error} class:warn={!counts.error && counts.warn} onclick={validateNow}>
          <Icon name={counts.error ? 'circle-x' : counts.warn ? 'triangle-alert' : 'shield-check'} size={15} />
          {counts.error ? `${counts.error} error${counts.error > 1 ? 's' : ''}` : counts.warn ? `${counts.warn} warning${counts.warn > 1 ? 's' : ''}` : 'Validate'}
        </button>
      </div>
    </Panel>
  </SvelteFlow>

  {#if !board.nodes.length}
    <div class="empty">
      <div class="glass box fade-in">
        <Icon name="blocks" size={30} />
        <h3>Your AWS sandbox</h3>
        <p>Drag building blocks from the palette. Start with a <strong>VPC</strong> for networked apps, or a <strong>Lambda</strong> for serverless.</p>
        <div class="row">
          <button class="btn sm" onclick={() => window.dispatchEvent(new CustomEvent('stratus:add', { detail: 'vpc' }))}><Icon name="network" size={14} /> Add a VPC</button>
          <button class="btn sm" onclick={() => window.dispatchEvent(new CustomEvent('stratus:add', { detail: 'lambda' }))}><Icon name="lambda" size={14} /> Add a Lambda</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .canvas {
    position: relative;
    height: 100%;
    min-height: 0;
    transition: box-shadow 0.2s;
  }
  .canvas.over {
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .canvas :global(.svelte-flow) {
    --xy-background-color: var(--bg);
    --xy-node-border-radius: 14px;
    --xy-minimap-background-color: var(--solid);
    --xy-controls-button-background-color: var(--solid);
    --xy-controls-button-background-color-hover: var(--solid-2);
    --xy-controls-button-color: var(--text-2);
    --xy-controls-button-border-color: var(--border);
    --xy-background-pattern-dots-color-default: var(--surface-3);
    --xy-selection-background-color: rgba(124, 92, 255, 0.08);
    --xy-selection-border: 1px dashed var(--accent);
    --xy-connectionline-stroke-default: var(--accent-2);
    --xy-connectionline-stroke-width-default: 2;
  }
  .canvas :global(.svelte-flow__node-service),
  .canvas :global(.svelte-flow__node-group) {
    background: none;
    border: 0;
    padding: 0;
    box-shadow: none;
    border-radius: 0;
    width: auto;
  }
  .canvas :global(.svelte-flow__node-group) {
    width: 100%;
  }
  .canvas :global(.svelte-flow__controls) {
    border-radius: 10px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .canvas :global(.svelte-flow__minimap) {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 12px;
    box-shadow: var(--shadow);
  }
  .sep {
    width: 1px;
    height: 20px;
    background: var(--border);
    margin: 0 4px;
  }
  .validate {
    color: var(--ok);
    border-color: transparent;
  }
  .validate.bad {
    color: var(--err);
    background: var(--err-soft);
  }
  .validate.warn {
    color: var(--warn);
    background: var(--warn-soft);
  }
  .empty {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .box {
    pointer-events: auto;
    max-width: 360px;
    text-align: center;
    padding: 24px;
    border-radius: 18px;
    color: var(--accent-2);
    box-shadow: var(--shadow-lg);
  }
  .box h3 {
    color: var(--text);
    margin: 10px 0 6px;
  }
  .box p {
    color: var(--text-2);
    font-size: 0.88rem;
  }
  .box .row {
    justify-content: center;
  }
  .box .btn {
    color: var(--text);
  }
</style>
