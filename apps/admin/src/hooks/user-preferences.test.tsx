import { test as baseTest, describe, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { useUserPreferences, useEditUserPreferences, DEFAULT_NAVIGATION_PREFERENCES } from "./user-preferences";
import { HttpResponse, http } from "msw";
import { mockUser } from "@test-utils/factories";
import { waitForQuerySettled } from "@test-utils/test-helpers";
import { serverFixture } from "@test-utils/fixtures/msw";
import { queryClientFixtures, type TestWrapperComponent } from "@test-utils/fixtures/query-client";
import type { UpdateUserRequestBody, UsersResponseType, User } from "@tryghost/admin-x-framework/api/users";
import type { SetupServer } from "msw/node";

// Constants
const USERS_API_URL = "/ghost/api/admin/users/me/";
const USER_UPDATE_API_URL = "/ghost/api/admin/users/:id/";

// Test fixtures
const fixtures = {
    emptyPreferences: {},
    existingPreferences: {
        existing: "value",
        shared: "old",
    },
    newPreferences: {
        shared: "new",
        additional: "data",
    },
    singlePreference: {
        setting: "value",
    },
    defaults: {
        navigation: DEFAULT_NAVIGATION_PREFERENCES,
    }
};

// Setup functions
/**
 * Setup function for testing `useUserPreferences`.
 *
 * This fixture handles the boilerplate of:
 * 1. Mocking the user API response with customizable user data
 * 2. Rendering the hook with the necessary React Query wrapper
 * 3. Waiting for the query to settle (success or error state)
 *
 * This allows tests to focus on asserting behavior rather than setup logic,
 * making test code more ergonomic and readable.
 *
 * @param userOverrides - Partial user data to override the default mock user
 * @returns The renderHook result with the query in a settled state
 */
async function setupQuery(
    server: SetupServer,
    wrapper: TestWrapperComponent,
    userOverrides: Partial<User> = {}
) {
    // Mock the user API endpoint with customizable user data
    server.use(
        http.get(USERS_API_URL, () => {
            return HttpResponse.json({
                users: [
                    {
                        ...mockUser,
                        ...userOverrides,
                    },
                ],
            });
        })
    );

    // Render the hook and wait for it to finish loading
    const { result } = renderHook(() => useUserPreferences(), {
        wrapper,
    });
    await waitForQuerySettled(result);
    return result;
}

/**
 * Setup function for testing `useEditUserPreferences`.
 *
 * This fixture handles the boilerplate of:
 * 1. Mocking both the user GET endpoint (for initial state) and PUT endpoint (for edits)
 * 2. Rendering both the query hook (to read preferences) and mutation hook (to edit them)
 * 3. Waiting for the initial query to settle before tests run
 *
 * This allows edit tests to immediately call `mutation.mutateAsync()` without worrying
 * about setup, making test code more ergonomic and focused on the edit behavior.
 *
 * @param initialUser - Partial user data for the initial state (before mutation)
 * @returns Both query and mutation hook results, ready for testing edits
 */
async function setupEdit(
    server: SetupServer,
    wrapper: TestWrapperComponent,
    initialUser: Partial<User> = {}
) {
    // Mock both the GET endpoint (for reading preferences) and PUT endpoint (for edits)
    server.use(
        http.get(USERS_API_URL, () => {
            return HttpResponse.json({
                users: [
                    {
                        ...mockUser,
                        ...initialUser,
                    },
                ],
            });
        }),
        http.put<{ id: string }, UpdateUserRequestBody, UsersResponseType>(
            USER_UPDATE_API_URL,
            async ({ request }) => {
                const body = await request.json();
                const accessibility = body.users[0]?.accessibility ?? "";
                return HttpResponse.json({
                    users: [
                        {
                            ...mockUser,
                            accessibility,
                        },
                    ],
                });
            }
        )
    );

    // Render the query hook and wait for initial data to load
    const queryResult = renderHook(() => useUserPreferences(), {
        wrapper,
    });
    await waitForQuerySettled(queryResult.result);

    // Render the mutation hook (ready to call mutateAsync in tests)
    const mutationResult = renderHook(() => useEditUserPreferences(), { wrapper });

    return {
        query: queryResult.result,
        mutation: mutationResult.result,
    };
}

// Test extensions
const queryTest = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: (userOverrides?: Partial<User>) => ReturnType<typeof setupQuery>;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async ({ server, wrapper }, provide) => {
        await provide((userOverrides) => setupQuery(server, wrapper, userOverrides));
    },
});

const editTest = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: (initialUser?: Partial<User>) => ReturnType<typeof setupEdit>;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async ({ server, wrapper }, provide) => {
        await provide((initialUser) => setupEdit(server, wrapper, initialUser));
    },
});

describe("useUserPreferences", () => {
    describe("initialization", () => {
        [
            {
                scenario: "null",
                accessibility: null,
            },
            {
                scenario: "undefined",
                accessibility: undefined,
            },
            {
                scenario: "empty string",
                accessibility: "",
            },
        ].forEach(({ scenario, accessibility }) => {
            queryTest(`returns object with defaults when accessibility is ${scenario}`, async ({ setup }) => {
                const result = await setup({ accessibility });

                expect(result.current.data).toEqual(fixtures.defaults);
            });
        });

        queryTest("parses JSON from accessibility field", async ({ setup }) => {
            const result = await setup({
                accessibility: JSON.stringify(fixtures.existingPreferences),
            });

            expect(result.current.data).toEqual({
                ...fixtures.defaults,
                ...fixtures.existingPreferences,
            });
        });

        queryTest("errors when invalid JSON", async ({ setup }) => {
            const result = await setup({ accessibility: "{invalid json" });

            expect(result.current.isError).toBe(true);
            expect(result.current.error).toBeInstanceOf(Error);
        });

        queryTest("gracefully handles invalid schema values", async ({ setup }) => {
            const result = await setup({
                accessibility: JSON.stringify({
                    whatsNew: {
                        lastSeenDate: "not-a-valid-datetime",
                    },
                }),
            });

            // Should not error - catches and returns undefined for invalid fields
            expect(result.current.isError).toBe(false);
            expect(result.current.data).toEqual({
                ...fixtures.defaults,
                whatsNew: {
                    lastSeenDate: undefined,
                },
            });
        });

        queryTest("returns undefined when user is not loaded", async ({ server, wrapper }) => {
            server.use(
                http.get(USERS_API_URL, () => {
                    return HttpResponse.json({ users: [] });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.isFetching).toBe(false);
            });

            expect(result.current.data).toBeUndefined();
        });
    });

    describe("query options", () => {
        queryTest("supports select option to transform data", async ({ server, wrapper }) => {
            server.use(
                http.get(USERS_API_URL, () => {
                    return HttpResponse.json({
                        users: [{
                            ...mockUser,
                            accessibility: JSON.stringify({
                                navigation: {
                                    expanded: { posts: false },
                                    menu: { visible: true },
                                },
                                nightShift: true,
                            }),
                        }],
                    });
                })
            );

            const { result } = renderHook(() => useUserPreferences({
                select: (data) => data.navigation,
            }), { wrapper });

            await waitForQuerySettled(result);

            expect(result.current.data).toEqual({
                expanded: { posts: false },
                menu: { visible: true },
            });
        });
    });
});

describe("useEditUserPreferences", () => {
    describe("editing preferences", () => {
        editTest("merges new preferences with existing ones", async ({ setup }) => {
            const { query, mutation } = await setup({
                accessibility: JSON.stringify(fixtures.existingPreferences),
            });

            await act(async () => {
                await mutation.current.mutateAsync(fixtures.newPreferences);
            });

            await waitFor(() => {
                expect(query.current.data).toEqual({
                    ...fixtures.defaults,
                    existing: "value",
                    shared: "new",
                    additional: "data",
                });
            });
        });

        editTest("creates new accessibility object when none exists", async ({ setup }) => {
            const { query, mutation } = await setup();

            await act(async () => {
                await mutation.current.mutateAsync(fixtures.singlePreference);
            });

            await waitFor(() => {
                expect(query.current.data).toEqual({
                    ...fixtures.defaults,
                    ...fixtures.singlePreference,
                });
            });
        });

        editTest("throws error when user is not loaded", async ({ server, wrapper }) => {
            server.use(
                http.get(USERS_API_URL, () => {
                    return HttpResponse.json({ users: [] });
                })
            );

            const { result } = renderHook(() => useEditUserPreferences(), {
                wrapper,
            });

            await expect(
                act(async () => {
                    await result.current.mutateAsync(fixtures.singlePreference);
                })
            ).rejects.toThrow("User is not loaded");
        });
    });

    describe("deep merge behavior", () => {
        editTest("deep merges nested objects while preserving sibling properties", async ({ setup }) => {
            const { query, mutation } = await setup({
                accessibility: JSON.stringify({
                    navigation: {
                        expanded: { posts: false },
                        menu: { visible: true },
                    },
                    nightShift: true,
                }),
            });

            await act(async () => {
                await mutation.current.mutateAsync({
                    navigation: { expanded: { posts: true } },
                });
            });

            await waitFor(() => {
                expect(query.current.data).toEqual({
                    navigation: {
                        expanded: { posts: true },
                        menu: { visible: true }, // Preserved
                    },
                    nightShift: true, // Preserved
                });
            });
        });
    });
});
