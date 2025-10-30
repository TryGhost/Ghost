import { test as baseTest, describe, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import {
    useUserPreferencesQuery,
    useUpdateUserPreferences,
} from "./user-preferences";
import { HttpResponse, http } from "msw";
import { mockUser } from "@test-utils/factories";
import { waitForQueryLoaded } from "@test-utils/test-helpers";
import { serverFixture } from "@test-utils/fixtures/msw";
import {
    queryClientFixtures,
    type TestWrapperComponent,
} from "@test-utils/fixtures/query-client";
import type {
    UpdateUserRequestBody,
    UsersResponseType,
    User,
} from "@tryghost/admin-x-framework/api/users";
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
};

// Type definitions
type SetupUserPreferencesTest = (
    userOverrides?: Partial<User>
) => Promise<{ current: ReturnType<typeof useUserPreferencesQuery> }>;

type SetupUpdatePreferencesTest = (initialUser?: Partial<User>) => Promise<{
    query: { current: ReturnType<typeof useUserPreferencesQuery> };
    mutation: { current: ReturnType<typeof useUpdateUserPreferences> };
}>;

const test = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: SetupUserPreferencesTest;
    setupUpdate: SetupUpdatePreferencesTest;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async (
        {
            server,
            wrapper,
        }: { server: SetupServer; wrapper: TestWrapperComponent },
        provide: (setup: SetupUserPreferencesTest) => Promise<void>
    ) => {
        const setupUserPreferencesTest: SetupUserPreferencesTest = async (
            userOverrides = {}
        ) => {
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

            const { result } = renderHook(() => useUserPreferencesQuery(), {
                wrapper,
            });
            await waitForQueryLoaded(result);
            return result;
        };
        await provide(setupUserPreferencesTest);
    },
    setupUpdate: async (
        {
            server,
            wrapper,
        }: { server: SetupServer; wrapper: TestWrapperComponent },
        provide: (setup: SetupUpdatePreferencesTest) => Promise<void>
    ) => {
        const setupUpdateTest: SetupUpdatePreferencesTest = async (
            initialUser = {}
        ) => {
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
                http.put<
                    { id: string },
                    UpdateUserRequestBody,
                    UsersResponseType
                >(USER_UPDATE_API_URL, async ({ request }) => {
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
                })
            );

            const queryResult = renderHook(() => useUserPreferencesQuery(), {
                wrapper,
            });
            await waitFor(() => {
                expect(queryResult.result.current.isSuccess).toBe(true);
            });

            const mutationResult = renderHook(
                () => useUpdateUserPreferences(),
                { wrapper }
            );

            return {
                query: queryResult.result,
                mutation: mutationResult.result,
            };
        };
        await provide(setupUpdateTest);
    },
});

describe("useUserPreferencesQuery", () => {
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
            test(`returns empty object when accessibility is ${scenario}`, async ({
                setup,
            }) => {
                const result = await setup({ accessibility });

                expect(result.current.data).toEqual({});
            });
        });

        test("parses JSON from accessibility field", async ({ setup }) => {
            const result = await setup({
                accessibility: JSON.stringify(fixtures.existingPreferences),
            });

            expect(result.current.data).toEqual(fixtures.existingPreferences);
        });

        [
            {
                scenario: "invalid JSON",
                accessibility: "{invalid json",
            },
            {
                scenario: "invalid schema",
                accessibility: JSON.stringify({
                    whatsNew: {
                        lastSeenDate: "not-a-valid-datetime",
                    },
                }),
            },
        ].forEach(({ scenario, accessibility }) => {
            test(`errors when ${scenario}`, async ({ setup }) => {
                const result = await setup({ accessibility });

                expect(result.current.isError).toBe(true);
                expect(result.current.error).toBeInstanceOf(Error);
            });
        });

        test("returns undefined when user is not loaded", async ({
            server,
            wrapper,
        }) => {
            server.use(
                http.get(USERS_API_URL, () => {
                    return HttpResponse.json({ users: [] });
                })
            );

            const { result } = renderHook(() => useUserPreferencesQuery(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.isFetching).toBe(false);
            });

            expect(result.current.data).toBeUndefined();
        });
    });
});

describe("useUpdateUserPreferences", () => {
    describe("updating preferences", () => {
        test("merges new preferences with existing ones", async ({
            setupUpdate,
        }) => {
            const { query, mutation } = await setupUpdate({
                accessibility: JSON.stringify(fixtures.existingPreferences),
            });

            await act(async () => {
                await mutation.current.mutateAsync(fixtures.newPreferences);
            });

            await waitFor(() => {
                expect(query.current.data).toEqual({
                    existing: "value",
                    shared: "new",
                    additional: "data",
                });
            });
        });

        test("creates new accessibility object when none exists", async ({
            setupUpdate,
        }) => {
            const { query, mutation } = await setupUpdate();

            await act(async () => {
                await mutation.current.mutateAsync(fixtures.singlePreference);
            });

            await waitFor(() => {
                expect(query.current.data).toEqual(fixtures.singlePreference);
            });
        });

        test("throws error when user is not loaded", async ({
            server,
            wrapper,
        }) => {
            server.use(
                http.get(USERS_API_URL, () => {
                    return HttpResponse.json({ users: [] });
                })
            );

            const { result } = renderHook(() => useUpdateUserPreferences(), {
                wrapper,
            });

            await expect(
                act(async () => {
                    await result.current.mutateAsync(fixtures.singlePreference);
                })
            ).rejects.toThrow("User is not loaded");
        });
    });
});
