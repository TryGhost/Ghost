import { test as baseTest, describe, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { useWhatsNew, useDismissWhatsNew } from "./use-whats-new";
import { HttpResponse, http } from "msw";
import { mockUser, createRawChangelogEntry } from "@test-utils/factories";
import { waitForQuerySettled } from "@test-utils/test-helpers";
import type { UpdateUserRequestBody, UsersResponseType } from "@tryghost/admin-x-framework/api/users";
import type { RawChangelogResponse, RawChangelogEntry } from "./use-changelog";
import { serverFixture } from "@test-utils/fixtures/msw";
import { queryClientFixtures, type TestWrapperComponent } from "@test-utils/fixtures/query-client";
import type { SetupServer } from "msw/node";
import { DEFAULT_NAVIGATION_PREFERENCES } from "@/hooks/user-preferences";

// Constants
const USERS_API_URL = "/ghost/api/admin/users/me/";
const USER_UPDATE_API_URL = "/ghost/api/admin/users/:id/";
const CHANGELOG_API_URL = "https://ghost.org/changelog.json";

// Types
interface SetupQueryOptions {
    accessibility?: string | null;
    changelog?: Partial<RawChangelogResponse>;
}

interface SetupMutationOptions {
    lastSeenDate?: string;
    posts?: RawChangelogEntry[];
}

type SetupQueryTest = (options?: SetupQueryOptions) => ReturnType<typeof setupQuery>;
type SetupMutationTest = (options?: SetupMutationOptions) => ReturnType<typeof setupMutation>;

// Test fixtures
const dates = {
    past: "2025-01-01T00:00:00.000+00:00",
    recent: "2025-01-10T00:00:00.000+00:00",
    current: "2025-01-15T10:00:00.000+00:00",
    future: "2025-01-20T10:00:00.000+00:00",
};

const fixtures = {
    entries: {
        newEntry: () =>
            createRawChangelogEntry({
                published_at: dates.current,
            }),
        oldEntry: () =>
            createRawChangelogEntry({
                published_at: dates.past,
            }),
        featuredEntry: () =>
            createRawChangelogEntry({
                published_at: dates.current,
                featured: "true",
            }),
    },
    preferences: {
        empty: {},
        withOtherSetting: { otherSetting: "value" },
        withLastSeen: (date: string) => ({
            whatsNew: { lastSeenDate: date },
        }),
        defaults: {
            navigation: DEFAULT_NAVIGATION_PREFERENCES,
        }
    },
};

// Setup functions
/**
 * Setup function for testing `useWhatsNew`.
 *
 * This fixture handles the boilerplate of:
 * 1. Mocking the user API endpoint with customizable accessibility preferences
 * 2. Mocking the user mutation endpoint (for initializing preferences)
 * 3. Mocking the changelog API endpoint with customizable changelog data
 * 4. Rendering the hook with the necessary React Query wrapper
 * 5. Waiting for the query to settle (success or error state)
 *
 * Note: The query is disabled until preferences exist (hasWhatsNewPreferences = true).
 * This means the query naturally stays in loading state during initialization, then
 * enables and settles once the mutation completes. Tests only need to wait once.
 *
 * This allows tests to focus on asserting behavior rather than setup logic,
 * making test code more ergonomic and readable.
 *
 * @param server - MSW server instance for mocking API endpoints
 * @param wrapper - React Query wrapper component for hook testing
 * @param options - Test configuration options (accessibility, changelog data)
 * @returns The renderHook result with the query in a settled state
 */
async function setupQuery(server: SetupServer, wrapper: TestWrapperComponent, options: SetupQueryOptions = {}) {
    const { accessibility = null, changelog = {} } = options;

    server.use(
        // Mock the user preferences endpoint
        http.get(USERS_API_URL, () => {
            return HttpResponse.json({
                users: [
                    {
                        ...mockUser,
                        accessibility: accessibility ?? mockUser.accessibility,
                    },
                ],
            });
        }),
        // Mock the user mutation endpoint (for initializing preferences)
        http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(USER_UPDATE_API_URL, async ({ request }) => {
            const body = await request.json();
            const newAccessibility = body.users[0]?.accessibility;
            return HttpResponse.json({
                users: [
                    {
                        ...mockUser,
                        accessibility: newAccessibility,
                    },
                ],
            });
        }),
        // Mock the changelog endpoint
        http.get(CHANGELOG_API_URL, () => {
            return HttpResponse.json({
                posts: changelog.posts ?? [],
                changelogUrl: changelog.changelogUrl ?? "https://ghost.org/changelog",
            });
        })
    );

    const { result } = renderHook(() => useWhatsNew(), {
        wrapper,
    });

    // Wait for query to settle. The query is disabled until preferences are initialized,
    // so it stays in loading state during the mutation, then enables and settles naturally.
    await waitForQuerySettled(result);

    return result;
}

/**
 * Setup function for testing `useDismissWhatsNew`.
 *
 * This fixture handles the boilerplate of:
 * 1. Mocking the user API endpoint with customizable lastSeenDate
 * 2. Mocking the user mutation endpoint (for updating preferences)
 * 3. Mocking the changelog API endpoint with customizable posts
 * 4. Rendering both the query hook (to read state) and mutation hook (to update state)
 * 5. Waiting for the initial query to settle before tests run
 *
 * This allows mutation tests to immediately call `mutation.mutateAsync()` without worrying
 * about setup, making test code more ergonomic and focused on the mutation behavior.
 *
 * @param server - MSW server instance for mocking API endpoints
 * @param wrapper - React Query wrapper component for hook testing
 * @param options - Test configuration options (lastSeenDate, posts)
 * @returns Both query and mutation hook results, ready for testing mutations
 */
async function setupMutation(server: SetupServer, wrapper: TestWrapperComponent, options: SetupMutationOptions = {}) {
    const { lastSeenDate = dates.past, posts = [fixtures.entries.newEntry()] } = options;

    server.use(
        // Mock the user preferences endpoint
        http.get(USERS_API_URL, () => {
            return HttpResponse.json({
                users: [
                    {
                        ...mockUser,
                        accessibility: JSON.stringify({
                            whatsNew: { lastSeenDate },
                        }),
                    },
                ],
            });
        }),
        // Mock the user mutation endpoint
        http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(USER_UPDATE_API_URL, async ({ request }) => {
            const body = await request.json();
            return HttpResponse.json({
                users: [
                    {
                        ...mockUser,
                        accessibility: body.users[0].accessibility,
                    },
                ],
            });
        }),
        // Mock the changelog endpoint
        http.get(CHANGELOG_API_URL, () => {
            return HttpResponse.json({
                posts,
                changelogUrl: "https://ghost.org/changelog",
            });
        })
    );

    const query = renderHook(() => useWhatsNew(), { wrapper });
    const mutation = renderHook(() => useDismissWhatsNew(), {
        wrapper,
    });

    await waitForQuerySettled(query.result);

    return {
        query: query.result,
        mutation: mutation.result,
    };
}

// Test extensions
const queryTest = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: SetupQueryTest;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async ({ server, wrapper }, provide) => {
        await provide((options) => setupQuery(server, wrapper, options));
    },
});

const mutationTest = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: SetupMutationTest;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async ({ server, wrapper }, provide) => {
        await provide((options) => setupMutation(server, wrapper, options));
    },
});

describe("useWhatsNew", () => {
    describe("hasNew", () => {
        describe("returns true", () => {
            queryTest("when lastSeenDate is before entry", async ({ setup }) => {
                const result = await setup({
                    changelog: {
                        posts: [fixtures.entries.newEntry()],
                    },
                    accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.past)),
                });

                expect(result.current.data?.hasNew).toBe(true);
            });
        });

        describe("returns false", () => {
            [
                {
                    scenario: "when preferences are missing",
                    input: {
                        changelog: { posts: [fixtures.entries.newEntry()] },
                    },
                },
                {
                    scenario: "when whatsNew key is missing",
                    input: {
                        changelog: { posts: [fixtures.entries.newEntry()] },
                        accessibility: JSON.stringify(fixtures.preferences.withOtherSetting),
                    },
                },
                {
                    scenario: "when whatsNew exists but lastSeenDate is missing",
                    input: {
                        changelog: { posts: [fixtures.entries.newEntry()] },
                        accessibility: JSON.stringify({ whatsNew: { foo: "bar" } }),
                    },
                },
                {
                    scenario: "when lastSeenDate is undefined",
                    input: {
                        changelog: { posts: [fixtures.entries.newEntry()] },
                        accessibility: JSON.stringify({ whatsNew: { lastSeenDate: undefined } }),
                    },
                },
                {
                    scenario: "when no entries exist",
                    input: {
                        accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.past)),
                        changelog: { posts: [] },
                    },
                },
                {
                    scenario: "when lastSeenDate is after entry",
                    input: {
                        changelog: {
                            posts: [fixtures.entries.oldEntry()],
                        },
                        accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.current)),
                    },
                },
                {
                    scenario: "when lastSeenDate equals entry",
                    input: {
                        changelog: {
                            posts: [fixtures.entries.newEntry()],
                        },
                        accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.current)),
                    },
                },
                {
                    scenario: "when first entry is old despite newer entries existing",
                    input: {
                        changelog: {
                            posts: [fixtures.entries.oldEntry(), fixtures.entries.newEntry()],
                        },
                        accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.recent)),
                    },
                },
            ].forEach(({ scenario, input }) => {
                queryTest(scenario, async ({ setup }) => {
                    const result = await setup(input);
                    expect(result.current.data?.hasNew).toBe(false);
                });
            });
        });
    });

    describe("hasNewFeatured", () => {
        describe("returns true", () => {
            queryTest("when entry is newer than lastSeenDate and featured", async ({ setup }) => {
                const result = await setup({
                    changelog: {
                        posts: [fixtures.entries.featuredEntry()],
                    },
                    accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.past)),
                });

                expect(result.current.data?.hasNewFeatured).toBe(true);
            });
        });

        describe("returns false", () => {
            [
                {
                    scenario: "when entry is older than lastSeenDate",
                    input: {
                        changelog: {
                            posts: [fixtures.entries.featuredEntry()],
                        },
                        accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.future)),
                    },
                },
                {
                    scenario: "when entry is newer but not featured",
                    input: {
                        changelog: {
                            posts: [fixtures.entries.newEntry()],
                        },
                        accessibility: JSON.stringify(fixtures.preferences.withLastSeen(dates.past)),
                    },
                },
                {
                    scenario: "when no entries exist",
                    input: {
                        changelog: { posts: [] },
                    },
                },
            ].forEach(({ scenario, input }) => {
                queryTest(scenario, async ({ setup }) => {
                    const result = await setup(input);
                    expect(result.current.data?.hasNewFeatured).toBe(false);
                });
            });
        });
    });
});

describe("useDismissWhatsNew", () => {
    mutationTest("changes hasNew from true to false", async ({ setup }) => {
        const { query, mutation } = await setup();

        expect(query.current.data?.hasNew).toBe(true);

        await act(async () => {
            await mutation.current.mutateAsync();
        });

        await waitFor(() => {
            expect(query.current.data?.hasNew).toBe(false);
        });
    });

    mutationTest("works with multiple entries", async ({ setup }) => {
        const { query, mutation } = await setup({
            posts: [
                createRawChangelogEntry({
                    published_at: dates.future,
                }),
                createRawChangelogEntry({
                    published_at: dates.current,
                }),
                createRawChangelogEntry({
                    published_at: dates.recent,
                }),
            ],
        });

        expect(query.current.data?.hasNew).toBe(true);

        await act(async () => {
            await mutation.current.mutateAsync();
        });

        await waitFor(() => {
            expect(query.current.data?.hasNew).toBe(false);
        });
    });

    mutationTest("handles empty entries gracefully", async ({ setup }) => {
        const { query, mutation } = await setup({
            posts: [],
        });

        expect(query.current.data?.hasNew).toBe(false);

        await act(async () => {
            await mutation.current.mutateAsync();
        });

        await waitFor(() => {
            expect(query.current.data?.hasNew).toBe(false);
        });
    });
});
