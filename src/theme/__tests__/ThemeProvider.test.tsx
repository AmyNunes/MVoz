import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemeProvider, useTheme } from '../ThemeProvider';
import { palette } from '../tokens';

function Probe() {
  const theme = useTheme();
  return <Text>{`${theme.scheme} ${theme.colors.bg}`}</Text>;
}

describe('ThemeProvider', () => {
  it('entrega o tema escuro quando a preferência é "dark"', async () => {
    await render(
      <ThemeProvider preference="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`dark ${palette.dark.bg}`)).toBeOnTheScreen();
  });

  it('entrega o tema claro quando a preferência é "light"', async () => {
    await render(
      <ThemeProvider preference="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`light ${palette.light.bg}`)).toBeOnTheScreen();
  });
});
