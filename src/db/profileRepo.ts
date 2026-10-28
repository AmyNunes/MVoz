import { z } from 'zod';

import { profileSchema, type Profile } from '@/guide/profile';
import { nowIso } from '@/lib/dates';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

type Row = {
  goal: string;
  grammaticalGender: string;
  identity: string | null;
  hormones: string | null;
  recentSurgery: number;
  surgeryCleared: number;
  experience: string;
  slp: string;
  dailyMinutes: number;
  healthFlags: string;
  aiIncludeContext: number;
};

/** Respostas do Guia (linha única). `null` se o Guia ainda não foi respondido. */
export async function getProfile(): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM profile WHERE id = 1');
  if (!row) return null;
  const parsed = profileSchema.safeParse({
    ...row,
    recentSurgery: row.recentSurgery === 1,
    surgeryCleared: row.surgeryCleared === 1,
    aiIncludeContext: row.aiIncludeContext === 1,
    healthFlags: parseJsonWith(row.healthFlags, z.array(z.string()), []),
  });
  return parsed.success ? parsed.data : null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profile (id, goal, grammaticalGender, identity, hormones, recentSurgery, surgeryCleared, experience, slp,
       dailyMinutes, healthFlags, aiIncludeContext, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET goal = excluded.goal, grammaticalGender = excluded.grammaticalGender,
       identity = excluded.identity, hormones = excluded.hormones, recentSurgery = excluded.recentSurgery,
       surgeryCleared = excluded.surgeryCleared, experience = excluded.experience, slp = excluded.slp,
       dailyMinutes = excluded.dailyMinutes, healthFlags = excluded.healthFlags,
       aiIncludeContext = excluded.aiIncludeContext, updatedAt = excluded.updatedAt`,
    profile.goal,
    profile.grammaticalGender,
    profile.identity,
    profile.hormones,
    profile.recentSurgery ? 1 : 0,
    profile.surgeryCleared ? 1 : 0,
    profile.experience,
    profile.slp,
    profile.dailyMinutes,
    JSON.stringify(profile.healthFlags),
    profile.aiIncludeContext ? 1 : 0,
    nowIso(),
  );
}
