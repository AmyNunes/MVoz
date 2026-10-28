import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { strings } from '@/i18n/strings';

import { PitchTrace } from '../PitchTrace';

const frames = Array.from({ length: 100 }, (_, i) => ({ t: i * 0.02, hz: 180, clarity: 0.95, rms: 0.05 }));

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };

/** Elementos nativos do SVG (o texto do SVG não aparece para `getByText`). */
function findAll(node: unknown, type: string): Node[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as Node;
  const own = n.type === type ? [n] : [];
  return own.concat((n.children ?? []).flatMap((child) => findAll(child, type)));
}

async function renderTrace(band: { lowHz: number; highHz: number } | null) {
  await render(
    <GestureHandlerRootView>
      <PitchTrace frames={frames} band={band} onTogglePause={jest.fn()} onShiftBand={jest.fn()} />
    </GestureHandlerRootView>,
  );
  // Quem mede é a camada do desenho, por cima do quadro (o desenho não muda o tamanho do quadro).
  const layer = screen.getByLabelText(strings.meter.traceLabel).children[0];
  if (typeof layer === 'string') throw new Error('camada do desenho não encontrada');
  expect(layer.props.style).toMatchObject({ position: 'absolute' });
  await fireEvent(layer, 'layout', { nativeEvent: { layout: { width: 320, height: 240 } } });
  return screen.toJSON();
}

describe('PitchTrace', () => {
  it('desenha a linha do tom e a faixa-alvo depois de medir o espaço', async () => {
    const tree = await renderTrace({ lowHz: 165, highHz: 200 });

    const [path] = findAll(tree, 'RNSVGPath');
    expect(String(path.props.d)).toMatch(/^M/);
    expect(findAll(tree, 'RNSVGRect')).toHaveLength(1);
  });

  it('sem faixa-alvo, não desenha a faixa', async () => {
    const tree = await renderTrace(null);

    expect(findAll(tree, 'RNSVGRect')).toHaveLength(0);
    expect(findAll(tree, 'RNSVGPath')).toHaveLength(1);
  });
});
