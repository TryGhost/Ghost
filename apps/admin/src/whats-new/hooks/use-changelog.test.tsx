import { test as baseTest, describe, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { useChangelog, type RawChangelogResponse, ChangelogResponseSchema } from './use-changelog';
import { waitForQuerySettled } from '@test-utils/test-helpers';
import { changelogEntry } from '@tryghost/test-data';
import { serverFixture } from '@test-utils/fixtures/msw';
import { queryClientFixtures, type TestWrapperComponent } from '@test-utils/fixtures/query-client';
import type { SetupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Constants
const CHANGELOG_API_URL = 'https://ghost.org/changelog.json';
const DEFAULT_CHANGELOG_RESPONSE = ChangelogResponseSchema.parse({});

// Test fixtures
const changelogResponse = (
  overrides: Partial<RawChangelogResponse> = {},
): RawChangelogResponse => ({
  posts: [],
  changelogUrl: 'https://ghost.org/changelog',
  ...overrides,
});

// Raw feed entries paired with the parsed shape the hook derives from them
// (camelCase keys, real Date, boolean `featured`).
const rawEntries = {
  featured: changelogEntry({
    slug: 'new-feature-2025',
    title: 'New Feature',
    custom_excerpt: 'Description',
    url: 'https://ghost.org/changelog/new-feature-2025',
    published_at: '2025-01-15T10:00:00.000+00:00',
    featured: 'true',
    feature_image: 'https://ghost.org/images/new-feature.png',
    html: '<p>Exciting new feature details</p>',
  }),
  regular: changelogEntry({
    slug: 'bug-fix-update',
    title: 'Bug Fix',
    custom_excerpt: 'Fixed issue',
    url: 'https://ghost.org/changelog/bug-fix-update',
    published_at: '2025-01-10T10:00:00.000+00:00',
    featured: 'false',
    feature_image: 'https://ghost.org/images/bug-fix.png',
    html: '<p>Bug fix details</p>',
  }),
};

const parsedEntries = {
  featured: {
    slug: 'new-feature-2025',
    title: 'New Feature',
    customExcerpt: 'Description',
    url: 'https://ghost.org/changelog/new-feature-2025',
    publishedAt: new Date('2025-01-15T10:00:00.000+00:00'),
    featured: true,
    featureImage: 'https://ghost.org/images/new-feature.png',
    html: '<p>Exciting new feature details</p>',
  },
  regular: {
    slug: 'bug-fix-update',
    title: 'Bug Fix',
    customExcerpt: 'Fixed issue',
    url: 'https://ghost.org/changelog/bug-fix-update',
    publishedAt: new Date('2025-01-10T10:00:00.000+00:00'),
    featured: false,
    featureImage: 'https://ghost.org/images/bug-fix.png',
    html: '<p>Bug fix details</p>',
  },
};

// Types
type NetworkOptions = {
  status?: number;
  networkError?: boolean;
};

type SetupChangelogTest = (
  data?: Partial<RawChangelogResponse>,
  networkOptions?: NetworkOptions,
) => ReturnType<typeof setupChangelog>;

// Setup function
/**
 * Setup function for testing `useChangelog`.
 *
 * This fixture handles the boilerplate of:
 * 1. Mocking the changelog API endpoint with customizable response data
 * 2. Simulating network errors or HTTP status codes
 * 3. Rendering the hook with the necessary React Query wrapper
 * 4. Waiting for the query to settle (success or error state)
 *
 * This allows tests to focus on asserting behavior rather than setup logic,
 * making test code more ergonomic and readable.
 *
 * @param data - Partial changelog response data to override defaults
 * @param networkOptions - Network simulation options (status code, network error)
 * @returns The renderHook result with the query in a settled state
 */
async function setupChangelog(
  server: SetupServer,
  wrapper: TestWrapperComponent,
  data?: Partial<RawChangelogResponse>,
  networkOptions: NetworkOptions = {},
) {
  const { status = 200, networkError = false } = networkOptions;

  // Mock the changelog endpoint
  server.use(
    http.get(CHANGELOG_API_URL, () => {
      if (networkError) {
        return HttpResponse.error();
      }
      if (status !== 200) {
        return new HttpResponse(null, { status });
      }
      return HttpResponse.json(changelogResponse(data));
    }),
  );

  const { result } = renderHook(() => useChangelog(), { wrapper });
  await waitForQuerySettled(result);
  return result;
}

// Test extension
const test = baseTest.extend<{
  server: SetupServer;
  queryClient: QueryClient;
  wrapper: TestWrapperComponent;
  setup: SetupChangelogTest;
}>({
  ...serverFixture,
  ...queryClientFixtures,
  setup: async ({ server, wrapper }, provide) => {
    await provide((data, networkOptions) => setupChangelog(server, wrapper, data, networkOptions));
  },
});

describe('useChangelog', () => {
  describe('successful data fetching', () => {
    test('successfully fetches and deserializes changelog entries', async ({ setup }) => {
      const result = await setup({
        posts: [rawEntries.featured, rawEntries.regular],
        changelogUrl: 'https://custom.ghost.org/changelog',
      });

      expect(result.current.data).toEqual({
        entries: expect.arrayContaining([parsedEntries.featured, parsedEntries.regular]) as unknown,
        changelogUrl: 'https://custom.ghost.org/changelog',
      });
    });
  });

  describe('valid JSON with missing or empty fields', () => {
    [
      {
        scenario: 'missing posts field',
        input: { changelogUrl: 'https://ghost.org/changelog' },
        expected: {
          entries: [],
          changelogUrl: 'https://ghost.org/changelog',
        },
      },
      {
        scenario: 'empty posts array',
        input: {
          posts: [],
          changelogUrl: 'https://ghost.org/changelog',
        },
        expected: {
          entries: [],
          changelogUrl: 'https://ghost.org/changelog',
        },
      },
      {
        scenario: 'missing changelogUrl',
        input: { posts: [] },
        expected: DEFAULT_CHANGELOG_RESPONSE,
      },
    ].forEach(({ scenario, input, expected }) => {
      test(`defaults when ${scenario}`, async ({ server, wrapper }) => {
        server.use(
          http.get(CHANGELOG_API_URL, () => {
            return HttpResponse.json(input);
          }),
        );

        const { result } = renderHook(() => useChangelog(), {
          wrapper,
        });
        await waitForQuerySettled(result);

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(expected);
      });
    });
  });

  describe('nullable fields', () => {
    test('accepts null for custom_excerpt, feature_image, and html', async ({
      server,
      wrapper,
    }) => {
      server.use(
        http.get(CHANGELOG_API_URL, () => {
          return HttpResponse.json({
            posts: [
              {
                slug: 'post-without-excerpt',
                title: 'Post Without Excerpt',
                custom_excerpt: null,
                feature_image: null,
                html: null,
                url: 'https://ghost.org/changelog/post-without-excerpt',
                published_at: '2026-04-29T10:00:00.000+00:00',
                featured: 'true',
              },
            ],
            changelogUrl: 'https://ghost.org/changelog',
          });
        }),
      );

      const { result } = renderHook(() => useChangelog(), { wrapper });
      await waitForQuerySettled(result);

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data?.entries[0]).toMatchObject({
        slug: 'post-without-excerpt',
        customExcerpt: null,
        featureImage: null,
        html: null,
      });
    });
  });

  describe('network errors', () => {
    [
      {
        scenario: 'HTTP 500 error',
        networkOptions: { status: 500 },
        expectedMessage: 'Failed to fetch changelog: 500',
      },
      {
        scenario: 'HTTP 404 error',
        networkOptions: { status: 404 },
        expectedMessage: 'Failed to fetch changelog: 404',
      },
      {
        scenario: 'network failure',
        networkOptions: { networkError: true },
        expectedMessage: 'Failed to fetch',
      },
    ].forEach(({ scenario, networkOptions, expectedMessage }) => {
      test(`errors when ${scenario}`, async ({ setup }) => {
        const result = await setup(undefined, networkOptions);

        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeInstanceOf(Error);
        expect((result.current.error as Error).message).toBe(expectedMessage);
      });
    });
  });

  describe('validation errors', () => {
    test('errors when non-JSON response', async ({ server, wrapper }) => {
      server.use(
        http.get(CHANGELOG_API_URL, () => {
          return new Response('Not JSON', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
      );

      const { result } = renderHook(() => useChangelog(), { wrapper });
      await waitForQuerySettled(result);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });

    [
      {
        scenario: 'invalid URL in changelogUrl',
        input: changelogResponse({
          posts: [],
          changelogUrl: 'not-a-url',
        }),
      },
      {
        scenario: 'invalid date format in published_at',
        input: changelogResponse({
          posts: [
            changelogEntry({
              published_at: 'not-a-date',
            }),
          ],
        }),
      },
      {
        scenario: 'incomplete entry missing required fields',
        input: {
          posts: [
            {
              slug: 'test-1',
              title: 'Test',
            },
          ],
          changelogUrl: 'https://ghost.org/changelog',
        },
      },
    ].forEach(({ scenario, input }) => {
      test(`errors when ${scenario}`, async ({ server, wrapper }) => {
        server.use(
          http.get(CHANGELOG_API_URL, () => {
            return HttpResponse.json(input);
          }),
        );

        const { result } = renderHook(() => useChangelog(), {
          wrapper,
        });
        await waitForQuerySettled(result);

        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
      });
    });
  });
});
