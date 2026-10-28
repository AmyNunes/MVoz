import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { getExercise } from '@/exercises/catalog';
import type { VoiceFrame } from '@/audio/analyzer';
import type { Exercise } from '@/exercises/model';
import { strings } from '@/i18n/strings';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

import { ExercisePlayer } from '../ExercisePlayer';

const p = strings.player;

jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));
jest.mock('@/db/settingsRepo', () => ({ writeSetting: jest.fn(async () => {}), readAllSettings: jest.fn() }));
jest.mock('@/features/meter/useMicPermission', () => ({
  useMicPermission: () => ({ status: 'granted', request: jest.fn(), openSettings: jest.fn() }),
}));
// O mesmo objeto a cada render, como o hook de verdade (funções estáveis): senão os efeitos
// que dependem de `onFrames` rodariam sem parar.
const mockLive = {
  status: 'listening',
  listening: true,
  readout: { kind: 'voice', hz: 185 },
  resonance: null,
  trace: [],
  paused: false,
  togglePause: () => {},
  retry: () => {},
  startFile: async () => {},
  stopFile: async () => 0,
  onFrames: (listener: (frames: VoiceFrame[]) => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
};
const mockListeners = new Set<(frames: VoiceFrame[]) => void>();
/** Manda `seconds` de voz a 200 Hz (quadros de 20 ms) a partir de `from`, e depois 1 s de silêncio. */
async function sing(from: number, seconds: number) {
  const voice = Array.from({ length: Math.round(seconds / 0.02) }, (_, i) => ({ t: from + i * 0.02, hz: 200, clarity: 0.95, rms: 0.05, formants: null }));
  const quiet = Array.from({ length: 50 }, (_, i) => ({ t: from + seconds + i * 0.02, hz: null, clarity: 0.1, rms: 0.001, formants: null }));
  await act(async () => {
    for (const listener of mockListeners) {
      listener(voice);
      listener(quiet);
    }
  });
}
jest.mock('@/features/meter/useLiveVoice', () => ({ useLiveVoice: () => mockLive }));
jest.mock('@/audio/tonePlayer', () => ({ createTonePlayer: () => ({ play: jest.fn(), stop: jest.fn() }) }));

const ex = (id: string) => getExercise(id) as Exercise;

async function renderPlayer(id: string, callbacks: Partial<React.ComponentProps<typeof ExercisePlayer>> = {}) {
  const props = { onComplete: jest.fn(async () => {}), onPain: jest.fn(), onExit: jest.fn(), ...callbacks };
  await render(
    <GestureHandlerRootView>
      <ExercisePlayer exercise={ex(id)} {...props} />
    </GestureHandlerRootView>,
  );
  return props;
}

beforeEach(() => {
  mockListeners.clear();
  useSettings.setState({ training: { ...defaultSettings.training, targetEnabled: true }, gestures: defaultSettings.gestures });
});

describe('player sem microfone', () => {
  it('tarefa com preparação, "Fiz", "Terminar" e "Como foi?" → salva com a avaliação', async () => {
    const props = await renderPlayer('release-yawn-sigh');
    const steps = ex('release-yawn-sigh').steps;

    // Já começa na tarefa ("haaa" 3 vezes); os passos de preparação aparecem como "Antes:".
    expect(screen.getByText(p.taskOf(1, 1))).toBeOnTheScreen();
    expect(screen.getByText(p.before(`${steps[0]} ${steps[1]}`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: p.did }));
    expect(screen.getByText(p.stepCount(1, 3, 'suspiros'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: p.finish }));
    await fireEvent.press(screen.getByRole('button', { name: p.feeling.easy }));
    await fireEvent.press(screen.getByRole('button', { name: p.discomfort[0] }));
    await fireEvent.press(screen.getByRole('button', { name: p.save }));

    expect(props.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'release-yawn-sigh',
        repsDone: 1,
        rating: expect.objectContaining({ feeling: 'easy', discomfort: 0 }),
      }),
    );
  });

  it('"Senti dor · parar" encerra e mostra as orientações', async () => {
    const props = await renderPlayer('release-yawn-sigh');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: p.pain }));
    });

    expect(props.onPain).toHaveBeenCalledWith(expect.objectContaining({ rating: expect.objectContaining({ discomfort: 2 }) }));
    expect(screen.getByText(p.painTitle)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: p.painBack }));
    expect(props.onExit).toHaveBeenCalled();
  });

  it('sair depois de fazer algo pergunta se quer salvar', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderPlayer('silent-laugh');
    await fireEvent.press(screen.getByRole('button', { name: p.did }));
    await fireEvent.press(screen.getByRole('button', { name: p.close }));

    expect(alert).toHaveBeenCalledWith(p.exitTitle, p.exitBody, expect.any(Array));
    alert.mockRestore();
  });

  it('missão: notas de conforto, esforço e quanto combinou', async () => {
    await renderPlayer('missions');
    await fireEvent.press(screen.getByRole('button', { name: p.finish }));
    expect(screen.getByText(p.mission.fit)).toBeOnTheScreen();
  });
});

describe('player com microfone', () => {
  it.each([
    ['target-hold', /Alvo: 182 Hz/],
    ['big-dog-small-dog', new RegExp(p.measure.resonanceCalibrating)],
    ['question-statement', /Você vem amanhã\./],
    ['sz-mpt', /\/s\//],
    ['standard-passage', /O Vento Norte e o Sol/],
    ['pitch-glides', /Deslize pelo menos 8 semitons/],
  ])('%s mostra a medição certa', async (id, text) => {
    await renderPlayer(id);
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: p.pain })).toBeOnTheScreen();
  });

  it('canudo: começa contando; cada tarefa conta do seu jeito e passa sozinha para a próxima', async () => {
    const props = await renderPlayer('straw-phonation');
    // Começa direto na tarefa 1 ("uuu"); posicionar o canudo vem como "Antes:".
    expect(screen.getByText(p.taskOf(1, 5))).toBeOnTheScreen();
    expect(screen.getByText(p.before(ex('straw-phonation').steps[0]))).toBeOnTheScreen();

    // "uuu" de 5 s, 3 vezes. 3 s não valem; 5 s sim.
    expect(screen.getByText(p.stepCount(0, 3, '"uuu" de 5 s'))).toBeOnTheScreen();
    await sing(0, 3);
    expect(screen.getByText(p.stepCount(0, 3, '"uuu" de 5 s'))).toBeOnTheScreen();
    await sing(10, 5.2);
    await sing(20, 5.2);
    await sing(30, 5.2);
    expect(screen.getByText(p.stepCount(3, 3, '"uuu" de 5 s'))).toBeOnTheScreen();
    expect(screen.getByText(p.stepDone)).toBeOnTheScreen();

    // Tarefa feita: depois de um instante, passa sozinha para os deslizes.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });
    expect(screen.getByText(p.taskOf(2, 5))).toBeOnTheScreen();
    expect(screen.getByText(p.stepCount(0, 5, 'deslizes'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: p.did }));
    expect(screen.getByText(p.stepCount(1, 5, 'deslizes'))).toBeOnTheScreen();

    // Tarefa 3: cantarolar 20 s pelo canudo (soma o tempo com voz). A seta pula para ela.
    await fireEvent.press(screen.getByRole('button', { name: p.nextTask }));
    expect(screen.getByText(p.voiceTime(0, 20, 'cantarolando'))).toBeOnTheScreen();
    await sing(40, 21);
    expect(screen.getByText(p.voiceTime(20, 20, 'cantarolando'))).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: p.finish }));
    await fireEvent.press(screen.getByRole('button', { name: p.feeling.ok }));
    await fireEvent.press(screen.getByRole('button', { name: p.discomfort[0] }));
    await fireEvent.press(screen.getByRole('button', { name: p.save }));
    expect(props.onComplete).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'straw-phonation', repsDone: 5 }));
  });

  it('respiração diafragmática: a ação na tela, os outros passos num toque, e a contagem já começa', async () => {
    await renderPlayer('diaphragmatic-breathing');
    const steps = ex('diaphragmatic-breathing').steps;
    expect(screen.getByText(steps[0])).toBeOnTheScreen();
    expect(screen.queryByText(steps[3])).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: p.allSteps(3) }));
    for (const step of steps) expect(screen.getByText(step)).toBeOnTheScreen();
    expect(screen.getByText(p.repOf(0, 5, 'ciclos'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: p.nextTask })).toBeNull();
    expect(screen.getByRole('button', { name: p.did })).toBeOnTheScreen();
  });

  it('sem faixa-alvo ligada, pede para definir antes', async () => {
    useSettings.setState({ training: { ...defaultSettings.training, targetEnabled: false } });
    await renderPlayer('target-hold');
    expect(screen.getByText(p.needsBand)).toBeOnTheScreen();
  });
});
