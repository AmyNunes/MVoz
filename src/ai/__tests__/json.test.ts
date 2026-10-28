import { extractJson } from '../json';

describe('extractJson', () => {
  it('lê JSON puro', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('lê JSON dentro de bloco de código', () => {
    expect(extractJson('```json\n{"a":[1,2]}\n```')).toEqual({ a: [1, 2] });
  });

  it('acha o primeiro objeto equilibrado no meio do texto, mesmo com chaves em strings', () => {
    expect(extractJson('Aqui: {"a":"tem } dentro","b":{"c":2}} fim')).toEqual({
      a: 'tem } dentro',
      b: { c: 2 },
    });
  });

  it('lança erro quando não há JSON', () => {
    expect(() => extractJson('nenhum json aqui')).toThrow();
  });
});
