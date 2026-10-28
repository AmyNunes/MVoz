import type { SegmentMetrics } from '@/audio/metrics';

const hz = (n: number | null) => (n === null ? '—' : `${Math.round(n)} Hz`);
const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);
const one = (n: number | null) => (n === null ? '—' : (Math.round(n * 10) / 10).toString());

/** Métricas de um trecho em texto, para os prompts (só números, nunca o áudio). */
export function describeMetrics(m: SegmentMetrics): string {
  const lines = [
    `- Duração: ${Math.round(m.durationSec)} s, com voz em ${pct(m.voicedRatio)} do tempo.`,
    `- Tom médio: ${hz(m.medianHz)}; faixa usada (10%–90%): ${hz(m.p10Hz)} a ${hz(m.p90Hz)} (${one(m.rangeSt)} semitons).`,
    `- Variação de entonação: ${one(m.variabilitySt)} semitons (desvio).`,
  ];
  if (m.stabilityCents !== null) lines.push(`- Estabilidade em sons sustentados: desvio de ${Math.round(m.stabilityCents)} cents.`);
  if (m.inTargetRatio !== null) lines.push(`- Tempo de voz dentro da faixa-alvo: ${pct(m.inTargetRatio)}.`);
  if (m.belowFloorRatio !== null) lines.push(`- Tempo de voz abaixo do piso: ${pct(m.belowFloorRatio)}.`);
  const e = m.endings;
  if (e.rising + e.falling + e.flat > 0) lines.push(`- Finais de frase: ${e.rising} subindo, ${e.falling} descendo, ${e.flat} retos.`);
  if (m.resonance) {
    lines.push(
      `- Ressonância estimada (medianas): F1 ${hz(m.resonance.f1)}, F2 ${hz(m.resonance.f2)}, espaçamento dos formantes ${hz(m.resonance.spacing)} (maior = mais clara). É estimativa.`,
    );
  }
  lines.push(`- Maior som contínuo: ${one(m.longestSoundSec)} s.`);
  return lines.join('\n');
}
