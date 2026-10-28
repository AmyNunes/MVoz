import { Stack } from 'expo-router';
import { useRef } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';

import { AiErrorView } from '@/components/ai/AiErrorView';
import { MessageBubble } from '@/components/coach/MessageBubble';
import { Chip, ErrorState, IconButton, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { useCoach } from '@/features/coach/useCoach';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const c = strings.ai.coach;

/** Perguntar à IA (Coach, seção 10.9). */
export default function CoachScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const coach = useCoach();
  const scroll = useRef<ScrollViewInstance>(null);
  const header = (
    <Stack.Screen
      options={{
        title: c.title,
        headerRight: () => <IconButton icon="plus-square" accessibilityLabel={c.newChat} disabled={coach.sending} onPress={() => void coach.newChat()} />,
      }}
    />
  );

  if (coach.state.status === 'loading') return <Screen edges={[]}>{header}<Skeleton height={theme.sizes.traceHeight} /></Screen>;
  if (coach.state.status === 'error') return <Screen edges={[]}>{header}<ErrorState onRetry={coach.reload} /></Screen>;

  const footer = (
    <View style={styles.composer}>
      <View style={styles.flex}>
        <TextField label={c.placeholder} value={coach.draft} onChangeText={coach.setDraft} multiline editable={!coach.sending} />
      </View>
      <IconButton icon="send" accessibilityLabel={c.send} disabled={coach.sending || coach.draft.trim() === ''} onPress={() => coach.send()} />
    </View>
  );

  return (
    <Screen edges={[]} scroll={false} footer={footer}>
      {header}
      <ScrollView ref={scroll} contentContainerStyle={styles.list} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <Text color="textMuted">{c.intro}</Text>
        {coach.messages.length === 0 && (
          <View style={styles.examples}>
            {c.examples.map((example) => (
              <Chip key={example} label={example} onPress={() => coach.send(example)} />
            ))}
          </View>
        )}
        {coach.messages.map((m) => (
          <MessageBubble key={`${m.at}-${m.role}`} message={m} />
        ))}
        {coach.sending && (
          <Text color="textMuted" accessibilityLiveRegion="polite">
            {strings.ai.thinking}
          </Text>
        )}
        {coach.error && <AiErrorView error={coach.error} onRetry={coach.retry} />}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: t.spacing.screen, paddingVertical: t.spacing.md, gap: t.spacing.lg },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm },
  flex: { flex: 1 },
}));
