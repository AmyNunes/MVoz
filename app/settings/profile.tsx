import { router, Stack } from 'expo-router';

import { QuestionView } from '@/components/guide/QuestionView';
import { Button, EmptyState, ListGroup, ListRow, Notice, Screen, Sheet, Toggle } from '@/components/ui';
import { answerLabel } from '@/features/settings/profileAnswers';
import { useProfileEditor } from '@/features/settings/useProfileEditor';
import { visibleQuestions } from '@/guide/questions';
import { strings } from '@/i18n/strings';

const s = strings.settings.profile;
const q = strings.guide.questions;

/** Configurações › Sobre mim (seção 10.10, item 3): respostas do Guia e o contexto para a IA. */
export default function ProfileSettingsScreen() {
  const editor = useProfileEditor();
  const { profile } = editor;
  const header = <Stack.Screen options={{ title: s.title }} />;

  if (!profile) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState icon="user" message={s.empty} action={{ label: strings.plan.answerGuide, onPress: () => router.push('/guide') }} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      {header}
      {editor.goalChanged && (
        <Notice tone="warning" action={<Button label={strings.plan.redoGuide} variant="secondary" onPress={() => router.push('/guide')} />}>
          {s.goalChanged}
        </Notice>
      )}
      <ListGroup>
        {visibleQuestions(profile).map((id) => (
          <ListRow
            key={id}
            title={q[id].title}
            subtitle={answerLabel(id, profile)}
            accessibilityHint={s.edit(q[id].title)}
            onPress={() => editor.open(id)}
          />
        ))}
      </ListGroup>
      <ListGroup>
        <ListRow
          icon="cpu"
          title={s.aiContext}
          subtitle={s.aiContextHint}
          right={<Toggle accessibilityLabel={s.aiContext} value={profile.aiIncludeContext} onValueChange={editor.setAiContext} />}
        />
      </ListGroup>
      <Notice icon="info">{strings.health.disclaimer}</Notice>

      <Sheet visible={editor.editing !== null} onClose={editor.close} snapPoints={['90%']}>
        {editor.editing && <QuestionView id={editor.editing} draft={editor.draft} onChange={editor.change} />}
        <Button label={strings.common.save} icon="check" onPress={editor.save} />
      </Sheet>
    </Screen>
  );
}
