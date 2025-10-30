import { test as baseTest, describe, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWhatsNewQuery, useMarkWhatsNewAsSeen } from "./use-whats-new";
import { HttpResponse, http } from "msw";
import { mockUser, createRawChangelogEntry } from "@test-utils/factories";
import { waitForQueryLoaded } from "@test-utils/test-helpers";
import type {
    UpdateUserRequestBody,
    UsersResponseType,
} from "@tryghost/admin-x-framework/api/users";
import type { RawChangelogResponse, RawChangelogEntry } from "./use-changelog";
import { serverFixture } from "@test-utils/fixtures/msw";
import { queryClientFixtures } from "@test-utils/fixtures/query-client";
import type { SetupServer } from "msw/node";
import type { ReactNode } from "react";

const USERS_API_URL = "/ghost/api/admin/users/me/";
const USER_UPDATE_API_URL = "/ghost/api/admin/users/:id/";
const CHANGELOG_API_URL = "https://ghost.org/changelog.json";

interface SetupWhatsNewOptions {
    accessibility?: string | null;
    changelog?: Partial<RawChangelogResponse>;
}

interface SetupMutationOptions {
    lastSeenDate?: string;
    posts?: RawChangelogEntry[];
}

const test = baseTest.extend({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async (
        {
            server,
            wrapper,
        }: {
            server: SetupServer;
            wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
        },
        provide: (
            setup: (
                options?: SetupWhatsNewOptions
            ) => Promise<{ current: ReturnType<typeof useWhatsNewQuery> }>
        ) => Promise<void>
    ) => {
        const setupWhatsNewTest = async (
            options: SetupWhatsNewOptions = {}
        ) => {
            const { accessibility = null, changelog = {} } = options;

            // Setup user preferences endpoint
            server.use(
                http.get(USERS_API_URL, () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility:
                                    accessibility ?? mockUser.accessibility,
                            },
                        ],
                    });
                })
            );

            // Setup user mutation endpoint (for initializing preferences)
            server.use(
                http.put<
                    { id: string },
                    UpdateUserRequestBody,
                    UsersResponseType
                >(USER_UPDATE_API_URL, async ({ request }) => {
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
                })
            );

            // Setup changelog endpoint
            server.use(
                http.get(CHANGELOG_API_URL, () => {
                    return HttpResponse.json({
                        posts: changelog.posts ?? [],
                        changelogUrl:
                            changelog.changelogUrl ??
                            "https://ghost.org/changelog",
                    });
                })
            );

            const { result } = renderHook(() => useWhatsNewQuery(), {
                wrapper,
            });
            await waitForQueryLoaded(result);

            return result;
        };
        await provide(setupWhatsNewTest);
    },
    setupMutation: async (
        {
            server,
            wrapper,
        }: {
            server: SetupServer;
            wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
        },
        provide: (
            setup: (options?: SetupMutationOptions) => Promise<{
                query: { current: ReturnType<typeof useWhatsNewQuery> };
                mutation: { current: ReturnType<typeof useMarkWhatsNewAsSeen> };
            }>
        ) => Promise<void>
    ) => {
        const setupMutationTest = async (
            options: SetupMutationOptions = {}
        ) => {
            const {
                lastSeenDate = "2025-01-01T00:00:00Z",
                posts = [
                    createRawChangelogEntry({
                        published_at: "2025-01-15T10:00:00Z",
                    }),
                ],
            } = options;

            // Setup user preferences endpoint
            server.use(
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
                })
            );

            // Setup user mutation endpoint
            server.use(
                http.put<
                    { id: string },
                    UpdateUserRequestBody,
                    UsersResponseType
                >(USER_UPDATE_API_URL, async ({ request }) => {
                    const body = await request.json();
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: body.users[0].accessibility,
                            },
                        ],
                    });
                })
            );

            // Setup changelog endpoint
            server.use(
                http.get(CHANGELOG_API_URL, () => {
                    return HttpResponse.json({
                        posts,
                        changelogUrl: "https://ghost.org/changelog",
                    });
                })
            );

            const query = renderHook(() => useWhatsNewQuery(), { wrapper });
            const mutation = renderHook(() => useMarkWhatsNewAsSeen(), {
                wrapper,
            });

            await waitFor(() => {
                expect(query.result.current.isSuccess).toBe(true);
            });

            return {
                query: query.result,
                mutation: mutation.result,
            };
        };
        await provide(setupMutationTest);
    },
});

describe("useWhatsNewQuery", () => {
    const fixtures = {
        dates: {
            past: "2025-01-01T00:00:00Z",
            recent: "2025-01-10T00:00:00Z",
            current: "2025-01-15T10:00:00Z",
            future: "2025-01-20T10:00:00Z",
        },
        entries: {
            newEntry: () =>
                createRawChangelogEntry({
                    published_at: "2025-01-15T10:00:00Z",
                }),
            oldEntry: () =>
                createRawChangelogEntry({
                    published_at: "2025-01-01T10:00:00Z",
                }),
            featuredEntry: () =>
                createRawChangelogEntry({
                    published_at: "2025-01-15T10:00:00Z",
                    featured: true,
                }),
        },
        preferences: {
            empty: {},
            withOtherSetting: { otherSetting: "value" },
            withLastSeen: (date: string) => ({
                whatsNew: { lastSeenDate: date },
            }),
        },
    };

    describe("hasNew", () => {
        describe("returns true", () => {
            test("when lastSeenDate is before entry", async ({ setup }) => {
                const result = await setup({
                    changelog: {
                        posts: [
                            createRawChangelogEntry({
                                published_at: "2025-01-15T10:00:00Z",
                            }),
                        ],
                    },
                    accessibility: JSON.stringify(
                        fixtures.preferences.withLastSeen(
                            "2025-01-01T00:00:00Z"
                        )
                    ),
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
                        accessibility: JSON.stringify(
                            fixtures.preferences.withOtherSetting
                        ),
                    },
                },
                {
                    scenario: "when no entries exist",
                    input: {
                        accessibility: JSON.stringify(
                            fixtures.preferences.withLastSeen(
                                fixtures.dates.past
                            )
                        ),
                        changelog: { posts: [] },
                    },
                },
                {
                    scenario: "when lastSeenDate is after entry",
                    input: {
                        changelog: {
                            posts: [
                                createRawChangelogEntry({
                                    published_at: "2025-01-01T10:00:00Z",
                                }),
                            ],
                        },
                        accessibility: JSON.stringify(
                            fixtures.preferences.withLastSeen(
                                "2025-01-15T00:00:00Z"
                            )
                        ),
                    },
                },
                {
                    scenario: "when lastSeenDate equals entry",
                    input: {
                        changelog: {
                            posts: [
                                createRawChangelogEntry({
                                    published_at: "2025-01-15T10:00:00Z",
                                }),
                            ],
                        },
                        accessibility: JSON.stringify(
                            fixtures.preferences.withLastSeen(
                                "2025-01-15T10:00:00Z"
                            )
                        ),
                    },
                },
                {
                    scenario:
                        "when first entry is old despite newer entries existing",
                    input: {
                        changelog: {
                            posts: [
                                createRawChangelogEntry({
                                    published_at: "2025-01-01T00:00:00Z",
                                }),
                                createRawChangelogEntry({
                                    published_at: "2025-01-15T00:00:00Z",
                                }),
                            ],
                        },
                        accessibility: JSON.stringify(
                            fixtures.preferences.withLastSeen(
                                "2025-01-10T00:00:00Z"
                            )
                        ),
                    },
                },
            ].forEach(({ scenario, input }) => {
                test(scenario, async ({ setup }) => {
                    const result = await setup(input);
                    expect(result.current.data?.hasNew).toBe(false);
                });
            });
        });
    });

    describe("hasNewFeatured", () => {
        describe("returns true", () => {
            test("when entry is newer than lastSeenDate and featured", async ({
                setup,
            }) => {
                const result = await setup({
                    changelog: {
                        posts: [
                            createRawChangelogEntry({
                                published_at: "2025-01-15T10:00:00Z",
                                featured: true,
                            }),
                        ],
                    },
                    accessibility: JSON.stringify(
                        fixtures.preferences.withLastSeen(
                            "2025-01-01T00:00:00Z"
                        )
                    ),
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
                            posts: [
                                createRawChangelogEntry({
                                    published_at: "2025-01-15T10:00:00Z",
                                    featured: true,
                                }),
                            ],
                        },
                        accessibility: JSON.stringify(
                            fixtures.preferences.withLastSeen(
                                "2025-01-20T00:00:00Z"
                            )
                        ),
                    },
                },
                {
                    scenario: "when entry is newer but not featured",
                    input: {
                        changelog: {
                            posts: [
                                createRawChangelogEntry({
                                    published_at: "2025-01-15T10:00:00Z",
                                    featured: false,
                                }),
                            ],
                        },
                        accessibility: JSON.stringify(
                            fixtures.preferences.withLastSeen(
                                "2025-01-01T00:00:00Z"
                            )
                        ),
                    },
                },
                {
                    scenario: "when no entries exist",
                    input: {
                        changelog: { posts: [] },
                    },
                },
            ].forEach(({ scenario, input }) => {
                test(scenario, async ({ setup }) => {
                    const result = await setup(input);
                    expect(result.current.data?.hasNewFeatured).toBe(false);
                });
            });
        });
    });

    describe("useMarkWhatsNewAsSeen", () => {
        test("changes hasNew from true to false", async ({ setupMutation }) => {
            const { query, mutation } = await setupMutation();

            expect(query.current.data?.hasNew).toBe(true);

            await act(async () => {
                await mutation.current.mutateAsync();
            });

            await waitFor(() => {
                expect(query.current.data?.hasNew).toBe(false);
            });
        });

        test("works with multiple entries", async ({ setupMutation }) => {
            const { query, mutation } = await setupMutation({
                posts: [
                    createRawChangelogEntry({
                        published_at: "2025-01-20T10:00:00Z",
                    }),
                    createRawChangelogEntry({
                        published_at: "2025-01-15T10:00:00Z",
                    }),
                    createRawChangelogEntry({
                        published_at: "2025-01-10T10:00:00Z",
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

        test("handles empty entries gracefully", async ({ setupMutation }) => {
            const { query, mutation } = await setupMutation({
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
});
