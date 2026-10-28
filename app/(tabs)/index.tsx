import { router } from 'expo-router';
import { useState } from 'react';

import { HealthSheet } from '@/components/exercises/HealthSheet';
import { SettingsButton } from '@/components/navigation/SettingsButton';
import { SetupCard } from '@/components/today/SetupCard';
import { TrainingCard } from '@/components/today/TrainingCard';
import { VoiceTodaySheet } from '@/components/today/VoiceTodaySheet';
import { WeekCard } from '@/components/today/WeekCard';
import { Button, Card, ErrorState, ListGroup, ListRow, Notice, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { currentStage } from '@/guide/plan';
import { getGreeting } from '@/features/today/greeting';
import { useToday } from '@/features/today/useToday';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';
import { useTheme } from '@/theme';

const t = strings.today;

/** Hoje (seção 10.1). */
export default function TodayScreen() {
  const theme = useTheme();
  const { greeting, date } = getGreeting(new Date());
  const today = useToday();
  const save = useProfile((s) => s.save);
  const weekday = useSettings((s) => s.training.checkinWeekday);
  const [help, setHelp] = useState(false);
  const { view, plan, profile } = today;

  return (
    <Screen>
      <ScreenHeader eyebrow={date} title={greeting} right={<SettingsButton />} />
      {today.state.status === 'loading' && <Skeleton height={theme.sizes.traceHeight} />}
      {today.state.status === 'error' && <ErrorState onRetry={today.reload} />}

      {view && (
        <>
          {view.setup && <SetupCard step={view.setup} />}
          {view.alerts.map((alert) => (
            <Notice key={alert} tone="warning" action={<Button label={t.alerts.more} variant="ghost" onPress={() => setHelp(true)} />}>
              {t.alerts[alert]}
            </Notice>
          ))}
          {view.blocked && profile && (
            <Notice
              tone="warning"
              action={<Button label={t.blocked.cleared} variant="secondary" onPress={() => void save({ ...profile, surgeryCleared: true })} />}
            >
              <Text variant="label">{t.blocked.title}</Text>
              <Text>{t.blocked.body}</Text>
            </Notice>
          )}
          {today.resting && (
            <Notice tone="warning" action={<Button label={strings.common.close} variant="ghost" onPress={today.dismissRest} />}>
              <Text variant="label">{t.voice.restTitle}</Text>
              <Text>{t.voice.restBody}</Text>
            </Notice>
          )}

          {!view.blocked && view.routine && (
            <Card title={t.training.routineTitle(view.routine.name)}>
              <Text color="textMuted">{t.training.routineHint}</Text>
              <Button label={t.training.start} icon="play" size="main" onPress={today.startRoutine} />
            </Card>
          )}
          {!view.blocked && !view.routine && plan && view.blocks.length > 0 && (
            <TrainingCard
              stageName={strings.guide.stages[currentStage(plan).id].name}
              blocks={view.blocks}
              light={view.light}
              onStart={today.requestStart}
            />
          )}

          <WeekCard days={view.week} minutes={view.weekMinutes} />

          <ListGroup>
            {plan && (
              <ListRow
                icon="clipboard"
                title={t.checkin.title(t.weekdays[weekday])}
                subtitle={view.checkinDue ? t.checkin.due : t.checkin.done}
                onPress={view.checkinDue ? () => router.push('/checkin') : undefined}
              />
            )}
            <ListRow icon="message-circle" title={strings.ai.coach.entry} subtitle={strings.ai.coach.entryHint} onPress={() => router.push('/coach')} />
          </ListGroup>
        </>
      )}

      <VoiceTodaySheet visible={today.asking} onClose={today.cancelAsk} onAnswer={today.answerVoice} />
      <HealthSheet visible={help} onClose={() => setHelp(false)} />
    </Screen>
  );
}
