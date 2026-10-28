/**
 * Extrai o primeiro objeto JSON de uma resposta de texto da IA.
 * Aceita resposta limpa, dentro de ```json ... ``` ou com texto em volta.
 * Lança erro se não houver JSON válido.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // continua: procura o primeiro bloco { ... } equilibrado
  }

  const start = candidate.indexOf('{');
  if (start === -1) throw new Error('no json object');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error('unbalanced json');
}
