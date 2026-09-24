<script lang="ts">
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
    { name: 'On-premises', ex: 'Your own data centre', provider: 0, note: 'You own everything — power, cooling, hardware refreshes, patching, all of it.' },
    { name: 'IaaS', ex: 'Amazon EC2', provider: 4, note: 'AWS runs the hardware and hypervisor. You patch the OS, install runtimes and harden the instance.' },
    { name: 'Containers (serverless)', ex: 'ECS on Fargate', provider: 5, note: 'AWS manages hosts and their OS. You build and patch the container image (including its runtime).' },
    { name: 'Functions (FaaS)', ex: 'AWS Lambda', provider: 6, note: 'AWS patches the OS and managed runtime. You own the code, its dependencies and the permissions you grant.' },
    { name: 'SaaS', ex: 'Amazon WorkMail, Gmail…', provider: 7, note: 'The vendor runs the application too. You still own your data and who can access it.' }
  ];

  let m = $state(1);
  const model = $derived(models[m]);
</script>

<div class="wbox">
  <div class="whead"><span class="wtag">Interactive</span><h4>Shared responsibility slider</h4></div>
  <div class="ctl">
    <input type="range" min="0" max={models.length - 1} step="1" bind:value={m} style:--pct="{(m / (models.length - 1)) * 100}%" aria-label="Service model" />
    <div class="ticks">
      {#each models as mm, i}<button class:on={i === m} onclick={() => (m = i)}>{mm.name}</button>{/each}
    </div>
  </div>
  <div class="grid2">
    <div class="stack">
      {#each layers as l, i}
        {@const fromBottom = layers.length - 1 - i}
        {@const aws = fromBottom < model.provider}
        <div class="layer" class:aws style:transition-delay="{fromBottom * 25}ms">
          <span>{l}</span>
          <em>{aws ? 'Provider' : 'You'}</em>
        </div>
      {/each}
    </div>
    <div class="side">
      <div class="stat"><span>Model</span><b>{model.name}</b><small class="faint">{model.ex}</small></div>
      <p class="muted">{model.note}</p>
      <div class="legend">
        <span><i class="you"></i> Your responsibility</span>
        <span><i class="prov"></i> Cloud provider</span>
      </div>
      <p class="faint small">"Security <em>of</em> the cloud" is AWS's job; "security <em>in</em> the cloud" is yours.</p>
    </div>
  </div>
</div>

<style>
  .ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
  }
  .ticks button {
    background: none;
    border: 0;
    padding: 2px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-3);
  }
  .ticks button.on {
    color: var(--accent-2);
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
  }
  .stack {
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
    background: rgba(124, 92, 255, 0.18);
    border: 1px solid rgba(124, 92, 255, 0.4);
    transition:
      background 0.4s var(--ease),
      border-color 0.4s;
  }
  .layer.aws {
    background: rgba(255, 153, 0, 0.14);
    border-color: rgba(255, 153, 0, 0.4);
  }
  .layer em {
    font-style: normal;
    font-size: 0.72rem;
    opacity: 0.75;
  }
  .side .stat {
    margin-bottom: 12px;
  }
  .side small {
    display: block;
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
    background: rgba(124, 92, 255, 0.7);
  }
  .prov {
    background: rgba(255, 153, 0, 0.7);
  }
  .small {
    font-size: 0.82rem;
  }
</style>
