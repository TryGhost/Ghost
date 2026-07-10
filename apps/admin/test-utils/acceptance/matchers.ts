import { expect } from "vitest";
import { server, type Locator } from "vitest/browser";

import type { ResourceCapture } from "./resources";

// Poll timing follows vitest's configured expect.poll defaults (set in
// vitest.acceptance.config.ts) rather than hard-coding harness-local values.
const POLL_INTERVAL_MS = server.config.expect.poll?.interval ?? 50;
const POLL_TIMEOUT_MS = server.config.expect.poll?.timeout ?? 1000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function matchesExpected(expected: string | RegExp, actual: string | undefined): boolean {
    if (actual === undefined) {
        return false;
    }
    return typeof expected === "string" ? actual === expected : expected.test(actual);
}

/**
 * Shared engine for the request-assertion matchers: polls the capture's
 * `lastRequest` until the named query field matches `expected` — exact
 * equality for a string, `.test()` for a RegExp — or, with `.not`, until it
 * doesn't, timing out after the configured expect.poll timeout.
 */
async function pollCapturedRequestField(
    isNot: boolean,
    capture: ResourceCapture,
    field: "filter" | "search",
    expected: string | RegExp
): Promise<{ pass: boolean; message: () => string }> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let actual = capture.lastRequest?.[field];
    let pass = matchesExpected(expected, actual);

    // Poll until the assertion (including .not) would pass or time out.
    while (pass === isNot && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        actual = capture.lastRequest?.[field];
        pass = matchesExpected(expected, actual);
    }

    const seen =
        capture.lastRequest === undefined
            ? "no request captured yet"
            : `the last request's ${field} was ${actual === undefined ? "undefined" : JSON.stringify(actual)}`;

    return {
        pass,
        message: () =>
            `expected the capture ${isNot ? "not " : ""}to have sent ${field} ${
                typeof expected === "string" ? JSON.stringify(expected) : String(expected)
            }, but ${seen}`,
    };
}

expect.extend({
    /**
     * `await expect(locator).toHaveCount(n)` — polls until the locator resolves to
     * exactly `n` elements (or, with `.not`, until it doesn't), timing out after
     * the configured expect.poll timeout. The retrying replacement for
     * `expect.poll(() => locator.all().length).toBe(n)`.
     */
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

    /**
     * `await expect(api).toHaveSentFilter(expected)` — polls the resource
     * capture until the latest request's decoded `?filter` matches. The
     * retrying, self-describing replacement for
     * `expect.poll(() => api.lastRequest?.filter)`.
     */
    async toHaveSentFilter(received: ResourceCapture, expected: string | RegExp) {
        return await pollCapturedRequestField(Boolean(this.isNot), received, "filter", expected);
    },

    /**
     * `await expect(api).toHaveSentSearch(expected)` — polls the resource
     * capture until the latest request's decoded `?search` matches. The
     * retrying, self-describing replacement for
     * `expect.poll(() => api.lastRequest?.search)`.
     */
    async toHaveSentSearch(received: ResourceCapture, expected: string | RegExp) {
        return await pollCapturedRequestField(Boolean(this.isNot), received, "search", expected);
    },
});

declare module "vitest" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    interface Matchers<T = any> {
        toHaveCount(expected: number): Promise<void>;
        toHaveSentFilter(expected: string | RegExp): Promise<void>;
        toHaveSentSearch(expected: string | RegExp): Promise<void>;
    }
}
