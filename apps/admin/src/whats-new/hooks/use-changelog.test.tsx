import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    beforeAll,
    afterAll,
} from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useChangelog } from "./use-changelog";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("useChangelog", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
    });

    afterEach(() => {
        queryClient.clear();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it("fetches and deserializes changelog entries", async () => {
        const mockResponse = {
            posts: [
                {
                    id: "1",
                    title: "New Feature",
                    excerpt: "Description",
                    url: "https://ghost.org/changelog/1",
                    published_at: "2025-01-15T10:00:00Z",
                    featured: true,
                },
                {
                    id: "2",
                    title: "Bug Fix",
                    excerpt: "Fixed issue",
                    url: "https://ghost.org/changelog/2",
                    published_at: "2025-01-10T10:00:00Z",
                    featured: false,
                },
            ],
            changelogUrl: "https://ghost.org/changelog",
        };

        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.json(mockResponse);
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual({
            entries: expect.arrayContaining([
                expect.objectContaining({
                    id: "1",
                    title: "New Feature",
                    excerpt: "Description",
                    url: "https://ghost.org/changelog/1",
                    featured: true,
                }),
                expect.objectContaining({
                    id: "2",
                    title: "Bug Fix",
                    excerpt: "Fixed issue",
                    url: "https://ghost.org/changelog/2",
                    featured: false,
                }),
            ]),
            changelogUrl: "https://ghost.org/changelog",
        });

        expect(result.current.data!.entries[0].publishedAt.toISOString()).toBe(
            "2025-01-15T10:00:00.000Z"
        );
        expect(result.current.data!.entries[1].publishedAt.toISOString()).toBe(
            "2025-01-10T10:00:00.000Z"
        );
    });

    it("returns empty entries when no posts in response", async () => {
        const mockResponse = {
            posts: [],
            changelogUrl: "https://ghost.org/changelog",
        };

        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.json(mockResponse);
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data).toEqual({
            entries: [],
            changelogUrl: "https://ghost.org/changelog",
        });
    });

    it("handles null or undefined posts array", async () => {
        const mockResponse = {
            posts: null,
            changelogUrl: "https://ghost.org/changelog",
        };

        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.json(mockResponse);
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data!.entries).toEqual([]);
    });

    it("handles fetch errors", async () => {
        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeInstanceOf(Error);
        expect((result.current.error as Error).message).toBe(
            "Failed to fetch changelog"
        );
    });

    it("handles network errors", async () => {
        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.error();
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
    });

    it("transforms snake_case to camelCase for entry fields", async () => {
        const mockResponse = {
            posts: [
                {
                    id: "1",
                    title: "Test",
                    excerpt: "Test excerpt",
                    url: "https://example.com",
                    published_at: "2025-01-15T10:00:00Z",
                    featured: true,
                },
            ],
            changelogUrl: "https://ghost.org/changelog",
        };

        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.json(mockResponse);
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const entry = result.current.data!.entries[0];

        // Should have camelCase publishedAt, not snake_case published_at
        expect(entry).toHaveProperty("publishedAt");
        expect(entry).not.toHaveProperty("published_at");
        expect(entry.publishedAt.isValid()).toBe(true);
    });

    it("preserves all entry fields during transformation", async () => {
        const mockResponse = {
            posts: [
                {
                    id: "entry-123",
                    title: "Feature Release",
                    excerpt: "Detailed description",
                    url: "https://ghost.org/changelog/feature",
                    published_at: "2025-01-20T15:30:00Z",
                    featured: false,
                },
            ],
            changelogUrl: "https://ghost.org/changelog",
        };

        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.json(mockResponse);
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        const entry = result.current.data!.entries[0];

        expect(entry.id).toBe("entry-123");
        expect(entry.title).toBe("Feature Release");
        expect(entry.excerpt).toBe("Detailed description");
        expect(entry.url).toBe("https://ghost.org/changelog/feature");
        expect(entry.featured).toBe(false);
        expect(entry.publishedAt.toISOString()).toBe(
            "2025-01-20T15:30:00.000Z"
        );
    });

    it("includes changelogUrl in response", async () => {
        const mockResponse = {
            posts: [],
            changelogUrl: "https://custom.ghost.org/changelog",
        };

        server.use(
            http.get("https://ghost.org/changelog.json", () => {
                return HttpResponse.json(mockResponse);
            })
        );

        const { result } = renderHook(() => useChangelog(), { wrapper });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data!.changelogUrl).toBe(
            "https://custom.ghost.org/changelog"
        );
    });
});
