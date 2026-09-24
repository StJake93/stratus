import { toast } from './toast.svelte';
import { BADGES, type BadgeCtx } from '../data/badges';

const KEY = 'stratus.progress.v1';

interface ProgressData {
  xp: number;
  steps: Record<string, number[]>; // lessonId -> completed step indexes
  lessons: Record<string, { at: number }>;
  quizzes: Record<string, { correct: number; total: number }>;
  scenarios: Record<string, { at: number; hintsUsed: number }>;
  badges: string[];
  tutorialDone: boolean;
  streak: { day: string; count: number };
  builds: number; // playground validations with a clean architecture
  exports: number; // times the terraform export was opened
}

const blank = (): ProgressData => ({
  xp: 0,
  steps: {},
  lessons: {},
  quizzes: {},
  scenarios: {},
  badges: [],
  tutorialDone: false,
  streak: { day: '', count: 0 },
  builds: 0,
  exports: 0
});

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw) };
  } catch {
    /* storage unavailable or corrupt — start fresh */
  }
  return blank();
}

export const LEVELS = [
  { xp: 0, title: 'Cloud Curious' },
  { xp: 150, title: 'Console Clicker' },
  { xp: 400, title: 'Sandbox Tinkerer' },
  { xp: 800, title: 'Resource Wrangler' },
  { xp: 1400, title: 'Pipeline Pilot' },
  { xp: 2200, title: 'Infrastructure Engineer' },
  { xp: 3300, title: 'Cloud Architect' },
  { xp: 4800, title: 'Platform Sage' }
];

const today = () => new Date().toISOString().slice(0, 10);

class Progress {
  d = $state<ProgressData>(load());

  level = $derived.by(() => {
    let i = 0;
    while (i + 1 < LEVELS.length && this.d.xp >= LEVELS[i + 1].xp) i++;
    const cur = LEVELS[i];
    const next = LEVELS[i + 1];
    const pct = next ? (this.d.xp - cur.xp) / (next.xp - cur.xp) : 1;
    return { n: i + 1, title: cur.title, next, pct: Math.min(1, pct) };
  });

  #save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.d));
    } catch {
      /* quota / private mode — progress just won't persist */
    }
  }

  #touchStreak() {
    const t = today();
    if (this.d.streak.day === t) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    this.d.streak = { day: t, count: this.d.streak.day === y ? this.d.streak.count + 1 : 1 };
  }

  #commit() {
    this.#touchStreak();
    this.#checkBadges();
    this.#save();
  }

  addXp(n: number, why?: string) {
    const before = this.level.n;
    this.d.xp += n;
    if (why) toast.xp(`+${n} XP`, why);
    queueMicrotask(() => {
      if (this.level.n > before) toast.ok(`Level ${this.level.n} reached!`, `You're now a ${this.level.title}.`);
    });
  }

  stepDone(lessonId: string, step: number) {
    return this.d.steps[lessonId]?.includes(step) ?? false;
  }

  completeStep(lessonId: string, step: number) {
    if (this.stepDone(lessonId, step)) return;
    this.d.steps[lessonId] = [...(this.d.steps[lessonId] ?? []), step];
    this.addXp(15);
    this.#commit();
  }

  lessonDone(id: string) {
    return !!this.d.lessons[id];
  }

  completeLesson(id: string, title: string) {
    if (this.d.lessons[id]) return;
    this.d.lessons[id] = { at: Date.now() };
    this.addXp(60, `Lesson complete: ${title}`);
    this.#commit();
  }

  recordQuiz(key: string, correct: number, total: number) {
    const prev = this.d.quizzes[key];
    if (!prev || correct > prev.correct) {
      const gained = correct - (prev?.correct ?? 0);
      if (gained > 0) this.addXp(gained * 10, `Quiz: ${correct}/${total} correct`);
      this.d.quizzes[key] = { correct, total };
      this.#commit();
    }
  }

  scenarioDone(id: string) {
    return !!this.d.scenarios[id];
  }

  completeScenario(id: string, title: string, hintsUsed: number) {
    if (this.d.scenarios[id]) return;
    this.d.scenarios[id] = { at: Date.now(), hintsUsed };
    this.addXp(hintsUsed === 0 ? 150 : 110, `Scenario complete: ${title}`);
    this.#commit();
  }

  recordBuild() {
    this.d.builds++;
    this.#commit();
  }

  recordExport() {
    this.d.exports++;
    this.#commit();
  }

  finishTutorial() {
    if (!this.d.tutorialDone) {
      this.d.tutorialDone = true;
      this.addXp(25, 'Tutorial complete');
      this.#commit();
    }
  }

  resetTutorial() {
    this.d.tutorialDone = false;
    this.#save();
  }

  reset() {
    this.d = blank();
    this.d.tutorialDone = true;
    this.#save();
  }

  #checkBadges() {
    const ctx: BadgeCtx = this.d;
    for (const b of BADGES) {
      if (!this.d.badges.includes(b.id) && b.test(ctx)) {
        this.d.badges = [...this.d.badges, b.id];
        setTimeout(() => toast.ok(`Badge unlocked: ${b.name}`, b.desc), 400);
      }
    }
  }
}

export const progress = new Progress();
