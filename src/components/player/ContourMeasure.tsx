import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { IconButton, Text } from '@/components/ui';
import type { DetectorState } from '@/exercises/criteria';
import { oneDecimal } from '@/features/player/summary';
import { pathFor, traceRange } from '@/features/meter/trace';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { FeedbackPlaceholder } from './PitchMeasure';

const m = strings.player.measure;

export type ContourChoice = { text: string; points: { t: number; hz: number }[] };

type Props = {
  items: readonly ContourChoice[];
  index: number;
  onIndexChange: (index: number) => void;
  state: DetectorState | null;
  hidden: boolean;
  summaryOnly: boolean;
};

/** Curva-alvo + o meu traçado por cima (seção 8.3, `contour`). */
export function ContourMeasure({ items, index, onIndexChange, state, hidden, summaryOnly }: Props) {
  const styles = useStyles();
  const item = items[index];
  const last = state?.values[state.values.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <IconButton icon="chevron-left" accessibilityLabel={m.contourPrev} disabled={index === 0} onPress={() => onIndexChange(index - 1)} />
        <Text variant="reading" align="center" style={styles.text}>
          {item.text}
        </Text>
        <IconButton
          icon="chevron-right"
          accessibilityLabel={m.contourNext}
          disabled={index >= items.length - 1}
          onPress={() => onIndexChange(index + 1)}
        />
      </View>
      {hidden ? <FeedbackPlaceholder summaryOnly={summaryOnly} /> : <ContourChart target={item.points} attempt={state?.attempt ?? []} />}
      {last !== undefined && (
        <Text variant="label" align="center" color="textMuted">
          {m.contourError(oneDecimal(last))}
        </Text>
      )}
    </View>
  );
}

/** Gráfico parado com a duração da curva: curva-alvo em `target` e a tentativa em `primary`. */
export function ContourChart({ target, attempt }: { target: { t: number; hz: number }[]; attempt: { t: number; hz: number }[] }) {
  const theme = useTheme();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const duration = target[target.length - 1]?.t ?? 1;
  const range = traceRange([...target, ...attempt], null);
  const window = { start: 0, end: duration };
  const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  return (
    <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={m.contourLabel}>
      {/* Camada por cima: o desenho não muda o tamanho do quadro (senão ele cresce sem parar na rolagem). */}
      <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
        {size.width > 0 && (
          <Svg width={size.width} height={size.height}>
            <Path d={pathFor(target, range, size, window, Infinity)} stroke={theme.colors.target} strokeWidth={6} strokeOpacity={0.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={pathFor(attempt, range, size, window, 0.1)} stroke={theme.colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flexGrow: 1, gap: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  chart: {
    flexGrow: 1,
    minHeight: t.sizes.traceMinHeight,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
}));
