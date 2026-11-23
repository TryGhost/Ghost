import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTokenHolder } from './app-token';
import { useAppTokenRenewal } from './use-app-token-renewal';

const { createToken } = vi.hoisted(() => ({ createToken: vi.fn() }));

vi.mock('@tryghost/admin-x-framework/api/app-installations', () => ({
  useCreateAppToken: () => ({ mutateAsync: createToken }),
}));

const HOUR = 60 * 60 * 1000;

describe('useAppTokenRenewal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createToken.mockReset();
    createToken.mockResolvedValue({
      app_tokens: [{ access_token: 'ghost_app_renewed', expires_in: 3600 }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const holder = () =>
    createAppTokenHolder({
      token: { access_token: 'ghost_app_first', expires_in: 3600 },
      receivedAt: Date.now(),
      onError: vi.fn(),
    });

  it('renews nothing while the app isn’t running, and renews at once when it runs again', async () => {
    const tokenHolder = holder();
    const { rerender } = renderHook(
      ({ running }) =>
        useAppTokenRenewal(tokenHolder, {
          installation: { id: 'installation-1', revision: 2 },
          running,
          onEnded: vi.fn(),
        }),
      { initialProps: { running: false } },
    );

    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(createToken).not.toHaveBeenCalled();

    rerender({ running: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(createToken).toHaveBeenCalledExactlyOnceWith({ id: 'installation-1', revision: 2 });
  });

  it('stops renewing when the app stops running', async () => {
    const tokenHolder = holder();
    const { rerender } = renderHook(
      ({ running }) =>
        useAppTokenRenewal(tokenHolder, {
          installation: { id: 'installation-1', revision: 2 },
          running,
          onEnded: vi.fn(),
        }),
      { initialProps: { running: true } },
    );

    rerender({ running: false });
    await vi.advanceTimersByTimeAsync(2 * HOUR);

    expect(createToken).not.toHaveBeenCalled();
  });
});
