import { Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles, TINT, useTheme, withAlpha, type ColorTokens } from '@/theme';

export type PlayerTool = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Cor do ícone (ex.: `danger` no gravar). */
  color?: keyof ColorTokens;
  /** Ligado agora (gravando, tocando): o círculo fica colorido. */
  active?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Pausar/Continuar (sempre a primeira ferramenta). */
export const pauseTool = (paused: boolean, onPress: () => void): PlayerTool => ({
  key: 'pause',
  label: paused ? strings.player.resume : strings.player.pause,
  icon: paused ? 'play' : 'pause',
  active: paused,
  onPress,
});

/** Ferramentas do exercício lado a lado: ícone num círculo e o nome embaixo. */
export function PlayerTools({ tools }: { tools: readonly PlayerTool[] }) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      {tools.map((tool) => {
        const color = tool.color ?? 'text';
        return (
          <Pressable
            key={tool.key}
            onPress={tool.onPress}
            disabled={tool.disabled}
            accessibilityRole="button"
            accessibilityLabel={tool.accessibilityLabel ?? tool.label}
            accessibilityState={{ disabled: !!tool.disabled, selected: !!tool.active }}
            style={({ pressed }) => [styles.tool, pressed && styles.pressed, tool.disabled && styles.disabled]}
          >
            <View style={[styles.circle, tool.active && { backgroundColor: withAlpha(theme.colors[color === 'text' ? 'primary' : color], TINT) }]}>
              <Icon name={tool.icon} color={color} />
            </View>
            <Text variant="caption" align="center" numberOfLines={1} importantForAccessibility="no" style={styles.label}>
              {tool.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'space-around', gap: t.spacing.sm },
  tool: { flex: 1, alignItems: 'center', gap: t.spacing.xs, minHeight: t.sizes.touchTarget },
  circle: {
    width: t.sizes.touchTarget,
    height: t.sizes.touchTarget,
    borderRadius: t.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceAlt,
  },
  label: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: t.opacity.pressed },
  disabled: { opacity: t.opacity.disabled },
}));
