# Stratus: cloud infrastructure lab

An interactive, browser-based learning tool for cloud infrastructure and DevOps. It goes from first principles to dragging AWS building blocks onto a canvas, with live architecture validation and Terraform export.

**Live:** https://stjake93.github.io/stratus/

## What's inside

| Area | What you get |
| --- | --- |
| **Guided lessons** | 27 lessons and 90 steps across 5 tracks: Cloud Foundations, AWS Essentials, Serverless & Containers, Data/Messaging/Ops, and Terraform. They are built from tabs, accordions, carousels, clickable diagrams, callouts, simulated terminals and code samples, and every lesson ends with a quiz. |
| **Interactive simulators** | 13 widgets: shared-responsibility slider, CIDR/subnet calculator, region latency map, IAM policy evaluator, SG vs NACL packet tracer, EC2 auto-scaling sim, S3 storage-class picker, Lambda cost & concurrency lab, SQS decoupling sim, Kubernetes scheduler, Terraform workflow, state drift, and `count` vs `for_each`. |
| **Build canvas** | Drag-and-drop AWS services (30+) with VPC/subnet containment and semantic connection rules. Invalid links are rejected with an explanation. |
| **Architecture linter** | Live errors, warnings and hints drawn from real AWS constraints and Well-Architected practice (placement, AZ spread, public/private routing, egress, security). |
| **Terraform export** | The diagram becomes idiomatic HCL (`main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`), plus a simulated `plan`/`apply` diff. |
| **Scenarios** | 11 guided builds (static site, serverless API, production VPC, three-tier, event pipeline, fan-out, Fargate, EKS, Terraform backend, and more). Each has live goal checks, hints and a debrief. |
| **Compare clouds** | An AWS ↔ Azure ↔ GCP concept map with Terraform resource names, a service matrix, and a matching game. |
| **Progression** | XP, levels, badges, streaks, per-track progress and a learning-path map. Saved in `localStorage`. |
| **Onboarding** | A spotlight tutorial tour on first launch, which can be replayed anytime. |

Lesson content is original, summarised from the official AWS, HashiCorp, Microsoft and Google Cloud documentation, with deep links to the source pages throughout.

## Stack

- [Svelte 5](https://svelte.dev) + [Vite](https://vite.dev) + TypeScript, with no backend.
- [Svelte Flow](https://svelteflow.dev) (`@xyflow/svelte`) for the canvas. It is lazy-loaded, so only the canvas route downloads it.
- [Lucide](https://lucide.dev) icons, imported per icon.
- Hash routing, so it works on any static host.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type-check
npm run build    # production build in dist/
npm run audit:contrast   # WCAG contrast check for the colour tokens
```

## Accessibility

Stratus targets WCAG 2.2 AA in both themes, with full keyboard support (including keyboard alternatives to dragging on the canvas), screen reader announcements, reduced motion and pausable simulations. See [ACCESSIBILITY.md](ACCESSIBILITY.md) for what is checked, how to run the audits, and known limitations.

## Project layout

```
src/
  lib/
    data/            # content: lessons/, tracks, scenarios, services, compare, badges
    components/      # UI kit (ui/), interactive widgets (widgets/), Blocks renderer
    canvas/          # board store, graph model, validator, Terraform generator, nodes/panels
    pages/           # Home, Track, Lesson, Play, Scenarios, Compare, Provider, Progress
    stores/          # router, progress (XP/badges), settings, toasts, announcer
  dev/               # accessibility and diagram layout audits (dev server only)
scripts/             # contrast audit
```

### Adding content

Lessons are plain data. Add a lesson object to a file in `src/lib/data/lessons/` using the helpers in `h.ts` (`text`, `tabs`, `accordion`, `carousel`, `diagram`, `widget`, `quiz`, `challenge`, `docs`, …), then list its id in `src/lib/data/tracks.ts`. You don't need to change any UI code.

To add a canvas service, append it to `src/lib/data/services.ts` with its placement, links and config. Then add lint rules in `canvas/validate.ts` and HCL output in `canvas/terraform.ts`.

## Roadmap

- Azure and Google Cloud tracks, palettes and `azurerm` / `google` Terraform export (preview pages already map the concepts).
- More scenarios, and saving/sharing canvas designs.
