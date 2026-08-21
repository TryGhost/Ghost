import { test as baseTest, describe, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { HttpResponse, http } from 'msw';
import type { SetupServer } from 'msw/node';
import { mockUser } from '@test-utils/factories';
import { waitForQuerySettled } from '@test-utils/test-helpers';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import type {
  UpdateUserRequestBody,
  UsersResponseType,
} from '@tryghost/admin-x-framework/api/users';
import { useUserPreferences } from '@/hooks/user-preferences';
import { useNavigationExpanded } from './use-navigation-preferences';

const USERS_API_URL = '/ghost/api/admin/users/me/';
const USER_UPDATE_API_URL = '/ghost/api/admin/users/:id/';

const navigationPreferences = (expanded: { posts: boolean; members: boolean }) =>
  JSON.stringify({
    navigation: { expanded, menu: { visible: true } },
  });

const navigationTest = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
}>({
  ...serverFixture,
  ...queryClientFixtures,
});

describe('useNavigationExpanded', () => {
  navigationTest('leaves the other groups as the server has them', async ({ server, wrapper }) => {
    let storedAccessibility = navigationPreferences({ posts: true, members: true });
    const writtenAccessibility: string[] = [];

    server.use(
      http.get(USERS_API_URL, () => {
        return HttpResponse.json({
          users: [{ ...mockUser, accessibility: storedAccessibility }],
        });
      }),
      http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(
        USER_UPDATE_API_URL,
        async ({ request }) => {
          const body = await request.json();
          storedAccessibility = body.users[0]?.accessibility ?? '';
          writtenAccessibility.push(storedAccessibility);
          return HttpResponse.json({
            users: [{ ...mockUser, accessibility: storedAccessibility }],
          });
        },
      ),
    );

    const preferences = renderHook(() => useUserPreferences(), { wrapper });
    await waitForQuerySettled(preferences.result);

    const { result } = renderHook(() => useNavigationExpanded('posts'), { wrapper });

    // Another writer collapses a group this client has never read.
    storedAccessibility = navigationPreferences({ posts: true, members: false });

    await act(async () => {
      await result.current[1](false);
    });

    expect(JSON.parse(writtenAccessibility[0])).toMatchObject({
      navigation: { expanded: { posts: false, members: false } },
    });
  });
});
