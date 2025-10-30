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
import { useUserPreferences } from "./use-user-preferences";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
    TestWrapper,
    createTestQueryClient,
} from "@tryghost/admin-x-framework/test/test-utils";
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useUserPreferences", () => {
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

    describe("initialization", () => {
        it("returns empty object when accessibility is null", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [mockUser] });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toEqual({});
            });
        });

        it("parses JSON from accessibility field", async () => {
            const preferences = { setting1: "value1", setting2: 123 };

            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify(preferences),
                            },
                        ],
                    });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toEqual(preferences);
            });
        });

        it("returns empty object for invalid JSON", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: "{invalid json",
                            },
                        ],
                    });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toEqual({});
            });
        });

        it("returns undefined when user is not loaded", () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [] });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            expect(result.current.data).toBeUndefined();
        });
    });

    describe("updatePreferences", () => {
        it("merges new preferences with existing ones", async () => {
            const existingPrefs = { existing: "value", shared: "old" };
            let lastPutBody: any = null;

            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility: JSON.stringify(existingPrefs),
                            },
                        ],
                    });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
                    lastPutBody = await request.json();
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility:
                                    lastPutBody.users[0].accessibility,
                            },
                        ],
                    });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toEqual(existingPrefs);
                expect(result.current.isSuccess).toBe(true);
            });

            const newPrefs = { shared: "new", additional: "data" };
            await act(async () => {
                await result.current.updatePreferences(newPrefs);
            });

            await waitFor(() => {
                expect(lastPutBody).not.toBeNull();
            });

            const sentAccessibility = JSON.parse(
                lastPutBody.users[0].accessibility
            );
            expect(sentAccessibility).toEqual({
                existing: "value",
                shared: "new",
                additional: "data",
            });
        });

        it("creates new accessibility object when none exists", async () => {
            let lastPutBody: any = null;

            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [mockUser] });
                }),
                http.put("/ghost/api/admin/users/:id/", async ({ request }) => {
                    lastPutBody = await request.json();
                    return HttpResponse.json({
                        users: [
                            {
                                ...mockUser,
                                accessibility:
                                    lastPutBody.users[0].accessibility,
                            },
                        ],
                    });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toEqual({});
                expect(result.current.isSuccess).toBe(true);
            });

            const newPrefs = { setting: "value" };
            await act(async () => {
                await result.current.updatePreferences(newPrefs);
            });

            await waitFor(() => {
                expect(lastPutBody).not.toBeNull();
            });

            const sentAccessibility = JSON.parse(
                lastPutBody.users[0].accessibility
            );
            expect(sentAccessibility).toEqual({ setting: "value" });
        });

        it("reflects updated preferences immediately after mutation", async () => {
            let accessibilityValue: string | null = null;

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

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toEqual({});
                expect(result.current.isSuccess).toBe(true);
            });

            await act(async () => {
                await result.current.updatePreferences({ setting: "value" });
            });

            expect(JSON.parse(accessibilityValue)).toEqual({
                setting: "value",
            });
        });

        it("throws error when user is not loaded", async () => {
            server.use(
                http.get("/ghost/api/admin/users/me/", () => {
                    return HttpResponse.json({ users: [] });
                })
            );

            const { result } = renderHook(() => useUserPreferences(), {
                wrapper,
            });

            await waitFor(() => {
                expect(result.current.data).toBeUndefined();
            });

            await expect(
                act(async () => {
                    await result.current.updatePreferences({
                        setting: "value",
                    });
                })
            ).rejects.toThrow("User is not loaded");
        });
    });
});
