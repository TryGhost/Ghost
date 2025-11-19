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
        test("returns true for parent link as fallback when current location has query params", () => {
            // Parent link serves as fallback when query params don't match any submenu item
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

            expect(result.current).toBe(true);
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

        test("returns false when current has extra params (not exact match)", () => {
            // Changed: Now requires EXACT match, not subset
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=draft&tag=news",
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

        test("returns true when all params match regardless of order", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?tag=news&type=draft",
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
                useIsActiveLink({ path: "posts?type=draft&tag=news" })
            );

            expect(result.current).toBe(true);
        });

        test("returns false when target has extra param not in current", () => {
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
                useIsActiveLink({ path: "posts?type=draft&tag=news" })
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

        test("activeOnSubpath still matches when query params present (parent fallback)", () => {
            // Parent link with activeOnSubpath serves as fallback even with query params
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

            // Parent link is active as fallback
            expect(result.current).toBe(true);
        });
    });

    describe("real-world scenarios", () => {
        test("Posts menu: only Drafts link active when viewing Drafts (parent NOT active)", () => {
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

            const childPaths = [
                'posts?type=draft',
                'posts?type=scheduled',
                'posts?type=published'
            ];

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts", childPaths })
            );
            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(mainPostsLink.result.current).toBe(false); // Parent NOT active when child matches
            expect(draftsLink.result.current).toBe(true); // Submenu item matches exactly
        });

        test("Posts menu: only Drafts link active (not custom view with more params)", () => {
            // Custom view with draft+tag should NOT match the simple draft view
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

            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );
            const customViewLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft&tag=news" })
            );

            expect(draftsLink.result.current).toBe(true);
            expect(customViewLink.result.current).toBe(false); // Exact match required
        });

        test("Posts menu: only custom view active when all params present", () => {
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?type=draft&tag=news",
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

            const childPaths = [
                'posts?type=draft',
                'posts?type=scheduled',
                'posts?type=published',
                'posts?type=draft&tag=news' // Custom view
            ];

            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );
            const customViewLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft&tag=news" })
            );
            const mainLink = renderHook(() =>
                useIsActiveLink({ path: "posts", childPaths })
            );

            expect(draftsLink.result.current).toBe(false); // Not exact match
            expect(customViewLink.result.current).toBe(true); // Exact match
            expect(mainLink.result.current).toBe(false); // Parent NOT active when child matches
        });

        test("Posts menu: main link active as fallback when params don't match any submenu", () => {
            // If user adds a filter that doesn't match any submenu item, parent should be active
            mockUseLocation.mockReturnValue({
                pathname: "/posts",
                search: "?author=john&status=sent",
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

            const childPaths = [
                'posts?type=draft',
                'posts?type=scheduled',
                'posts?type=published'
            ];

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts", childPaths })
            );
            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(mainPostsLink.result.current).toBe(true); // Active as fallback (no child matches)
            expect(draftsLink.result.current).toBe(false); // Doesn't match
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

            const childPaths = [
                'posts?type=draft',
                'posts?type=scheduled',
                'posts?type=published'
            ];

            const mainPostsLink = renderHook(() =>
                useIsActiveLink({ path: "posts", childPaths })
            );
            const draftsLink = renderHook(() =>
                useIsActiveLink({ path: "posts?type=draft" })
            );

            expect(mainPostsLink.result.current).toBe(true); // Active when no query params
            expect(draftsLink.result.current).toBe(false); // No match without query params
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
