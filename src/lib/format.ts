/** "US$ 0,0021" para valores pequenos; "US$ 1,25" para os demais. */
export function formatUsd(value: number): string {
  const digits = value > 0 && value < 0.01 ? 4 : 2;
  return `US$ ${value.toFixed(digits).replace('.', ',')}`;
}

/** Lê "0,15" ou "0.15". Vazio vira `null`; texto inválido vira `NaN`. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

/** Mostra um número decimal com vírgula ("0,15"). */
export function formatDecimal(value: number | null): string {
  return value == null ? '' : String(value).replace('.', ',');
}

/** "1 card", "3 cards" */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "0:07", "2:35" a partir de segundos. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** "~8 min" a partir de segundos. */
export function formatMinutes(seconds: number): string {
  return `~${Math.max(1, Math.round(seconds / 60))} min`;
}
