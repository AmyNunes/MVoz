import { CoachMark } from '@/components/ui';
import { COACH_MARKS, type CoachKey } from '@/features/settings/coachMarks';
import { useCoachMark } from '@/features/settings/useCoachMark';

/** Mostra o guia de gestos da tela na primeira visita (`when` = a tela já tem o que o guia mostra). */
export function GestureGuide({ name, when = true }: { name: CoachKey; when?: boolean }) {
  const coach = useCoachMark(name);
  const guide = COACH_MARKS[name];
  return <CoachMark visible={coach.visible && when} title={guide.title} motion={guide.motion} hints={guide.hints} onDismiss={coach.dismiss} />;
}
