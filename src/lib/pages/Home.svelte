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
</script>

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
        <p class="muted">Every lesson in order. Filled nodes are complete — click one to jump in.</p>
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
          <div class="nodes">
            {#each ids as id, i (id)}
              {@const l = LESSON[id]}
              {@const d = progress.lessonDone(id)}
              {@const p = stepPct(id)}
              {#if i > 0}<span class="link" class:lit={progress.lessonDone(ids[i - 1])}></span>{/if}
              <a class="node" class:done={d} class:current={next.id === id} href={href.lesson(id)} style:--p={p} aria-label={l.title}>
                <span class="dot"><Icon name={d ? 'check' : l.icon} size={16} stroke={d ? 3 : 2} /></span>
                <span class="tip">{l.title}<small>{l.minutes} min · {l.level}</small></span>
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="grid tiles">
    <a class="tile aws" href={href.provider('aws')}>
      <span class="ti"><Icon name="cloud" size={22} /></span>
      <h3>AWS</h3>
      <p>IAM, VPC, EC2, S3, Lambda, ECR, ECS, EKS, databases, messaging and more.</p>
      <span class="go">Explore <Icon name="arrow-right" size={14} /></span>
    </a>
    <a class="tile tf" href={href.provider('terraform')}>
      <span class="ti"><Icon name="file-code" size={22} /></span>
      <h3>Terraform</h3>
      <p>HCL, plan/apply, state, modules and for_each — with interactive simulators.</p>
      <span class="go">Explore <Icon name="arrow-right" size={14} /></span>
    </a>
    <a class="tile scn" href={href.play(nextScenario.id)}>
      <span class="ti"><Icon name={nextScenario.icon} size={22} /></span>
      <h3>Next scenario</h3>
      <p><strong>{nextScenario.title}</strong> — {nextScenario.summary}</p>
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
    color: var(--accent-2);
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
    color: var(--text-3);
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
  .nodes {
    display: flex;
    align-items: center;
    overflow-x: auto;
    padding: 6px 4px;
    scrollbar-width: none;
  }
  .link {
    flex: 1;
    min-width: 14px;
    max-width: 60px;
    height: 3px;
    border-radius: 3px;
    background: var(--surface-3);
  }
  .link.lit {
    background: var(--tc);
  }
  .node {
    position: relative;
    flex: none;
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
    box-shadow: inset 0 0 0 1px var(--border-strong);
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
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translate(-50%, 4px);
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    padding: 6px 10px;
    border-radius: 9px;
    background: var(--solid-2);
    border: 1px solid var(--border-strong);
    color: var(--text);
    font-size: 0.78rem;
    font-weight: 600;
    box-shadow: var(--shadow);
    transition: all 0.2s var(--ease);
    z-index: 5;
  }
  .tip small {
    display: block;
    font-weight: 400;
    color: var(--text-3);
    font-size: 0.7rem;
  }
  .node:hover .tip,
  .node:focus-visible .tip {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  .nodes {
    padding-top: 50px;
    margin-top: -44px;
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
  .tile.aws {
    --tc: var(--aws);
  }
  .tile.tf {
    --tc: var(--tf);
  }
  .tile.scn {
    --tc: var(--accent-2);
  }
  .tile.cmp {
    --tc: var(--ok);
  }
  .ti {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--tc) 18%, transparent);
    color: var(--tc);
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
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--tc);
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
