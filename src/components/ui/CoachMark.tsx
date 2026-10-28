import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { strings } from '@/i18n/strings';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type CoachHint = { icon: IconName; text: string };

type Props = {
  visible: boolean;
  title: string;
  /** Gesto demonstrado pela "bolinha do dedo". */
  motion: 'swipe' | 'tap' | 'hold';
  hints: CoachHint[];
  onDismiss: () => void;
};

const TRAVEL = 56;

/** Sobreposição na primeira visita: animação do gesto, frases curtas e "Entendi" (seção 4.5). */
export function CoachMark({ visible, title, motion, hints, onDismiss }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!visible || reduceMotion) return;
    const d = theme.durations.pulse;
    if (motion === 'swipe') {
      x.set(withRepeat(withSequence(withTiming(TRAVEL, { duration: d }), withTiming(-TRAVEL, { duration: d * 2 }), withTiming(0, { duration: d })), -1));
    } else {
      scale.set(withRepeat(withSequence(withTiming(0.75, { duration: d / 2 }), withTiming(1, { duration: d / 2 })), -1));
    }
    return () => {
      cancelAnimation(x);
      cancelAnimation(scale);
    };
  }, [visible, reduceMotion, motion, x, scale, theme]);

  const fingerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scale: scale.get() }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.stage} importantForAccessibility="no-hide-descendants">
            <Animated.View
              style={[styles.finger, { backgroundColor: withAlpha(theme.colors.primary, TINT * 3) }, fingerStyle]}
            />
          </View>
          <Text variant="heading" align="center" accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.hints}>
            {hints.map((h) => (
              <View key={h.text} style={styles.hint}>
                <Icon name={h.icon} color="primary" size={theme.sizes.iconSmall} />
                <Text style={styles.hintText}>{h.text}</Text>
              </View>
            ))}
          </View>
          <Button label={strings.common.gotIt} onPress={onDismiss} size="main" />
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: t.spacing.xxl,
    backgroundColor: withAlpha(t.colors.scrim, 0.55),
  },
  panel: {
    gap: t.spacing.lg,
    padding: t.spacing.xxl,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
  },
  stage: { height: t.sizes.badge.lg * 1.6, alignItems: 'center', justifyContent: 'center' },
  finger: {
    width: t.sizes.badge.lg,
    height: t.sizes.badge.lg,
    borderRadius: t.radii.full,
    borderWidth: 2,
    borderColor: t.colors.primary,
  },
  hints: { gap: t.spacing.sm },
  hint: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  hintText: { flex: 1 },
}));
