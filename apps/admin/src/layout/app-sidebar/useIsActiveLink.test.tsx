import { describe, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsActiveLink } from "./useIsActiveLink";
import * as adminXFramework from "@tryghost/admin-x-framework";

// Mock the admin-x-framework module
vi.mock("@tryghost/admin-x-framework", async () => {
    const actual = await vi.importActual("@tryghost/admin-x-framework");
    return {
        ...actual,
        useLocation: vi.fn(),
        useMatch: vi.fn(),
    };
});

describe("useIsActiveLink", () => {
    const mockUseLocation = vi.mocked(adminXFramework.useLocation);
    const mockUseMatch = vi.mocked(adminXFramework.useMatch);

    describe("basic pathname matching", () => {
        test("returns true when pathname matches exactly", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );

            expect(result.current).toBe(true);
        });

        test("returns false when pathname does not match", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/pages",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue(null);

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );

            expect(result.current).toBe(false);
        });

        test("returns false when path is undefined", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: undefined })
            );

            expect(result.current).toBe(false);
        });

        test("returns false when path is empty string", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "" })
            );

            expect(result.current).toBe(false);
        });
    });

    describe("query parameter handling", () => {
        test("returns false when target has no query params but current location has query params", () => {
            // This is the key fix: main "Posts" link should not be active when viewing "Drafts"
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=draft",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );

            expect(result.current).toBe(false);
        });

        test("returns true when query parameters match exactly", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=draft",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(result.current).toBe(true);
        });

        test("returns false when query parameter values differ", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=published",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(result.current).toBe(false);
        });

        test("returns true when target query params are subset of current params", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=draft&sort=created_at",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(result.current).toBe(true);
        });

        test("returns false when target query param is missing in current location", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?sort=created_at",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(result.current).toBe(false);
        });
    });

    describe("activeOnSubpath option", () => {
        test("matches subpaths when activeOnSubpath is true", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/members/some-member",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/members/some-member",
                pathnameBase: "/members",
                pattern: {
                    path: "/members/*",
                    caseSensitive: false,
                    end: false,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "members", activeOnSubpath: true })
            );

            expect(result.current).toBe(true);
        });

        test("does not match subpaths when activeOnSubpath is false", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/members/some-member",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue(null);

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "members", activeOnSubpath: false })
            );

            expect(result.current).toBe(false);
        });

        test("activeOnSubpath does not interfere with query param matching", () => {
            // When activeOnSubpath is true, query params should still be checked
            mockUseLocation.mockReturnValue({
                pathname: "/members",
                search: "?filter=paid",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/members",
                pathnameBase: "/members",
                pattern: {
                    path: "/members/*",
                    caseSensitive: false,
                    end: false,
                },
            });

            const { result } = renderHook(() =>
                useIsActiveLink({ path: "members", activeOnSubpath: true })
            );

            // Should be false because target has no query params but current location does
            expect(result.current).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        test("Posts menu: main link not active when viewing Drafts", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=draft",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );
            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(mainPostsLink.result.current).toBe(false);
            expect(draftsLink.result.current).toBe(true);
        });

        test("Posts menu: main link not active when viewing Scheduled", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=scheduled",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );
            const scheduledLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=scheduled" })
            );

            expect(mainPostsLink.result.current).toBe(false);
            expect(scheduledLink.result.current).toBe(true);
        });

        test("Posts menu: main link not active when viewing Published", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=published",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );
            const publishedLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=published" })
            );

            expect(mainPostsLink.result.current).toBe(false);
            expect(publishedLink.result.current).toBe(true);
        });

        test("Posts menu: main link IS active when viewing all posts (no query params)", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/posts",
                pathnameBase: "/posts",
                pattern: {
                    path: "/posts",
                    caseSensitive: false,
                    end: true,
                },
            });

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts" })
            );
            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(mainPostsLink.result.current).toBe(true);
            expect(draftsLink.result.current).toBe(false);
        });

        test("Members menu: main link active on subpaths with activeOnSubpath", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/members/some-member-id",
                search: "",
                hash: "",
                state: null,
                key: "default",
            });
            mockUseMatch.mockReturnValue({
                params: {},
                pathname: "/members/some-member-id",
                pathnameBase: "/members",
                pattern: {
                    path: "/members/*",
                    caseSensitive: false,
                    end: false,
                },
            });

            const membersLink = renderHook(() =>
                useIsActiveLink({ path: "members", activeOnSubpath: true })
            );

            expect(membersLink.result.current).toBe(true);
        });
    });
});
