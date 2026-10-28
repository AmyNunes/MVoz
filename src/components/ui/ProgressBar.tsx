import { View } from 'react-native';

import { makeStyles, useTheme, type ColorTokens } from '@/theme';

type Props = {
  /** 0 a 1 */
  progress: number;
  color?: keyof ColorTokens;
  height?: number;
  accessibilityLabel?: string;
};

export function ProgressBar({ progress, color = 'primary', height, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <View
      style={[styles.track, height != null && { height }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.colors[color] }]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    height: t.spacing.xs,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: t.radii.full },
}));
