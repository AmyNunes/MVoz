import { create } from 'zustand';

import { getProfile, saveProfile } from '@/db/profileRepo';
import type { Profile } from '@/guide/profile';

type ProfileState = {
  /** Respostas do Guia; `null` até o Guia ser respondido. */
  profile: Profile | null;
  load: () => Promise<void>;
  save: (profile: Profile) => Promise<void>;
};

/** Perfil (Sobre mim) carregado ao abrir o app, para os textos e as regras do plano. */
export const useProfile = create<ProfileState>()((set) => ({
  profile: null,
  load: async () => set({ profile: await getProfile() }),
  save: async (profile) => {
    await saveProfile(profile);
    set({ profile });
  },
}));
