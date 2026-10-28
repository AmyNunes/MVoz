import { View } from 'react-native';

import { ExerciseCards } from '@/components/ai/ExerciseCards';
import { SafetyCard } from '@/components/ai/SafetyCard';
import { Text } from '@/components/ui';
import type { CoachMessage } from '@/db/coachRepo';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const c = strings.ai.coach;

/** Uma mensagem da conversa; as da IA trazem exercícios tocáveis e, se for o caso, o alerta. */
export function MessageBubble({ message }: { message: CoachMessage }) {
  const styles = useStyles();
  const mine = message.role === 'user';
  return (
    <View style={[styles.wrap, mine && styles.mineWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]} accessible accessibilityLabel={`${mine ? c.you : c.assistant}: ${message.content}`}>
        <Text color={mine ? 'onPrimary' : 'text'}>{message.content}</Text>
      </View>
      {message.safetyFlag && <SafetyCard />}
      {message.exerciseIds.length > 0 && <ExerciseCards ids={message.exerciseIds} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: t.spacing.sm, alignItems: 'stretch' },
  mineWrap: { alignItems: 'flex-end' },
  bubble: { padding: t.spacing.md, borderRadius: t.radii.lg, maxWidth: '88%' },
  mine: { backgroundColor: t.colors.primary },
  theirs: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, alignSelf: 'flex-start' },
}));
