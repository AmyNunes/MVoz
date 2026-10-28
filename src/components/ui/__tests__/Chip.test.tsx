import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from '../Chip';

describe('Chip', () => {
  it('selecionável: informa se está selecionado', async () => {
    await render(<Chip label="B1" selected onPress={() => {}} />);

    expect(screen.getByRole('button', { name: 'B1' })).toBeSelected();
  });

  it('chama onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(<Chip label="viagens" onPress={onPress} accessibilityLabel="Remover viagens" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Remover viagens' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sem onPress não é um botão', async () => {
    await render(<Chip label="Contexto" />);

    expect(screen.getByText('Contexto')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
