import { setupServer } from "msw/node";

/**
 * Extended test fixture with MSW server (PyTest-style fixtures for Vitest).
 *
 * Creates a fresh MSW server for each test, ensuring complete isolation.
 * The server is automatically started before the test and closed after.
 *
 * Usage:
 *
 * @example
 * // Compose the fixture into your test via vitest's test.extend
 * import { serverFixture } from "@test-utils/fixtures/msw";
 * import { http, HttpResponse } from "msw";
 * const test = baseTest.extend({ ...serverFixture });
 *
 * describe("useChangelog", () => {
 *   // Server auto-initializes when you destructure { server }
 *   test("fetches data", ({ server }) => {
 *     server.use(
 *       http.get("/api/endpoint", () => HttpResponse.json(mockData))
 *     );
 *   });
 *
 *   test("handles errors", ({ server }) => {
 *     server.use(
 *       http.get("/api/endpoint", () => new HttpResponse(null, { status: 500 }))
 *     );
 *   });
 * });
 *
 * @example
 * // Tests without { server } won't initialize MSW (lazy initialization)
 * test("pure logic test", () => {
 *   expect(1 + 1).toBe(2); // No MSW overhead
 * });
 */
/**
 * MSW server fixture definition.
 * Can be composed with other fixtures using spread syntax.
 */
export const serverFixture = {
    server: async ({ task }: { task: unknown }, provide: (value: ReturnType<typeof setupServer>) => Promise<void>) => {
        void task;
        const server = setupServer();
        server.listen({ onUnhandledRequest: "warn" });
        await provide(server);
        server.close();
    },
} as const;
