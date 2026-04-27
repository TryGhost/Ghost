/* eslint-disable ghost/mocha/handle-done-callback, ghost/mocha/no-top-level-hooks */

const {
    disableNetwork,
    setupTestEnv,
    settleJobs
} = require('./setup-test-env');

const {snapshotExports} = setupTestEnv();
const {mochaHooks} = snapshotExports;

function fullTitle(task) {
    return (task.fullTestName || task.name || '').replace(/ > /g, ' ');
}

beforeAll(async function () {
    if (mochaHooks.beforeAll) {
        await mochaHooks.beforeAll();
    }

    disableNetwork();
});

beforeEach(async function (context) {
    if (mochaHooks.beforeEach) {
        await mochaHooks.beforeEach.call({
            currentTest: {
                currentRetry() {
                    return 0;
                },
                file: context.task.file.filepath,
                fullTitle() {
                    return fullTitle(context.task);
                }
            }
        });
    }
});

afterEach(async function () {
    await settleJobs();
    disableNetwork();
});
