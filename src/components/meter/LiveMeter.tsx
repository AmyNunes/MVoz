import { useState } from 'react';
import { View } from 'react-native';

import { GestureGuide } from '@/components/navigation/GestureGuide';
import { Button, ErrorState, Segmented, Text } from '@/components/ui';
import { useLiveVoice } from '@/features/meter/useLiveVoice';
import { MAX_RECORDING_SEC, useMeterRecording } from '@/features/meter/useMeterRecording';
import { useReferenceTone } from '@/features/meter/useReferenceTone';
import { useStartResonance } from '@/features/meter/useStartResonance';
import { useTargetBand } from '@/features/meter/useTargetBand';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

import { PitchReadout } from './PitchReadout';
import { PitchTrace } from './PitchTrace';
import { RecordButton } from './RecordButton';
import { ResonanceGauge } from './ResonanceGauge';
import { TargetBandSheet } from './TargetBandSheet';
import { ToneSheet } from './ToneSheet';

const m = strings.meter;

type Mode = 'pitch' | 'resonance';
type OpenSheet = 'band' | 'tone' | null;

const MODES = [
  { value: 'pitch', label: m.mode.pitch },
  { value: 'resonance', label: m.mode.resonance },
] as const satisfies readonly { value: Mode; label: string }[];

/** Nota inicial do "Ouvir tom" sem faixa-alvo. */
const DEFAULT_TONE_HZ = 200;

/**
 * Medidor com o microfone já liberado (seção 10.2). Tom e ressonância nunca aparecem juntos:
 * mostrar os dois ao mesmo tempo confunde (PESQUISA.md, seção 8).
 */
export function LiveMeter() {
  const styles = useStyles();
  const tone = useReferenceTone();
  const live = useLiveVoice({ muted: tone.playing });
  const target = useTargetBand();
  const band = target.band;
  const recorder = useMeterRecording(live, band);
  const start = useStartResonance();
  const [mode, setMode] = useState<Mode>('pitch');
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const toneHz = band ? Math.sqrt(band.lowHz * band.highHz) : DEFAULT_TONE_HZ;
  // Gravando, pausar encerraria a gravação e o tom entraria no arquivo: os dois ficam desligados.
  const togglePause = () => {
    if (!recorder.recording) live.togglePause();
  };

  if (live.status === 'error') {
    return (
      <View style={styles.center}>
        <ErrorState message={m.micError} onRetry={live.retry} />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Segmented accessibilityLabel={m.mode.label} options={MODES} value={mode} onChange={setMode} />

      {mode === 'pitch' ? (
        <>
          <PitchReadout readout={live.readout} band={band} paused={live.paused} playingTone={tone.playing} />
          <PitchTrace frames={live.trace} band={band} onTogglePause={togglePause} onShiftBand={target.shift} />
          <Text variant="caption" color="textMuted" align="center">
            {m.tip}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={m.tone.button}
                icon="volume-2"
                variant="secondary"
                disabled={recorder.recording}
                onPress={() => setSheet('tone')}
              />
            </View>
            <View style={styles.flex}>
              <Button label={m.band.button} icon="sliders" variant="secondary" onPress={() => setSheet('band')} />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <ResonanceGauge reading={live.resonance} paused={live.paused} reference={start} />
        </View>
      )}

      <View style={styles.bottom}>
        <View style={styles.flex}>
          <Button
            label={live.paused ? m.resume : m.pause}
            icon={live.paused ? 'play' : 'pause'}
            variant="secondary"
            size="main"
            disabled={recorder.recording}
            onPress={togglePause}
          />
        </View>
        <RecordButton
          recording={recorder.recording}
          elapsedSec={recorder.elapsed}
          maxSec={MAX_RECORDING_SEC}
          disabled={live.paused || live.status !== 'listening'}
          onPress={recorder.toggle}
        />
      </View>

      <TargetBandSheet visible={sheet === 'band'} onClose={() => setSheet(null)} />
      <GestureGuide name="meter" />
      <ToneSheet
        visible={sheet === 'tone'}
        onClose={() => setSheet(null)}
        initialHz={toneHz}
        playing={tone.playing}
        onPlay={tone.play}
        onStop={tone.stop}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, justifyContent: 'center' },
  body: {
    flex: 1,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.screen,
    paddingBottom: t.spacing.lg,
  },
  row: { flexDirection: 'row', gap: t.spacing.md },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg },
  flex: { flex: 1 },
}));
