import { ScrollView, View } from 'react-native';

import { BulletList } from '@/components/exercises/StepList';
import { Button, IconBadge, Notice, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.player;
const h = strings.health;

/** Depois do "Senti dor · parar": treino encerrado + sinais para parar e quando procurar ajuda (14.2, 14.3). */
export function PainView({ onBack }: { onBack: () => void }) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <IconBadge icon="heart" color="danger" size="lg" />
          <Text variant="title" align="center" accessibilityRole="header">
            {p.painTitle}
          </Text>
          <Text align="center" color="textMuted">
            {p.painBody}
          </Text>
        </View>
        <Text variant="heading" accessibilityRole="header">
          {h.stopTitle}
        </Text>
        <BulletList items={h.stopSigns} />
        <Text color="textMuted">{h.persist}</Text>
        <Text variant="heading" accessibilityRole="header">
          {h.helpTitle}
        </Text>
        <BulletList items={h.help} />
        <Notice>{h.disclaimer}</Notice>
      </ScrollView>
      <View style={styles.footer}>
        <Button label={p.painBack} size="main" onPress={onBack} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1 },
  content: { padding: t.spacing.screen, gap: t.spacing.lg },
  top: { alignItems: 'center', gap: t.spacing.md, paddingVertical: t.spacing.lg },
  footer: { paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.lg },
}));
