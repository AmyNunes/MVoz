import { useCallback, useEffect, useState } from 'react';

import type { ToneSpec } from '@/audio/tone';
import { createTonePlayer } from '@/audio/tonePlayer';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

/** Duração da nota de referência. */
const NOTE_SECONDS = 2;

/** Tom de referência (nota ou curva). `playing` serve para pausar a análise do microfone. */
export function useReferenceTone() {
  const [playing, setPlaying] = useState(false);
  const [player] = useState(() => createTonePlayer(setPlaying));

  useEffect(() => () => player.stop(), [player]);

  const playSpec = useCallback(
    async (spec: ToneSpec) => {
      try {
        await player.play(spec, useSettings.getState().training.toneTimbre);
      } catch {
        player.stop();
        showSnackbar(strings.meter.tone.error);
      }
    },
    [player],
  );

  const play = useCallback((hz: number) => playSpec({ kind: 'note', hz, seconds: NOTE_SECONDS }), [playSpec]);

  return { playing, play, playSpec, stop: player.stop };
}
