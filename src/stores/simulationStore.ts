import { create } from 'zustand';

import type { ContourPoint } from '@/ai/schemas/simulate';

type SimulationState = {
  /** Curva da última simulação de cada exercício (para o "Fazer agora" com a curva). */
  contours: Partial<Record<string, ContourPoint[]>>;
  setContour: (exerciseId: string, points: ContourPoint[]) => void;
};

export const useSimulationStore = create<SimulationState>()((set) => ({
  contours: {},
  setContour: (exerciseId, points) => set((s) => ({ contours: { ...s.contours, [exerciseId]: points } })),
}));
