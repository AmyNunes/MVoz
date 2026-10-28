import { fireEvent, render, screen } from '@testing-library/react-native';

import { Segmented } from '../Segmented';

const options = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
] as const;

describe('Segmented', () => {
  it('marca a opção atual', async () => {
    await render(
      <Segmented accessibilityLabel="Tema" options={options} value="light" onChange={() => {}} />,
    );

    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Escuro' })).not.toBeChecked();
  });

  it('avisa a opção escolhida', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented accessibilityLabel="Tema" options={options} value="system" onChange={onChange} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Escuro' }));

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
