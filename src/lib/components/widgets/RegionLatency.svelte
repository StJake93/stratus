<script lang="ts">
  // Stylised world map: equirectangular projection of real lat/long.
  const regions = [
    { id: 'us-east-1', city: 'N. Virginia', lat: 38.9, lon: -77.4, azs: 6 },
    { id: 'us-west-2', city: 'Oregon', lat: 45.8, lon: -119.7, azs: 4 },
    { id: 'sa-east-1', city: 'São Paulo', lat: -23.5, lon: -46.6, azs: 3 },
    { id: 'eu-west-1', city: 'Ireland', lat: 53.3, lon: -6.3, azs: 3 },
    { id: 'eu-central-1', city: 'Frankfurt', lat: 50.1, lon: 8.7, azs: 3 },
    { id: 'me-central-1', city: 'UAE', lat: 25.2, lon: 55.3, azs: 3 },
    { id: 'af-south-1', city: 'Cape Town', lat: -33.9, lon: 18.4, azs: 3 },
    { id: 'ap-south-1', city: 'Mumbai', lat: 19.1, lon: 72.9, azs: 3 },
    { id: 'ap-southeast-1', city: 'Singapore', lat: 1.35, lon: 103.8, azs: 3 },
    { id: 'ap-northeast-1', city: 'Tokyo', lat: 35.7, lon: 139.7, azs: 4 },
    { id: 'ap-southeast-2', city: 'Sydney', lat: -33.9, lon: 151.2, azs: 3 }
  ];
  const users = [
    { id: 'perth', city: 'Perth', lat: -31.95, lon: 115.86 },
    { id: 'london', city: 'London', lat: 51.5, lon: -0.12 },
    { id: 'nyc', city: 'New York', lat: 40.7, lon: -74 },
    { id: 'saopaulo', city: 'São Paulo', lat: -23.5, lon: -46.6 },
    { id: 'tokyo', city: 'Tokyo', lat: 35.7, lon: 139.7 },
    { id: 'nairobi', city: 'Nairobi', lat: -1.29, lon: 36.8 }
  ];

  let user = $state('perth');
  let region = $state('ap-southeast-2');

  const W = 720;
  const H = 340;
  const proj = (lat: number, lon: number) => ({ x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H * 1.2 - H * 0.1 });

  function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
    const R = 6371;
    const r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r;
    const dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const u = $derived(users.find((x) => x.id === user)!);
  const rg = $derived(regions.find((x) => x.id === region)!);
  const dist = $derived(km(u, rg));
  // light in fibre ≈ 200,000 km/s; real paths are longer → ×1.6 routing factor; round trip ×2
  const rtt = $derived(Math.round(((dist * 1.6) / 200000) * 1000 * 2 + 4));
  const best = $derived(regions.reduce((a, b) => (km(u, a) < km(u, b) ? a : b)));

  const pu = $derived(proj(u.lat, u.lon));
  const pr = $derived(proj(rg.lat, rg.lon));
  const arc = $derived(`M${pu.x},${pu.y} Q${(pu.x + pr.x) / 2},${Math.min(pu.y, pr.y) - 60} ${pr.x},${pr.y}`);

  // A dotted "land-ish" backdrop generated from coarse continent boxes (purely decorative).
  const land = [
    [-165, 70, -55, 15], [-120, 15, -80, 8], [-80, 12, -35, -55], [-10, 70, 40, 36], [-18, 36, 50, -35],
    [40, 70, 180, 45], [40, 45, 145, 5], [95, 5, 150, -10], [112, -12, 154, -40], [165, -35, 178, -46]
  ];
  const dots: { x: number; y: number }[] = [];
  for (let lon = -180; lon < 180; lon += 6)
    for (let lat = 80; lat > -60; lat -= 6)
      if (land.some(([a, b, c, d]) => lon >= a && lon <= c && lat <= b && lat >= d)) dots.push(proj(lat, lon));
</script>

<div class="wbox">
  <div class="whead"><span class="wtag">Interactive</span><h4>Regions, AZs &amp; latency</h4></div>
  <div class="pick">
    <span class="eyebrow">Your users are in</span>
    {#each users as x}<button class:on={user === x.id} onclick={() => (user = x.id)}>{x.city}</button>{/each}
  </div>
  <svg viewBox="0 0 {W} {H}" class="map" role="img" aria-label="World map of AWS regions">
    {#each dots as d}<circle cx={d.x} cy={d.y} r="1.6" class="land" />{/each}
    <path d={arc} class="arc" />
    <path d={arc} class="pkt" pathLength="400" />
    {#each regions as r}
      {@const p = proj(r.lat, r.lon)}
      <g class="reg" class:on={r.id === region} class:best={r.id === best.id} onclick={() => (region = r.id)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (region = r.id)}>
        <circle cx={p.x} cy={p.y} r="12" class="halo" />
        <circle cx={p.x} cy={p.y} r="5" class="dot" />
        <text x={p.x} y={p.y - 11}>{r.id}</text>
      </g>
    {/each}
    <circle cx={pu.x} cy={pu.y} r="6" class="user" />
  </svg>
  <div class="stats">
    <div class="stat"><span>Region</span><b>{rg.id}</b><small class="faint">{rg.city} · {rg.azs} AZs</small></div>
    <div class="stat"><span>Distance</span><b>{Math.round(dist).toLocaleString()} km</b></div>
    <div class="stat"><span>Est. round trip</span><b class:good={rtt < 60} class:bad={rtt > 180}>~{rtt} ms</b></div>
  </div>
  <p class="faint small">
    {#if best.id === region}Great choice — {rg.id} is the closest region to {u.city}.{:else}Tip: {best.id} ({best.city}) is closer to {u.city}. Also weigh data residency laws, service availability and price when choosing a region.{/if}
    Click any region on the map. Estimate assumes light in fibre plus typical routing overhead.
  </p>
</div>

<style>
  .pick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .pick .eyebrow {
    margin-right: 4px;
  }
  .pick button {
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.8rem;
    font-weight: 600;
  }
  .pick button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }
  .map {
    width: 100%;
    height: auto;
    border-radius: 12px;
    background: radial-gradient(ellipse at center, rgba(124, 92, 255, 0.08), transparent 70%);
  }
  .land {
    fill: var(--surface-3);
  }
  .reg {
    cursor: pointer;
  }
  .reg text {
    font-size: 9px;
    font-weight: 600;
    fill: var(--text-3);
    text-anchor: middle;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .reg:hover text,
  .reg.on text,
  .reg.best text {
    opacity: 1;
  }
  .reg.on text {
    fill: var(--text);
  }
  .dot {
    fill: var(--aws);
  }
  .halo {
    fill: var(--aws);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .reg:hover .halo {
    opacity: 0.15;
  }
  .reg.on .halo {
    opacity: 0.3;
    animation: ping 1.6s infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes ping {
    50% {
      transform: scale(1.5);
      opacity: 0.1;
    }
  }
  .user {
    fill: var(--accent-2);
    stroke: white;
    stroke-width: 2;
  }
  .arc {
    fill: none;
    stroke: var(--accent-2);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    opacity: 0.6;
  }
  .pkt {
    fill: none;
    stroke: white;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 2 400;
    animation: travel 1.6s linear infinite;
  }
  @keyframes travel {
    from {
      stroke-dashoffset: 400;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 10px;
  }
  .stats small {
    display: block;
  }
  .stats b {
    font-size: 1.05rem !important;
  }
  .good {
    color: var(--ok);
  }
  .bad {
    color: var(--err);
  }
  .small {
    font-size: 0.8rem;
    margin: 10px 0 0;
  }
</style>
