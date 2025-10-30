import { test as baseTest, describe, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import {
    useChangelog,
    type RawChangelogResponse,
    ChangelogResponseSchema,
} from "./use-changelog";
import { waitForQueryLoaded } from "@test-utils/test-helpers";
import {
    createChangelogResponse,
    changelogFixtures,
} from "@test-utils/factories";
import { serverFixture } from "@test-utils/fixtures/msw";
import {
    queryClientFixtures,
    type TestWrapperComponent,
} from "@test-utils/fixtures/query-client";
import type { SetupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const CHANGELOG_API_URL = "https://ghost.org/changelog.json";
const DEFAULT_CHANGELOG_RESPONSE = ChangelogResponseSchema.parse({});

type NetworkOptions = {
    status?: number;
    networkError?: boolean;
};

type SetupChangelogTest = (
    data?: Partial<RawChangelogResponse>,
    networkOptions?: NetworkOptions
) => Promise<{ current: ReturnType<typeof useChangelog> }>;

const test = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: SetupChangelogTest;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async (
        {
            server,
            wrapper,
        }: { server: SetupServer; wrapper: TestWrapperComponent },
        provide: (setup: SetupChangelogTest) => Promise<void>
    ) => {
        const setupChangelogTest: SetupChangelogTest = async (
            data,
            networkOptions = {}
        ) => {
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
                    const mockResponse =
                        data?.posts !== undefined
                            ? createChangelogResponse(data)
                            : null;
                    return HttpResponse.json(mockResponse);
                })
            );

            const { result } = renderHook(() => useChangelog(), { wrapper });
            await waitForQueryLoaded(result);
            return result;
        };
        await provide(setupChangelogTest);
    },
});

describe("useChangelog", () => {
    describe("successful data fetching", () => {
        test("successfully fetches and deserializes changelog entries", async ({
            setup,
        }) => {
            const result = await setup({
                posts: [
                    changelogFixtures.newFeaturedEntry,
                    changelogFixtures.bugFixEntry,
                ],
                changelogUrl: "https://custom.ghost.org/changelog",
            });

            expect(result.current.data).toEqual({
                entries: expect.arrayContaining([
                    expect.objectContaining({
                        id: "1",
                        title: "New Feature",
                        excerpt: "Description",
                        url: "https://ghost.org/changelog/1",
                        publishedAt: new Date("2025-01-15T10:00:00.000Z"),
                        featured: true,
                    }),
                    expect.objectContaining({
                        id: "2",
                        title: "Bug Fix",
                        excerpt: "Fixed issue",
                        url: "https://ghost.org/changelog/2",
                        publishedAt: new Date("2025-01-10T10:00:00.000Z"),
                        featured: false,
                    }),
                ]) as unknown,
                changelogUrl: "https://custom.ghost.org/changelog",
            });
        });
    });

    describe("valid JSON with missing or empty fields", () => {
        [
            {
                scenario: "missing posts field",
                input: { changelogUrl: "https://ghost.org/changelog" },
                expected: {
                    entries: [],
                    changelogUrl: "https://ghost.org/changelog",
                },
            },
            {
                scenario: "empty posts array",
                input: {
                    posts: [],
                    changelogUrl: "https://ghost.org/changelog",
                },
                expected: {
                    entries: [],
                    changelogUrl: "https://ghost.org/changelog",
                },
            },
            {
                scenario: "missing changelogUrl",
                input: { posts: [] },
                expected: DEFAULT_CHANGELOG_RESPONSE,
            },
        ].forEach(({ scenario, input, expected }) => {
            test(`defaults when ${scenario}`, async ({ server, wrapper }) => {
                server.use(
                    http.get(CHANGELOG_API_URL, () => {
                        return HttpResponse.json(input);
                    })
                );

                const { result } = renderHook(() => useChangelog(), {
                    wrapper,
                });
                await waitForQueryLoaded(result);

                expect(result.current.isSuccess).toBe(true);
                expect(result.current.data).toEqual(expected);
            });
        });
    });

    describe("network errors", () => {
        [
            {
                scenario: "HTTP 500 error",
                networkOptions: { status: 500 },
                expectedMessage: "Failed to fetch changelog: 500",
            },
            {
                scenario: "HTTP 404 error",
                networkOptions: { status: 404 },
                expectedMessage: "Failed to fetch changelog: 404",
            },
            {
                scenario: "network failure",
                networkOptions: { networkError: true },
                expectedMessage: "Failed to fetch",
            },
        ].forEach(({ scenario, networkOptions, expectedMessage }) => {
            test(`errors when ${scenario}`, async ({ setup }) => {
                const result = await setup(undefined, networkOptions);

                expect(result.current.isError).toBe(true);
                expect(result.current.error).toBeInstanceOf(Error);
                expect((result.current.error as Error).message).toBe(
                    expectedMessage
                );
            });
        });
    });

    describe("validation errors", () => {
        test("errors when non-JSON response", async ({ server, wrapper }) => {
            server.use(
                http.get(CHANGELOG_API_URL, () => {
                    return new Response("Not JSON", {
                        status: 200,
                        headers: { "Content-Type": "text/plain" },
                    });
                })
            );

            const { result } = renderHook(() => useChangelog(), { wrapper });
            await waitForQueryLoaded(result);

            expect(result.current.isError).toBe(true);
            expect(result.current.error).toBeDefined();
        });

        [
            {
                scenario: "invalid URL in changelogUrl",
                input: {
                    posts: [],
                    changelogUrl: "not-a-url",
                },
            },
            {
                scenario: "invalid date format in published_at",
                input: {
                    posts: [
                        {
                            id: "1",
                            title: "Test",
                            excerpt: "Test excerpt",
                            url: "https://ghost.org/test",
                            published_at: "not-a-date",
                            featured: false,
                        },
                    ],
                    changelogUrl: "https://ghost.org/changelog",
                },
            },
            {
                scenario: "incomplete entry missing required fields",
                input: {
                    posts: [
                        {
                            id: "1",
                            title: "Test",
                        },
                    ],
                    changelogUrl: "https://ghost.org/changelog",
                },
            },
        ].forEach(({ scenario, input }) => {
            test(`errors when ${scenario}`, async ({ server, wrapper }) => {
                server.use(
                    http.get(CHANGELOG_API_URL, () => {
                        return HttpResponse.json(input);
                    })
                );

                const { result } = renderHook(() => useChangelog(), {
                    wrapper,
                });
                await waitForQueryLoaded(result);

                expect(result.current.isError).toBe(true);
                expect(result.current.error).toBeDefined();
            });
        });
    });
});
