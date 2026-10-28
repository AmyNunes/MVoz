import { View } from 'react-native';

import { Button, Card, Icon, Notice, Text } from '@/components/ui';
import { CATEGORY_ICONS, getExercise } from '@/exercises/catalog';
import type { TodayBlock } from '@/features/today/today';
import type { StartRequest } from '@/features/today/useToday';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';
import { makeStyles } from '@/theme';

const t = strings.today.training;

type Props = {
  stageName: string;
  blocks: readonly TodayBlock[];
  light: boolean;
  onStart: (request: StartRequest) => void;
};

/** Treino de hoje (seção 10.1): exercícios, blocos, "Começar" e "Só tenho 5 minutos". */
export function TrainingCard({ stageName, blocks, light, onStart }: Props) {
  const styles = useStyles();
  const next = blocks.find((b) => !b.done);

  return (
    <Card title={light ? t.lightTitle : t.title(stageName)}>
      {light && <Notice tone="warning">{t.lightBody}</Notice>}
      {blocks.map((block) => (
        <View key={block.block} style={styles.block}>
          {blocks.length > 1 && (
            <View style={styles.blockTitle}>
              <Text variant="label">{t.block(block.block)}</Text>
              {block.done && <Text variant="label">{t.done}</Text>}
            </View>
          )}
          {block.items.map((item, i) => {
            const exercise = getExercise(item.exerciseId);
            if (!exercise) return null;
            return (
              <View key={`${item.exerciseId}-${i}`} style={styles.item}>
                <Icon name={block.done ? 'check-circle' : CATEGORY_ICONS[exercise.category]} color={block.done ? 'success' : 'textMuted'} />
                <Text style={styles.name} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text variant="caption" color="textMuted">
                  {formatMinutes(item.durationSec ?? exercise.durationSec)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      {blocks.length > 1 && (
        <Text variant="caption" color="textMuted">
          {t.blocksHint}
        </Text>
      )}
      {next ? (
        <>
          <Button
            label={blocks.length > 1 ? t.startBlock(next.block) : t.start}
            icon="play"
            size="main"
            onPress={() => onStart({ block: next.block, variant: 'normal' })}
          />
          {!light && <Button label={t.minimal} variant="ghost" onPress={() => onStart({ block: next.block, variant: 'minimal' })} />}
        </>
      ) : (
        <Text align="center">{t.allDone}</Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles((tk) => ({
  block: { gap: tk.spacing.sm },
  blockTitle: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { flexDirection: 'row', alignItems: 'center', gap: tk.spacing.md },
  name: { flex: 1 },
}));
