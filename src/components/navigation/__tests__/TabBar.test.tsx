import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { TabBar } from '../TabBar';

const routes = [
  { key: 'index-1', name: 'index', title: 'Hoje' },
  { key: 'exercises-1', name: 'exercises', title: 'Exercícios' },
  { key: 'plan-1', name: 'plan', title: 'Plano' },
  { key: 'progress-1', name: 'progress', title: 'Progresso' },
];

function props(navigateToTab: jest.Mock, defaultPrevented = false) {
  return {
    state: { index: 0, routes: routes.map(({ key, name }) => ({ key, name })) },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: { title: r.title } }])),
    emitter: { emit: () => ({ defaultPrevented }) },
    navigateToTab,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;
}

describe('TabBar', () => {
  it('mostra as 4 abas com a atual selecionada', async () => {
    await render(<TabBar {...props(jest.fn())} />);

    for (const r of routes) expect(screen.getByRole('tab', { name: r.title })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Hoje' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Plano' })).not.toBeSelected();
  });

  it('tocar numa aba navega para ela', async () => {
    const navigateToTab = jest.fn();
    await render(<TabBar {...props(navigateToTab)} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Plano' }));
    expect(navigateToTab).toHaveBeenCalledWith('plan-1');
  });

  it('tocar na aba atual não navega de novo', async () => {
    const navigateToTab = jest.fn();
    await render(<TabBar {...props(navigateToTab)} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Hoje' }));
    expect(navigateToTab).not.toHaveBeenCalled();
  });
});
