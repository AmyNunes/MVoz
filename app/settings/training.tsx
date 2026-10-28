import { Stack } from 'expo-router';
import { View } from 'react-native';

import { BandSettings } from '@/components/settings/BandSettings';
import { Button, Card, Chip, ListRow, Notice, Screen, Segmented, Stepper, Text, Toggle } from '@/components/ui';
import { getActivePlan } from '@/db/guideRepo';
import { useReferenceTone } from '@/features/meter/useReferenceTone';
import { BEGINNER_MAX_MINUTES, effectiveDailyMinutes } from '@/guide/profile';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';
import { makeStyles } from '@/theme';

const t = strings.settings.training;

/** Configurações › Treino (seção 10.10, item 4). */
export default function TrainingSettingsScreen() {
  const styles = useStyles();
  const training = useSettings((s) => s.training);
  const update = useSettings((s) => s.update);
  const profile = useProfile((s) => s.profile);
  const plan = useLoader(getActivePlan);
  const tone = useReferenceTone();
  const recommended = profile ? effectiveDailyMinutes(profile) : BEGINNER_MAX_MINUTES;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t.title }} />
      <BandSettings plan={plan.state.status === 'success' ? plan.state.data : null} />

      <Card title={t.limit}>
        <Stepper
          value={training.dailyLimitMinutes}
          min={5}
          max={60}
          step={5}
          format={t.minutes}
          accessibilityLabel={t.limit}
          onChange={(v) => update('training', { dailyLimitMinutes: v })}
        />
        <Text variant="caption" color="textMuted">
          {t.limitHint}
        </Text>
        {training.dailyLimitMinutes > recommended && <Notice tone="warning">{t.limitAbove(recommended)}</Notice>}
      </Card>

      <Card>
        <ListRow
          title={t.warmup}
          subtitle={t.warmupHint}
          right={<Toggle accessibilityLabel={t.warmup} value={training.mandatoryWarmup} onValueChange={(v) => update('training', { mandatoryWarmup: v })} />}
        />
        {!training.mandatoryWarmup && <Notice tone="warning">{t.warmupOff}</Notice>}
      </Card>

      <Card title={t.notation}>
        <Segmented
          accessibilityLabel={t.notation}
          options={[
            { value: 'solfege', label: t.notationOptions.solfege },
            { value: 'letter', label: t.notationOptions.letter },
          ]}
          value={training.notation}
          onChange={(notation) => update('training', { notation })}
        />
      </Card>

      <Card title={t.checkinDay}>
        <View style={styles.chips}>
          {strings.today.weekdays.map((day, i) => (
            <Chip key={day} label={day} selected={training.checkinWeekday === i} onPress={() => update('training', { checkinWeekday: i })} />
          ))}
        </View>
      </Card>

      <Card title={t.timbre}>
        <Segmented
          accessibilityLabel={t.timbre}
          options={[
            { value: 'soft', label: t.timbreOptions.soft },
            { value: 'bright', label: t.timbreOptions.bright },
          ]}
          value={training.toneTimbre}
          onChange={(toneTimbre) => update('training', { toneTimbre })}
        />
        <Button label={t.listen} icon="volume-2" variant="secondary" onPress={() => tone.play(training.targetLowHz)} />
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((th) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: th.spacing.sm },
}));
