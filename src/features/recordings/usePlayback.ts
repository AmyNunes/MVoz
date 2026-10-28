import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback } from 'react';

/** Atualiza a posição 10 vezes por segundo: o traçado anda junto com o áudio (seção 7.5). */
const UPDATE_MS = 100;

/** Toca o WAV de uma gravação. `uri` nulo = nada para tocar. */
export function usePlayback(uri: string | null) {
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: UPDATE_MS });
  const status = useAudioPlayerStatus(player);
  const atEnd = status.duration > 0 && status.currentTime >= status.duration - 0.05;

  const toggle = useCallback(async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (atEnd || status.didJustFinish) await player.seekTo(0);
    player.play();
  }, [player, status.playing, status.didJustFinish, atEnd]);

  return {
    playing: status.playing,
    position: status.currentTime,
    duration: status.duration,
    ready: status.isLoaded,
    toggle,
  };
}
