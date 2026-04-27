const {
    cleanupDatabases,
    disableNetwork,
    setupTestEnv,
    settleJobs
} = require('./setup-test-env');

const {snapshotExports} = setupTestEnv();
const {mochaHooks} = snapshotExports;

exports.mochaHooks = mochaHooks;

const originalBeforeAll = mochaHooks.beforeAll;
mochaHooks.beforeAll = async function () {
    if (originalBeforeAll) {
        await originalBeforeAll.call(this);
    }

    // Disable network in tests to prevent any accidental requests
    disableNetwork();
};

const originalAfterEach = mochaHooks.afterEach;
mochaHooks.afterEach = async function () {
    await settleJobs();

    try {
        if (originalAfterEach) {
            await originalAfterEach.call(this);
        }
    } finally {
        // Re-apply network disabling after each test. Individual test afterEach hooks
        // often call sinon.restore() which removes the DNS stubs set up by
        // disableNetwork() in beforeAll. Without re-applying, subsequent tests make
        // real DNS lookups on nocked domains which can be slow on CI, causing flaky
        // timeouts (e.g. ExternalMediaInliner CDN storage adapter tests).
        // Wrapped in finally so DNS stubs are restored even if a previous afterEach
        // hook throws.
        disableNetwork();
    }
};

const originalAfterAll = mochaHooks.afterAll;
mochaHooks.afterAll = async function () {
    if (originalAfterAll) {
        await originalAfterAll.call(this);
    }

    // Clean up the session-specific test database (only if we generated it)
    await cleanupDatabases();
};
