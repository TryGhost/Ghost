import { expect } from "vitest";
import { server, type Locator } from "vitest/browser";

import type { EditSettingsCapture, ResourceCapture } from "./resources";

type EditedSettings = NonNullable<EditSettingsCapture["lastRequest"]>["settings"];

function editedSettingsEqual(actual: EditedSettings | undefined, expected: EditedSettings): boolean {
    return actual?.length === expected.length && expected.every(expectedSetting => (
        actual.some(setting => setting.key === expectedSetting.key && setting.value === expectedSetting.value)
    ));
}

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

/** Polls until the settings mutation capture receives the exact edited settings payload. */
async function pollEditedSettings(
    isNot: boolean,
    capture: EditSettingsCapture,
    expected: EditedSettings
): Promise<{ pass: boolean; message: () => string }> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let actual = capture.lastRequest?.settings;
    let pass = editedSettingsEqual(actual, expected);

    while (pass === isNot && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        actual = capture.lastRequest?.settings;
        pass = editedSettingsEqual(actual, expected);
    }

    const seen = actual === undefined ? "no settings edit captured yet" : `the last edit was ${JSON.stringify(actual)}`;

    return {
        pass,
        message: () =>
            `expected the capture ${isNot ? "not " : ""}to have edited settings ${JSON.stringify(expected)}, but ${seen}`,
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

    /** `await expect(api).toHaveEditedSettings(settings)` — polls until the latest PUT /settings/ payload matches exactly. */
    async toHaveEditedSettings(received: EditSettingsCapture, expected: EditedSettings) {
        return await pollEditedSettings(Boolean(this.isNot), received, expected);
    },
});

declare module "vitest" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    interface Matchers<T = any> {
        toHaveCount(expected: number): Promise<void>;
        toHaveSentFilter(expected: string | RegExp): Promise<void>;
        toHaveSentSearch(expected: string | RegExp): Promise<void>;
        toHaveEditedSettings(expected: EditedSettings): Promise<void>;
    }
}
