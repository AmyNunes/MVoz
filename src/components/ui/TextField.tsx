import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  helper?: string;
  error?: string;
  /** Texto oculto (ex.: chave da API) com botão de olho para mostrar. */
  secure?: boolean;
};

export function TextField({ label, helper, error, secure, multiline, ...inputProps }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      <Text variant="label">{label}</Text>
      <View style={[styles.box, focused && styles.focused, !!error && styles.invalid, inputProps.editable === false && styles.locked]}>
        <TextInput
          {...inputProps}
          multiline={multiline}
          secureTextEntry={secure && hidden}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          accessibilityState={{ disabled: inputProps.editable === false }}
          maxFontSizeMultiplier={theme.maxFontScale}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.multiline]}
        />
        {secure && (
          <IconButton
            icon={hidden ? 'eye' : 'eye-off'}
            accessibilityLabel={hidden ? strings.common.showText : strings.common.hideText}
            onPress={() => setHidden((h) => !h)}
            color="textMuted"
          />
        )}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={theme.sizes.iconSmall} color="danger" />
          <Text variant="caption" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : (
        helper && (
          <Text variant="caption" color="textMuted">
            {helper}
          </Text>
        )
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.sizes.touchTarget,
    borderRadius: t.radii.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceAlt,
  },
  focused: { borderColor: t.colors.primary },
  locked: { opacity: t.opacity.pressed },
  invalid: { borderColor: t.colors.danger },
  input: {
    ...t.typography.body,
    flex: 1,
    color: t.colors.text,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  multiline: { minHeight: t.sizes.multilineHeight, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  errorText: { flex: 1 },
}));
