import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme';

import { Icon } from './Icon';

type Positions = Record<string, number>;

type Props<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  /** `handle` = a alça ≡ que deve aparecer na linha. */
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
  onReorder: (keys: string[]) => void;
  handleLabel: (item: T) => string;
};

const toPositions = (keys: readonly string[]): Positions => Object.fromEntries(keys.map((k, i) => [k, i]));

type RowProps = {
  id: string;
  /** Posição inicial (ler o shared value durante o render gera aviso do Reanimated). */
  index: number;
  positions: SharedValue<Positions>;
  count: number;
  rowHeight: number;
  onDrop: (p: Positions) => void;
  children: (handle: ReactNode) => ReactNode;
  label: string;
};

function Row({ id, index, positions, count, rowHeight, onDrop, children, label }: RowProps) {
  const theme = useTheme();
  const styles = useStyles();
  const top = useSharedValue(index * rowHeight);
  const dragging = useSharedValue(false);
  const startTop = useRef(0);

  useAnimatedReaction(
    () => positions.get()[id],
    (pos) => {
      if (!dragging.get() && pos != null) top.set(withTiming(pos * rowHeight, { duration: theme.durations.transition }));
    },
  );

  const pan = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: 200,
    onActivate: () => {
      dragging.set(true);
      startTop.current = top.get();
      haptics.light();
    },
    onUpdate: (e) => {
      const y = Math.max(0, Math.min((count - 1) * rowHeight, startTop.current + e.translationY));
      top.set(y);
      const next = Math.round(y / rowHeight);
      const current = positions.get();
      const from = current[id];
      if (next !== from) {
        const swapped: Positions = { ...current };
        for (const key of Object.keys(current)) if (current[key] === next) swapped[key] = from;
        swapped[id] = next;
        positions.set(swapped);
      }
    },
    onDeactivate: () => {
      const final = positions.get();
      top.set(withTiming(final[id] * rowHeight, { duration: theme.durations.micro }));
      dragging.set(false);
      onDrop(final);
    },
  });

  const style = useAnimatedStyle(() => ({
    top: top.get(),
    zIndex: dragging.get() ? 2 : 1,
    elevation: dragging.get() ? theme.elevation.card : 0,
  }));

  const handle = (
    <GestureDetector gesture={pan}>
      <View style={styles.handle} accessible accessibilityRole="adjustable" accessibilityLabel={label}>
        <Icon name="menu" color="textMuted" />
      </View>
    </GestureDetector>
  );

  return <Animated.View style={[styles.row, { height: rowHeight }, style]}>{children(handle)}</Animated.View>;
}

/**
 * Lista reordenável segurando e arrastando pela alça ≡ (seção 6).
 * A alternativa visível ("Mover para cima/baixo") fica no menu de cada item.
 */
export function SortableList<T>({ data, keyOf, rowHeight, renderItem, onReorder, handleLabel }: Props<T>) {
  const keys = data.map(keyOf);
  const positions = useSharedValue<Positions>(toPositions(keys));
  const joined = keys.join('|');

  useEffect(() => {
    positions.set(toPositions(joined.split('|')));
  }, [joined, positions]);

  const onDrop = (p: Positions) => {
    const order = Object.keys(p).sort((a, b) => p[a] - p[b]);
    if (order.join('|') !== joined) onReorder(order);
  };

  return (
    <View style={{ height: data.length * rowHeight }}>
      {data.map((item, index) => (
        <Row
          key={keyOf(item)}
          id={keyOf(item)}
          index={index}
          positions={positions}
          count={data.length}
          rowHeight={rowHeight}
          onDrop={onDrop}
          label={handleLabel(item)}
        >
          {(handle) => renderItem(item, index, handle)}
        </Row>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { position: 'absolute', left: 0, right: 0, backgroundColor: t.colors.surface },
  handle: {
    width: t.sizes.touchTarget,
    height: t.sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
