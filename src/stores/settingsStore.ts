import type { z } from 'zod';
import { create } from 'zustand';

import { readAllSettings, writeSetting } from '@/db/settingsRepo';
import {
  settingsGroups,
  type Settings,
  type SettingsGroup,
} from '@/features/settings/schemas';
import { parseJsonWith } from '@/lib/json';

const groupKeys = Object.keys(settingsGroups) as SettingsGroup[];

function schemaOf<K extends SettingsGroup>(key: K): z.ZodType<Settings[K]> {
  return settingsGroups[key] as unknown as z.ZodType<Settings[K]>;
}

function defaultsOf<K extends SettingsGroup>(key: K): Settings[K] {
  return schemaOf(key).parse({});
}

export const defaultSettings = Object.fromEntries(
  groupKeys.map((k) => [k, defaultsOf(k)]),
) as Settings;

type SettingsState = Settings & {
  loaded: boolean;
  load: () => Promise<void>;
  update: <K extends SettingsGroup>(group: K, patch: Partial<Settings[K]>) => Promise<void>;
};

/** Configurações do app: carregadas do banco ao abrir e salvas a cada mudança. */
export const useSettings = create<SettingsState>()((set, get) => ({
  ...defaultSettings,
  loaded: false,

  load: async () => {
    const raw = await readAllSettings();
    const next = Object.fromEntries(
      groupKeys.map((k) => [k, parseJsonWith(raw[k], schemaOf(k), defaultsOf(k))]),
    ) as Settings;
    set({ ...next, loaded: true });
  },

  update: async (group, patch) => {
    const merged = schemaOf(group).parse({ ...get()[group], ...patch });
    set({ [group]: merged } as Pick<Settings, typeof group>);
    await writeSetting(group, merged);
  },
}));
