import { test as baseTest } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TestWrapper } from "@tryghost/admin-x-framework/test/test-utils";

export type TestWrapperComponent = ({ children }: { children: ReactNode }) => JSX.Element;

/**
 * Creates a test QueryClient with sensible defaults for testing
 *
 * Ported from admin-x-framework to reduce external dependencies.
 * Configures QueryClient for optimal test performance:
 * - No retries (tests should pass on first attempt)
 * - No caching (tests should be isolated)
 * - Silenced logging (cleaner test output)
 */
function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                cacheTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
        logger: {
            log: () => {},
            warn: () => {},
            error: () => {},
        },
    });
}

/**
 * Test fixture for QueryClient + React wrapper (PyTest-style fixtures for Vitest).
 *
 * Provides isolated QueryClient instance and TestWrapper for each test.
 * Automatically cleans up QueryClient after each test.
 *
 * Use this fixture for:
 * - Testing hooks without API calls (pure logic)
 * - Testing React components that use react-query
 * - When you DON'T need MSW server
 *
 * Usage:
 *
 * @example
 * import { testWithQueryClient as test } from "@test/fixtures/query-client";
 * import { describe, expect } from "vitest";
 *
 * describe("useMyHook", () => {
 *   test("computes derived state", ({ queryClient, wrapper }) => {
 *     const { result } = renderHook(() => useMyHook(), { wrapper });
 *     expect(result.current.value).toBe(expected);
 *   });
 * });
 *
 * @example
 * // Tests without { queryClient, wrapper } won't initialize them (lazy initialization)
 * test("pure logic test", () => {
 *   expect(1 + 1).toBe(2); // No QueryClient overhead
 * });
 */
/**
 * QueryClient + wrapper fixture definitions.
 * Can be composed with other fixtures using spread syntax.
 */
export const queryClientFixtures = {
    // Test-scoped fixture: create fresh QueryClient for each test
    queryClient: async ({ task }: { task: unknown }, provide: (value: QueryClient) => Promise<void>) => {
        void task;
        const client = createTestQueryClient();
        await provide(client);
        client.clear();
    },

    // Wrapper depends on queryClient fixture
    wrapper: async (
        { queryClient }: { queryClient: QueryClient },
        provide: (value: TestWrapperComponent) => Promise<void>
    ) => {
        const wrapper: TestWrapperComponent = ({ children }) => (
            <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
        );
        await provide(wrapper);
    },
} as const;

export const testWithQueryClient = baseTest.extend<{
    queryClient: QueryClient;
    wrapper: TestWrapperComponent;
}>(queryClientFixtures);
