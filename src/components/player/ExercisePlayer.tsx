import { useKeepAwake } from 'expo-keep-awake';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { MicPermission } from '@/components/meter/MicPermission';
import { TargetBandSheet } from '@/components/meter/TargetBandSheet';
import { Button, IconButton, Notice, Text } from '@/components/ui';
import type { Exercise } from '@/exercises/model';
import type { RoutineItem } from '@/exercises/results';
import { useMicPermission } from '@/features/meter/useMicPermission';
import { useTargetBand } from '@/features/meter/useTargetBand';
import { needsBand } from '@/features/player/target';
import type { FeedbackMode } from '@/features/player/usePlayerFlow';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { MeasuredPlayer, type PlayerCallbacks } from './MeasuredPlayer';
import { PlainPlayer } from './PlainPlayer';

const p = strings.player;

export type ExercisePlayerProps = PlayerCallbacks & {
  exercise: Exercise;
  item?: RoutineItem;
  simulatedContour?: { t: number; hz: number }[] | null;
  initialFeedback?: FeedbackMode;
};

/**
 * Player de um exercício (seção 8.5). Antes de medir, pede o microfone (com explicação) e,
 * se o exercício usa tom-alvo, a faixa-alvo. A tela fica acesa enquanto ele está aberto.
 */
export function ExercisePlayer(props: ExercisePlayerProps) {
  useKeepAwake();
  const { exercise } = props;
  const usesMic = exercise.measure !== 'none' && exercise.measure !== 'mission';
  return usesMic ? <MicGate {...props} /> : <PlainPlayer {...props} />;
}

function MicGate(props: ExercisePlayerProps) {
  const theme = useTheme();
  const styles = useStyles();
  const mic = useMicPermission();

  if (mic.status === 'granted') return <BandGate {...props} />;
  return (
    <GateFrame title={props.exercise.name} onClose={props.onExit}>
      {mic.status === 'checking' ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} accessibilityLabel={strings.common.loading} />
        </View>
      ) : (
        <MicPermission status={mic.status} onRequest={mic.request} onOpenSettings={mic.openSettings} />
      )}
    </GateFrame>
  );
}

function BandGate(props: ExercisePlayerProps) {
  const styles = useStyles();
  const target = useTargetBand();
  const [sheet, setSheet] = useState(false);

  if (!needsBand(props.exercise) || target.band) return <MeasuredPlayer {...props} band={target.band} />;
  return (
    <GateFrame title={props.exercise.name} onClose={props.onExit}>
      <View style={styles.gate}>
        <Notice>{p.needsBand}</Notice>
        <Button label={p.setBand} icon="sliders" size="main" onPress={() => setSheet(true)} />
      </View>
      <TargetBandSheet visible={sheet} onClose={() => setSheet(false)} />
    </GateFrame>
  );
}

/** Moldura das telas antes do exercício: ✕ e o nome. */
function GateFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <IconButton icon="x" accessibilityLabel={p.close} onPress={onClose} />
        <Text variant="heading" numberOfLines={1} style={styles.flex} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingHorizontal: t.spacing.xs },
  gate: { flex: 1, justifyContent: 'flex-end', gap: t.spacing.lg, padding: t.spacing.screen },
}));
