import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';
import { IconBadge } from './IconBadge';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  /** Valor atual mostrado à direita, ex.: "Sistema". */
  value?: string;
  icon?: IconName;
  iconColor?: keyof ColorTokens;
  /** Elemento à direita no lugar da seta (ex.: um interruptor). */
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityHint?: string;
};

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconColor = 'primary',
  right,
  onPress,
  onLongPress,
  accessibilityHint,
}: Props) {
  const styles = useStyles();

  const content = (
    <>
      {icon && <IconBadge icon={icon} color={iconColor} />}
      <View style={styles.texts}>
        <Text>{title}</Text>
        {subtitle && (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text variant="label" color="textMuted" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      )}
      {right ?? (onPress && <Icon name="chevron-right" color="textMuted" />)}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={[title, value, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.listRowHeight,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  texts: { flex: 1, gap: t.spacing.xs / 2 },
  value: { maxWidth: '45%' },
  pressed: { backgroundColor: t.colors.surfaceAlt },
}));
