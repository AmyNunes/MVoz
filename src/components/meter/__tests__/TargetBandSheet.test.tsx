import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/i18n/strings';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

import { TargetBandSheet } from '../TargetBandSheet';

const b = strings.meter.band;

jest.mock('@/db/settingsRepo', () => ({ writeSetting: jest.fn(async () => {}), readAllSettings: jest.fn() }));

// O sheet de verdade depende do provider nativo; aqui só o conteúdo importa.
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));

beforeEach(() => {
  useSettings.setState({ training: { ...defaultSettings.training } });
});

describe('TargetBandSheet', () => {
  it('desligada: só o interruptor', async () => {
    await render(<TargetBandSheet visible onClose={jest.fn()} />);

    expect(screen.getByLabelText(b.show)).toBeOnTheScreen();
    expect(screen.queryByLabelText(b.low)).toBeNull();
  });

  it('ligar mostra os ajustes; "+" no começo sobe 1 semitom', async () => {
    await render(<TargetBandSheet visible onClose={jest.fn()} />);
    await fireEvent(screen.getByLabelText(b.show), 'valueChange', true);

    expect(useSettings.getState().training.targetEnabled).toBe(true);
    expect(screen.getByText('165 Hz · Mi 3')).toBeOnTheScreen();

    const increase = screen.getAllByRole('button', { name: strings.common.increase });
    await fireEvent.press(increase[1]);
    expect(useSettings.getState().training.targetLowHz).toBeCloseTo(174.8, 1);
  });
});
