import { shiftSemitones } from '@/lib/notes';

/**
 * Curvas de entonação dos exercícios de curva (seção 8.3, `contour`), sem IA.
 * Em semitons em relação ao centro da faixa-alvo: a mesma curva serve para qualquer voz.
 * A simulação com IA (10.5) pode trazer outras curvas, já em Hz.
 */
export type ContourItem = {
  text: string;
  points: { t: number; st: number }[];
};

/** Sobe no final. */
const question = [
  { t: 0, st: 0 },
  { t: 0.35, st: 1.5 },
  { t: 0.9, st: 0.5 },
  { t: 1.25, st: 0 },
  { t: 1.7, st: 4.5 },
];

/** Desce no final. */
const statement = [
  { t: 0, st: 0 },
  { t: 0.35, st: 1.5 },
  { t: 0.9, st: 0.5 },
  { t: 1.25, st: 0 },
  { t: 1.7, st: -3 },
];

/** Pico de 3 semitons na sílaba `stressed` (0 = primeira) de uma palavra com `syllables` sílabas. */
function stress(syllables: number, stressed: number) {
  const step = 0.22;
  const points = [{ t: 0, st: 0 }];
  for (let i = 0; i < syllables; i++) {
    points.push({ t: (i + 0.5) * step, st: i === stressed ? 3 : i > stressed ? -1 : 0 });
  }
  points.push({ t: syllables * step, st: -1.5 });
  return points;
}

export const CONTOURS: Record<string, ContourItem[]> = {
  'question-statement': [
    { text: 'Você vem amanhã.', points: statement },
    { text: 'Você vem amanhã?', points: question },
    { text: 'Está tudo bem.', points: statement },
    { text: 'Está tudo bem?', points: question },
    { text: 'A loja abre cedo.', points: statement },
    { text: 'A loja abre cedo?', points: question },
  ],
  'stress-pairs': [
    { text: 'SÁbia', points: stress(3, 0) },
    { text: 'saBIa', points: stress(3, 1) },
    { text: 'sabiÁ', points: stress(3, 2) },
    { text: 'secreTÁria', points: stress(5, 2) },
    { text: 'secretaRIa', points: stress(5, 3) },
    { text: 'PÚblico', points: stress(3, 0) },
    { text: 'puBLIco', points: stress(3, 1) },
    { text: 'publiCOU', points: stress(3, 2) },
  ],
  'contour-shadowing': [
    {
      text: 'Que bom que você veio, eu estava esperando!',
      points: [
        { t: 0, st: 1 },
        { t: 0.3, st: 4 },
        { t: 0.7, st: 1 },
        { t: 1.1, st: 3 },
        { t: 1.5, st: 0 },
        { t: 2.0, st: 2 },
        { t: 2.5, st: 3.5 },
        { t: 2.9, st: 0.5 },
      ],
    },
    {
      text: 'Nossa, que dia lindo hoje, né?',
      points: [
        { t: 0, st: 3 },
        { t: 0.4, st: 0 },
        { t: 0.8, st: 2 },
        { t: 1.2, st: 4 },
        { t: 1.6, st: 1 },
        { t: 2.0, st: 4 },
      ],
    },
  ],
  'falling-endings': [
    { text: 'Eu vou ao mercado agora.', points: statement },
    { text: 'O ônibus atrasou de novo.', points: statement },
    { text: 'Amanhã eu te ligo.', points: statement },
    { text: 'Já terminei o relatório.', points: statement },
  ],
};

/** Curva em Hz para tocar e desenhar, centrada em `centerHz`. */
export function contourInHz(item: ContourItem, centerHz: number): { t: number; hz: number }[] {
  return item.points.map((p) => ({ t: p.t, hz: shiftSemitones(centerHz, p.st) }));
}
