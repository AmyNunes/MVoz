import { View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import type { MilestoneStatus } from '@/guide/milestones';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.plan;

const one = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

/** "58% de 70%", "3 de 5 treinos"… com "falta pouco" perto da meta (seção 10.6). */
export function milestoneProgress(m: MilestoneStatus): string {
  if (m.met) return p.met;
  if (m.current === null) return p.checkinNeeded;
  const u = p.units;
  const text = (() => {
    switch (m.kind) {
      case 'glide-range':
        return p.progress(`${one(m.current)}`, `${m.target} ${u.semitones}`);
      case 'resonance-gain':
        return p.progress(`${one(m.current)}${u.percent}`, `${m.target}${u.percent}`);
      case 'monologue':
        return p.progress(`${m.current}${u.percent}`, `${m.target}${u.percent}`);
      case 'reading-band':
        return `${m.current} ${u.hz}`;
      case 'mpt':
        return p.checkinNeeded;
      default:
        return p.progress(String(m.current), `${m.target}`);
    }
  })();
  return m.current >= m.target * 0.8 && m.kind !== 'reading-band' ? `${text} → ${p.almost}` : text;
}

/** Checklist dos marcos com os valores medidos. */
export function MilestoneList({ milestones }: { milestones: readonly MilestoneStatus[] }) {
  const styles = useStyles();
  if (milestones.length === 0) return <Text color="textMuted">{p.noMilestones}</Text>;

  return (
    <View style={styles.list}>
      {milestones.map((m) => (
        <View key={m.kind} style={styles.row} accessible accessibilityLabel={`${strings.guide.milestones[m.kind]}: ${milestoneProgress(m)}`}>
          <Icon name={m.met ? 'check-circle' : 'circle'} color={m.met ? 'success' : 'textMuted'} />
          <View style={styles.texts}>
            <Text>{strings.guide.milestones[m.kind]}</Text>
            <Text variant="caption" color="textMuted">
              {milestoneProgress(m)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.md },
  row: { flexDirection: 'row', gap: t.spacing.md, alignItems: 'flex-start' },
  texts: { flex: 1, gap: t.spacing.xs / 2 },
}));
