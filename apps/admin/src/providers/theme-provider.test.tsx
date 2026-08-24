import { test as baseTest, afterEach, describe, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import type { SetupServer } from 'msw/node';
import type {
  UpdateUserRequestBody,
  UsersResponseType,
} from '@tryghost/admin-x-framework/api/users';
import { mockUser } from '@test-utils/factories';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import { useUserPreferences } from '@/hooks/user-preferences';
import { ThemeProvider } from './theme-provider';
import { useThemeContext } from './theme-context';

const USERS_API_URL = '/ghost/api/admin/users/me/';
const USER_UPDATE_API_URL = '/ghost/api/admin/users/:id/';

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
