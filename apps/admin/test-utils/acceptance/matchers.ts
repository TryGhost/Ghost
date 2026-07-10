import { expect } from "vitest";
import { server, type Locator } from "vitest/browser";

// Poll timing follows vitest's configured expect.poll defaults (set in
// vitest.acceptance.config.ts) rather than hard-coding harness-local values.
const POLL_INTERVAL_MS = server.config.expect.poll?.interval ?? 50;
const POLL_TIMEOUT_MS = server.config.expect.poll?.timeout ?? 1000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * `await expect(locator).toHaveCount(n)` — polls until the locator resolves to
 * exactly `n` elements (or, with `.not`, until it doesn't), timing out after
 * the configured expect.poll timeout. The retrying replacement for
 * `expect.poll(() => locator.all().length).toBe(n)`.
 */
expect.extend({
    async toHaveCount(received: Locator, expected: number) {
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        let actual = received.all().length;

        // Poll until the assertion (including .not) would pass or time out.
        while ((actual === expected) === Boolean(this.isNot) && Date.now() < deadline) {
            await sleep(POLL_INTERVAL_MS);
            actual = received.all().length;
        }

        return {
            pass: actual === expected,
            message: () =>
                `expected locator ${received.selector} ${this.isNot ? "not " : ""}to have ${expected} element(s), found ${actual}`,
        };
    },
});

declare module "vitest" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    interface Matchers<T = any> {
        toHaveCount(expected: number): Promise<void>;
    }
}
