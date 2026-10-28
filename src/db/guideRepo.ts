import { z } from 'zod';

import { baselineMetricsSchema, type BaselineMetrics } from '@/guide/baseline';
import { checkinAnswersSchema, checkinMetricsSchema, DECISIONS, type CheckinRecord, type Decision } from '@/guide/checkin';
import type { NewPlan, Plan } from '@/guide/plan';
import type { PlanChange } from '@/guide/progression';
import { planStageSchema, type PlanStage } from '@/guide/stages';
import { nowIso } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** Gravação inicial, plano, eventos do plano e check-ins (seções 9 e 13). */

const idsSchema = z.array(z.string());

// --- Gravação inicial ("Seu início") ---

export type Baseline = { id: string; createdAt: string; recordingIds: string[]; metrics: BaselineMetrics };

export async function insertBaseline(input: { recordingIds: string[]; metrics: BaselineMetrics }): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    'INSERT INTO baselines (id, createdAt, recordingIds, metrics) VALUES (?, ?, ?, ?)',
    id,
    nowIso(),
    JSON.stringify(input.recordingIds),
    JSON.stringify(input.metrics),
  );
  return id;
}

/** O início vale a primeira gravação inicial (as regravações mensais servem para comparar). */
export async function getBaseline(which: 'first' | 'latest' = 'first'): Promise<Baseline | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string; createdAt: string; recordingIds: string; metrics: string }>(
    `SELECT * FROM baselines ORDER BY createdAt ${which === 'first' ? 'ASC' : 'DESC'} LIMIT 1`,
  );
  if (!row) return null;
  const metrics = parseJsonWith<BaselineMetrics | null>(row.metrics, baselineMetricsSchema, null);
  if (!metrics) return null;
  return { id: row.id, createdAt: row.createdAt, recordingIds: parseJsonWith(row.recordingIds, idsSchema, []), metrics };
}

// --- Plano ---

type PlanRow = {
  id: string;
  goal: Plan['goal'];
  createdAt: string;
  active: number;
  stageIndex: number;
  stages: string;
  finalTargetLowHz: number;
  finalTargetHighHz: number;
  stageTargetLowHz: number;
  stageTargetHighHz: number;
  stageStartedAt: string;
  lighterUntil: string | null;
};

function planFromRow(row: PlanRow): Plan {
  return {
    id: row.id,
    goal: row.goal,
    createdAt: row.createdAt,
    active: row.active === 1,
    stageIndex: row.stageIndex,
    stages: parseJsonWith<PlanStage[]>(row.stages, z.array(planStageSchema), []),
    finalTarget: { lowHz: row.finalTargetLowHz, highHz: row.finalTargetHighHz },
    stageTarget: { lowHz: row.stageTargetLowHz, highHz: row.stageTargetHighHz },
    stageStartedAt: row.stageStartedAt,
    lighterUntil: row.lighterUntil,
  };
}

export async function getActivePlan(): Promise<Plan | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PlanRow>('SELECT * FROM plans WHERE active = 1 ORDER BY createdAt DESC LIMIT 1');
  if (!row) return null;
  const plan = planFromRow(row);
  return plan.stages.length > 0 ? plan : null;
}

/** Cria o plano novo como o único ativo (refazer o Guia desativa o anterior). */
export async function insertPlan(plan: NewPlan): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE plans SET active = 0 WHERE active = 1');
    await db.runAsync(
      `INSERT INTO plans (id, goal, createdAt, active, stageIndex, stages, finalTargetLowHz, finalTargetHighHz,
         stageTargetLowHz, stageTargetHighHz, stageStartedAt, lighterUntil)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      plan.goal,
      plan.createdAt,
      plan.stageIndex,
      JSON.stringify(plan.stages),
      plan.finalTarget.lowHz,
      plan.finalTarget.highHz,
      plan.stageTarget.lowHz,
      plan.stageTarget.highHz,
      plan.stageStartedAt,
      plan.lighterUntil,
    );
  });
  return id;
}

export async function updatePlanProgress(id: string, change: PlanChange): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE plans SET stageIndex = ?, stageTargetLowHz = ?, stageTargetHighHz = ?, stageStartedAt = ?, lighterUntil = ? WHERE id = ?`,
    change.stageIndex,
    change.stageTarget.lowHz,
    change.stageTarget.highHz,
    change.stageStartedAt,
    change.lighterUntil,
    id,
  );
}

export async function updatePlanStages(id: string, stages: PlanStage[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE plans SET stages = ? WHERE id = ?', JSON.stringify(stages), id);
}

/** `band`: a faixa da etapa subiu no check-in. */
export type PlanEventKind = Decision | 'back' | 'edit' | 'band';

export async function insertPlanEvent(event: { planId: string; kind: PlanEventKind; fromStage: number; toStage: number; note?: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO plan_events (id, planId, kind, fromStage, toStage, at, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    newId(),
    event.planId,
    event.kind,
    event.fromStage,
    event.toStage,
    nowIso(),
    event.note ?? '',
  );
}

/** Quando aconteceu o último evento deste tipo no plano (ISO), ou `null`. */
export async function lastPlanEventAt(planId: string, kind: PlanEventKind): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ at: string }>('SELECT at FROM plan_events WHERE planId = ? AND kind = ? ORDER BY at DESC LIMIT 1', planId, kind);
  return row?.at ?? null;
}

// --- Check-ins ---

type CheckinRow = Omit<CheckinRecord, 'answers' | 'metrics' | 'recordingIds' | 'decision'> & {
  answers: string;
  metrics: string;
  recordingIds: string;
  decision: string | null;
};

const decisionSchema = z.enum(DECISIONS).nullable();

function checkinFromRow(row: CheckinRow): CheckinRecord | null {
  const answers = checkinAnswersSchema.safeParse(parseJsonWith<unknown>(row.answers, z.unknown(), null));
  if (!answers.success) return null;
  return {
    ...row,
    answers: answers.data,
    metrics: parseJsonWith(row.metrics, checkinMetricsSchema, checkinMetricsSchema.parse({})),
    recordingIds: parseJsonWith(row.recordingIds, idsSchema, []),
    decision: decisionSchema.catch(null).parse(row.decision),
  };
}

export async function insertCheckin(input: Omit<CheckinRecord, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO checkins (id, weekStart, recordingIds, answers, milestones, decision, summaryPt, createdAt, metrics)
     VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?)`,
    id,
    input.weekStart,
    JSON.stringify(input.recordingIds),
    JSON.stringify(input.answers),
    input.decision,
    input.summaryPt,
    nowIso(),
    JSON.stringify(input.metrics),
  );
  return id;
}

export async function updateCheckinSummary(id: string, summaryPt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE checkins SET summaryPt = ? WHERE id = ?', summaryPt, id);
}

/** Check-ins mais recentes primeiro. */
export async function listCheckins(limit = 52): Promise<CheckinRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CheckinRow>('SELECT * FROM checkins ORDER BY createdAt DESC LIMIT ?', limit);
  return rows.flatMap((row) => {
    const parsed = checkinFromRow(row);
    return parsed ? [parsed] : [];
  });
}
