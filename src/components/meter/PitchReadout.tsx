import { View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { bandState, type Band, type BandState } from '@/features/meter/band';
import type { Readout } from '@/features/meter/readout';
import { strings } from '@/i18n/strings';
import { formatUserNote } from '@/features/settings/notation';
import { useThrottledAnnouncement } from '@/lib/useThrottledAnnouncement';
import { makeStyles, type ColorTokens } from '@/theme';

const m = strings.meter;

/** O leitor de tela fala o estado no máximo a cada 2 s (seção 15). */
const ANNOUNCE_MS = 2000;

const BAND_STATES: Record<BandState, { label: string; icon: IconName; color: keyof ColorTokens }> = {
  in: { label: m.inBand, icon: 'check-circle', color: 'success' },
  below: { label: m.below, icon: 'arrow-down', color: 'warning' },
  above: { label: m.above, icon: 'arrow-up', color: 'warning' },
};

type Props = {
  readout: Readout;
  band?: Band | null;
  paused?: boolean;
  /** O tom de referência está tocando (o medidor não escuta). */
  playingTone?: boolean;
  /** Numa linha só (no player, onde o espaço é curto). */
  compact?: boolean;
};

type State = { label: string; icon?: IconName; color?: keyof ColorTokens };

function describe(readout: Readout, band: Band | null, paused: boolean, playingTone: boolean): State {
  if (playingTone) return { label: m.tone.playing, icon: 'volume-2' };
  if (paused) return { label: m.paused, icon: 'pause' };
  if (readout.kind === 'quiet') return { label: m.tooQuiet, icon: 'volume-1' };
  if (readout.kind === 'silence') return { label: m.silence };
  return band ? BAND_STATES[bandState(readout.hz, band)] : { label: m.listening };
}

/** Hz grande + nota + estado (seção 4.5). A cor nunca é o único sinal: sempre com ícone. */
export function PitchReadout({ readout, band = null, paused = false, playingTone = false, compact = false }: Props) {
  const styles = useStyles();
  const voice = !paused && !playingTone && readout.kind === 'voice' ? Math.round(readout.hz) : null;
  const note = voice === null ? null : formatUserNote(voice);
  const state = describe(readout, band, paused, playingTone);
  useThrottledAnnouncement(state.label, ANNOUNCE_MS);
  const label = voice === null || note === null ? state.label : m.readoutLabel(voice, note);
  const stateView = (
    <View style={[styles.state, compact && styles.stateCompact]}>
      {state.icon && <Icon name={state.icon} color={state.color ?? 'textMuted'} size={styles.stateIcon.width} />}
      <Text variant={compact ? 'caption' : 'label'} color={state.color ? 'text' : 'textMuted'} align={compact ? 'right' : 'center'} style={styles.stateText}>
        {state.label}
      </Text>
    </View>
  );

  if (compact) {
    // "196 Hz · Sol 3" à esquerda e o estado à direita, numa linha.
    return (
      <View style={styles.compact}>
        <View style={styles.value} accessible accessibilityLabel={label}>
          <Text variant="title" style={styles.number}>
            {voice ?? m.noValue}
          </Text>
          <Text variant="label" color="textMuted">
            {note ? `${m.hz} · ${note}` : m.hz}
          </Text>
        </View>
        {stateView}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.value} accessible accessibilityLabel={label}>
        <Text variant="meter" style={styles.number}>
          {voice ?? m.noValue}
        </Text>
        <Text variant="heading" color="textMuted">
          {m.hz}
        </Text>
      </View>
      {/* Linha da nota sempre presente, para o layout não pular. */}
      <Text variant="heading" color="textMuted" importantForAccessibility="no">
        {note ?? ' '}
      </Text>
      {stateView}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { alignItems: 'center', gap: t.spacing.xs },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: t.spacing.sm },
  number: { fontVariant: ['tabular-nums'] },
  state: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, minHeight: t.sizes.icon },
  stateIcon: { width: t.sizes.iconSmall },
  stateText: { flexShrink: 1 },
  compact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.md },
  stateCompact: { flexShrink: 1, justifyContent: 'flex-end' },
}));
