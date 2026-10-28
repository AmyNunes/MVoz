import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Button, ListGroup, ListRow, Text } from '@/components/ui';
import { chartGeometry, nearestIndex } from '@/features/progress/chart';
import type { ProgressPoint } from '@/features/progress/progress';
import { strings } from '@/i18n/strings';
import { formatShortDate } from '@/lib/dates';
import { makeStyles, useTheme } from '@/theme';

const p = strings.progress;

type Props = {
  points: readonly ProgressPoint[];
  format: (value: number) => string;
  /** Faixa-alvo ao fundo (gráfico do tom). */
  band?: { low: number; high: number } | null;
  /** Linha do zero = igual ao início (gráfico da ressonância). */
  zero?: boolean;
  /** Resumo para o leitor de tela. */
  accessibilityLabel: string;
};

const LINE = 2;
const DOT = 4;
const DOT_SELECTED = 6;
const RING = 2;

const label = (point: ProgressPoint) => (point.start ? p.start : formatShortDate(new Date(point.at)));

/**
 * Linha de uma série (um ponto por check-in), com a faixa ao fundo. Tocar no gráfico mostra o
 * valor do ponto mais perto; "Ver em tabela" lista todos (alternativa ao toque e ao gráfico).
 */
export function LineChart({ points, format, band = null, zero = false, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const height = theme.sizes.traceHeight;
  const box = { width, height, padX: theme.spacing.lg, padY: theme.spacing.md };
  const include = [...(band ? [band.low, band.high] : []), ...(zero ? [0] : [])];
  const geo = chartGeometry(
    points.map((pt) => pt.value),
    box,
    include,
  );
  const active = selected ?? points.length - 1;
  const current = points[active];

  return (
    <View style={styles.wrap}>
      {current && (
        <Text variant="label" accessibilityLiveRegion="polite">
          {p.pointValue(label(current), format(current.value))}
        </Text>
      )}
      <Pressable
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => setSelected(nearestIndex(geo.xy, e.nativeEvent.locationX))}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ height }}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {band && (
              <Rect
                x={0}
                y={geo.y(band.high)}
                width={width}
                height={Math.max(0, geo.y(band.low) - geo.y(band.high))}
                fill={theme.colors.targetSoft}
              />
            )}
            {zero && <Line x1={0} x2={width} y1={geo.y(0)} y2={geo.y(0)} stroke={theme.colors.border} strokeWidth={1} />}
            <Path d={geo.path} stroke={theme.colors.primary} strokeWidth={LINE} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {geo.xy.map((pt, i) => (
              <Circle
                key={`${i}-${points[i].at}`}
                cx={pt.x}
                cy={pt.y}
                r={i === active ? DOT_SELECTED : DOT}
                fill={points[i].start ? theme.colors.surface : theme.colors.primary}
                stroke={i === active || points[i].start ? theme.colors.primary : theme.colors.surface}
                strokeWidth={RING}
              />
            ))}
          </Svg>
        )}
      </Pressable>
      <View style={styles.axis}>
        <Text variant="caption" color="textMuted">
          {points[0] ? label(points[0]) : ''}
        </Text>
        <Text variant="caption" color="textMuted">
          {points.length > 1 ? label(points[points.length - 1]) : ''}
        </Text>
      </View>
      <Button label={table ? p.hideTable : p.showTable} icon="list" variant="ghost" onPress={() => setTable(!table)} />
      {table && (
        <ListGroup>
          {points.map((pt) => (
            <ListRow key={`${pt.at}-${pt.value}`} title={label(pt)} value={format(pt.value)} />
          ))}
        </ListGroup>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: t.spacing.sm },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
}));
