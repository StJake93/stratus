<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { TRACKS } from '../data/tracks';
  import { LESSON, LESSONS } from '../data/lessons';
  import { SCENARIOS } from '../data/scenarios';
  import { BADGES } from '../data/badges';
  import { progress } from '../stores/progress.svelte';
  import { href } from '../stores/router.svelte';

  const ordered = TRACKS.flatMap((t) => t.lessons).filter((id) => LESSON[id]);
  const next = $derived(LESSON[ordered.find((id) => !progress.lessonDone(id)) ?? ordered[0]]);
  const started = $derived(Object.keys(progress.d.lessons).length > 0 || Object.keys(progress.d.steps).length > 0);
  const doneCount = $derived(Object.keys(progress.d.lessons).length);
  const nextScenario = $derived(SCENARIOS.find((s) => !progress.scenarioDone(s.id)) ?? SCENARIOS[0]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const stepPct = (id: string) => {
    const l = LESSON[id];
    return l ? (progress.d.steps[id]?.length ?? 0) / l.steps.length : 0;
  };
  const status = (id: string) => {
    const l = LESSON[id];
    const steps = progress.d.steps[id]?.length ?? 0;
    if (progress.lessonDone(id)) return 'completed';
    if (next.id === id) return steps ? `next up, ${steps} of ${l.steps.length} steps done` : 'next up';
    return steps ? `${steps} of ${l.steps.length} steps done` : 'not started';
  };

  // Tooltips are hoverable and dismissible with Escape (WCAG 1.4.13).
  let tipsHidden = $state(false);
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') tipsHidden = true;
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="page">
  <section class="hero fade-in">
    <div class="copy">
      <span class="eyebrow">{greet} · Level {progress.level.n} {progress.level.title}</span>
      <h1>Learn cloud infrastructure <span class="grad-text">by building it.</span></h1>
      <p class="muted lead">Interactive lessons on AWS and Terraform, from first principles to drag-and-drop architectures with live validation and Terraform export.</p>
      <div class="row cta">
        <a class="btn primary" href={href.lesson(next.id)}><Icon name="play" size={16} /> {started ? 'Continue' : 'Start'}: {next.title}</a>
        <a class="btn" href={href.play()}><Icon name="blocks" size={16} /> Open the canvas</a>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><Icon name="graduation" size={18} /><b>{doneCount}<small>/{LESSONS.length}</small></b><span>Lessons</span></div>
      <div class="stat"><Icon name="blocks" size={18} /><b>{Object.keys(progress.d.scenarios).length}<small>/{SCENARIOS.length}</small></b><span>Scenarios</span></div>
      <div class="stat"><Icon name="zap" size={18} /><b>{progress.d.xp.toLocaleString()}</b><span>XP</span></div>
      <div class="stat"><Icon name="award" size={18} /><b>{progress.d.badges.length}<small>/{BADGES.length}</small></b><span>Badges</span></div>
    </div>
  </section>

  <section class="path card" data-tour="path">
    <header class="sh">
      <div>
        <h2>Your learning path</h2>
        <p class="muted">Every lesson in order. Filled nodes are complete, and you can select any node to jump in.</p>
      </div>
    </header>
    <div class="lanes">
      {#each TRACKS as t, ti (t.id)}
        {@const ids = t.lessons.filter((id) => LESSON[id])}
        {@const done = ids.filter((id) => progress.lessonDone(id)).length}
        <div class="lane" style:--tc={t.color} style:animation-delay="{ti * 70}ms">
          <a class="lane-h" href={href.track(t.id)}>
            <strong>{t.title}</strong>
            <small>{done}/{ids.length} complete</small>
          </a>
          <ol class="nodes" class:tips-off={tipsHidden} aria-label="{t.title} lessons" onmouseover={() => (tipsHidden = false)} onfocusin={() => (tipsHidden = false)}>
            {#each ids as id, i (id)}
              {@const l = LESSON[id]}
              {@const d = progress.lessonDone(id)}
              {@const p = stepPct(id)}
              <li class="step" class:first={i === 0}>
                {#if i > 0}<span class="link" class:lit={progress.lessonDone(ids[i - 1])} aria-hidden="true"></span>{/if}
                <a
                  class="node"
                  class:done={d}
                  class:current={next.id === id}
                  class:edge-l={i < 2}
                  class:edge-r={i > ids.length - 3 && i >= 2}
                  href={href.lesson(id)}
                  style:--p={p}
                  aria-label="{l.title}, {status(id)}"
                >
                  <span class="dot" aria-hidden="true"><Icon name={d ? 'check' : l.icon} size={16} stroke={d ? 3 : 2} /></span>
                  <span class="tip" aria-hidden="true">{l.title}<small>{l.minutes} min · {l.level} · {status(id)}</small></span>
                </a>
              </li>
            {/each}
          </ol>
        </div>
      {/each}
    </div>
  </section>

  <h2 class="sr-only">Explore</h2>
  <section class="grid tiles" aria-label="Explore">
    <a class="tile aws" href={href.provider('aws')}>
      <span class="ti"><Icon name="cloud" size={22} /></span>
      <h3>AWS</h3>
      <p>IAM, VPC, EC2, S3, Lambda, ECR, ECS, EKS, databases, messaging and more.</p>
      <span class="go">Explore <Icon name="arrow-right" size={14} /></span>
    </a>
    <a class="tile tf" href={href.provider('terraform')}>
      <span class="ti"><Icon name="file-code" size={22} /></span>
      <h3>Terraform</h3>
      <p>HCL, plan and apply, state, modules and for_each, all with interactive simulators.</p>
      <span class="go">Explore <Icon name="arrow-right" size={14} /></span>
    </a>
    <a class="tile scn" href={href.play(nextScenario.id)}>
      <span class="ti"><Icon name={nextScenario.icon} size={22} /></span>
      <h3>Next scenario</h3>
      <p><strong>{nextScenario.title}:</strong> {nextScenario.summary}</p>
      <span class="go">Start building <Icon name="arrow-right" size={14} /></span>
    </a>
    <a class="tile cmp" href={href.compare()}>
      <span class="ti"><Icon name="git-compare" size={22} /></span>
      <h3>Compare clouds</h3>
      <p>Map AWS ↔ Azure ↔ Google Cloud services and the Terraform resource names for each.</p>
      <span class="go">Compare <Icon name="arrow-right" size={14} /></span>
    </a>
  </section>
</div>

<style>
  .page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 36px 32px 64px;
  }
  .hero {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 28px;
    align-items: center;
    margin-bottom: 28px;
  }
  .hero h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.08;
    margin: 10px 0 12px;
    letter-spacing: -0.035em;
  }
  .lead {
    font-size: 1.05rem;
    max-width: 580px;
  }
  .cta {
    flex-wrap: wrap;
    margin-top: 18px;
  }
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .stat {
    padding: 16px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--accent-2-fg);
  }
  .stat b {
    display: block;
    font-size: 1.7rem;
    color: var(--text);
    letter-spacing: -0.03em;
    margin-top: 6px;
  }
  .stat small {
    font-size: 0.9rem;
    color: var(--text-2);
    font-weight: 500;
  }
  .stat span {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
  }
  .path {
    padding: 22px 24px;
    margin-bottom: 24px;
    background:
      radial-gradient(80% 60% at 100% 100%, rgba(124, 92, 255, 0.08), transparent 70%),
      var(--surface);
  }
  .sh h2 {
    margin: 0 0 2px;
  }
  .sh p {
    margin: 0 0 16px;
    font-size: 0.9rem;
  }
  .lanes {
    display: grid;
    gap: 6px;
  }
  .lane {
    display: grid;
    grid-template-columns: 200px 1fr;
    align-items: center;
    gap: 16px;
    padding: 8px 0;
    animation: fadeIn 0.5s var(--ease) both;
  }
  .lane-h {
    color: var(--text);
    border-left: 3px solid var(--tc);
    padding-left: 10px;
  }
  .lane-h:hover {
    text-decoration: none;
  }
  .lane-h strong {
    display: block;
    font-size: 0.92rem;
  }
  .lane-h small {
    font-size: 0.74rem;
    color: var(--text-3);
  }
  /* No scroll container here: lanes wrap instead, so tooltips, the pulse ring and hover scale are never clipped. */
  .nodes {
    list-style: none;
    margin: 0;
    padding: 6px 4px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    row-gap: 14px;
  }
  .step {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    max-width: 102px;
  }
  .step.first {
    flex: 0 0 auto;
    max-width: none;
  }
  .link {
    flex: 1;
    min-width: 14px;
    max-width: 60px;
    height: 3px;
    border-radius: 3px;
    background: var(--track);
  }
  .link.lit {
    background: var(--tc);
  }
  .node {
    position: relative;
    flex: none;
    border-radius: 50%;
  }
  .node:focus-visible {
    outline-offset: 4px;
  }
  .dot {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--text-2);
    background:
      conic-gradient(var(--tc) calc(var(--p) * 360deg), transparent 0) border-box,
      var(--solid);
    border: 3px solid transparent;
    box-shadow: inset 0 0 0 1px var(--border-input);
    transition:
      transform 0.25s var(--ease),
      box-shadow 0.25s;
  }
  .node:hover .dot {
    transform: scale(1.12);
  }
  .node.done .dot {
    background: var(--tc);
    color: #0b0f1a;
    box-shadow: 0 0 18px -4px var(--tc);
  }
  .node.current .dot {
    box-shadow:
      0 0 0 3px var(--bg),
      0 0 0 5px var(--tc);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    50% {
      box-shadow:
        0 0 0 3px var(--bg),
        0 0 0 8px color-mix(in srgb, var(--tc) 40%, transparent);
    }
  }
  .tip {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translate(-50%, 4px);
    opacity: 0;
    visibility: hidden;
    white-space: nowrap;
    padding: 6px 10px;
    border-radius: 9px;
    background: var(--solid);
    border: 1px solid var(--border-strong);
    color: var(--text);
    font-size: 0.8rem;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    transition:
      opacity 0.2s var(--ease),
      transform 0.2s var(--ease),
      visibility 0.2s;
    z-index: 20;
  }
  /* Invisible bridge so the pointer can move from the node onto the tooltip without it closing. */
  .tip::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 12px;
  }
  .tip small {
    display: block;
    font-weight: 400;
    color: var(--text-2);
    font-size: 0.74rem;
  }
  /* Keep tooltips inside the card at either end of a lane. */
  .edge-l .tip {
    left: -4px;
    transform: translate(0, 4px);
  }
  .edge-r .tip {
    left: auto;
    right: -4px;
    transform: translate(0, 4px);
  }
  .node:hover .tip,
  .node:focus-visible .tip {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, 0);
  }
  .edge-l:hover .tip,
  .edge-l:focus-visible .tip,
  .edge-r:hover .tip,
  .edge-r:focus-visible .tip {
    transform: none;
  }
  .tips-off .tip {
    opacity: 0 !important;
    visibility: hidden !important;
  }
  @media (hover: none) {
    .tip {
      display: none;
    }
  }
  .tiles {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .tile {
    --tc: var(--accent);
    display: flex;
    flex-direction: column;
    padding: 20px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: linear-gradient(160deg, color-mix(in srgb, var(--tc) 12%, transparent), transparent 60%), var(--surface);
    color: var(--text);
    transition:
      transform 0.25s var(--ease),
      border-color 0.25s,
      box-shadow 0.25s;
  }
  .tile:hover {
    text-decoration: none;
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--tc) 50%, transparent);
    box-shadow: 0 20px 40px -24px var(--tc);
  }
  .tile {
    --tfg: var(--accent-fg);
  }
  .tile.aws {
    --tc: var(--aws);
    --tfg: var(--aws-fg);
  }
  .tile.tf {
    --tc: var(--tf);
    --tfg: var(--tf-fg);
  }
  .tile.scn {
    --tc: var(--accent-2);
    --tfg: var(--accent-2-fg);
  }
  .tile.cmp {
    --tc: var(--ok);
    --tfg: var(--ok-fg);
  }
  .ti {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--tc) 18%, transparent);
    color: var(--tfg);
    margin-bottom: 14px;
  }
  .tile h3 {
    margin: 0 0 6px;
  }
  .tile p {
    color: var(--text-2);
    font-size: 0.88rem;
    flex: 1;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--tfg);
  }
  @media (max-width: 900px) {
    .page {
      padding: 56px 16px 48px;
    }
    .hero {
      grid-template-columns: 1fr;
    }
    .lane {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }
</style>
