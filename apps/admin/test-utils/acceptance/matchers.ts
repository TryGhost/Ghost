import { expect } from "vitest";
import { server, type Locator } from "vitest/browser";

import type { ResourceCapture } from "./resources";

// Poll timing follows the configured expect.poll defaults (vitest.acceptance.config.ts).
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
    if (typeof expected === "string") {
        return actual === expected;
    }
    // A /g or /y RegExp is stateful — .test() advances lastIndex, so repeated
    // polls alternate match/no-match (and break .not). Strip those flags.
    const stateless = expected.global || expected.sticky ? new RegExp(expected.source, expected.flags.replace(/[gy]/g, "")) : expected;
    return stateless.test(actual);
}

/** Polls the capture's `lastRequest` until `field` matches `expected` (`.not`-aware). */
async function pollCapturedRequestField(
    isNot: boolean,
    capture: ResourceCapture,
    field: "filter" | "search",
    expected: string | RegExp
): Promise<{ pass: boolean; message: () => string }> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let actual = capture.lastRequest?.[field];
    let pass = matchesExpected(expected, actual);

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
    /** `await expect(locator).toHaveCount(n)` — polls until the locator resolves to exactly `n` elements (`.not`-aware). */
    async toHaveCount(received: Locator, expected: number) {
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        let actual = received.all().length;

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

    /** `await expect(api).toHaveSentFilter(x)` — polls until the latest request's decoded ?filter matches (string = exact, RegExp = partial). */
    async toHaveSentFilter(received: ResourceCapture, expected: string | RegExp) {
        return await pollCapturedRequestField(Boolean(this.isNot), received, "filter", expected);
    },

    /** `await expect(api).toHaveSentSearch(x)` — polls until the latest request's decoded ?search matches (string = exact, RegExp = partial). */
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
