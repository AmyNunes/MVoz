import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, type Theme } from '@/theme';

type Props = {
  height: number;
  width?: DimensionValue;
  radius?: keyof Theme['radii'];
};

/**
 * Bloco cinza que "pulsa" enquanto o conteúdo carrega.
 * Com "reduzir movimento" ligado, fica parado.
 * É invisível para o leitor de tela: a tela que o usa anuncia "Carregando".
 */
export function Skeleton({ height, width = '100%', radius = 'sm' }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.set(1);
      return;
    }
    opacity.set(
      withRepeat(
        withTiming(theme.opacity.skeletonDim, { duration: theme.durations.pulse }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity, theme]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height,
          width,
          borderRadius: theme.radii[radius],
          backgroundColor: theme.colors.surfaceAlt,
        },
        animatedStyle,
      ]}
    />
  );
}
