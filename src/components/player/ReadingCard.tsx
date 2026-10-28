import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { TEXTS, type ReadingText } from '@/exercises/texts';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const m = strings.player.measure;

type Props = {
  ids: readonly string[];
  /** Textos gerados pela IA nesta tela (vêm depois dos do catálogo). */
  extra?: readonly ReadingText[];
  /** "Texto novo com IA": devolve se deu certo, para pular para o texto novo. */
  ai?: { label: string; loading: boolean; generate: () => Promise<boolean> } | null;
};

/** Texto de leitura do exercício (tipografia `reading`), com setas quando há mais de um. */
export function ReadingCard({ ids, extra = [], ai = null }: Props) {
  const styles = useStyles();
  const [index, setIndex] = useState(0);
  const pages = [...ids.flatMap((id) => (TEXTS[id] ? [TEXTS[id]] : [])), ...extra];
  const text = pages[Math.min(index, pages.length - 1)];
  if (!text) return null;

  const generate = async () => {
    const count = pages.length;
    if (ai && (await ai.generate())) setIndex(count);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {pages.length > 1 && (
          <IconButton icon="chevron-left" accessibilityLabel={m.textPrev} disabled={index === 0} onPress={() => setIndex(index - 1)} />
        )}
        <Text variant="label" color="textMuted" align="center" style={styles.title}>
          {text.title}
        </Text>
        {pages.length > 1 && (
          <IconButton
            icon="chevron-right"
            accessibilityLabel={m.textNext}
            disabled={index >= pages.length - 1}
            onPress={() => setIndex(index + 1)}
          />
        )}
        {ai && <IconButton icon="zap" accessibilityLabel={ai.label} disabled={ai.loading} onPress={() => void generate()} />}
      </View>
      <ScrollView contentContainerStyle={styles.lines} nestedScrollEnabled>
        {text.lines.map((line) => (
          <Text key={line} variant="reading">
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexShrink: 1,
    maxHeight: t.sizes.readingCardMaxHeight,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingBottom: t.spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: t.sizes.touchTarget, paddingHorizontal: t.spacing.xs },
  title: { flex: 1 },
  lines: { paddingHorizontal: t.spacing.lg, gap: t.spacing.sm },
}));
