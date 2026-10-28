import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSnackbar } from '@/stores/snackbarStore';
import { makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

const VISIBLE_MS = 5000;

/** Mostra o Snackbar atual acima da tab bar por 5 s. Fica no layout raiz. */
export function SnackbarHost() {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const current = useSnackbar((s) => s.current);
  const hide = useSnackbar((s) => s.hide);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => hide(current.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;

  return (
    <Animated.View
      key={current.id}
      entering={FadeInDown.duration(theme.durations.transition)}
      exiting={FadeOutDown.duration(theme.durations.micro)}
      style={[styles.wrap, { bottom: insets.bottom + theme.sizes.tabBarHeight + theme.spacing.md }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} accessibilityLiveRegion="polite">
        <Text style={styles.message}>{current.message}</Text>
        {current.action && (
          <Pressable
            onPress={() => {
              current.action?.onPress();
              hide(current.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={current.action.label}
            hitSlop={theme.spacing.md}
            style={styles.action}
          >
            <Text variant="label" style={styles.actionText}>
              {current.action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'absolute', left: t.spacing.screen, right: t.spacing.screen },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.buttonHeight,
    paddingLeft: t.spacing.lg,
    paddingRight: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.text,
    elevation: t.elevation.fab,
  },
  message: { flex: 1, color: t.colors.bg },
  action: { minHeight: t.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: t.spacing.sm },
  actionText: { color: t.colors.bg, fontWeight: t.typography.title.fontWeight, textTransform: 'uppercase', letterSpacing: t.tracking.caps },
}));
