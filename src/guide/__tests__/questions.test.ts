import { isAnswered, toProfile, visibleQuestions, type GuideDraft } from '../questions';

const complete: GuideDraft = {
  goal: 'feminize',
  grammaticalGender: 'f',
  recentSurgery: false,
  experience: 'new',
  slp: 'no',
  dailyMinutes: 30,
  healthFlags: [],
};

describe('perguntas do Guia', () => {
  it('a da liberação médica só aparece com cirurgia recente', () => {
    expect(visibleQuestions(complete)).not.toContain('surgeryCleared');
    expect(visibleQuestions({ ...complete, recentSurgery: true })).toContain('surgeryCleared');
  });

  it('opcionais puladas viram null; iniciante fica em 15 min', () => {
    const profile = toProfile(complete);
    expect(profile).toMatchObject({ identity: null, hormones: null, dailyMinutes: 15, surgeryCleared: false });
  });

  it('falta resposta obrigatória: ainda não dá para salvar', () => {
    expect(toProfile({ ...complete, slp: undefined })).toBeNull();
    expect(toProfile({ ...complete, recentSurgery: true })).toBeNull();
    expect(toProfile({ ...complete, recentSurgery: true, surgeryCleared: false })).toMatchObject({ recentSurgery: true });
  });

  it('respondida', () => {
    expect(isAnswered('health', { healthFlags: [] })).toBe(true);
    expect(isAnswered('identity', {})).toBe(false);
  });
});
