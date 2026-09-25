import { getContext, setContext } from 'svelte';

// Keeps heading levels correct however lesson blocks are nested (WCAG 1.3.1 / 2.4.6).
// A page's h1 is followed by h2 blocks; content inside an accordion item or carousel slide is one level deeper.
const KEY = Symbol('heading-level');

export const headingLevel = (): number => getContext<number>(KEY) ?? 2;
export const provideHeadingLevel = (level: number) => setContext(KEY, Math.min(6, Math.max(2, level)));
export const tag = (level: number) => `h${Math.min(6, Math.max(1, level))}`;
