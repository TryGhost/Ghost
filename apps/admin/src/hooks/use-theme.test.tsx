import { test as baseTest, afterEach, describe, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { useTheme } from './use-theme';
import { useUserPreferences } from './user-preferences';
import { HttpResponse, http } from 'msw';
import { staffUser } from '@tryghost/test-data';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import type {
  UpdateUserRequestBody,
  UsersResponseType,
} from '@tryghost/admin-x-framework/api/users';
import type { SetupServer } from 'msw/node';
import * as emberBridge from '@/ember-bridge';

// Constants
const USERS_API_URL = '/ghost/api/admin/users/me/';
const USER_UPDATE_API_URL = '/ghost/api/admin/users/:id/';

const mockUser = staffUser();

const themeTest = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
  animationFrames: Map<number, FrameRequestCallback>;
}>({
  ...serverFixture,
  ...queryClientFixtures,
  // Captures requestAnimationFrame callbacks so tests can observe the
  // `theme-switching` suppression window and release it deterministically.
  animationFrames: async ({ task }, provide) => {
    void task;
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        callbacks.set(frameId, callback);
        return frameId;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((frameId) => {
        callbacks.delete(frameId);
      });
    await provide(callbacks);
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  },
});

function flushAnimationFrames(callbacks: Map<number, FrameRequestCallback>) {
  while (callbacks.size > 0) {
    const [frameId, callback] = callbacks.entries().next().value ?? [];
    if (frameId !== undefined && callback) {
      callbacks.delete(frameId);
      callback(0);
    }
  }
}

function mockPreferences(server: SetupServer, nightShift: string) {
  server.use(
    http.get(USERS_API_URL, () => {
      return HttpResponse.json({
        users: [
          {
            ...mockUser,
            accessibility: JSON.stringify({ nightShift }),
          },
        ],
      });
    }),
    http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(
      USER_UPDATE_API_URL,
      async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          users: [
            {
              ...mockUser,
              accessibility: body.users[0]?.accessibility ?? '',
            },
          ],
        });
      },
    ),
  );
}

afterEach(() => {
  document.documentElement.classList.remove('dark', 'theme-switching');
});

describe('useTheme (standalone)', () => {
  themeTest(
    'does not report a ready theme until preferences have loaded',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isThemeReady).toBe(false);
      await waitFor(() => expect(result.current.isThemeReady).toBe(true));
      expect(result.current.resolvedTheme).toBe('dark');
      flushAnimationFrames(animationFrames);
    },
  );

  themeTest(
    'applies the persisted theme with transition suppression',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.resolvedTheme).toBe('dark');
      });

      const html = document.documentElement;
      expect(html.classList.contains('dark')).toBe(true);
      expect(html.classList.contains('theme-switching')).toBe(true);
      // Loading preferences reapplies the theme before the initial suppression
      // window closes, leaving only the latest release callback scheduled.
      expect(animationFrames.size).toBe(1);

      flushAnimationFrames(animationFrames);

      expect(html.classList.contains('dark')).toBe(true);
      expect(html.classList.contains('theme-switching')).toBe(false);
    },
  );

  themeTest(
    'suppresses transitions while switching theme, then releases',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'light');

      const { result } = renderHook(
        () => ({
          theme: useTheme(),
          preferences: useUserPreferences(),
        }),
        { wrapper },
      );

      // Wait for preferences to load so setTheme can persist the change
      await waitFor(() => {
        expect(result.current.preferences.data).toBeDefined();
      });
      flushAnimationFrames(animationFrames);

      const html = document.documentElement;
      expect(html.classList.contains('dark')).toBe(false);
      expect(html.classList.contains('theme-switching')).toBe(false);

      await act(async () => {
        await result.current.theme.setTheme('dark');
      });

      expect(html.classList.contains('dark')).toBe(true);
      expect(html.classList.contains('theme-switching')).toBe(true);

      flushAnimationFrames(animationFrames);

      expect(html.classList.contains('dark')).toBe(true);
      expect(html.classList.contains('theme-switching')).toBe(false);
    },
  );
});

describe('useTheme (Ember-managed)', () => {
  themeTest(
    'tracks system changes without applying the DOM theme',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'system');
      const mediaQuery = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
      const mediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);
      const managedSpy = vi.spyOn(emberBridge, 'isEmberThemeManaged').mockReturnValue(true);
      const removeListenerSpy = vi.spyOn(mediaQuery, 'removeEventListener');

      try {
        const { result, unmount } = renderHook(() => useTheme(), { wrapper });
        await waitFor(() => expect(result.current.theme).toBe('system'));
        expect(result.current.resolvedTheme).toBe('light');

        act(() => {
          mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: true }));
        });
        expect(result.current.resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(animationFrames.size).toBe(0);

        act(() => {
          mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
        });
        expect(result.current.resolvedTheme).toBe('light');

        unmount();
        expect(removeListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
      } finally {
        mediaSpy.mockRestore();
        managedSpy.mockRestore();
        removeListenerSpy.mockRestore();
      }
    },
  );
});
