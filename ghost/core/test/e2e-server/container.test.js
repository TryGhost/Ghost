const assert = require('node:assert/strict');
const {agentProvider} = require('../utils/e2e-framework');
const {getCurrentScope} = require('../../core/shared/container/current');
const db = require('../../core/server/data/db');

describe('DI container boot wiring', function () {
    beforeAll(async function () {
        await agentProvider.getGhostAPIAgent();
    });

    it('sets a default scope during boot', function () {
        assert.ok(getCurrentScope());
    });

    it('serves db.knex from the default scope', function () {
        assert.equal(db.knex, getCurrentScope().resolve('knex'));
    });
});
