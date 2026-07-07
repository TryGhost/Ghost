const assert = require('node:assert/strict');
const {agentProvider} = require('../utils/e2e-framework');
const {getCurrentScope} = require('../../core/shared/container/current');

describe('DI container boot wiring', function () {
    beforeAll(async function () {
        await agentProvider.getGhostAPIAgent();
    });

    it('sets a default scope during boot', function () {
        assert.ok(getCurrentScope());
    });
});
