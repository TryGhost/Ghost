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
import type { StateBridge } from '@/ember-bridge';

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

describe('useTheme (OS preference)', () => {
  themeTest(
    'ignores OS changes unless the preference is system',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'light');
      const mediaQuery = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
      const mediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);

      try {
        const { result } = renderHook(() => useTheme(), { wrapper });
        await waitFor(() => expect(result.current.isThemeReady).toBe(true));
        flushAnimationFrames(animationFrames);

        act(() => {
          mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: true }));
        });

        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(result.current.resolvedTheme).toBe('light');
      } finally {
        mediaSpy.mockRestore();
      }
    },
  );
});

describe('useTheme (with Ember mounted)', () => {
  function mountEmberBridge(calls: string[], preload: Promise<void> = Promise.resolve()) {
    window.EmberBridge = {
      state: {
        onUpdate: () => {},
        onInvalidate: () => {},
        onDelete: () => {},
        on: () => {},
        off: () => {},
        sidebarVisible: true,
        getRouteUrl: (routeName) => routeName,
        isRouteActive: () => false,
        preloadAdminThemeStylesheet: () => {
          calls.push('preload');
          return preload;
        },
        applyAdminThemePreference: (mode) => {
          calls.push(`apply:${mode}`);
        },
      } satisfies StateBridge,
    };
  }

  afterEach(() => {
    delete window.EmberBridge;
  });

  themeTest('applies the persisted theme on load', async ({ server, wrapper, animationFrames }) => {
    mockPreferences(server, 'dark');
    mountEmberBridge([]);

    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.isThemeReady).toBe(true));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    flushAnimationFrames(animationFrames);
  });

  themeTest(
    'flips the dark class only once Ember has loaded its stylesheet',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'light');
      const calls: string[] = [];
      let finishPreload = () => {};
      mountEmberBridge(
        calls,
        new Promise<void>((resolve) => {
          finishPreload = resolve;
        }),
      );

      const { result } = renderHook(
        () => ({
          theme: useTheme(),
          preferences: useUserPreferences(),
        }),
        { wrapper },
      );
      await waitFor(() => {
        expect(result.current.preferences.data).toBeDefined();
      });
      flushAnimationFrames(animationFrames);

      let switching: Promise<void> | undefined;
      act(() => {
        switching = result.current.theme.setTheme('dark');
      });
      expect(calls).toEqual(['preload']);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      await act(async () => {
        finishPreload();
        await switching;
      });
      expect(calls).toEqual(['preload', 'apply:dark']);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      flushAnimationFrames(animationFrames);
    },
  );

  themeTest(
    'restores the previous theme in React and Ember when saving fails',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'light');
      server.use(
        http.put(USER_UPDATE_API_URL, () =>
          HttpResponse.json({ errors: [{ message: 'Validation error' }] }, { status: 422 }),
        ),
      );
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const calls: string[] = [];
      mountEmberBridge(calls);

      try {
        const { result } = renderHook(
          () => ({
            theme: useTheme(),
            preferences: useUserPreferences(),
          }),
          { wrapper },
        );
        await waitFor(() => {
          expect(result.current.preferences.data).toBeDefined();
        });
        flushAnimationFrames(animationFrames);

        await act(async () => {
          await result.current.theme.setTheme('dark');
        });

        expect(calls).toEqual(['preload', 'apply:dark', 'apply:light']);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(result.current.theme.theme).toBe('light');
        flushAnimationFrames(animationFrames);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    },
  );

  themeTest(
    'applies OS changes in system mode within the change event',
    async ({ server, wrapper, animationFrames }) => {
      mockPreferences(server, 'system');
      mountEmberBridge([]);
      const mediaQuery = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
      const mediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);
      const removeListenerSpy = vi.spyOn(mediaQuery, 'removeEventListener');

      try {
        const { result, unmount } = renderHook(() => useTheme(), { wrapper });
        await waitFor(() => expect(result.current.theme).toBe('system'));
        expect(result.current.resolvedTheme).toBe('light');
        flushAnimationFrames(animationFrames);

        // Registered after the hook's listener, so it observes the class as it
        // stands when the event hands over to Ember, before React re-renders.
        let darkDuringEvent: boolean | undefined;
        mediaQuery.addEventListener('change', () => {
          darkDuringEvent = document.documentElement.classList.contains('dark');
        });

        act(() => {
          mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: true }));
        });
        expect(darkDuringEvent).toBe(true);
        expect(result.current.resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('theme-switching')).toBe(true);

        act(() => {
          mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
        });
        expect(darkDuringEvent).toBe(false);
        expect(result.current.resolvedTheme).toBe('light');
        flushAnimationFrames(animationFrames);

        unmount();
        expect(removeListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
      } finally {
        mediaSpy.mockRestore();
        removeListenerSpy.mockRestore();
      }
    },
  );
});
