import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { useDeferredDispose } from './use-deferred-dispose';

const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

describe('useDeferredDispose', () => {
  it('disposes once the owner unmounts', async () => {
    const dispose = vi.fn();
    const { unmount } = renderHook(() => useDeferredDispose(dispose));

    await settle();
    expect(dispose).not.toHaveBeenCalled();

    unmount();
    await settle();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('keeps the resource through a teardown that is set up again', async () => {
    const dispose = vi.fn();
    const { unmount } = renderHook(() => useDeferredDispose(dispose), { wrapper: StrictMode });

    await settle();
    expect(dispose).not.toHaveBeenCalled();

    unmount();
    await settle();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
