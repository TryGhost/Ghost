import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    beforeAll,
    afterAll,
} from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import moment from "moment-timezone";
import { useWhatsNew } from "./use-whats-new";
import type { ChangelogEntry } from "./use-changelog";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
    TestWrapper,
    createTestQueryClient,
} from "@tryghost/admin-x-framework/test/test-utils";
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useWhatsNew", () => {
    let queryClient: QueryClient;

    const mockUser = {
        id: "user-123",
        name: "Test User",
        slug: "test-user",
        email: "test@example.com",
        profile_image: null,
        cover_image: null,
        bio: null,
        website: null,
        location: null,
        facebook: null,
        twitter: null,
        threads: null,
        bluesky: null,
        mastodon: null,
        tiktok: null,
        youtube: null,
        instagram: null,
        linkedin: null,
        accessibility: null,
        status: "active",
        meta_title: null,
        meta_description: null,
        tour: null,
        last_seen: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
        comment_notifications: true,
        free_member_signup_notification: true,
        paid_subscription_canceled_notification: true,
        paid_subscription_started_notification: true,
        mention_notifications: true,
        recommendation_notifications: true,
        milestone_notifications: true,
        donation_notifications: true,
        roles: [
            {
                id: "1",
                name: "Administrator",
                description: "Administrators",
                created_at: "2024-01-01T00:00:00.000Z",
                updated_at: "2024-01-01T00:00:00.000Z",
            },
        ],
        url: "http://localhost:2368/author/test-user/",
    };

    beforeEach(() => {
        queryClient = createTestQueryClient();
    });

    afterEach(() => {
        queryClient.clear();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const createMockEntry = (
        publishedAt: string,
        featured = false
    ): ChangelogEntry => ({
        id: "1",
        title: "Test Entry",
        excerpt: "Description",
        url: "https://example.com",
        publishedAt: moment(publishedAt),
        featured,
    });

    describe("initialization with default settings", () => {
        it("initializes settings when preferences are empty", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [mockUser] });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
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

            const entries = [createMockEntry("2025-01-15T10:00:00Z")];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.settings.lastSeenDate.isValid()).toBe(
                    true
                );
            });
        });

        it("initializes settings when whatsNew key is missing", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    otherSetting: "value",
                                }),
                            },
                        ],
                    });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
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

            const entries = [createMockEntry("2025-01-15T10:00:00Z")];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.settings.lastSeenDate.isValid()).toBe(
                    true
                );
            });
        });

        it("uses existing settings when already initialized", async () => {
            const existingDate = "2025-01-01T00:00:00.000Z";

            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: { lastSeenDate: existingDate },
                                }),
                            },
                        ],
                    });
                })
            );

            const entries = [createMockEntry("2025-01-15T10:00:00Z")];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.settings.lastSeenDate.toISOString()).toBe(
                    existingDate
                );
            });
        });
    });

    describe("hasNew computation", () => {
        it("returns false when no entries exist", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [mockUser] });
                })
            );

            const { result } = renderHook(() => useWhatsNew([]), { wrapper });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(false);
            });
        });

        it.each([
            [
                "newer than lastSeenDate",
                "2025-01-01T00:00:00Z",
                "2025-01-15T10:00:00Z",
                true,
            ],
            [
                "older than lastSeenDate",
                "2025-01-15T00:00:00Z",
                "2025-01-01T10:00:00Z",
                false,
            ],
            [
                "equal to lastSeenDate",
                "2025-01-15T10:00:00Z",
                "2025-01-15T10:00:00Z",
                false,
            ],
        ])(
            "returns correct value when entry is %s",
            async (_label, lastSeenDate, publishedAt, expected) => {
                server.use(
                    http.get("/ghost/api/admin/users/me/", () => {
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

                const entries = [createMockEntry(publishedAt)];
                const { result } = renderHook(() => useWhatsNew(entries), {
                    wrapper,
                });

                await waitFor(() => {
                    expect(result.current.hasNew).toBe(expected);
                });
            }
        );

        it("only checks the first (latest) entry", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: {
                                        lastSeenDate: "2025-01-10T00:00:00Z",
                                    },
                                }),
                            },
                        ],
                    });
                })
            );

            const entries = [
                createMockEntry("2025-01-01T00:00:00Z"),
                createMockEntry("2025-01-15T00:00:00Z"),
            ];

            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(false);
            });
        });
    });

    describe("hasNewFeatured computation", () => {
        it("returns false when hasNew is false", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: {
                                        lastSeenDate: "2025-01-20T00:00:00Z",
                                    },
                                }),
                            },
                        ],
                    });
                })
            );

            const entries = [createMockEntry("2025-01-15T10:00:00Z", true)];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.hasNewFeatured).toBe(false);
            });
        });

        it("returns false when hasNew is true but entry is not featured", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: {
                                        lastSeenDate: "2025-01-01T00:00:00Z",
                                    },
                                }),
                            },
                        ],
                    });
                })
            );

            const entries = [createMockEntry("2025-01-15T10:00:00Z", false)];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.hasNewFeatured).toBe(false);
            });
        });

        it("returns true when hasNew is true and entry is featured", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: {
                                        lastSeenDate: "2025-01-01T00:00:00Z",
                                    },
                                }),
                            },
                        ],
                    });
                })
            );

            const entries = [createMockEntry("2025-01-15T10:00:00Z", true)];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.hasNewFeatured).toBe(true);
            });
        });

        it("returns false when entries array is empty", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [mockUser] });
                })
            );

            const { result } = renderHook(() => useWhatsNew([]), { wrapper });

            await waitFor(() => {
                expect(result.current.hasNewFeatured).toBe(false);
            });
        });
    });

    describe("markAsSeen", () => {
        it("marks entries as seen and hasNew becomes false", async () => {
            let accessibilityValue = JSON.stringify({
                whatsNew: { lastSeenDate: "2025-01-01T00:00:00Z" },
            });

            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: accessibilityValue,
                            },
                        ],
                    });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
                    const body = await request.json();
                    accessibilityValue = body.users[0].accessibility;
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: accessibilityValue,
                            },
                        ],
                    });
                })
            );

            const entries = [createMockEntry("2025-01-15T10:00:00Z")];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(true);
            });

            await act(async () => {
                await result.current.markAsSeen();
            });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(false);
            });
        });

        it("marks the latest entry when multiple entries exist", async () => {
            let accessibilityValue = JSON.stringify({
                whatsNew: { lastSeenDate: "2025-01-01T00:00:00Z" },
            });

            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: accessibilityValue,
                            },
                        ],
                    });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
                    const body = await request.json();
                    accessibilityValue = body.users[0].accessibility;
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: accessibilityValue,
                            },
                        ],
                    });
                })
            );

            const entries = [
                createMockEntry("2025-01-20T10:00:00Z"),
                createMockEntry("2025-01-15T10:00:00Z"),
                createMockEntry("2025-01-10T10:00:00Z"),
            ];

            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(true);
            });

            await act(async () => {
                await result.current.markAsSeen();
            });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(false);
            });
        });

        it("does nothing when no entries exist", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: {
                                        lastSeenDate: "2025-01-01T00:00:00Z",
                                    },
                                }),
                            },
                        ],
                    });
                })
            );

            const { result } = renderHook(() => useWhatsNew([]), { wrapper });

            await waitFor(() => {
                expect(result.current.hasNew).toBe(false);
            });

            // Should not throw
            await act(async () => {
                await result.current.markAsSeen();
            });

            expect(result.current.hasNew).toBe(false);
        });
    });

    describe("settings exposure", () => {
        it("exposes current lastSeenDate setting", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify({
                                    whatsNew: {
                                        lastSeenDate: "2025-01-15T10:30:00Z",
                                    },
                                }),
                            },
                        ],
                    });
                })
            );

            const entries = [createMockEntry("2025-01-01T00:00:00Z")];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.settings.lastSeenDate.isValid()).toBe(
                    true
                );
                expect(result.current.settings.lastSeenDate.toISOString()).toBe(
                    "2025-01-15T10:30:00.000Z"
                );
            });
        });

        it("exposes default settings when preferences are empty", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [mockUser] });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
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

            const entries = [createMockEntry("2025-01-01T00:00:00Z")];
            const { result } = renderHook(() => useWhatsNew(entries), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.settings.lastSeenDate.isValid()).toBe(
                    true
                );
            });
        });
    });
});
