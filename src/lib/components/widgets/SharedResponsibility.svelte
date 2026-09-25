<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';

  const layers = [
    'Customer data',
    'Identity & access configuration',
    'Application code',
    'Runtime & middleware',
    'Guest operating system',
    'Virtualization',
    'Network infrastructure',
    'Servers & storage hardware',
    'Physical data centres'
  ];

  const models = [
    { name: 'On-premises', ex: 'Your own data centre', provider: 0, note: 'You own everything: power, cooling, hardware refreshes and every patch.' },
    { name: 'IaaS', ex: 'Amazon EC2', provider: 4, note: 'AWS runs the hardware and hypervisor. You patch the OS, install runtimes and harden the instance.' },
    { name: 'Containers (serverless)', ex: 'ECS on Fargate', provider: 5, note: 'AWS manages hosts and their OS. You build and patch the container image, including its runtime.' },
    { name: 'Functions (FaaS)', ex: 'AWS Lambda', provider: 6, note: 'AWS patches the OS and managed runtime. You own the code, its dependencies and the permissions you grant.' },
    { name: 'SaaS', ex: 'Amazon WorkMail, Gmail…', provider: 7, note: 'The vendor runs the application too. You still own your data and who can access it.' }
  ];

  let m = $state(1);
  const model = $derived(models[m]);
  const id = `sr-${Math.random().toString(36).slice(2, 8)}`;
</script>

<WidgetFrame title="Shared responsibility slider">
  <div class="ctl">
    <label for={id}><span>Service model</span></label>
    <input
      {id}
      type="range"
      min="0"
      max={models.length - 1}
      step="1"
      bind:value={m}
      style:--pct="{(m / (models.length - 1)) * 100}%"
      aria-valuetext="{model.name}, for example {model.ex}"
    />
    <div class="ticks" aria-hidden="true">
      {#each models as mm, i}<button tabindex="-1" class:on={i === m} onclick={() => (m = i)}>{mm.name}</button>{/each}
    </div>
  </div>
  <div class="grid2">
    <ul class="stack" aria-label="Responsibility by layer for {model.name}">
      {#each layers as l, i}
        {@const fromBottom = layers.length - 1 - i}
        {@const aws = fromBottom < model.provider}
        <li class="layer" class:aws style:transition-delay="{fromBottom * 25}ms">
          <span>{l}</span>
          <em><span class="sr-only">: </span>{aws ? 'Provider' : 'You'}</em>
        </li>
      {/each}
    </ul>
    <div class="side" aria-live="polite">
      <div class="stat"><span>Model</span><b>{model.name}</b><small>{model.ex}</small></div>
      <p class="note">{model.note}</p>
      <div class="legend" aria-hidden="true">
        <span><i class="you"></i> Your responsibility</span>
        <span><i class="prov"></i> Cloud provider</span>
      </div>
      <p class="faint small">“Security <em>of</em> the cloud” is AWS’s job; “security <em>in</em> the cloud” is yours.</p>
    </div>
  </div>
</WidgetFrame>

<style>
  .ticks {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin-top: 4px;
  }
  .ticks button {
    min-height: 24px;
    background: none;
    border: 0;
    padding: 2px 4px;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--text-3);
    border-radius: 6px;
  }
  .ticks button:hover {
    color: var(--text);
  }
  .ticks button.on {
    color: var(--accent-2-fg);
    font-weight: 700;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 18px;
  }
  @media (max-width: 640px) {
    .grid2 {
      grid-template-columns: 1fr;
    }
    .ticks button {
      font-size: 0.66rem;
    }
  }
  .stack {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .layer {
    display: flex;
    justify-content: space-between;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 0.83rem;
    font-weight: 600;
    background: rgba(124, 92, 255, 0.16);
    border: 1px solid rgba(124, 92, 255, 0.45);
    transition:
      background 0.4s var(--ease),
      border-color 0.4s;
  }
  .layer.aws {
    background: rgba(255, 153, 0, 0.14);
    border-color: rgba(255, 153, 0, 0.5);
  }
  .layer em {
    font-style: normal;
    font-size: 0.74rem;
    color: var(--text-2);
  }
  .side .stat {
    margin-bottom: 12px;
  }
  .side small {
    display: block;
    color: var(--text-2);
  }
  .note {
    color: var(--text-2);
  }
  .legend {
    display: flex;
    gap: 14px;
    font-size: 0.8rem;
    color: var(--text-2);
    margin-bottom: 8px;
  }
  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 4px;
  }
  .you {
    background: rgba(124, 92, 255, 0.8);
  }
  .prov {
    background: rgba(255, 153, 0, 0.8);
  }
  .small {
    font-size: 0.82rem;
  }
</style>
