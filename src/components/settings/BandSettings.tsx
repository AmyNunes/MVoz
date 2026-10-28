import { View } from 'react-native';

import { Button, Card, ListRow, Notice, Stepper, Text, Toggle } from '@/components/ui';
import type { Plan } from '@/guide/plan';
import { outsidePlanBand } from '@/guide/progression';
import { strings } from '@/i18n/strings';
import { formatNote } from '@/lib/notes';
import { useSettings } from '@/stores/settingsStore';
import { makeStyles } from '@/theme';

const t = strings.settings.training;
/** Menor distância entre o grave e o agudo da faixa (Hz). */
const MIN_WIDTH_HZ = 10;
const STEP_HZ = 5;

/** Faixa-alvo manual, com aviso quando sai das regras do plano (seção 10.10, item 4). */
export function BandSettings({ plan }: { plan: Plan | null }) {
  const styles = useStyles();
  const training = useSettings((s) => s.training);
  const update = useSettings((s) => s.update);
  const band = { lowHz: training.targetLowHz, highHz: training.targetHighHz };
  const format = (hz: number) => t.hz(Math.round(hz), formatNote(hz, training.notation));
  const outside = plan !== null && training.targetEnabled && outsidePlanBand(band, plan);

  return (
    <Card title={t.band}>
      <ListRow
        title={t.bandEnabled}
        right={<Toggle accessibilityLabel={t.bandEnabled} value={training.targetEnabled} onValueChange={(v) => update('training', { targetEnabled: v })} />}
      />
      {training.targetEnabled && (
        <View style={styles.steppers}>
          <Text variant="label">{t.low}</Text>
          <Stepper
            value={band.lowHz}
            min={60}
            max={band.highHz - MIN_WIDTH_HZ}
            step={STEP_HZ}
            format={format}
            accessibilityLabel={t.low}
            onChange={(v) => update('training', { targetLowHz: Math.round(v) })}
          />
          <Text variant="label">{t.high}</Text>
          <Stepper
            value={band.highHz}
            min={band.lowHz + MIN_WIDTH_HZ}
            max={500}
            step={STEP_HZ}
            format={format}
            accessibilityLabel={t.high}
            onChange={(v) => update('training', { targetHighHz: Math.round(v) })}
          />
        </View>
      )}
      {outside && plan && (
        <Notice
          tone="warning"
          action={
            <Button
              label={t.usePlanBand}
              variant="secondary"
              onPress={() => update('training', { targetLowHz: plan.stageTarget.lowHz, targetHighHz: plan.stageTarget.highHz })}
            />
          }
        >
          {t.outsidePlan}
        </Notice>
      )}
    </Card>
  );
}

const useStyles = makeStyles((th) => ({
  steppers: { gap: th.spacing.sm },
}));
