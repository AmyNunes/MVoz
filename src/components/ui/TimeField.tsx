import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '@/i18n/strings';
import { formatTimeOfDay, parseTimeOfDay } from '@/lib/dates';
import { makeStyles } from '@/theme';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';
import { Text } from './Text';

type Props = {
  label: string;
  /** "08:30" */
  value: string;
  onChange: (value: string) => void;
  /** Passo dos minutos (padrão 5). */
  minuteStep?: number;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Campo de horário: mostra "08:30" e abre um painel com hora e minuto. */
export function TimeField({ label, value, onChange, minuteStep = 5 }: Props) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const minutes = parseTimeOfDay(value);
  const [draft, setDraft] = useState({ h: Math.floor(minutes / 60), m: minutes % 60 });
  const t = strings.notifications.timePicker;

  const openPicker = () => {
    setDraft({ h: Math.floor(minutes / 60), m: minutes % 60 });
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="heading">{value}</Text>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} snapPoints={['55%']}>
        <View style={styles.row}>
          <Text variant="label" style={styles.label}>
            {t.hour}
          </Text>
          <Stepper accessibilityLabel={t.hour} value={draft.h} min={0} max={23} format={pad} onChange={(h) => setDraft((d) => ({ ...d, h }))} />
        </View>
        <View style={styles.row}>
          <Text variant="label" style={styles.label}>
            {t.minute}
          </Text>
          <Stepper
            accessibilityLabel={t.minute}
            value={draft.m}
            min={0}
            max={60 - minuteStep}
            step={minuteStep}
            format={pad}
            onChange={(m) => setDraft((d) => ({ ...d, m }))}
          />
        </View>
        <Button
          label={`${strings.common.done} · ${formatTimeOfDay(draft.h * 60 + draft.m)}`}
          icon="check"
          size="main"
          onPress={() => {
            onChange(formatTimeOfDay(draft.h * 60 + draft.m));
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  field: {
    flex: 1,
    minHeight: t.sizes.listRowHeight,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceAlt,
  },
  pressed: { opacity: t.opacity.pressed },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.md },
  label: { flex: 1 },
}));
