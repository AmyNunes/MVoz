import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/i18n/strings';

import { TextField } from '../TextField';

describe('TextField', () => {
  it('o campo é encontrado pelo rótulo e repassa o texto digitado', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Modelo" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Modelo'), 'gemini');

    expect(onChangeText).toHaveBeenCalledWith('gemini');
  });

  it('secreto: começa oculto e o olho mostra o texto', async () => {
    await render(<TextField label="Chave da API" secure />);
    const input = screen.getByLabelText('Chave da API');

    expect(input).toHaveProp('secureTextEntry', true);

    await fireEvent.press(screen.getByRole('button', { name: strings.common.showText }));

    expect(screen.getByLabelText('Chave da API')).toHaveProp('secureTextEntry', false);
    expect(screen.getByRole('button', { name: strings.common.hideText })).toBeOnTheScreen();
  });

  it('mostra a mensagem de erro no lugar da ajuda', async () => {
    await render(<TextField label="URL base" helper="Ajuda" error="URL inválida" />);

    expect(screen.getByText('URL inválida')).toBeOnTheScreen();
    expect(screen.queryByText('Ajuda')).toBeNull();
  });
});
