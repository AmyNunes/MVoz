import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View, type RefreshControlProps, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { makeStyles } from '@/theme';

type Props = {
  children: ReactNode;
  /** Rolagem vertical (padrão). Use `false` em telas com lista própria. */
  scroll?: boolean;
  /** Telas das abas precisam da área segura do topo; telas com cabeçalho nativo, não. */
  edges?: Edge[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
  /** Área fixa no rodapé (ex.: botão principal), acima do teclado e da barra do sistema. */
  footer?: ReactNode;
};

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  refreshControl,
  contentStyle,
  footer,
}: Props) {
  const styles = useStyles();

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {/* Com edge-to-edge, o Android não encolhe a janela para o teclado: subimos o conteúdo. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: t.spacing.screen,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.huge,
    gap: t.spacing.xl,
  },
  footer: {
    paddingHorizontal: t.spacing.screen,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.lg,
    backgroundColor: t.colors.bg,
  },
}));
