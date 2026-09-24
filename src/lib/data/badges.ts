import { TRACKS } from './tracks';

export interface BadgeCtx {
  xp: number;
  lessons: Record<string, unknown>;
  scenarios: Record<string, unknown>;
  quizzes: Record<string, { correct: number; total: number }>;
  streak: { count: number };
  builds: number;
  exports: number;
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  test: (c: BadgeCtx) => boolean;
}

const trackDone = (id: string) => (c: BadgeCtx) => {
  const t = TRACKS.find((t) => t.id === id);
  return !!t && t.lessons.length > 0 && t.lessons.every((l) => l in c.lessons);
};

export const BADGES: Badge[] = [
  { id: 'first-lesson', name: 'Hello, Cloud', desc: 'Complete your first lesson.', icon: 'sparkles', test: (c) => Object.keys(c.lessons).length >= 1 },
  { id: 'five-lessons', name: 'Momentum', desc: 'Complete five lessons.', icon: 'flame', test: (c) => Object.keys(c.lessons).length >= 5 },
  { id: 'perfect-quiz', name: 'Sharpshooter', desc: 'Ace a quiz with 3+ questions.', icon: 'target', test: (c) => Object.values(c.quizzes).some((q) => q.total >= 3 && q.correct === q.total) },
  { id: 'first-scenario', name: 'Architect in Training', desc: 'Complete a build scenario.', icon: 'blocks', test: (c) => Object.keys(c.scenarios).length >= 1 },
  { id: 'five-scenarios', name: 'Blueprint Master', desc: 'Complete five build scenarios.', icon: 'crown', test: (c) => Object.keys(c.scenarios).length >= 5 },
  { id: 'clean-build', name: 'Zero Warnings', desc: 'Validate a clean architecture in free play.', icon: 'shield-check', test: (c) => c.builds >= 1 },
  { id: 'iac-export', name: 'Code It Up', desc: 'Export a diagram to Terraform.', icon: 'file-code', test: (c) => c.exports >= 1 },
  { id: 'streak-3', name: 'Habit Forming', desc: 'Learn three days in a row.', icon: 'calendar', test: (c) => c.streak.count >= 3 },
  { id: 'core-done', name: 'Grounded', desc: 'Finish the Cloud Foundations track.', icon: 'graduation', test: trackDone('core') },
  { id: 'aws-done', name: 'AWS Explorer', desc: 'Finish every AWS lesson.', icon: 'award', test: (c) => ['aws-core', 'aws-compute', 'aws-data'].every((t) => trackDone(t)(c)) },
  { id: 'tf-done', name: 'Terraformer', desc: 'Finish the Terraform track.', icon: 'award', test: trackDone('terraform') },
  { id: 'xp-1000', name: 'Four Digits', desc: 'Earn 1,000 XP.', icon: 'zap', test: (c) => c.xp >= 1000 }
];
