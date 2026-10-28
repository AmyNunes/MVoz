import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

import { synthesizeTone, TONE_SAMPLE_RATE, type Timbre, type ToneSpec } from './tone';
import { encodeWav } from './wav';

/**
 * Toca o tom de referência (seção 7.6): gera o WAV uma vez, guarda no cache e toca pelo
 * expo-audio. Quem usa deve pausar a análise do microfone enquanto toca.
 */
export type TonePlayer = {
  play: (spec: ToneSpec, timbre?: Timbre) => Promise<void>;
  stop: () => void;
};

/** Nome estável do arquivo para cada tom (o mesmo tom não é gerado de novo). */
export function toneKey(spec: ToneSpec, timbre: Timbre = 'soft'): string {
  const suffix = timbre === 'soft' ? '' : `-${timbre}`;
  if (spec.kind === 'note') return `note-${spec.hz.toFixed(1)}-${spec.seconds}${suffix}`;
  if (spec.kind === 'glide') return `glide-${spec.fromHz.toFixed(1)}-${spec.toHz.toFixed(1)}-${spec.seconds}${suffix}`;
  let hash = 0;
  for (const c of JSON.stringify(spec.points)) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) | 0;
  return `contour-${(hash >>> 0).toString(36)}${suffix}`;
}

async function toneUri(spec: ToneSpec, timbre: Timbre): Promise<string> {
  const dir = new Directory(Paths.cache, 'tones');
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, `${toneKey(spec, timbre)}.wav`);
  if (!file.exists) await file.write(encodeWav(synthesizeTone(spec, TONE_SAMPLE_RATE, timbre), TONE_SAMPLE_RATE));
  return file.uri;
}

export function createTonePlayer(onPlayingChange: (playing: boolean) => void): TonePlayer {
  let player: AudioPlayer | null = null;
  let subscription: { remove: () => void } | null = null;

  function stop() {
    subscription?.remove();
    subscription = null;
    if (player) {
      player.remove();
      player = null;
      onPlayingChange(false);
    }
  }

  async function play(spec: ToneSpec, timbre: Timbre = 'soft') {
    stop();
    const uri = await toneUri(spec, timbre);
    const next = createAudioPlayer({ uri });
    player = next;
    subscription = next.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (status.didJustFinish && player === next) stop();
    });
    onPlayingChange(true);
    next.play();
  }

  return { play, stop };
}
