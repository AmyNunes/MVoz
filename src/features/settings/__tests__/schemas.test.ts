import { aiSettingsSchema, appearanceSchema, trainingSchema } from '../schemas';

describe('schemas de configurações', () => {
  it('objeto vazio vira os padrões', () => {
    expect(appearanceSchema.parse({}).themePreference).toBe('system');
    expect(aiSettingsSchema.parse({})).toMatchObject({ provider: 'gemini', model: '', monthlyLimit: null });
  });

  it('um campo inválido volta ao padrão sem perder os outros', () => {
    const parsed = aiSettingsSchema.parse({ provider: 'nao-existe', model: 'meu-modelo' });
    expect(parsed.provider).toBe('gemini');
    expect(parsed.model).toBe('meu-modelo');
  });

  it('limite mensal zero ou negativo volta a "sem limite"', () => {
    expect(aiSettingsSchema.parse({ monthlyLimit: 0 }).monthlyLimit).toBeNull();
    expect(aiSettingsSchema.parse({ monthlyLimit: -3 }).monthlyLimit).toBeNull();
  });

  it('faixa-alvo começa desligada, em 165–200 Hz, e rejeita valores fora de 60–500 Hz', () => {
    expect(trainingSchema.parse({})).toMatchObject({ targetEnabled: false, targetLowHz: 165, targetHighHz: 200, dailyLimitMinutes: 15 });
    expect(trainingSchema.parse({ targetLowHz: 20, targetHighHz: 180 })).toMatchObject({
      targetLowHz: 165,
      targetHighHz: 180,
    });
  });

  it('lixo no lugar do objeto vira os padrões', () => {
    expect(appearanceSchema.parse('lixo').themePreference).toBe('system');
    expect(aiSettingsSchema.parse(42).provider).toBe('gemini');
  });
});
