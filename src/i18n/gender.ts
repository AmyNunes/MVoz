import { useProfile } from '@/stores/profileStore';

/**
 * Textos que não dá para escrever sem marcar gênero (seção 4.6): usa a forma escolhida em
 * Sobre mim (feminino, masculino ou neutro). Sem o Guia respondido, a forma neutra.
 * Ex.: g({ f: 'pronta', m: 'pronto', n: 'com tudo pronto' }).
 */
export function g(forms: { f: string; m: string; n: string }): string {
  return forms[useProfile.getState().profile?.grammaticalGender ?? 'n'];
}
