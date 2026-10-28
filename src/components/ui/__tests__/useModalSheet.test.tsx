import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, render } from '@testing-library/react-native';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

import { useModalSheet } from '../useModalSheet';

const fake = { present: jest.fn(), dismiss: jest.fn() };
/** Simula a folha fechando sozinha (arrastar para baixo, X). */
let closeFromInside: () => void = () => {};

/** Faz o papel do BottomSheetModal: expõe present/dismiss pelo ref e avisa quando fecha. */
const FakeModal = forwardRef<BottomSheetModal, { onDismiss: () => void }>(function FakeModal({ onDismiss }, ref) {
  useImperativeHandle(ref, () => fake as unknown as BottomSheetModal);
  useEffect(() => {
    closeFromInside = onDismiss;
  });
  return null;
});

function Probe({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { ref, onDismiss } = useModalSheet(visible, onClose);
  return <FakeModal ref={ref} onDismiss={onDismiss} />;
}

beforeEach(() => {
  fake.present.mockClear();
  fake.dismiss.mockClear();
});

describe('useModalSheet', () => {
  it('não pede para fechar uma folha que nunca abriu (senão o gorhom trava a folha)', async () => {
    await render(<Probe visible={false} onClose={() => {}} />);
    expect(fake.dismiss).not.toHaveBeenCalled();
    expect(fake.present).not.toHaveBeenCalled();
  });

  it('abre quando fica visível e fecha quando deixa de ser', async () => {
    const onClose = jest.fn();
    const { rerender } = await render(<Probe visible={false} onClose={onClose} />);
    await rerender(<Probe visible onClose={onClose} />);
    expect(fake.present).toHaveBeenCalledTimes(1);
    await rerender(<Probe visible={false} onClose={onClose} />);
    expect(fake.dismiss).toHaveBeenCalledTimes(1);
  });

  it('quando a folha fecha sozinha (arrastar, X), não pede para fechar de novo e reabre depois', async () => {
    const onClose = jest.fn();
    const { rerender } = await render(<Probe visible onClose={onClose} />);
    expect(fake.present).toHaveBeenCalledTimes(1);

    await act(async () => closeFromInside());
    expect(onClose).toHaveBeenCalledTimes(1);
    await rerender(<Probe visible={false} onClose={onClose} />);
    expect(fake.dismiss).not.toHaveBeenCalled();

    await rerender(<Probe visible onClose={onClose} />);
    expect(fake.present).toHaveBeenCalledTimes(2);
  });
});
