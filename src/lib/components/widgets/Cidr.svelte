<script lang="ts">
  import WidgetFrame from './WidgetFrame.svelte';
  import Range from '../ui/Range.svelte';

  let vpc = $state(16);
  let sub = $state(24);

  $effect(() => {
    if (sub < vpc) sub = vpc;
  });

  const base = [10, 0, 0, 0];
  const toInt = (o: number[]) => ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
  const toIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

  const vpcSize = $derived(2 ** (32 - vpc));
  const subSize = $derived(2 ** (32 - sub));
  const subnets = $derived(2 ** (sub - vpc));
  const shown = $derived(Math.min(subnets, 64));
  const cidrs = $derived(Array.from({ length: Math.min(subnets, 6) }, (_, i) => `${toIp(toInt(base) + i * subSize)}/${sub}`));
  const maskBits = $derived(Array.from({ length: 32 }, (_, i) => i < sub));
  const fmt = (n: number) => n.toLocaleString();
</script>

<WidgetFrame title="CIDR and subnet calculator">
  <div class="two">
    <Range label="VPC prefix (AWS allows /16 to /28)" bind:value={vpc} min={16} max={28} format={(v) => `10.0.0.0/${v}`} valuetext={(v) => `slash ${v}, ${fmt(2 ** (32 - v))} addresses`} />
    <Range label="Subnet prefix" bind:value={sub} min={16} max={28} format={(v) => `/${v}`} valuetext={(v) => `slash ${v}, ${fmt(2 ** (32 - v))} addresses per subnet`} />
  </div>

  <div class="bits" role="img" aria-label="Address bits: {vpc} VPC network bits, {sub - vpc} subnet bits, {32 - sub} host bits">
    {#each maskBits as net, i}
      <span class:net class:vpcpart={i < vpc} class:gap={i % 8 === 7}></span>
    {/each}
  </div>
  <div class="legend" aria-hidden="true"><span><i class="a"></i> VPC network bits ({vpc})</span><span><i class="b"></i> Subnet bits ({sub - vpc})</span><span><i class="c"></i> Host bits ({32 - sub})</span></div>

  <div class="stats">
    <div class="stat"><span>VPC addresses</span><b>{fmt(vpcSize)}</b></div>
    <div class="stat"><span>Subnets of /{sub}</span><b>{fmt(subnets)}</b></div>
    <div class="stat"><span>IPs per subnet</span><b>{fmt(subSize)}</b></div>
    <div class="stat"><span>Usable in AWS</span><b class="ok">{fmt(Math.max(0, subSize - 5))}</b></div>
  </div>
  <p class="sr-only" aria-live="polite">
    A /{vpc} VPC split into /{sub} subnets gives {fmt(subnets)} subnet{subnets === 1 ? '' : 's'} with {fmt(Math.max(0, subSize - 5))} usable addresses each.
  </p>

  <div class="blocks" aria-hidden="true">
    {#each Array(shown) as _, i}
      <span class="blk" style:animation-delay="{i * 8}ms"></span>
    {/each}
    {#if subnets > shown}<span class="more">+{fmt(subnets - shown)} more</span>{/if}
  </div>
  <p class="list">First subnets: {cidrs.join(', ')}{subnets > cidrs.length ? ', …' : ''}</p>
  <p class="faint note">AWS reserves 5 addresses in every subnet: the network address, VPC router, DNS, one for future use, and broadcast.</p>
</WidgetFrame>

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  @media (max-width: 600px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
  .bits {
    display: flex;
    gap: 2px;
    margin: 4px 0 6px;
  }
  .bits span {
    flex: 1;
    height: 18px;
    border-radius: 3px;
    background: var(--track);
    transition: background 0.3s;
  }
  .bits span.net {
    background: var(--accent-2);
  }
  .bits span.vpcpart {
    background: var(--accent-strong);
  }
  .bits span.gap {
    margin-right: 5px;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 0.78rem;
    color: var(--text-2);
    margin-bottom: 14px;
  }
  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 4px;
  }
  .a {
    background: var(--accent-strong);
  }
  .b {
    background: var(--accent-2);
  }
  .c {
    background: var(--track);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }
  .ok {
    color: var(--ok-fg);
  }
  .blocks {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  .blk {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.55), rgba(124, 92, 255, 0.55));
    animation: pop 0.3s var(--ease) both;
  }
  @keyframes pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
  }
  .more {
    font-size: 0.8rem;
    color: var(--text-2);
    margin-left: 6px;
  }
  .list {
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--text-2);
    margin: 10px 0 4px;
  }
  .note {
    font-size: 0.82rem;
    margin: 0;
  }
</style>
