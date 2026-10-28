/**
 * Versão translúcida de uma cor dos tokens (#RRGGBB → #RRGGBBAA).
 * Usada em fundos "tonais", como o círculo atrás de um ícone.
 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`.toUpperCase();
}

/** Opacidade dos fundos tonais. */
export const TINT = 0.14;
