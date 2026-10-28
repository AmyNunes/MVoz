import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

const ICONS: Record<string, IconName> = {
  index: 'sun',
  exercises: 'list',
  plan: 'compass',
  progress: 'bar-chart-2',
};

type Props = BottomTabBarProps & {
  /** Botão central (Medidor, a partir da Fase 2). */
  center?: React.ReactNode;
};

/** Tab bar customizada: 4 abas e, no meio, o botão do Medidor (seção 5.1). */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets, center }: Props) {
  const theme = useTheme();
  const styles = useStyles();

  const items = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const color = focused ? 'primary' : 'textMuted';

    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        style={styles.item}
      >
        <View
          style={[
            styles.pill,
            focused && { backgroundColor: withAlpha(theme.colors.primary, TINT) },
          ]}
        >
          <Icon name={ICONS[route.name] ?? 'circle'} color={color} />
        </View>
        <Text variant="caption" color={color} numberOfLines={1} style={focused && styles.activeLabel}>
          {label}
        </Text>
      </Pressable>
    );
  });

  const middle = Math.ceil(items.length / 2);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {items.slice(0, middle)}
      {center && <View style={styles.center}>{center}</View>}
      {items.slice(middle)}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  item: {
    flex: 1,
    height: t.sizes.tabBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs / 2,
  },
  pill: {
    width: t.sizes.badge.lg,
    height: t.sizes.badge.sm,
    borderRadius: t.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: { fontWeight: t.typography.label.fontWeight },
  center: { flex: 1, alignItems: 'center' },
}));
