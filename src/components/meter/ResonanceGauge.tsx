import { View } from 'react-native';

import { Notice, Text } from '@/components/ui';
import { gaugePosition, type ResonanceReading } from '@/features/meter/resonance';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const r = strings.meter.resonance;

type Props = {
  reading: ResonanceReading | null;
  paused?: boolean;
  /** Referência (ΔF) para a marca de comparação, ex.: o começo do exercício. */
  reference?: { spacing: number; label: string } | null;
  /** Sem a dica longa do rodapé (no player, onde o espaço é curto; ela fica no Medidor). */
  compact?: boolean;
};

/**
 * Barra "mais escura ↔ mais clara" com o marcador atual e o rótulo "estimativa" (seção 4.5).
 * A marca "Seu início" entra com a gravação inicial do Guia (Fase 4).
 */
export function ResonanceGauge({ reading, paused = false, reference = null, compact = false }: Props) {
  const styles = useStyles();
  const position = reading && !paused ? gaugePosition(reading.spacing) : null;
  const percent = position === null ? null : Math.round(position * 100);
  const referencePercent = reference ? Math.round(gaugePosition(reference.spacing) * 100) : null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text variant="heading">{r.label}</Text>
        <Text variant="caption" color="textMuted">
          {r.estimate}
        </Text>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={r.label}
        accessibilityValue={percent === null ? { text: r.waiting } : { min: 0, max: 100, now: percent, text: r.value(percent) }}
        style={styles.track}
      >
        {referencePercent !== null && <View style={[styles.reference, { left: `${referencePercent}%` }]} />}
        {percent !== null && <View style={[styles.marker, { left: `${percent}%` }]} />}
      </View>
      {reference && referencePercent !== null && (
        // A legenda sai do lado mais perto da marca, para não passar da borda da tela.
        <View
          style={[
            styles.referenceLabelRow,
            referencePercent <= 50 ? { paddingLeft: `${referencePercent}%` } : { justifyContent: 'flex-end', paddingRight: `${100 - referencePercent}%` },
          ]}
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="caption" color="textMuted" style={styles.referenceLabel}>
            {referencePercent <= 50 ? `▲ ${reference.label}` : `${reference.label} ▲`}
          </Text>
        </View>
      )}

      <View style={styles.ends} importantForAccessibility="no-hide-descendants">
        <Text variant="caption" color="textMuted">
          {r.darker}
        </Text>
        <Text variant="caption" color="textMuted">
          {r.brighter}
        </Text>
      </View>

      {position === null && !paused && (
        <Text color="textMuted" align="center">
          {r.waiting}
        </Text>
      )}
      {reading?.highPitch && !paused && <Notice tone="warning">{r.highPitch}</Notice>}
      {!compact && (
        <Text variant="caption" color="textMuted">
          {r.tip}
        </Text>
      )}
    </View>
  );
}

const MARKER = 28;

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  track: {
    height: t.spacing.lg,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surfaceAlt,
    justifyContent: 'center',
    marginVertical: t.spacing.sm,
  },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    marginLeft: -MARKER / 2,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primary,
    borderWidth: 3,
    borderColor: t.colors.surface,
    elevation: t.elevation.card,
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  reference: {
    position: 'absolute',
    width: t.spacing.xs,
    height: t.spacing.xxl,
    marginLeft: -t.spacing.xs / 2,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.textMuted,
  },
  referenceLabelRow: { flexDirection: 'row', marginTop: -t.spacing.sm },
  referenceLabel: { flexShrink: 1 },
}));
