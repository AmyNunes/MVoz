import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('chama onPress ao tocar', async () => {
    const onPress = jest.fn();
    await render(<Button label="Começar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Começar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desativado: não chama onPress e avisa o leitor de tela', async () => {
    const onPress = jest.fn();
    await render(<Button label="Começar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Começar' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('carregando: fica ocupado e não aceita toques', async () => {
    const onPress = jest.fn();
    await render(<Button label="Testando" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Testando' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });
});
