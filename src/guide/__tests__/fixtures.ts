import type { BaselineMetrics } from '../baseline';
import type { Profile } from '../profile';

/** Dados de exemplo dos testes do Guia. */
export const baseline: BaselineMetrics = {
  speechMedianHz: 120,
  speechP10Hz: 100,
  speechP90Hz: 140,
  readingMedianHz: 122,
  minHz: 85,
  maxHz: 400,
  vowelA: { f1: 700, f2: 1100, spacing: 950 },
  vowelI: { f1: 280, f2: 2250, spacing: 1250 },
  speechSpacing: 1000,
};

export const profile: Profile = {
  goal: 'feminize',
  grammaticalGender: 'f',
  identity: null,
  hormones: 'estrogen',
  recentSurgery: false,
  surgeryCleared: false,
  experience: 'new',
  slp: 'no',
  dailyMinutes: 15,
  healthFlags: [],
  aiIncludeContext: false,
};
