import { View } from 'react-native';

import type { Simulation } from '@/ai/schemas/simulate';
import { BulletList } from '@/components/exercises/StepList';
import { ContourChart } from '@/components/player/ContourMeasure';
import { Button, Card, Icon, Notice, Text, type IconName } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const s = strings.simulate;

type Props = {
  data: Simulation;
  playing: boolean;
  onListen: () => void;
};

/** A "simulação" do exercício em texto (seção 10.5): passos com sensação, som e checagem. */
export function SimulationView({ data, playing, onListen }: Props) {
  const styles = useStyles();
  const points = data.contour?.points ?? null;

  return (
    <View style={styles.container}>
      <Text>{data.overviewPt}</Text>

      <Card title={s.steps}>
        {data.steps.map((step, i) => (
          <View key={`${i}-${step.titlePt}`} style={styles.step}>
            <Text variant="heading">
              {i + 1}. {step.titlePt}
            </Text>
            <Text>{step.instructionPt}</Text>
            {step.durationSec > 0 && (
              <Text variant="caption" color="textMuted">
                {s.duration(Math.round(step.durationSec))}
              </Text>
            )}
            <Detail icon="user" label={s.feel} text={step.feelPt} />
            <Detail icon="volume-2" label={s.sound} text={step.soundPt} />
            <Detail icon="check-circle" label={s.check} text={step.checkPt} />
          </View>
        ))}
      </Card>

      {points && (
        <Card title={s.curve}>
          <View style={styles.chart}>
            <ContourChart target={points} attempt={[]} />
          </View>
          <Button label={playing ? s.stop : s.listenCurve} icon={playing ? 'square' : 'volume-2'} variant="secondary" onPress={onListen} />
        </Card>
      )}

      {data.analogyPt !== '' && (
        <Card title={s.analogy}>
          <Text>{data.analogyPt}</Text>
        </Card>
      )}
      {data.mistakes.length > 0 && (
        <Card title={s.mistakes}>
          {data.mistakes.map((m) => (
            <View key={m.mistakePt} style={styles.mistake}>
              <Text variant="label">{m.mistakePt}</Text>
              <Text color="textMuted">{s.fix(m.fixPt)}</Text>
            </View>
          ))}
        </Card>
      )}
      {data.successSignsPt.length > 0 && (
        <Card title={s.successSigns}>
          <BulletList items={data.successSignsPt} />
        </Card>
      )}
      {data.safetyPt !== '' && <Notice tone="warning">{data.safetyPt}</Notice>}
    </View>
  );
}

function Detail({ icon, label, text }: { icon: IconName; label: string; text: string }) {
  const styles = useStyles();
  if (!text) return null;
  return (
    <View style={styles.detail}>
      <Icon name={icon} color="textMuted" size={styles.detailIcon.width} />
      <Text style={styles.flex}>
        <Text variant="label">{label}: </Text>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.xl },
  step: { gap: t.spacing.xs },
  detail: { flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' },
  detailIcon: { width: t.sizes.iconSmall },
  flex: { flex: 1 },
  mistake: { gap: t.spacing.xs },
  chart: { height: t.sizes.traceHeight },
}));
