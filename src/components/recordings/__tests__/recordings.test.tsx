import { render, screen } from '@testing-library/react-native';

import type { SegmentMetrics } from '@/audio/metrics';
import { strings } from '@/i18n/strings';

import { PlaybackTrace } from '../PlaybackTrace';
import { metricRows, RecordingMetrics } from '../RecordingMetrics';

const m = strings.recordings.metrics;

const metrics: SegmentMetrics = {
  durationSec: 32,
  voicedSec: 21.5,
  voicedRatio: 0.67,
  medianHz: 182.4,
  p10Hz: 151,
  p90Hz: 214,
  rangeSt: 6.04,
  variabilitySt: 2.2,
  stabilityCents: 180,
  inTargetRatio: 0.58,
  belowFloorRatio: null,
  endings: { rising: 3, falling: 2, flat: 4 },
  longestSoundSec: 6.3,
  resonance: { f1: 512, f2: 1630, centroid: 1500, spacing: 1050 },
};

describe('métricas da gravação', () => {
  it('mostra os valores com vírgula e nota', async () => {
    await render(<RecordingMetrics metrics={metrics} />);

    expect(screen.getByText('182 Hz · Fá♯ 3')).toBeOnTheScreen();
    expect(screen.getByText('151–214 Hz (6,0 semitons)')).toBeOnTheScreen();
    expect(screen.getByText('0:21 de 0:32')).toBeOnTheScreen();
    expect(screen.getByText('58%')).toBeOnTheScreen();
    expect(screen.getByText('3 sobem · 2 descem · 4 retos')).toBeOnTheScreen();
    expect(screen.getByText('F1 512 Hz · F2 1630 Hz')).toBeOnTheScreen();
  });

  it('sem faixa-alvo na hora da gravação, não mostra "Na faixa-alvo"', () => {
    const labels = metricRows({ ...metrics, inTargetRatio: null }).map((r) => r.label);
    expect(labels).not.toContain(m.inTarget);
  });

  it('sem voz: avisa em vez de mostrar números vazios', () => {
    expect(metricRows({ ...metrics, medianHz: null })).toEqual([{ label: m.voiced, value: m.noVoice }]);
  });
});

describe('PlaybackTrace', () => {
  it('rótulo para leitor de tela', async () => {
    await render(<PlaybackTrace track={{ v: 1, rate: 10, hz: [180, 182, 0, 190] }} durationSec={0.4} position={0.1} />);
    expect(screen.getByLabelText(strings.recordings.traceLabel)).toBeOnTheScreen();
  });
});
