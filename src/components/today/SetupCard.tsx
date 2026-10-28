import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, Icon, ListRow, Text } from '@/components/ui';
import type { SetupStep } from '@/features/today/today';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const t = strings.today.setup;

const STEPS = [
  { step: 'guide', label: t.guide, route: '/guide' },
  { step: 'baseline', label: t.baseline, route: '/guide/baseline' },
  { step: 'plan', label: t.plan, route: '/guide/result' },
] as const;

/** Guia de primeiro uso em 3 passos (seção 10.1). */
export function SetupCard({ step }: { step: Exclude<SetupStep, null> }) {
  const styles = useStyles();
  const current = STEPS.findIndex((s) => s.step === step);

  return (
    <Card title={t.title}>
      {STEPS.map((s, i) => {
        const done = step === 'first-session' || i < current;
        return i === current ? (
          <ListRow key={s.step} icon="arrow-right-circle" title={s.label} onPress={() => router.push(s.route)} />
        ) : (
          <View key={s.step} style={styles.row} accessible accessibilityLabel={s.label} accessibilityState={{ checked: done }}>
            <Icon name={done ? 'check-circle' : 'circle'} color={done ? 'success' : 'textMuted'} />
            <Text color={done ? 'text' : 'textMuted'} style={styles.text}>
              {s.label}
            </Text>
          </View>
        );
      })}
      <View style={styles.row}>
        <Icon name={step === 'first-session' ? 'play-circle' : 'circle'} color={step === 'first-session' ? 'primary' : 'textMuted'} />
        <Text color={step === 'first-session' ? 'text' : 'textMuted'} style={styles.text}>
          {t.first}
        </Text>
      </View>
      {step === 'first-session' && (
        <Text variant="caption" color="textMuted">
          {t.firstHint}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles((tk) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: tk.spacing.md, minHeight: tk.sizes.touchTarget, paddingHorizontal: tk.spacing.lg },
  text: { flexShrink: 1 },
}));
