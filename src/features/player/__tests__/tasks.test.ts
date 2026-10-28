import { getExercise } from '@/exercises/catalog';
import type { Exercise } from '@/exercises/model';

import { exerciseTasks, firstStep, neighborTaskStep } from '../tasks';

const ex = (id: string) => getExercise(id) as Exercise;

describe('tarefas do exercício', () => {
  it('canudo: só os passos com contagem viram tarefas; a preparação vem como "Antes:"', () => {
    const straw = ex('straw-phonation');
    const tasks = exerciseTasks(straw);
    expect(tasks.map((t) => t.step)).toEqual([1, 2, 3, 4, 5]);
    expect(tasks[0].before).toEqual([straw.steps[0]]);
    expect(tasks[1].before).toEqual([]);
    expect(firstStep(straw)).toBe(1);
  });

  it('desaquecimento: os passos depois da última tarefa vêm como "Depois:"', () => {
    const cooldown = ex('cooldown');
    const tasks = exerciseTasks(cooldown);
    expect(tasks.at(-1)?.after).toEqual(cooldown.steps.slice(2));
  });

  it('tarefa vizinha', () => {
    const tasks = exerciseTasks(ex('straw-phonation'));
    expect(neighborTaskStep(tasks, 1, -1)).toBeNull();
    expect(neighborTaskStep(tasks, 1, 1)).toBe(2);
    expect(neighborTaskStep(tasks, 5, 1)).toBeNull();
  });

  it('exercício de uma tarefa só: sem tarefas, começa no passo 0', () => {
    const breathing = ex('diaphragmatic-breathing');
    expect(exerciseTasks(breathing)).toEqual([]);
    expect(firstStep(breathing)).toBe(0);
  });
});
