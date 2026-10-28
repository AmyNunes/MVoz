import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { PitchFrame } from '@/audio/pitch';
import type { Band } from '@/features/meter/band';
import { gridLines, tracePath, traceRange, yForHz, type TraceRange } from '@/features/meter/trace';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

type Props = {
  frames: readonly PitchFrame[];
  band: Band | null;
  /** Nota-alvo (linha tracejada), nos exercícios de imitar e sustentar uma nota. */
  noteHz?: number | null;
  /** Sem estes, o gráfico não tem gestos (ex.: no player). */
  onTogglePause?: () => void;
  onShiftBand?: (semitones: number) => void;
};

const STROKE = 3;

/**
 * Gráfico rolando do tom (seção 4.5): eixo em semitons, faixa-alvo em `targetSoft` com bordas
 * `target`, linha em `primary`; trechos sem voz ficam vazios.
 * Toque: pausa/continua. Arrastar ↑↓: move a faixa de 1 em 1 semitom (alternativas: botões).
 */
export function PitchTrace({ frames, band, noteHz = null, onTogglePause, onShiftBand }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const range = traceRange(frames, band);
  const pxPerSemitone = size.height / (range.high - range.low);
  const drag = useRef({ pxPerSemitone: 0, applied: 0 });

  const pan = usePanGesture({
    runOnJS: true,
    enabled: band !== null && onShiftBand !== undefined,
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onActivate: () => {
      drag.current = { pxPerSemitone, applied: 0 };
    },
    onUpdate: (e) => {
      const steps = Math.trunc(-e.translationY / drag.current.pxPerSemitone);
      if (steps !== drag.current.applied) {
        onShiftBand?.(steps - drag.current.applied);
        drag.current.applied = steps;
      }
    },
  });
  const tap = useTapGesture({ runOnJS: true, enabled: onTogglePause !== undefined, onActivate: () => onTogglePause?.() });
  const gesture = useExclusiveGestures(pan, tap);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const labelSize = theme.typography.caption.fontSize;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel={strings.meter.traceLabel}>
        {/* O desenho fica numa camada por cima: o tamanho vem só do layout, nunca do desenho
            (senão, numa tela com rolagem, a borda faz o gráfico crescer sem parar). */}
        <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
          {size.width > 0 && (
            <Svg width={size.width} height={size.height}>
              {band && <BandArea band={band} range={range} width={size.width} height={size.height} />}
              {gridLines(range, size.height, theme.typography.caption.lineHeight + theme.spacing.sm).map((hz) => {
                const y = yForHz(hz, range, size.height);
                return [
                  <Line key={`l${hz}`} x1={0} x2={size.width} y1={y} y2={y} stroke={theme.colors.border} />,
                  <SvgText
                    key={`t${hz}`}
                    x={theme.spacing.xs}
                    y={y - theme.spacing.xs}
                    fontSize={labelSize}
                    fill={theme.colors.textMuted}
                  >
                    {strings.meter.hzShort(hz)}
                  </SvgText>,
                ];
              })}
              {noteHz !== null && (
                <Line
                  x1={0}
                  x2={size.width}
                  y1={yForHz(noteHz, range, size.height)}
                  y2={yForHz(noteHz, range, size.height)}
                  stroke={theme.colors.target}
                  strokeWidth={2}
                  strokeDasharray="6 6"
                />
              )}
              <Path
                d={tracePath(frames, range, size)}
                stroke={theme.colors.primary}
                strokeWidth={STROKE}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          )}
        </View>
      </View>
    </GestureDetector>
  );
}

type BandAreaProps = { band: Band; range: TraceRange; width: number; height: number };

function BandArea({ band, range, width, height }: BandAreaProps) {
  const theme = useTheme();
  const top = yForHz(band.highHz, range, height);
  const bottom = yForHz(band.lowHz, range, height);
  return (
    <>
      <Rect x={0} y={top} width={width} height={bottom - top} fill={theme.colors.targetSoft} />
      <Line x1={0} x2={width} y1={top} y2={top} stroke={theme.colors.target} strokeWidth={2} />
      <Line x1={0} x2={width} y1={bottom} y2={bottom} stroke={theme.colors.target} strokeWidth={2} />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    flex: 1,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
    elevation: t.elevation.card,
  },
}));
