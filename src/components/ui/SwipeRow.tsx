import { useRef, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type SwipeAction = {
  label: string;
  icon: IconName;
  color: keyof ColorTokens;
  onTrigger: () => void;
};

type Props = {
  children: ReactNode;
  /** Deslizar → (ex.: duplicar). */
  onSwipeRight?: SwipeAction;
  /** Deslizar ← (excluir, com "Desfazer"). */
  onSwipeLeft?: SwipeAction;
  enabled?: boolean;
};

const THRESHOLD = 0.35;

/**
 * Linha com ações reveladas ao deslizar (seção 6). Toda ação também existe num menu visível.
 * `activeOffsetX` + `failOffsetY` para não brigar com a rolagem vertical.
 */
export function SwipeRow({ children, onSwipeRight, onSwipeLeft, enabled = true }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const crossed = useRef(false);

  const pan = usePanGesture({
    runOnJS: true,
    enabled: enabled && width > 0,
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    onUpdate: (e) => {
      const allowed = (e.translationX > 0 && onSwipeRight) || (e.translationX < 0 && onSwipeLeft);
      x.set(allowed ? e.translationX : 0);
      const over = Math.abs(e.translationX) > width * THRESHOLD;
      if (over !== crossed.current) {
        crossed.current = over;
        if (over) haptics.light();
      }
    },
    onDeactivate: () => {
      const tx = x.get();
      crossed.current = false;
      if (Math.abs(tx) <= width * THRESHOLD) {
        x.set(withSpring(0, theme.springs.drag));
        return;
      }
      x.set(withTiming(0, { duration: theme.durations.transition }));
      (tx > 0 ? onSwipeRight : onSwipeLeft)?.onTrigger();
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const rightBg = useAnimatedStyle(() => ({ opacity: x.get() > 0 ? 1 : 0 }));
  const leftBg = useAnimatedStyle(() => ({ opacity: x.get() < 0 ? 1 : 0 }));

  const background = (action: SwipeAction, side: 'left' | 'right') => (
    <Animated.View
      style={[
        styles.bg,
        side === 'left' ? styles.bgStart : styles.bgEnd,
        { backgroundColor: theme.colors[action.color] },
        side === 'left' ? rightBg : leftBg,
      ]}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={action.icon} color="onPrimary" />
      <Text variant="label" color="onPrimary">
        {action.label}
      </Text>
    </Animated.View>
  );

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {onSwipeRight && background(onSwipeRight, 'left')}
      {onSwipeLeft && background(onSwipeLeft, 'right')}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { backgroundColor: t.colors.surface },
  bg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.xl,
  },
  bgStart: { justifyContent: 'flex-start' },
  bgEnd: { justifyContent: 'flex-end' },
}));
