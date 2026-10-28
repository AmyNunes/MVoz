import { Pressable, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome do grupo para o leitor de tela, ex.: "Tema". */
  accessibilityLabel: string;
};

/** Escolha única entre poucas opções. A selecionada fica preenchida e com ✓. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.selected,
              pressed && !selected && styles.pressed,
            ]}
          >
            {selected && <Icon name="check" size={theme.sizes.iconSmall} color="onPrimary" />}
            <Text variant="label" color={selected ? 'onPrimary' : 'text'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    flexDirection: 'row',
    padding: t.spacing.xs,
    gap: t.spacing.xs,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceAlt,
  },
  // Cada opção cresce a partir do tamanho do próprio texto: rótulos longos
  // ("Como eu digo?" + ✓) não ficam cortados ao lado de rótulos curtos.
  segment: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    minHeight: t.sizes.touchTarget,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radii.md - t.spacing.xs,
  },
  selected: { backgroundColor: t.colors.primary },
  pressed: { opacity: t.opacity.pressed },
}));
