import type { SegmentMetrics } from '@/audio/metrics';
import { profile } from '@/guide/__tests__/fixtures';

import { contextText, type UserContext } from '../context';
import { validChanges } from '../functions/adjustPlan';
import { adjustPlanPrompt } from '../prompts/adjustPlan';
import { coachPrompt, COACH_HISTORY } from '../prompts/coach';
import { explainRecordingPrompt } from '../prompts/recording';
import { coachReplySchema } from '../schemas/coach';
import { readingTextSchema } from '../schemas/texts';
import { validExerciseIds } from '../validate';

jest.mock('../client', () => ({ callAI: jest.fn() }));

const ctx: UserContext = {
  profile: { ...profile, identity: 'trans-woman', hormones: 'estrogen', aiIncludeContext: false },
  stage: { name: 'Ressonância', number: 2, total: 6 },
  band: { lowHz: 150, highHz: 175 },
  start: { speechMedianHz: 120, readingMedianHz: 122, minHz: 85, maxHz: 400 },
  lastCheckin: { readingMedianHz: 140, inTargetPct: 40, effort: 3, fit: 6, comfort: 7 },
  discomfort: false,
};

const metrics: SegmentMetrics = {
  durationSec: 30,
  voicedSec: 20,
  voicedRatio: 0.66,
  medianHz: 160,
  p10Hz: 140,
  p90Hz: 190,
  rangeSt: 5.3,
  variabilitySt: 2.1,
  stabilityCents: null,
  inTargetRatio: 0.55,
  belowFloorRatio: null,
  endings: { rising: 2, falling: 3, flat: 1 },
  longestSoundSec: 4.2,
  resonance: { f1: 500, f2: 1800, centroid: 1200, spacing: 1150 },
};

describe('contexto do usuário (seções 12.2 e 12.3)', () => {
  it('identidade e hormônios só com "Incluir meu contexto" ligado', () => {
    expect(contextText(ctx)).not.toMatch(/mulher trans|estrogênio/);
    const withContext = contextText({ ...ctx, profile: { ...ctx.profile!, aiIncludeContext: true } });
    expect(withContext).toMatch(/mulher trans/);
    expect(withContext).toMatch(/estrogênio/);
  });

  it('objetivo, etapa, faixa, início e último check-in', () => {
    const text = contextText(ctx);
    expect(text).toMatch(/voz mais feminina/);
    expect(text).toMatch(/Etapa atual do plano: 2 de 6/);
    expect(text).toMatch(/150 Hz a 175 Hz/);
    expect(text).toMatch(/extensão confortável 85 Hz a 400 Hz/);
    expect(text).toMatch(/esforço 3\/10/);
  });

  it('desconforto vai sem detalhes', () => {
    expect(contextText({ ...ctx, discomfort: true })).toMatch(/Relatou desconforto ou rouquidão/);
  });
});

describe('prompts', () => {
  it('explicar gravação: só métricas e o catálogo', () => {
    const [system, user] = explainRecordingPrompt({ kind: 'free', exerciseName: null, metrics }, ctx);
    expect(system.content).toMatch(/lip-trill/);
    expect(user.content).toMatch(/Tom médio: 160 Hz/);
    expect(user.content).toMatch(/55%/);
  });

  it('coach: manda só as últimas mensagens', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    const messages = coachPrompt(history, ctx);
    expect(messages).toHaveLength(COACH_HISTORY + 1);
    expect(messages.at(-1)?.content).toBe('m19');
  });

  it('ajustar plano: marca o exercício fixo', () => {
    const [, user] = adjustPlanPrompt({ stages: [{ index: 1, name: 'Ressonância', exercises: ['big-dog-small-dog', 'smile-vowels'], fixed: 'smile-vowels' }], request: 'telefone' }, ctx);
    expect(user.content).toMatch(/smile-vowels \(fixo\)/);
    expect(user.content).toMatch(/Pedido: "telefone"/);
  });
});

describe('validação das respostas', () => {
  it('exercícios: só ids do catálogo, sem repetir, até 3', () => {
    expect(validExerciseIds(['lip-trill', 'inventado', 'lip-trill', 'straw-phonation', 'pitch-glides', 'cooldown'])).toEqual([
      'lip-trill',
      'straw-phonation',
      'pitch-glides',
    ]);
  });

  it('ajustes do plano: descarta o que não cabe', () => {
    const stages = [{ index: 1, name: 'R', exercises: ['lip-trill', 'pitch-glides'], fixed: 'pitch-glides' }];
    const changes = validChanges(
      [
        { action: 'add', exerciseId: 'straw-phonation', stageIndex: 1, reasonPt: '' },
        { action: 'add', exerciseId: 'lip-trill', stageIndex: 1, reasonPt: 'já está' },
        { action: 'remove', exerciseId: 'pitch-glides', stageIndex: 1, reasonPt: 'fixo' },
        { action: 'remove', exerciseId: 'lip-trill', stageIndex: 0, reasonPt: 'etapa passada' },
        { action: 'replace', exerciseId: 'lip-trill', replaceWithId: 'inventado', stageIndex: 1, reasonPt: '' },
        { action: 'replace', exerciseId: 'lip-trill', replaceWithId: 'cooldown', stageIndex: 1, reasonPt: 'ok' },
      ],
      stages,
    );
    expect(changes.map((c) => c.reasonPt)).toEqual(['', 'ok']);
  });

  it('schemas: safetyFlag inválido vira falso; texto precisa de parágrafos', () => {
    expect(coachReplySchema.parse({ replyPt: 'Oi', safetyFlag: 'talvez' }).safetyFlag).toBe(false);
    expect(readingTextSchema.safeParse({ title: 'x', paragraphs: [] }).success).toBe(false);
  });
});
