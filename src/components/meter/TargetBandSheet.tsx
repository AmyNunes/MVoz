import { View } from 'react-native';

import { Sheet, Stepper, Text, Toggle } from '@/components/ui';
import { useTargetBand } from '@/features/meter/useTargetBand';
import { strings } from '@/i18n/strings';
import { formatUserNote } from '@/features/settings/notation';
import { hzToMidi, midiToHz } from '@/lib/notes';
import { makeStyles } from '@/theme';

const b = strings.meter.band;

type Props = {
  visible: boolean;
  onClose: () => void;
};

const label = (midi: number) => {
  const hz = midiToHz(midi);
  return b.value(Math.round(hz), formatUserNote(hz));
};

/** Ajuste da faixa-alvo com Steppers de 1 semitom (alternativa ao arraste no gráfico, seção 6). */
export function TargetBandSheet({ visible, onClose }: Props) {
  const styles = useStyles();
  const target = useTargetBand();
  const low = hzToMidi(target.current.lowHz);
  const high = hzToMidi(target.current.highHz);

  return (
    <Sheet visible={visible} onClose={onClose} title={b.title}>
      <View style={styles.row}>
        <Text style={styles.flex}>{b.show}</Text>
        <Toggle value={target.enabled} onValueChange={target.setEnabled} accessibilityLabel={b.show} />
      </View>
      {target.enabled && (
        <>
          <Field title={b.whole}>
            <Stepper
              value={low}
              min={hzToMidi(60)}
              max={hzToMidi(500) - (high - low)}
              onChange={(next) => target.shift(next - low)}
              format={() => b.range(Math.round(target.current.lowHz), Math.round(target.current.highHz))}
              accessibilityLabel={b.whole}
            />
          </Field>
          <Field title={b.low}>
            <Stepper
              value={low}
              min={hzToMidi(60)}
              max={high - 1}
              onChange={(next) => target.setLow(midiToHz(next))}
              format={label}
              accessibilityLabel={b.low}
            />
          </Field>
          <Field title={b.high}>
            <Stepper
              value={high}
              min={low + 1}
              max={hzToMidi(500)}
              onChange={(next) => target.setHigh(midiToHz(next))}
              format={label}
              accessibilityLabel={b.high}
            />
          </Field>
        </>
      )}
      <Text variant="caption" color="textMuted">
        {b.hint}
      </Text>
    </Sheet>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text variant="label" color="textMuted">
        {title}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, minHeight: t.sizes.touchTarget },
  flex: { flex: 1 },
  field: { gap: t.spacing.sm },
}));
