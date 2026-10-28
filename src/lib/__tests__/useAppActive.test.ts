import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useAppActive } from '../useAppActive';

describe('useAppActive', () => {
  it('fica falso em segundo plano e volta ao reabrir', async () => {
    let listener: (state: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler;
      return { remove: jest.fn() };
    });

    const { result } = await renderHook(() => useAppActive());
    expect(result.current).toBe(true);

    await act(() => listener('background'));
    expect(result.current).toBe(false);

    await act(() => listener('active'));
    expect(result.current).toBe(true);
  });
});
