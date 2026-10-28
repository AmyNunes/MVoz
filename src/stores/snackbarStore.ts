import { create } from 'zustand';

export type SnackbarMessage = {
  id: number;
  message: string;
  action?: { label: string; onPress: () => void };
};

type SnackbarState = {
  current: SnackbarMessage | null;
  show: (message: string, action?: SnackbarMessage['action']) => void;
  hide: (id?: number) => void;
};

let nextId = 1;

/** Aviso curto acima da tab bar, por 5 s, com uma ação (ex.: "Desfazer"). */
export const useSnackbar = create<SnackbarState>()((set, get) => ({
  current: null,
  show: (message, action) => set({ current: { id: nextId++, message, action } }),
  hide: (id) => {
    const current = get().current;
    if (current && (id === undefined || current.id === id)) set({ current: null });
  },
}));

export const showSnackbar = (message: string, action?: SnackbarMessage['action']) =>
  useSnackbar.getState().show(message, action);
