import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { makeStyles } from '@/theme';

export type Choice<T> = { value: T; label: string };

type Props<T> = {
  choices: readonly Choice<T>[];
  /** Escolhidas (uma só, no modo `single`). */
  selected: readonly T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
  accessibilityLabel: string;
};

/** Opções grandes, fáceis de tocar com uma mão. A escolha mostra ✓ (não só a cor). */
export function ChoiceList<T extends string | number | boolean>({ choices, selected, onToggle, multiple = false, accessibilityLabel }: Props<T>) {
  const styles = useStyles();

  return (
    <View style={styles.list} accessibilityRole={multiple ? undefined : 'radiogroup'} accessibilityLabel={accessibilityLabel}>
      {choices.map((choice) => {
        const on = selected.includes(choice.value);
        return (
          <Pressable
            key={String(choice.value)}
            onPress={() => onToggle(choice.value)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: on } : { selected: on }}
            accessibilityLabel={choice.label}
            style={({ pressed }) => [styles.row, on && styles.on, pressed && styles.pressed]}
          >
            <Text style={styles.label} color={on ? 'onPrimary' : 'text'}>
              {choice.label}
            </Text>
            {on && <Icon name="check" color="onPrimary" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.listRowHeight,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  on: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  label: { flex: 1 },
  pressed: { opacity: t.opacity.pressed },
}));
