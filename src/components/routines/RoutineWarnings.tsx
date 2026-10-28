import { BulletList } from '@/components/exercises/StepList';
import { Notice, Text } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import type { RoutineWarning } from '@/exercises/routine';
import { strings } from '@/i18n/strings';

const w = strings.routines.warnings;

function message(warning: RoutineWarning): string {
  switch (warning.kind) {
    case 'warmupFirst':
      return w.warmupFirst;
    case 'cooldownLast':
      return w.cooldownLast;
    case 'tooLong':
      return w.tooLong(warning.minutes);
    case 'prerequisite':
      return w.prerequisite(getExercise(warning.exerciseId)?.name ?? '', getExercise(warning.prerequisiteId)?.name ?? '');
  }
}

/** Avisos da rotina (seção 8.6). Não bloqueiam o salvar. */
export function RoutineWarnings({ warnings }: { warnings: readonly RoutineWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <Notice tone="warning">
      <Text variant="label">{w.title}</Text>
      <BulletList items={warnings.map(message)} />
    </Notice>
  );
}
