import type { Profile } from '@/guide/profile';
import type { QuestionId } from '@/guide/questions';
import { strings } from '@/i18n/strings';

const q = strings.guide.questions;
const s = strings.settings.profile;

/** A resposta do Guia em texto curto, para a lista de Configurações › Sobre mim. */
export function answerLabel(id: QuestionId, profile: Profile): string {
  switch (id) {
    case 'goal':
      return q.goal.options[profile.goal];
    case 'grammaticalGender':
      return q.grammaticalGender.options[profile.grammaticalGender];
    case 'identity':
      return profile.identity ? q.identity.options[profile.identity] : s.skipped;
    case 'hormones':
      return profile.hormones ? q.hormones.options[profile.hormones] : s.skipped;
    case 'surgery':
      return profile.recentSurgery ? q.surgery.options.yes : q.surgery.options.no;
    case 'surgeryCleared':
      return profile.surgeryCleared ? q.surgeryCleared.options.yes : q.surgeryCleared.options.no;
    case 'experience':
      return q.experience.options[profile.experience];
    case 'slp':
      return q.slp.options[profile.slp];
    case 'minutes':
      return q.minutes.value(profile.dailyMinutes);
    case 'health':
      return profile.healthFlags.length > 0 ? profile.healthFlags.map((f) => q.health.options[f]).join(', ') : q.health.none;
  }
}
