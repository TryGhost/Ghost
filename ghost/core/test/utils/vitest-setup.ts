// Vitest setup for the unit suite. Bootstraps the test environment and
// bridges the snapshot hook contract from @tryghost/express-test onto
// vitest's globals so it's exercised end-to-end.

import chalk from 'chalk';
import {beforeAll, beforeEach, afterEach, afterAll} from 'vitest';
import {isConsoleAllowed, resetConsoleAllowed} from './console-guard';

// Register tsx's CommonJS hook so test files (and the Ghost server code they
// pull in) can require() .ts sources. Scoping it here — rather than a global
// NODE_OPTIONS='--import tsx' — keeps the loader out of the sibling app
// projects under the unified `pnpm test:watch`, where it breaks their module
// resolution. Must run before any Ghost source is required below.
require('tsx/cjs');

process.env.NODE_ENV = process.env.NODE_ENV || 'testing';
process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'TEST_STRIPE_WEBHOOK_SECRET';

// Load Ghost's runtime overrides (nconf wiring, etc.). Ghost's testing
// config (core/shared/config/env/config.testing.json) supplies url and
// port 2369 by default, which matches the canonical port committed in
// snapshots — no per-worker session overrides needed.
require('../../core/server/overrides');

// @tryghost/express-test's snapshot bridge is pulled in lazily — requiring it
// is ~170ms per worker and only the hooks below ever read it. The mock-manager
// just below uses the same shape.
type SnapshotExports = {
    snapshotManager?: {
        setCurrentTest: (_info: {testPath?: string; testTitle: string}) => void;
    };
    mochaHooks?: {
        beforeAll?: () => Promise<void>;
        afterEach?: () => Promise<void>;
        afterAll?: () => Promise<void>;
    };
};
let snapshotExports: SnapshotExports | undefined;
const getSnapshotExports = (): SnapshotExports => {
    if (!snapshotExports) {
        snapshotExports = require('@tryghost/express-test').snapshot;
    }
    return snapshotExports!;
};

// e2e-framework-mock-manager is pulled in lazily — it boots a fair
// amount of Ghost-side machinery, which unit tests in the spike subtree
// don't need. Only require it when a hook actually runs.
let mockManager: {disableNetwork: () => void} | undefined;
const getMockManager = () => {
    if (!mockManager) {
        mockManager = require('./e2e-framework-mock-manager');
    }
    return mockManager!;
};

// Console-output guard for the unit suite. The unit tier was cleaned to zero
// un-captured console.error/console.warn output; this locks that in by failing
// any passing test that emits one. Capture the real implementations at module
// load (before any test or Ghost source can swap them) so afterEach can always
// restore to the genuine console — never to a wrapper that would leak across
// files under the shared module registry.
/* eslint-disable no-console -- the guard owns console.error/warn by design */
const realConsoleError = console.error;
const realConsoleWarn = console.warn;
/* eslint-enable no-console */
let recordedConsoleError: unknown[][] = [];
let recordedConsoleWarn: unknown[][] = [];

// Bridge @tryghost/express-test's mochaHooks contract onto vitest's
// globals. The hooks are plain async functions so they translate
// directly.
beforeAll(async () => {
    const {mochaHooks} = getSnapshotExports();
    if (mochaHooks?.beforeAll) {
        await mochaHooks.beforeAll();
    }
    getMockManager().disableNetwork();
});

// Bridge jest-snapshot's per-test config. The mocha hook reads
// `this.currentTest`; vitest has no mocha `this`, so we derive the same
// testPath/testTitle from the vitest task. testTitle must exactly match
// mocha's `fullTitle()` (describe names + test name joined by spaces) or
// committed .snap keys won't resolve.
beforeEach((context: {task: {name: string; suite?: unknown; file?: {filepath?: string}}}) => {
    // Install recording shims over console.error/console.warn. They keep
    // passing runs quiet AND track calls. A test that installs its own
    // spy/stub (sinon.stub / vi.spyOn) shadows these, so its calls aren't
    // recorded here — that's the automatic exemption. Reset the per-test
    // allow flag and the recorded-call arrays first.
    resetConsoleAllowed();
    recordedConsoleError = [];
    recordedConsoleWarn = [];
    /* eslint-disable no-console -- the guard deliberately owns console.error/warn */
    console.error = (...args: unknown[]) => {
        recordedConsoleError.push(args);
    };
    console.warn = (...args: unknown[]) => {
        recordedConsoleWarn.push(args);
    };
    /* eslint-enable no-console */

    const {snapshotManager} = getSnapshotExports();
    if (!snapshotManager) {
        return;
    }
    const titleParts: string[] = [];
    let node: {name?: string; suite?: unknown; filepath?: string} | undefined = context.task;
    // Walk task -> describe(s); stop at the file node (it has `filepath`).
    while (node && !node.filepath) {
        if (node.name) {
            titleParts.unshift(node.name);
        }
        node = node.suite as typeof node;
    }
    snapshotManager.setCurrentTest({
        testPath: context.task.file?.filepath,
        testTitle: titleParts.join(' ')
    });
});

afterEach(async () => {
    const domainEvents = require('@tryghost/domain-events');
    const mentionsJobsService = require('../../core/server/services/mentions-jobs');
    const jobsService = require('../../core/server/services/jobs');

    const timeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error(chalk.yellow(
            '\n[SLOW TEST] It takes longer than 2s to wait for all jobs ' +
            'and events to settle in the afterEach hook\n'
        ));
    }, 2000);

    await domainEvents.allSettled();
    await mentionsJobsService.allSettled();
    await jobsService.allSettled();
    await domainEvents.allSettled();

    clearTimeout(timeout);

    try {
        const {mochaHooks} = getSnapshotExports();
        if (mochaHooks?.afterEach) {
            await mochaHooks.afterEach();
        }
    } finally {
        // Individual test afterEach hooks often call sinon.restore() which
        // strips the DNS stubs set in beforeAll; reapply so subsequent
        // tests don't hit real DNS on nocked domains.
        getMockManager().disableNetwork();
    }
});

// Console-output guard check. Registered after the job-settling afterEach so
// vitest runs it FIRST (afterEach is LIFO) — restoring the real console before
// any later hook (e.g. the slow-test warning above) writes to it. A test's own
// sinon.restore / vi.restoreAllMocks runs in its inner afterEach, which is
// earlier still, so its spy is already gone and never leaks across files.
afterEach(() => {
    /* eslint-disable no-console -- restore the real console captured at module load */
    console.error = realConsoleError;
    console.warn = realConsoleWarn;
    /* eslint-enable no-console */

    if (isConsoleAllowed()) {
        return;
    }

    const errorCount = recordedConsoleError.length;
    const warnCount = recordedConsoleWarn.length;
    if (errorCount === 0 && warnCount === 0) {
        return;
    }

    const first = recordedConsoleError[0] ?? recordedConsoleWarn[0];
    const firstMessage = first.map(arg => (typeof arg === 'string' ? arg : String(arg))).join(' ');
    throw new Error(
        `Unexpected console output in a passing test: ${errorCount} console.error, ` +
        `${warnCount} console.warn call(s).\nFirst message: ${firstMessage}\n` +
        'An unexpected console.error/warn fired in a passing test. Capture it ' +
        '(spy on console + assert) or call allowConsoleErrors() if it is genuinely unavoidable.'
    );
});

afterAll(async () => {
    const {mochaHooks} = getSnapshotExports();
    if (mochaHooks?.afterAll) {
        await mochaHooks.afterAll();
    }
});
