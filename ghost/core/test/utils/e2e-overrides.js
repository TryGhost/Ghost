const path = require('path');
const os = require('os');
const crypto = require('crypto');
const configUtils = require('./configUtils');

const mochaHooks = {};
exports.mochaHooks = mochaHooks;

// const suiteThis = this;

// const originalBeforeAll = mochaHooks.beforeAll;
mochaHooks.beforeAll = async function () {
    const contentFolder = path.join(os.tmpdir(), crypto.randomUUID(), 'ghost-test');
    configUtils.setForSuite('paths:contentPath', contentFolder);
    console.log('e2e-overrides beforeAll test', contentFolder, configUtils.config.get('paths:contentPath'));

    // if (originalBeforeAll) {
    //     console.log('e2e-overrides calling OG beforeAll');
    //     await originalBeforeAll.bind(suiteThis)();
    // }
};

// const originalAfterAll = mochaHooks.afterAll;
mochaHooks.afterAll = async function () {
    await configUtils.fullRestore();

    // if (originalAfterAll) {
    //     await originalAfterAll.bind(suiteThis)();
    // }
};