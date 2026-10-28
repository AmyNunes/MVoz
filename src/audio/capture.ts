import { AudioModule, type AudioStream, type AudioStreamBuffer } from 'expo-audio';

import { ANALYSIS_SAMPLE_RATE, pcm16ToFloat32, Resampler } from './frames';

/**
 * Microfone ao vivo (seção 7.1): PCM de 16 bits, mono, pedido a 16 kHz.
 * O stream do expo-audio é recente e tem bugs abertos (ex.: o microfone fica preso se o
 * `stop` nativo falhar). Por isso cada `start()` cria um stream novo e cada `stop()` libera
 * o anterior, mesmo quando o `stop` dá erro.
 */
export type Capture = {
  start: () => Promise<void>;
  /** Para e libera o microfone. Uma gravação em andamento é finalizada pelo próprio expo-audio. */
  stop: () => void;
  /** Começa a gravar o que o microfone ouve num WAV de 16 bits, em `uri` (file://...). */
  startFile: (uri: string) => Promise<void>;
  /** Termina a gravação e devolve a duração, em segundos. */
  stopFile: () => Promise<number>;
};

/** `onSamples` recebe blocos de ~100 ms em float, mono, a 16 kHz. */
export function createCapture(onSamples: (samples: Float32Array) => void): Capture {
  let stream: AudioStream | null = null;
  let subscription: { remove: () => void } | null = null;
  let resampler: { rate: number; instance: Resampler } | null = null;

  function handleBuffer(buffer: AudioStreamBuffer) {
    const samples = pcm16ToFloat32(buffer.data, buffer.channels);
    if (buffer.sampleRate === ANALYSIS_SAMPLE_RATE) {
      onSamples(samples);
      return;
    }
    // O aparelho não aceitou 16 kHz: reamostra (guardando o estado entre blocos).
    if (resampler?.rate !== buffer.sampleRate) {
      resampler = { rate: buffer.sampleRate, instance: new Resampler(buffer.sampleRate, ANALYSIS_SAMPLE_RATE) };
    }
    onSamples(resampler.instance.process(samples));
  }

  function stop() {
    subscription?.remove();
    subscription = null;
    resampler = null;
    const current = stream;
    stream = null;
    if (!current) return;
    try {
      current.stop();
    } catch (error) {
      console.warn('Falha ao parar o microfone', error);
    } finally {
      current.release();
    }
  }

  async function start() {
    stop();
    // Falso positivo: `AudioModule` é o módulo nativo (um objeto), não um namespace de arquivo.
    // eslint-disable-next-line import/namespace
    const next = new AudioModule.AudioStream({
      sampleRate: ANALYSIS_SAMPLE_RATE,
      channels: 1,
      encoding: 'int16',
    });
    stream = next;
    // Blocos que chegam depois do stop (já na fila) são ignorados.
    subscription = next.addListener('audioStreamBuffer', (buffer) => {
      if (stream === next) handleBuffer(buffer);
    });
    try {
      await next.start();
    } catch (error) {
      if (stream === next) stop();
      throw error;
    }
  }

  async function startFile(uri: string) {
    if (!stream) throw new Error('O microfone não está ligado');
    await stream.startFileRecordingAsync({ uri, format: 'wav' });
  }

  async function stopFile() {
    if (!stream) throw new Error('O microfone não está ligado');
    const result = await stream.stopFileRecordingAsync();
    return result.duration;
  }

  return { start, stop, startFile, stopFile };
}
