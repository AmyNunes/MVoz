import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/i18n/strings';

import { MicPermission } from '../MicPermission';
import { PitchReadout } from '../PitchReadout';
import { RecordButton } from '../RecordButton';
import { ResonanceGauge } from '../ResonanceGauge';

const m = strings.meter;

describe('PitchReadout', () => {
  it('voz: Hz inteiro, nota e "Ouvindo…"', async () => {
    await render(<PitchReadout readout={{ kind: 'voice', hz: 196.3 }} />);

    expect(screen.getByText('196')).toBeOnTheScreen();
    expect(screen.getByText('Sol 3')).toBeOnTheScreen();
    expect(screen.getByText(m.listening)).toBeOnTheScreen();
    expect(screen.getByLabelText('196 hertz, Sol 3')).toBeOnTheScreen();
  });

  it('silêncio e voz fraca', async () => {
    await render(<PitchReadout readout={{ kind: 'silence' }} />);
    expect(screen.getByText(m.noValue)).toBeOnTheScreen();
    expect(screen.getByText(m.silence)).toBeOnTheScreen();

    await render(<PitchReadout readout={{ kind: 'quiet' }} />);
    expect(screen.getByText(m.tooQuiet)).toBeOnTheScreen();
  });

  it('com faixa-alvo: "Na faixa", "Abaixo" ou "Acima"', async () => {
    const band = { lowHz: 165, highHz: 200 };
    await render(<PitchReadout readout={{ kind: 'voice', hz: 180 }} band={band} />);
    expect(screen.getByText(m.inBand)).toBeOnTheScreen();

    await render(<PitchReadout readout={{ kind: 'voice', hz: 140 }} band={band} />);
    expect(screen.getByText(m.below)).toBeOnTheScreen();

    await render(<PitchReadout readout={{ kind: 'voice', hz: 230 }} band={band} />);
    expect(screen.getByText(m.above)).toBeOnTheScreen();
  });

  it('pausado não mostra o último tom', async () => {
    await render(<PitchReadout readout={{ kind: 'voice', hz: 196 }} paused />);

    expect(screen.queryByText('196')).toBeNull();
    expect(screen.getByText(m.paused)).toBeOnTheScreen();
  });
});

describe('ResonanceGauge', () => {
  const reading = { spacing: 1100, f1: 300, f2: 2300, centroid: 1500, highPitch: false };

  it('sempre diz que é estimativa; sem medida, pede uma vogal sustentada', async () => {
    await render(<ResonanceGauge reading={null} />);

    expect(screen.getByText(m.resonance.estimate)).toBeOnTheScreen();
    expect(screen.getByText(m.resonance.waiting)).toBeOnTheScreen();
  });

  it('com medida: posição na barra para o leitor de tela', async () => {
    await render(<ResonanceGauge reading={reading} />);

    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 50 });
    expect(screen.queryByText(m.resonance.highPitch)).toBeNull();
  });

  it('tom alto: avisa que a estimativa fica menos precisa', async () => {
    await render(<ResonanceGauge reading={{ ...reading, highPitch: true }} />);

    expect(screen.getByText(m.resonance.highPitch)).toBeOnTheScreen();
  });
});

describe('RecordButton', () => {
  it('parado: "Gravar"; gravando: tempo e "Parar gravação"', async () => {
    const onPress = jest.fn();
    await render(<RecordButton recording={false} elapsedSec={0} maxSec={180} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: m.record.start }));
    expect(onPress).toHaveBeenCalled();

    await render(<RecordButton recording elapsedSec={12.4} maxSec={180} onPress={onPress} />);
    expect(screen.getByText('0:12 de 3:00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `${m.record.stop}, 0:12 de 3:00` })).toBeOnTheScreen();
  });
});

describe('MicPermission', () => {
  it('explica antes de pedir o microfone', async () => {
    const onRequest = jest.fn();
    await render(<MicPermission status="ask" onRequest={onRequest} onOpenSettings={jest.fn()} />);

    expect(screen.getByText(m.permission.title)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: m.permission.allow }));
    expect(onRequest).toHaveBeenCalled();
  });

  it('bloqueado: leva às configurações', async () => {
    const onOpenSettings = jest.fn();
    await render(<MicPermission status="blocked" onRequest={jest.fn()} onOpenSettings={onOpenSettings} />);

    expect(screen.getByText(m.permission.blockedTitle)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: m.permission.openSettings }));
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
