import { useState } from 'react';

import { Button, Sheet, Stepper, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { formatUserNote } from '@/features/settings/notation';
import { hzToMidi, midiToHz } from '@/lib/notes';

const t = strings.meter.tone;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Nota inicial (ex.: o centro da faixa-alvo). */
  initialHz: number;
  playing: boolean;
  onPlay: (hz: number) => void;
  onStop: () => void;
};

const label = (midi: number) => {
  const hz = midiToHz(midi);
  return strings.meter.band.value(Math.round(hz), formatUserNote(hz));
};

/** Escolher a nota (de 1 em 1 semitom) e tocar o tom de referência (seção 7.6). */
export function ToneSheet({ visible, onClose, initialHz, playing, onPlay, onStop }: Props) {
  const [midi, setMidi] = useState(() => hzToMidi(initialHz));

  return (
    <Sheet visible={visible} onClose={onClose} title={t.title}>
      <Stepper
        value={midi}
        min={hzToMidi(60)}
        max={hzToMidi(500)}
        onChange={setMidi}
        format={label}
        accessibilityLabel={t.note}
      />
      <Button
        label={playing ? t.stop : t.play}
        icon={playing ? 'square' : 'play'}
        size="main"
        onPress={() => (playing ? onStop() : onPlay(midiToHz(midi)))}
      />
      <Text variant="caption" color="textMuted">
        {t.hint}
      </Text>
    </Sheet>
  );
}
