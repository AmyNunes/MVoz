import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { VoiceAnalyzer, type VoiceFrame } from '@/audio/analyzer';
import { createCapture, type Capture } from '@/audio/capture';
import { useAppActive } from '@/lib/useAppActive';

import { READOUT_WINDOW_SEC, sameReadout, summarize, type Readout } from './readout';
import { sameResonance, summarizeResonance, type ResonanceReading } from './resonance';
import { TRACE_SECONDS } from './trace';

export type LiveStatus = 'starting' | 'listening' | 'error';
export type FramesListener = (frames: readonly VoiceFrame[]) => void;

const SILENCE: Readout = { kind: 'silence' };

/**
 * Escuta o microfone e mede o tom ao vivo. Só escuta com a tela aberta, o app na frente
 * e sem pausa: fora disso o microfone fica desligado (nada de microfone ligado escondido).
 * Use só depois de a permissão estar concedida.
 *
 * O estado muda uma vez por bloco do microfone (~10 vezes por segundo), não a cada quadro
 * (seção 7.8). Ao pausar, o gráfico fica congelado; ao continuar, recomeça.
 * `muted`: ignora o microfone sem desligá-lo (ex.: enquanto o tom de referência toca,
 * para não medir o próprio alto-falante). `enabled: false` desliga o microfone.
 */
export function useLiveVoice({ muted = false, enabled = true }: { muted?: boolean; enabled?: boolean } = {}) {
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const captureRef = useRef<Capture | null>(null);
  const [listeners] = useState(() => new Set<FramesListener>());
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [paused, setPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<LiveStatus>('starting');
  const [readout, setReadout] = useState<Readout>(SILENCE);
  const [trace, setTrace] = useState<readonly VoiceFrame[]>([]);
  const [resonance, setResonance] = useState<ResonanceReading | null>(null);
  // `enabled` = a tela quer o microfone agora (ex.: o player desliga no "Como foi?" e no "Senti dor").
  const listening = focused && appActive && !paused && enabled;

  useEffect(() => {
    if (!listening) return;
    let alive = true;
    const analyzer = new VoiceAnalyzer();
    let history: VoiceFrame[] = [];

    const capture = createCapture((samples) => {
      if (mutedRef.current) return;
      const frames = analyzer.push(samples);
      if (frames.length === 0) return;
      listeners.forEach((listener) => listener(frames));
      const now = frames[frames.length - 1].t;
      history = history.concat(frames).filter((f) => now - f.t <= TRACE_SECONDS);
      const recent = history.filter((f) => now - f.t <= READOUT_WINDOW_SEC);
      const next = summarize(recent);
      setReadout((prev) => (sameReadout(prev, next) ? prev : next));
      const nextResonance = summarizeResonance(recent);
      setResonance((prev) => (sameResonance(prev, nextResonance) ? prev : nextResonance));
      setTrace(history);
    });
    captureRef.current = capture;

    capture.start().then(
      () => alive && setStatus('listening'),
      () => alive && setStatus('error'),
    );

    return () => {
      alive = false;
      captureRef.current = null;
      capture.stop();
      setStatus('starting');
      setReadout(SILENCE);
      setResonance(null);
    };
  }, [listening, attempt, listeners]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /** Grava o que o microfone ouve num WAV (`uri` = file://...). */
  const startFile = useCallback(async (uri: string) => {
    if (!captureRef.current) throw new Error('O microfone não está ligado');
    await captureRef.current.startFile(uri);
  }, []);

  const stopFile = useCallback(async () => {
    if (!captureRef.current) throw new Error('O microfone não está ligado');
    return captureRef.current.stopFile();
  }, []);

  /** Recebe as medidas novas (ex.: para calcular as métricas de uma gravação). */
  const onFrames = useCallback(
    (listener: FramesListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    [listeners],
  );

  return {
    status,
    listening,
    readout,
    resonance,
    trace,
    paused,
    togglePause,
    retry,
    startFile,
    stopFile,
    onFrames,
  };
}

export type LiveVoice = ReturnType<typeof useLiveVoice>;
