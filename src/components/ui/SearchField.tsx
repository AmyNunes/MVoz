import { TextInput, View } from 'react-native';

import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { Icon } from './Icon';
import { IconButton } from './IconButton';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

/** Campo de busca com lupa e botão de limpar. */
export function SearchField({ value, onChangeText, placeholder }: Props) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.box}>
      <Icon name="search" color="textMuted" size={theme.sizes.iconSmall} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        maxFontSizeMultiplier={theme.maxFontScale}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      {value ? (
        <IconButton icon="x-circle" color="textMuted" accessibilityLabel={strings.common.close} onPress={() => onChangeText('')} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: t.sizes.touchTarget,
    paddingLeft: t.spacing.lg,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surfaceAlt,
  },
  input: { ...t.typography.body, flex: 1, color: t.colors.text, paddingVertical: t.spacing.sm },
}));
