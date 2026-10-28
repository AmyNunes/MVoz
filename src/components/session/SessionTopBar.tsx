import { View } from 'react-native';

import { IconButton, ProgressBar, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const s = strings.session;

type Props = {
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
};

/** Progresso do treino numa linha: ‹ barra e "Exercício 1 de 5" › (alternativas ao deslizar, seção 6). */
export function SessionTopBar({ index, total, onPrevious, onNext }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <IconButton icon="chevron-left" accessibilityLabel={s.previous} disabled={index === 0} onPress={onPrevious} />
      <View style={styles.middle}>
        <ProgressBar progress={(index + 1) / total} accessibilityLabel={s.progress(index + 1, total)} />
        <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
          {s.progress(index + 1, total)}
        </Text>
      </View>
      <IconButton icon="chevron-right" accessibilityLabel={s.next} onPress={onNext} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing.xs },
  middle: { flex: 1, gap: t.spacing.xs },
}));
