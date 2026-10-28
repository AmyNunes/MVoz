import { fireEvent, render, screen } from '@testing-library/react-native';

import GestureSettingsScreen from '@/../app/settings/gestures';
import { GestureGuide } from '@/components/navigation/GestureGuide';
import { strings } from '@/i18n/strings';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

const g = strings.settings.gestures;

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('@/db/settingsRepo', () => ({ writeSetting: jest.fn(async () => {}), readAllSettings: jest.fn() }));

beforeEach(() => {
  useSettings.setState({ loaded: true, gestures: { ...defaultSettings.gestures } });
});

describe('guias de gesto', () => {
  it('aparece na primeira visita; "Entendi" não deixa aparecer de novo', async () => {
    await render(<GestureGuide name="session" />);
    expect(screen.getByText(strings.coach.session.left)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: strings.common.gotIt }));
    expect(useSettings.getState().gestures.coachMarksSeen).toContain('session');
  });

  it('não aparece enquanto a tela não tem o que mostrar', async () => {
    await render(<GestureGuide name="routines" when={false} />);
    expect(screen.queryByText(strings.coach.routines.left)).toBeNull();
  });
});

describe('Configurações › Gestos', () => {
  it('desliga a vibração e manda ver os guias de novo', async () => {
    useSettings.setState({ gestures: { haptics: true, coachMarksSeen: ['session', 'player'] } });
    await render(<GestureSettingsScreen />);

    await fireEvent(screen.getByLabelText(g.haptics), 'valueChange', false);
    expect(useSettings.getState().gestures.haptics).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: g.seeGuides }));
    expect(useSettings.getState().gestures.coachMarksSeen).toEqual([]);
  });
});
