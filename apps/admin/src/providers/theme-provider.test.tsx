import { test as baseTest, afterEach, describe, expect } from 'vitest';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import type { SetupServer } from 'msw/node';
import type {
  UpdateUserRequestBody,
  UsersResponseType,
} from '@tryghost/admin-x-framework/api/users';
import { staffUser } from '@tryghost/test-data';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { useUserPreferences } from '@/hooks/user-preferences';
import { ThemeProvider } from './theme-provider';
import { useThemeContext } from './theme-context';

const USERS_API_URL = '/ghost/api/admin/users/me/';
const USER_UPDATE_API_URL = '/ghost/api/admin/users/:id/';

const mockUser = staffUser();

const themeContextTest = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
});

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

describe('ThemeProvider', () => {
  themeContextTest(
    'shares one optimistic theme state across separate consumers mid-save',
    async ({ server, wrapper: Wrapper }) => {
      mockPreferences(server, 'light');

      // Hold the persistence PUT open so the optimistic window is observable.
      let releasePut: () => void = () => {};
      const putGate = new Promise<void>((resolve) => {
        releasePut = resolve;
      });
      server.use(
        http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(
          USER_UPDATE_API_URL,
          async ({ request }) => {
            const body = await request.json();
            await putGate;
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

      // Two SEPARATE components: `Shell` mirrors ThemedAdminApp, `Menu`
      // mirrors the appearance menu. The pre-provider architecture gave each
      // its own useTheme instance with independent optimistic state; this
      // asserts they now share one.
      function Shell() {
        const { resolvedTheme } = useThemeContext();
        return <div data-testid="shell-theme">{resolvedTheme}</div>;
      }
      let setThemeFromMenu: (mode: 'dark' | 'light' | 'system') => Promise<void> = async () => {};
      function Menu() {
        const { setTheme, isSettingTheme } = useThemeContext();
        setThemeFromMenu = setTheme;
        return <div data-testid="menu-saving">{String(isSettingTheme)}</div>;
      }

      render(
        <Wrapper>
          <ThemeProvider>
            <Shell />
            <Menu />
          </ThemeProvider>
        </Wrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('shell-theme').textContent).toBe('light');
      });

      let pendingSet: Promise<void>;
      act(() => {
        pendingSet = setThemeFromMenu('dark');
      });

      // Mid-flight (PUT still held open): the shell consumer already shows the
      // menu's optimistic selection, and the shared saving flag is visible to
      // the menu. The old two-instance architecture fails here: the shell's
      // instance knew nothing about the menu's pendingTheme.
      await waitFor(() => {
        expect(screen.getByTestId('shell-theme').textContent).toBe('dark');
      });
      expect(screen.getByTestId('menu-saving').textContent).toBe('true');

      releasePut();
      await act(async () => {
        await pendingSet;
      });

      expect(screen.getByTestId('shell-theme').textContent).toBe('dark');
      await waitFor(() => {
        expect(screen.getByTestId('menu-saving').textContent).toBe('false');
      });
    },
  );

  themeContextTest(
    'shares one theme state: a menu setTheme flips every consumer',
    async ({ server, wrapper: Wrapper }) => {
      mockPreferences(server, 'light');

      const contextWrapper = ({ children }: { children: ReactNode }) => (
        <Wrapper>
          <ThemeProvider>{children}</ThemeProvider>
        </Wrapper>
      );

      // Two consumers of the shared provider: `shell` mirrors ThemedAdminApp,
      // `menu` mirrors the appearance menu in the user menu.
      const { result } = renderHook(
        () => ({
          shell: useThemeContext(),
          menu: useThemeContext(),
          preferences: useUserPreferences(),
        }),
        { wrapper: contextWrapper },
      );

      // Wait for preferences to load so setTheme can persist the change
      await waitFor(() => {
        expect(result.current.preferences.data).toBeDefined();
      });
      expect(result.current.shell.resolvedTheme).toBe('light');

      await act(async () => {
        await result.current.menu.setTheme('dark');
      });

      expect(result.current.shell.theme).toBe('dark');
      expect(result.current.shell.resolvedTheme).toBe('dark');
    },
  );
});
