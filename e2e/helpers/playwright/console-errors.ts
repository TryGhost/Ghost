import {Page, TestInfo, test as base} from '@playwright/test';
import {test as ghostTest} from '@/helpers/playwright/fixture';

/**
 * A runtime error captured while a test drove the admin app: either an uncaught
 * exception (`page.on('pageerror')`) or a `console.error(...)` call.
 */
export interface CapturedRuntimeError {
    type: 'pageerror' | 'console.error';
    text: string;
}

/**
 * Known-benign runtime noise that must NOT fail the console-error gate.
 *
 * Keep this list SMALL, EXPLICIT and COMMENTED. Every entry is a promise that the
 * matched message is understood, harmless, and outside our control to fix from the
 * bundle (third-party deprecation, browser/devtools chatter, etc.). Anything that
 * looks like a real app bug must NOT be added here — fix the bug instead.
 *
 * A message is allowlisted when it contains one of these substrings (case-sensitive)
 * or matches one of these regexes.
 */
export const CONSOLE_ERROR_ALLOWLIST: Array<string | RegExp> = [
    // React 18 → 19 upgrade deprecation emitted by third-party libs that still call
    // the legacy ReactDOM.render / findDOMNode APIs. Noise, not a runtime failure.
    'ReactDOM.render is no longer supported',
    'findDOMNode is deprecated',

    // Chromium surfaces failed network requests (favicons, offline changelog fetches,
    // avatar/gravatar services) as console errors. These are network conditions, not
    // bundle/runtime bugs, and are already policed by the egress allowlist.
    /Failed to load resource: the server responded with a status of \d+/,
    /net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CONNECTION_REFUSED|ABORTED|FAILED)/,

    // Ember Data / admin deprecation warnings routed through console.error in dev
    // builds. They are guidance for future refactors, not runtime failures.
    /DEPRECATION:/
];

function isAllowlisted(text: string): boolean {
    return CONSOLE_ERROR_ALLOWLIST.some((matcher) => {
        if (typeof matcher === 'string') {
            return text.includes(matcher);
        }
        return matcher.test(text);
    });
}

/**
 * Attach `pageerror` / `console.error` listeners to a page and collect every
 * non-allowlisted message into `errors`. Returns a detach function.
 *
 * Exposed separately from the fixture so a test can watch a second page it opens
 * itself (e.g. an isolated public-site page) with the same allowlist.
 */
export function collectRuntimeErrors(page: Page, errors: CapturedRuntimeError[]): () => void {
    const onPageError = (error: Error) => {
        const text = error.stack || error.message || String(error);
        if (!isAllowlisted(text)) {
            errors.push({type: 'pageerror', text});
        }
    };

    const onConsole = (message: {type(): string; text(): string}) => {
        if (message.type() !== 'error') {
            return;
        }
        const text = message.text();
        if (!isAllowlisted(text)) {
            errors.push({type: 'console.error', text});
        }
    };

    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    return () => {
        page.off('pageerror', onPageError);
        page.off('console', onConsole);
    };
}

/**
 * Render captured errors into a readable failure message so a red gate points at
 * exactly what threw, not just "N errors".
 */
export function formatCapturedErrors(errors: CapturedRuntimeError[], testInfo: TestInfo): string {
    const lines = errors.map((error, index) => `  ${index + 1}. [${error.type}] ${error.text}`);
    return (
        `Captured ${errors.length} non-allowlisted runtime error(s) during "${testInfo.title}":\n` +
        `${lines.join('\n')}\n\n` +
        'If a message is known-benign third-party noise, add it to CONSOLE_ERROR_ALLOWLIST ' +
        'in helpers/playwright/console-errors.ts with a comment explaining why. ' +
        'Otherwise this is a real runtime failure the build + unit tests did not catch — fix it.'
    );
}

interface ConsoleErrorFixtures {
    /**
     * Errors captured on the authenticated admin page for the current test. Assert
     * `expect(runtimeErrors).toHaveLength(0)` at the end of a smoke test; the fixture
     * teardown does NOT auto-fail so the assertion stays visible in the test body.
     */
    runtimeErrors: CapturedRuntimeError[];
}

/**
 * The Ghost admin fixture, extended with a `runtimeErrors` collector wired to the
 * authenticated `page`. Listeners attach before the test body runs so navigation
 * performed inside the test is fully covered.
 */
export const test = ghostTest.extend<ConsoleErrorFixtures>({
    runtimeErrors: async ({page}, use) => {
        const errors: CapturedRuntimeError[] = [];
        const detach = collectRuntimeErrors(page, errors);

        await use(errors);

        detach();
    }
});

export const expect = base.expect;
