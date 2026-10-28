import type { VoiceFrame } from '@/audio/analyzer';
import { formantSpacing } from '@/audio/formants';
import { centsBetween, hzToMidi } from '@/lib/notes';

/**
 * Critérios automáticos de acerto (seção 8.3): recebem as medidas de 20 ms e contam as
 * repetições sozinhos. Funções puras, sem React, testadas com sequências sintéticas.
 */

export type Band = { lowHz: number; highHz: number };

export type DetectorState = {
  reps: number;
  /** 0–1: quanto da repetição atual já foi feito (segurar, extensão do deslize). */
  progress: number;
  /** A medida atual está no alvo (para o estado na tela e a vibração). */
  inTarget: boolean;
  /** Resultado de cada tentativa: segundos (segurar/duração), semitons (deslize), erro (curva). */
  values: number[];
  /** Duração do som contínuo atual, em segundos (`duration`). */
  currentSec: number;
  /** Ressonância: referência do começo (ΔF, Hz) e a maior mudança na direção pedida (%). */
  reference: number | null;
  bestChangePct: number;
  /** Curva: a última tentativa, com o tempo ajustado à duração da curva (para desenhar). */
  attempt: { t: number; hz: number }[];
};

export type Detector = {
  push: (frames: readonly VoiceFrame[]) => DetectorState;
  state: () => DetectorState;
  /** "Fiz": conta uma repetição à mão. */
  addManualRep: () => DetectorState;
};

const EMPTY: DetectorState = {
  reps: 0,
  progress: 0,
  inTarget: false,
  values: [],
  currentSec: 0,
  reference: null,
  bestChangePct: 0,
  attempt: [],
};

/** Silêncio maior que isso encerra uma tentativa. */
const END_GAP_SEC = 0.4;
/** Pausas menores que isso não interrompem um deslize, uma frase ou um som. */
const BRIDGE_SEC = 0.2;

function base(): { state: DetectorState; detector: (push: (frames: readonly VoiceFrame[]) => void) => Detector } {
  const state: DetectorState = { ...EMPTY, values: [], attempt: [] };
  const snapshot = () => ({ ...state, values: [...state.values], attempt: [...state.attempt] });
  return {
    state,
    detector: (push) => ({
      push: (frames) => {
        push(frames);
        return snapshot();
      },
      state: snapshot,
      addManualRep: () => {
        state.reps++;
        return snapshot();
      },
    }),
  };
}

/**
 * Segurar no alvo por `holdSec` (sustentar, imitar nota, ressonância). Depois de contar, só
 * conta de novo quando a voz sai do alvo: segurar 10 s seguidos vale uma repetição.
 * `verdict` devolve `null` quando aquela medida não diz nada (ex.: quadro sem formantes).
 */
export function holdDetector(holdSec: number, verdict: (f: VoiceFrame) => boolean | null): Detector {
  const { state, detector } = base();
  let since: number | null = null;
  let lastIn = -Infinity;
  let armed = true;

  return detector((frames) => {
    for (const f of frames) {
      const v = f.hz === null ? false : verdict(f);
      if (v === null) continue;
      if (v) {
        since ??= f.t;
        lastIn = f.t;
        state.inTarget = true;
        if (armed && f.t - since >= holdSec) {
          state.reps++;
          state.values.push(f.t - since);
          armed = false;
        }
      } else if (f.t - lastIn > BRIDGE_SEC) {
        since = null;
        armed = true;
        state.inTarget = false;
      }
      state.progress = !armed ? 1 : since === null ? 0 : Math.min(1, (f.t - since) / holdSec);
    }
  });
}

/** Sustentar: dentro da faixa, ou a ±`cents` da nota. */
export function sustainDetector(holdSec: number, target: { band: Band | null; noteHz: number | null }, cents = 50) {
  return holdDetector(holdSec, (f) => {
    const hz = f.hz as number;
    if (target.noteHz !== null) return Math.abs(centsBetween(target.noteHz, hz)) <= cents;
    if (target.band) return hz >= target.band.lowHz && hz <= target.band.highHz;
    return true;
  });
}

/** Leituras de ressonância usadas para a referência do começo (~1 s de voz). */
const REFERENCE_READINGS = 10;
/** Mudança mínima em relação à referência para contar como "mais clara/escura". */
const RESONANCE_MARGIN = 0.02;

/** Ressonância: mais clara (ou mais escura) que o começo do próprio exercício. */
export function resonanceDetector(holdSec: number, direction: 'brighter' | 'darker'): Detector {
  const readings: number[] = [];
  let reference: number | null = null;
  let best = 0;
  const inner = holdDetector(holdSec, (f) => {
    const spacing = f.formants ? formantSpacing(f.formants) : null;
    if (spacing === null) return null;
    if (reference === null) {
      readings.push(spacing);
      if (readings.length >= REFERENCE_READINGS) reference = [...readings].sort((a, b) => a - b)[readings.length >> 1];
      return null;
    }
    const change = (spacing - reference) / reference;
    const signed = direction === 'brighter' ? change : -change;
    best = Math.max(best, signed * 100);
    return signed >= RESONANCE_MARGIN;
  });
  const decorate = (s: DetectorState): DetectorState => ({ ...s, reference, bestChangePct: best });
  return {
    push: (frames) => decorate(inner.push(frames)),
    state: () => decorate(inner.state()),
    addManualRep: () => decorate(inner.addManualRep()),
  };
}

/** Tentativas separadas por silêncio: `onEnd` recebe cada trecho quando ele termina. */
function attempts(isActive: (f: VoiceFrame) => boolean, onEnd: (run: VoiceFrame[]) => void) {
  let run: VoiceFrame[] = [];
  let lastActive = -Infinity;
  return (frames: readonly VoiceFrame[]): VoiceFrame[] => {
    for (const f of frames) {
      if (isActive(f)) {
        if (run.length > 0 && f.t - lastActive > END_GAP_SEC) {
          onEnd(run);
          run = [];
        }
        run.push(f);
        lastActive = f.t;
      } else if (run.length > 0 && f.t - lastActive > END_GAP_SEC) {
        onEnd(run);
        run = [];
      }
    }
    return run;
  };
}

/** Extensão do trecho em semitons, entre os percentis 5 e 95 (ignora pontas soltas). */
function rangeSt(run: readonly VoiceFrame[]): number {
  const st = run.flatMap((f) => (f.hz === null ? [] : [hzToMidi(f.hz)])).sort((a, b) => a - b);
  if (st.length < 2) return 0;
  const at = (p: number) => st[Math.floor((st.length - 1) * p)];
  return at(0.95) - at(0.05);
}

const MIN_ATTEMPT_SEC = 0.4;

/**
 * Deslize: cada trecho com voz (uma respiração) que alcança `minRangeSt` semitons conta uma
 * repetição, na hora em que alcança (não só quando o som para). Subir e descer no mesmo
 * fôlego vale uma.
 */
export function glideDetector(minRangeSt: number): Detector {
  const { state, detector } = base();
  let counted = false;
  const feed = attempts(
    (f) => f.hz !== null,
    (run) => {
      const long = run[run.length - 1].t - run[0].t >= MIN_ATTEMPT_SEC;
      if (long || counted) state.values.push(rangeSt(run));
      counted = false;
    },
  );
  return detector((frames) => {
    const current = feed(frames);
    const range = rangeSt(current);
    const long = current.length > 0 && current[current.length - 1].t - current[0].t >= MIN_ATTEMPT_SEC;
    if (!counted && long && range >= minRangeSt) {
      state.reps++;
      counted = true;
    }
    state.progress = counted ? 1 : Math.min(1, range / minRangeSt);
    state.inTarget = range >= minRangeSt;
  });
}

/** Uma pausa sem voz maior que isso separa um "uuu" do próximo (respiração, barulho). */
const HOLD_GAP_SEC = 0.5;
/** Quem segura "5 s" contando de cabeça costuma parar um pouco antes: vale a partir de 90%. */
const HOLD_TOLERANCE = 0.9;

/**
 * Som com voz por `minSec` (ex.: "uuu" de 5 s pelo canudo): conta na hora em que chega lá e
 * só conta de novo depois de uma pausa. Vale só a voz (quadros com tom): a respiração e o
 * barulho entre uma vez e outra não têm tom, então separam as repetições.
 */
export function soundHoldDetector(minSec: number): Detector {
  const { state, detector } = base();
  let start: number | null = null;
  let lastVoiced = -Infinity;
  let counted = false;
  const end = () => {
    if (start !== null && lastVoiced - start >= MIN_ATTEMPT_SEC) state.values.push(lastVoiced - start);
    start = null;
    counted = false;
  };
  return detector((frames) => {
    for (const f of frames) {
      if (start !== null && f.t - lastVoiced > HOLD_GAP_SEC) end();
      if (f.hz === null) continue;
      start ??= f.t;
      lastVoiced = f.t;
      if (!counted && lastVoiced - start >= minSec * HOLD_TOLERANCE) {
        state.reps++;
        counted = true;
      }
    }
    const seconds = start === null ? 0 : lastVoiced - start;
    state.currentSec = seconds;
    state.progress = counted ? 1 : Math.min(1, seconds / minSec);
    state.inTarget = start !== null;
  });
}

/** Maior intervalo entre dois quadros que ainda conta como tempo de voz (o resto é pausa). */
const MAX_FRAME_GAP_SEC = 0.1;

/**
 * Tempo com voz somado (cantarolar uma melodia, dizer uma frase): as pausas para respirar não
 * zeram, só não contam. Uma "repetição" quando chega em `seconds` (com 90% de folga).
 */
export function voiceTimeDetector(seconds: number): Detector {
  const { state, detector } = base();
  let previous: number | null = null;
  return detector((frames) => {
    for (const f of frames) {
      if (f.hz !== null && previous !== null) state.currentSec += Math.min(f.t - previous, MAX_FRAME_GAP_SEC);
      previous = f.t;
    }
    if (state.reps === 0 && state.currentSec >= seconds * HOLD_TOLERANCE) state.reps = 1;
    state.progress = state.reps > 0 ? 1 : Math.min(1, state.currentSec / seconds);
    state.inTarget = frames.some((f) => f.hz !== null);
  });
}

/** Abaixo desta fração do volume da própria tentativa, o som acabou (a respiração é bem mais fraca). */
const RELATIVE_QUIET = 0.35;

/**
 * Duração de som contínuo pelo volume, com ou sem tom (/s/, /z/, "a"). A tentativa termina
 * quando o volume cai bem abaixo do volume dela mesma, para a respiração entre uma tentativa e
 * outra (que tem volume, mas fraco) não juntar as duas.
 */
export function durationDetector(soundRms = 0.006): Detector {
  const { state, detector } = base();
  let level = 0;
  let count = 0;
  const feed = attempts(
    (f) => f.rms >= Math.max(soundRms, level * RELATIVE_QUIET),
    (run) => {
      level = 0;
      count = 0;
      const seconds = run[run.length - 1].t - run[0].t;
      if (seconds < MIN_ATTEMPT_SEC) return;
      state.values.push(seconds);
      state.reps++;
    },
  );
  return detector((frames) => {
    let current: VoiceFrame[] = [];
    for (const f of frames) {
      current = feed([f]);
      // Volume típico da tentativa atual (média), para saber quando ela acabou.
      if (current.length > 0 && current[current.length - 1] === f) {
        count++;
        level += (f.rms - level) / count;
      }
    }
    state.currentSec = current.length > 0 ? current[current.length - 1].t - current[0].t : 0;
    state.inTarget = current.length > 0;
  });
}

/**
 * Erro médio (semitons) entre uma tentativa e a curva-alvo, com o tempo das duas ajustado
 * para a mesma duração (quem fala mais devagar não é punido). `null` se cobrir pouco a curva.
 */
export function contourError(attempt: readonly { t: number; hz: number }[], target: readonly { t: number; hz: number }[]): number | null {
  if (attempt.length < 2 || target.length < 2) return null;
  const duration = target[target.length - 1].t;
  const at = (points: readonly { t: number; hz: number }[], t: number) => {
    let i = 1;
    while (i < points.length - 1 && points[i].t < t) i++;
    const a = points[i - 1];
    const b = points[i];
    const k = b.t === a.t ? 0 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
    return hzToMidi(a.hz) + (hzToMidi(b.hz) - hzToMidi(a.hz)) * k;
  };
  const samples = 20;
  let total = 0;
  for (let i = 0; i <= samples; i++) {
    const t = (duration * i) / samples;
    total += Math.abs(at(attempt, t) - at(target, t));
  }
  return total / (samples + 1);
}

/** Curva: cada frase dita é comparada com a curva; erro médio abaixo do limite conta. */
export function contourDetector(target: readonly { t: number; hz: number }[], maxMeanErrorSt: number): Detector {
  const { state, detector } = base();
  const duration = target.length > 0 ? target[target.length - 1].t : 0;
  const scaled = (run: readonly VoiceFrame[]) => {
    const voiced = run.filter((f) => f.hz !== null);
    const span = voiced.length > 1 ? voiced[voiced.length - 1].t - voiced[0].t : 0;
    return voiced.map((f) => ({ t: span > 0 ? ((f.t - voiced[0].t) / span) * duration : 0, hz: f.hz as number }));
  };
  const feed = attempts(
    (f) => f.hz !== null,
    (run) => {
      if (run[run.length - 1].t - run[0].t < MIN_ATTEMPT_SEC) return;
      const attempt = scaled(run);
      const error = contourError(attempt, target);
      state.attempt = attempt;
      if (error === null) return;
      state.values.push(error);
      if (error < maxMeanErrorSt) state.reps++;
    },
  );
  return detector((frames) => {
    const current = feed(frames);
    if (current.length > 0) state.attempt = scaled(current);
    state.inTarget = current.length > 0;
  });
}

/** Fala: acompanha a fração do tempo de voz dentro da faixa (`progress`); repetições só no "Fiz". */
export function speechDetector(band: Band | null): Detector {
  const { state, detector } = base();
  let voiced = 0;
  let inBand = 0;
  return detector((frames) => {
    for (const f of frames) {
      if (f.hz === null) continue;
      voiced++;
      const inside = band !== null && f.hz >= band.lowHz && f.hz <= band.highHz;
      if (inside) inBand++;
      state.inTarget = inside;
    }
    state.progress = voiced > 0 ? inBand / voiced : 0;
  });
}

/** Sem critério automático (sem medição, missão): só o "Fiz" conta. */
export function manualDetector(): Detector {
  return base().detector(() => {});
}
