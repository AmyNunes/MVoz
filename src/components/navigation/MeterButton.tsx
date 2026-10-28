import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

/** Botão central da tab bar: círculo de 56 dp em `primary`, levemente elevado (seção 5.1). */
export function MeterButton() {
  const styles = useStyles();

  return (
    <Pressable
      onPress={() => router.push('/meter')}
      accessibilityRole="button"
      accessibilityLabel={strings.meter.open}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Icon name="mic" color="onPrimary" />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  fab: {
    width: t.sizes.fab,
    height: t.sizes.fab,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: t.elevation.fab,
  },
  pressed: { opacity: t.opacity.pressed },
}));
