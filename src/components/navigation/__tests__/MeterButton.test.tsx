import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '@/i18n/strings';

import { MeterButton } from '../MeterButton';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (path: string) => mockPush(path) } }));

describe('MeterButton', () => {
  it('abre o Medidor', async () => {
    await render(<MeterButton />);

    await fireEvent.press(screen.getByRole('button', { name: strings.meter.open }));
    expect(mockPush).toHaveBeenCalledWith('/meter');
  });
});
