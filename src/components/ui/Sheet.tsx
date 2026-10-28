import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';
import { useModalSheet } from './useModalSheet';

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
);

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Pontos de parada (padrão 50% e 90%, seção 4.5). */
  snapPoints?: (string | number)[];
};

/**
 * Bottom sheet com alça: fecha deslizando para baixo, no X ou no Voltar do Android.
 * Conteúdo com rolagem.
 */
export function Sheet({ visible, onClose, title, children, snapPoints = ['50%', '90%'] }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { ref, onDismiss, dismiss } = useModalSheet(visible, onClose);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [open, dismiss]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onChange={(index) => setOpen(index >= 0)}
      onDismiss={onDismiss}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Text variant="heading" style={styles.title} accessibilityRole="header" numberOfLines={2}>
          {title ?? ''}
        </Text>
        <IconButton icon="x" accessibilityLabel={strings.common.close} onPress={dismiss} />
      </View>
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const useStyles = makeStyles((t) => ({
  background: { backgroundColor: t.colors.surface, borderRadius: t.radii.lg },
  handle: { backgroundColor: t.colors.border, width: t.sizes.badge.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: t.spacing.xl,
    paddingRight: t.spacing.sm,
  },
  title: { flex: 1 },
  content: { paddingHorizontal: t.spacing.xl, gap: t.spacing.lg },
}));
