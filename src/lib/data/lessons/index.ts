import type { Lesson } from '../types';
import { CORE } from './core';
import { AWS_CORE } from './aws-core';
import { AWS_COMPUTE } from './aws-compute';
import { AWS_DATA } from './aws-data';
import { TERRAFORM } from './terraform';

export const LESSONS: Lesson[] = [...CORE, ...AWS_CORE, ...AWS_COMPUTE, ...AWS_DATA, ...TERRAFORM];
export const LESSON: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
