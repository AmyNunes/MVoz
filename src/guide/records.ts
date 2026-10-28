import type { Discomfort, ResultDetails, ResultRating } from '@/exercises/results';

/** O que as regras do Guia leem dos treinos feitos (sessões com resultados). */
export type ResultRecord = {
  exerciseId: string;
  repsDone: number;
  skipped: boolean;
  metrics: ResultDetails;
  rating: ResultRating;
};

export type SessionRecord = {
  id: string;
  /** Dia de treino ("AAAA-MM-DD", vira às 04:00). */
  date: string;
  startedAt: string;
  origin: string;
  block: number;
  minutes: number;
  discomfort: Discomfort | null;
  stoppedForPain: boolean;
  results: ResultRecord[];
};
