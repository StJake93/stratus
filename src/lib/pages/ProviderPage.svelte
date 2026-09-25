<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import Blocks from '../components/Blocks.svelte';
  import { TRACKS } from '../data/tracks';
  import { LESSON } from '../data/lessons';
  import { SERVICES, SERVICE, CATEGORIES, categoryColor, type Service } from '../data/services';
  import { CONCEPTS } from '../data/compare';
  import { SCENARIOS } from '../data/scenarios';
  import { progress } from '../stores/progress.svelte';
  import { href } from '../stores/router.svelte';
  import { code, accordion, tip } from '../data/lessons/h';

  let { id }: { id: string } = $props();

  const META: Record<string, { name: string; color: string; fg: string; tagline: string; docs: string; preview?: boolean }> = {
    aws: { name: 'Amazon Web Services', color: 'var(--aws)', fg: 'var(--aws-fg)', tagline: 'The largest cloud platform, with 200+ services across 30+ regions. Start with identity and networking, then pick your compute style.', docs: 'https://docs.aws.amazon.com/' },
    terraform: { name: 'HashiCorp Terraform', color: 'var(--tf)', fg: 'var(--tf-fg)', tagline: 'Declarative infrastructure as code for every cloud. Write HCL, plan the change and apply it: the same workflow everywhere.', docs: 'https://developer.hashicorp.com/terraform' },
    azure: { name: 'Microsoft Azure', color: 'var(--azure)', fg: 'var(--azure-fg)', tagline: 'Microsoft’s cloud, deeply integrated with Entra ID, Windows and .NET. A full Azure track is on the roadmap. Meanwhile, map what you know from AWS.', docs: 'https://learn.microsoft.com/en-us/azure/', preview: true },
    gcp: { name: 'Google Cloud', color: 'var(--gcp)', fg: 'var(--gcp-fg)', tagline: 'Google’s cloud: global networking, GKE, Cloud Run and BigQuery. A full GCP track is on the roadmap. Meanwhile, map what you know from AWS.', docs: 'https://docs.cloud.google.com/docs', preview: true }
  };
  const m = $derived(META[id]);
  const tracks = $derived(TRACKS.filter((t) => t.provider === id));

  const LESSON_FOR: Record<string, string> = {
    vpc: 'aws-vpc', subnet: 'aws-vpc', igw: 'aws-vpc', natgw: 'aws-vpc', vpce: 'aws-vpc', ec2: 'aws-ec2', alb: 'aws-ec2', s3: 'aws-s3', efs: 'aws-s3',
    lambda: 'aws-lambda', apigw: 'aws-apigw', ecr: 'aws-ecr', ecs: 'aws-ecs', eks: 'aws-eks', rds: 'aws-databases', dynamodb: 'aws-databases',
    elasticache: 'aws-databases', sqs: 'aws-messaging', sns: 'aws-messaging', eventbridge: 'aws-messaging', stepfunctions: 'aws-messaging',
    cloudfront: 'aws-edge', route53: 'aws-edge', waf: 'aws-edge', cloudwatch: 'aws-observability', iam: 'aws-iam', cognito: 'aws-iam', secrets: 'aws-iam'
  };

  let cat = $state('all');
  let open = $state<Service | null>(null);
  let dlg: HTMLDialogElement | undefined = $state();
  // Native modal dialog: focus trap, Escape to close and focus restoration come for free.
  $effect(() => {
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  });
  const catalog = $derived(SERVICES.filter((s) => s.category !== 'actors' && (cat === 'all' || s.category === cat)));

  const tfCheatsheet = [
    accordion(
      ['Core workflow', [code('bash', `terraform init       # download providers & modules, configure backend
terraform fmt        # canonical formatting
terraform validate   # syntax & internal consistency
terraform plan       # preview changes (use -out=tfplan in CI)
terraform apply      # make the changes (apply tfplan to apply exactly what was reviewed)
terraform destroy    # tear everything down`)]],
      ['Inspecting state', [code('bash', `terraform state list                     # every resource address
terraform state show aws_s3_bucket.logs  # attributes of one resource
terraform output                         # root module outputs
terraform graph | dot -Tsvg > graph.svg  # dependency graph`)]],
      ['Refactoring safely', [code('hcl', `# Rename a resource without destroying it
moved {
  from = aws_s3_bucket.log
  to   = aws_s3_bucket.logs
}

# Adopt something created by hand
import {
  to = aws_s3_bucket.reports
  id = "acme-reports"
}`)]],
      ['Environments & variables', [code('bash', `terraform plan -var-file=prod.tfvars
terraform workspace new staging
TF_VAR_region=eu-west-1 terraform plan`)]]
    ),
    tip('Pin provider versions with `~>` constraints and commit `.terraform.lock.hcl` so every machine uses the same provider builds.')
  ];
</script>

{#if m}
  <div class="page" style:--pc={m.color} style:--pfg={m.fg}>
    <header class="hero fade-in">
      <p class="badge">{#if m.preview}Preview{:else}Provider{/if}</p>
      <h1>{m.name}</h1>
      <p class="lead muted">{m.tagline}</p>
      <div class="row">
        <a class="btn" href={m.docs} target="_blank" rel="noopener"><Icon name="book-open" size={15} /> Official docs <Icon name="external-link" size={13} /><span class="sr-only"> (opens in a new tab)</span></a>
        {#if id === 'aws'}<a class="btn primary" href={href.play()}><Icon name="blocks" size={15} /> Build on the canvas</a>{/if}
        {#if m.preview}<a class="btn primary" href={href.compare()}><Icon name="git-compare" size={15} /> Compare with AWS</a>{/if}
      </div>
    </header>

    {#if tracks.length}
      <h2 class="sub">Learning tracks</h2>
      <div class="tracks">
        {#each tracks as t (t.id)}
          {@const ls = t.lessons.filter((l) => LESSON[l])}
          {@const done = ls.filter((l) => progress.lessonDone(l)).length}
          <a class="track" href={href.track(t.id)} style:--tc={t.color}>
            <h3>{t.title}</h3>
            <p>{t.blurb}</p>
            <div class="lessons">
              {#each ls as l}<span class:done={progress.lessonDone(l)} title={LESSON[l].title}><Icon name={LESSON[l].icon} size={14} /></span>{/each}
            </div>
            <div class="bar"><span style:width="{(done / Math.max(1, ls.length)) * 100}%"></span></div>
            <small>{done}/{ls.length} lessons</small>
          </a>
        {/each}
      </div>
    {/if}

    {#if id === 'aws'}
      <h2 class="sub">Service catalogue</h2>
      <p class="muted">Every building block available on the canvas. Click one for a quick briefing.</p>
      <div class="cats" role="group" aria-label="Filter by category">
        <button aria-pressed={cat === 'all'} onclick={() => (cat = 'all')}>All</button>
        {#each CATEGORIES.filter((c) => c.id !== 'actors') as c}<button aria-pressed={cat === c.id} onclick={() => (cat = c.id)} style:--cc={c.color}>{c.label}</button>{/each}
      </div>
      <ul class="catalog" aria-label="AWS services">
        {#each catalog as s (s.id)}
          <li>
            <button class="svc" onclick={() => (open = s)} style:--cc={categoryColor(s.category)} aria-haspopup="dialog">
              <span class="si" aria-hidden="true"><Icon name={s.icon} size={20} /></span>
              <strong>{s.name}</strong>
              <small>{s.full}</small>
            </button>
          </li>
        {/each}
      </ul>
      <h2 class="sub">Scenarios</h2>
      <div class="scns">
        {#each SCENARIOS.filter((s) => s.id !== 'tf-backend') as s (s.id)}
          <a href={href.play(s.id)} class="scn"><Icon name={s.icon} size={16} /> {s.title} {#if progress.scenarioDone(s.id)}<span class="okc"><Icon name="circle-check" size={15} /></span><span class="sr-only">(completed)</span>{/if}</a>
        {/each}
      </div>
    {:else if id === 'terraform'}
      <h2 class="sub">Command cheat sheet</h2>
      <Blocks blocks={tfCheatsheet} level={3} />
      <h2 class="sub">Practice</h2>
      <div class="scns">
        <a href={href.play('tf-backend')} class="scn"><Icon name="file-code" size={16} /> Terraform remote state backend</a>
        <a href={href.play()} class="scn"><Icon name="blocks" size={16} /> Draw any AWS diagram → see it as Terraform</a>
      </div>
    {:else}
      <h2 class="sub">Your AWS knowledge, mapped to {id === 'azure' ? 'Azure' : 'Google Cloud'}</h2>
      <div class="map">
        {#each CONCEPTS as c (c.id)}
          {@const o = c[id as 'azure' | 'gcp']}
          <a class="mapc" href={href.compare(c.id)}>
            <span class="eyebrow">{c.title}</span>
            <strong>{o.name}</strong>
            <span class="aws">≈ AWS {c.aws.name}</span>
            <code>{o.tf}</code>
          </a>
        {/each}
      </div>
      <div class="roadmap">
        <Icon name="map" size={20} />
        <div>
          <strong>Coming to this section</strong>
          <p class="muted">Guided lessons, {id === 'azure' ? 'an Azure' : 'a GCP'} service palette for the canvas, provider-specific scenarios, and <code>{id === 'azure' ? 'azurerm' : 'google'}</code> Terraform export.</p>
        </div>
      </div>
    {/if}
  </div>

  <dialog class="drawer glass" bind:this={dlg} aria-labelledby="svc-title" onclose={() => (open = null)} onclick={(e) => e.target === dlg && (open = null)}>
    {#if open}
      {@const s = open}
      <div class="dbody" style:--cc={categoryColor(s.category)}>
        <button class="x btn sm ghost" onclick={() => (open = null)} aria-label="Close"><Icon name="x" size={16} /></button>
        <span class="si big" aria-hidden="true"><Icon name={s.icon} size={28} /></span>
        <h2 id="svc-title">{s.full}</h2>
        <p class="muted">{s.blurb}</p>
        <dl>
          <dt>Terraform resource</dt><dd>{#if s.tf}<code>{s.tf}</code>{:else}None (represents something outside AWS){/if}</dd>
          <dt>Lives</dt>
          <dd>{s.placement === 'subnet' ? 'Inside a VPC subnet' : s.placement === 'vpc' ? 'Attached to a VPC' : s.placement === 'optional-subnet' ? 'Outside a VPC, or attached to private subnets' : 'Regional or global, outside your VPC'}</dd>
          {#if s.links && Object.keys(s.links).length}
            <dt>Typically connects to</dt>
            <dd><ul class="links">{#each Object.entries(s.links) as [t, rel]}<li class="chip">{SERVICE[t]?.name} · {rel}</li>{/each}</ul></dd>
          {/if}
        </dl>
        <div class="row wrap">
          {#if LESSON_FOR[s.id] && LESSON[LESSON_FOR[s.id]]}<a class="btn sm primary" href={href.lesson(LESSON_FOR[s.id])} onclick={() => (open = null)}><Icon name="graduation" size={14} /> Lesson</a>{/if}
          <a class="btn sm" href={s.docs} target="_blank" rel="noopener"><Icon name="book-open" size={14} /> AWS docs<span class="sr-only"> (opens in a new tab)</span></a>
          <a class="btn sm" href={href.play()} onclick={() => (open = null)}><Icon name="blocks" size={14} /> Use on canvas</a>
        </div>
      </div>
    {/if}
  </dialog>
{:else}
  <div class="page"><h1>Unknown provider</h1></div>
{/if}

<style>
  .page {
    max-width: 1180px;
    margin: 0 auto;
    padding: 36px 32px 64px;
  }
  .hero {
    padding: 32px;
    border-radius: 24px;
    border: 1px solid var(--border);
    background:
      radial-gradient(90% 120% at 100% 0%, color-mix(in srgb, var(--pc) 22%, transparent), transparent 60%),
      var(--surface);
  }
  .badge {
    margin: 0;
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--pfg);
  }
  .hero h1 {
    margin: 6px 0 8px;
  }
  .lead {
    max-width: 720px;
  }
  .hero .row {
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .sub {
    margin: 36px 0 12px;
  }
  .tracks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }
  .track {
    display: block;
    padding: 18px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    border-top: 3px solid var(--tc);
    background: var(--surface);
    color: var(--text);
    transition: transform 0.25s var(--ease);
  }
  .track:hover {
    text-decoration: none;
    transform: translateY(-3px);
  }
  .track h3 {
    margin: 0 0 4px;
  }
  .track p {
    font-size: 0.86rem;
    color: var(--text-2);
  }
  .lessons {
    display: flex;
    gap: 5px;
    margin: 10px 0;
    flex-wrap: wrap;
  }
  .lessons span {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text-3);
  }
  .lessons span.done {
    background: var(--tc);
    color: #0b0f1a;
  }
  .bar {
    height: 5px;
    border-radius: 5px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--tc);
  }
  .track small {
    font-size: 0.74rem;
    color: var(--text-3);
  }
  .cats {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 12px 0 14px;
  }
  .cats button {
    min-height: 30px;
    border: 1px solid var(--border-strong);
    background: none;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-2);
  }
  .cats button[aria-pressed='true'] {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: #ffffff;
  }
  .catalog {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }
  .svc {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    text-align: left;
    padding: 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--surface);
    transition: all 0.2s var(--ease);
  }
  .svc:hover {
    border-color: color-mix(in srgb, var(--cc) 60%, transparent);
    transform: translateY(-2px);
  }
  .si {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: color-mix(in srgb, var(--cc) 16%, transparent);
    color: var(--cc);
    margin-bottom: 6px;
  }
  .si.big {
    width: 56px;
    height: 56px;
    border-radius: 16px;
  }
  .svc strong {
    font-size: 0.9rem;
  }
  .svc small {
    font-size: 0.74rem;
    color: var(--text-2);
    line-height: 1.3;
  }
  .scns {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .scn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 0.86rem;
    font-weight: 600;
  }
  .scn:hover {
    text-decoration: none;
    border-color: var(--accent);
  }
  .okc {
    display: grid;
    color: var(--ok-fg);
  }
  .map {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 10px;
  }
  .mapc {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 14px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    border-left: 3px solid var(--pc);
    background: var(--surface);
    color: var(--text);
  }
  .mapc:hover {
    text-decoration: none;
    background: var(--surface-2);
  }
  .mapc .aws {
    font-size: 0.8rem;
    color: var(--text-2);
  }
  .mapc code {
    align-self: flex-start;
    font-size: 0.7rem;
    margin-top: 4px;
  }
  .roadmap {
    display: flex;
    gap: 14px;
    margin-top: 24px;
    padding: 18px;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--border-strong);
    color: var(--pfg);
  }
  .roadmap strong {
    color: var(--text);
  }
  .roadmap p {
    margin: 4px 0 0;
  }
  .drawer {
    position: fixed;
    inset: 0 0 0 auto;
    width: min(420px, 100vw);
    height: 100vh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-left: 1px solid var(--border-strong);
    background: var(--solid);
    color: var(--text);
    box-shadow: var(--shadow-lg);
    overflow-y: auto;
  }
  .drawer[open] {
    animation: slideIn 0.35s var(--ease);
  }
  .drawer::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  .dbody {
    position: relative;
    padding: 28px 24px;
  }
  @keyframes slideIn {
    from {
      transform: translateX(40px);
      opacity: 0;
    }
  }
  .drawer .x {
    position: absolute;
    top: 12px;
    right: 12px;
    min-width: 36px;
  }
  .drawer h2 {
    margin: 8px 0 6px;
  }
  .links {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  dl {
    margin: 16px 0;
  }
  dt {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-3);
    margin-top: 12px;
  }
  dd {
    margin: 4px 0 0;
    font-size: 0.9rem;
  }

  .wrap {
    flex-wrap: wrap;
  }
  @media (max-width: 900px) {
    .page {
      padding: 56px 16px 48px;
    }
    .hero {
      padding: 22px;
    }
  }
</style>
