import { test as baseTest, describe, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { useChangelog, type RawChangelogResponse, ChangelogResponseSchema } from "./use-changelog";
import { waitForQuerySettled } from "@test-utils/test-helpers";
import { createChangelogResponse, createRawChangelogEntry, changelogFixtures } from "@test-utils/factories";
import { serverFixture } from "@test-utils/fixtures/msw";
import { queryClientFixtures, type TestWrapperComponent } from "@test-utils/fixtures/query-client";
import type { SetupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Constants
const CHANGELOG_API_URL = "https://ghost.org/changelog.json";
const DEFAULT_CHANGELOG_RESPONSE = ChangelogResponseSchema.parse({});

// Types
type NetworkOptions = {
    status?: number;
    networkError?: boolean;
};

type SetupChangelogTest = (
    data?: Partial<RawChangelogResponse>,
    networkOptions?: NetworkOptions
) => ReturnType<typeof setupChangelog>;

// Setup function
/**
 * Setup function for testing `useChangelog`.
 *
 * This fixture handles the boilerplate of:
 * 1. Mocking the changelog API endpoint with customizable response data
 * 2. Simulating network errors or HTTP status codes
 * 3. Rendering the hook with the necessary React Query wrapper
 * 4. Waiting for the query to settle (success or error state)
 *
 * This allows tests to focus on asserting behavior rather than setup logic,
 * making test code more ergonomic and readable.
 *
 * @param data - Partial changelog response data to override defaults
 * @param networkOptions - Network simulation options (status code, network error)
 * @returns The renderHook result with the query in a settled state
 */
async function setupChangelog(
    server: SetupServer,
    wrapper: TestWrapperComponent,
    data?: Partial<RawChangelogResponse>,
    networkOptions: NetworkOptions = {}
) {
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
            return HttpResponse.json(createChangelogResponse(data));
        })
    );

    const { result } = renderHook(() => useChangelog(), { wrapper });
    await waitForQuerySettled(result);
    return result;
}

// Test extension
const test = baseTest.extend<{
    server: SetupServer;
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
    setup: SetupChangelogTest;
}>({
    ...serverFixture,
    ...queryClientFixtures,
    setup: async ({ server, wrapper }, provide) => {
        await provide((data, networkOptions) => setupChangelog(server, wrapper, data, networkOptions));
    },
});

describe("useChangelog", () => {
    describe("successful data fetching", () => {
        test("successfully fetches and deserializes changelog entries", async ({ setup }) => {
            const result = await setup({
                posts: [changelogFixtures.raw.featuredEntry, changelogFixtures.raw.regularEntry],
                changelogUrl: "https://custom.ghost.org/changelog",
            });

            expect(result.current.data).toEqual({
                entries: expect.arrayContaining([
                    changelogFixtures.parsed.featuredEntry,
                    changelogFixtures.parsed.regularEntry,
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
                await waitForQuerySettled(result);

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
                expect((result.current.error as Error).message).toBe(expectedMessage);
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
            await waitForQuerySettled(result);

            expect(result.current.isError).toBe(true);
            expect(result.current.error).toBeDefined();
        });

        [
            {
                scenario: "invalid URL in changelogUrl",
                input: createChangelogResponse({
                    posts: [],
                    changelogUrl: "not-a-url",
                }),
            },
            {
                scenario: "invalid date format in published_at",
                input: createChangelogResponse({
                    posts: [
                        createRawChangelogEntry({
                            published_at: "not-a-date",
                        }),
                    ],
                }),
            },
            {
                scenario: "incomplete entry missing required fields",
                input: {
                    posts: [
                        {
                            slug: "test-1",
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
                await waitForQuerySettled(result);

                expect(result.current.isError).toBe(true);
                expect(result.current.error).toBeDefined();
            });
        });
    });
});
