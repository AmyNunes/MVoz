import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { trackPoints, type PitchTrack } from '@/audio/pitchTrack';
import { gridLines, pathFor, traceRange, yForHz } from '@/features/meter/trace';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

type Props = {
  track: PitchTrack;
  durationSec: number;
  /** Segundo que está tocando agora (linha vertical). */
  position: number;
};

/** Pontos do traçado reduzido são a cada 100 ms: lacunas maiores quebram a linha. */
const MAX_GAP_SEC = 0.15;

/** Traçado inteiro da gravação, com a linha da posição andando junto com o áudio (seção 10.8). */
export function PlaybackTrace({ track, durationSec, position }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const points = trackPoints(track);
  const range = traceRange(points, null);
  const x = durationSec > 0 ? (size.width * Math.min(position, durationSec)) / durationSec : 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View
      style={styles.box}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={strings.recordings.traceLabel}
    >
      {size.width > 0 && (
        <Svg width={size.width} height={size.height}>
          {gridLines(range, size.height, theme.typography.caption.lineHeight + theme.spacing.sm).map((hz) => {
            const y = yForHz(hz, range, size.height);
            return [
              <Line key={`l${hz}`} x1={0} x2={size.width} y1={y} y2={y} stroke={theme.colors.border} />,
              <SvgText
                key={`t${hz}`}
                x={theme.spacing.xs}
                y={y - theme.spacing.xs}
                fontSize={theme.typography.caption.fontSize}
                fill={theme.colors.textMuted}
              >
                {strings.meter.hzShort(hz)}
              </SvgText>,
            ];
          })}
          <Path
            d={pathFor(points, range, size, { start: 0, end: durationSec }, MAX_GAP_SEC)}
            stroke={theme.colors.primary}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          <Line x1={x} x2={x} y1={0} y2={size.height} stroke={theme.colors.text} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    height: t.sizes.traceHeight,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
}));
