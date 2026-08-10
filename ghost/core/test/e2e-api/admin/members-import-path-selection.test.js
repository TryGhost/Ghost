const path = require('path');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const configUtils = require('../../utils/config-utils');
const config = require('../../../core/shared/config');
const jobsService = require('../../../core/server/services/jobs');
const {mockManager} = require('../../utils/e2e-framework');

// An import is performed while the request is open, or handed to a background
// job. Which one it takes is decided by the row count against a configurable
// threshold, by whether the file carries Stripe data, and by whether the caller
// forced it. The threshold is set per test so the same small fixture can stand
// on either side of it, rather than the boundary needing a fixture large enough
// to cross the shipped default.
const fixture = name => path.join(__dirname, '/../../utils/fixtures/csv/', name);

describe('Members import path selection', function () {
    let request;

    beforeAll(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'newsletters', 'members:newsletters');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(async function () {
        mockManager.restore();
        await configUtils.restore();
    });

    const upload = file => request
        .post(localUtils.API.getApiQuery('members/upload/'))
        .attach('membersfile', fixture(file))
        .set('Origin', config.get('url'))
        .expect('Content-Type', /json/)
        .expect('Cache-Control', testUtils.cacheRules.private);

    describe('within the threshold', function () {
        it('imports while the request is open and reports what it did', async function () {
            configUtils.set('members:importer:inlineThreshold', 5);

            const res = await upload('valid-members-import.csv');

            assert.equal(res.status, 201);
            assert.equal(res.body.meta.originalImportSize, 2);
            assert.equal(res.body.meta.stats.imported, 2);
        });

        it('still defers a file carrying Stripe data, which is slow to import', async function () {
            configUtils.set('members:importer:inlineThreshold', 5);

            const res = await upload('members-with-stripe-ids.csv');

            assert.equal(res.status, 202);
            assert.equal(res.body.meta.stats, undefined);

            // the deferred job reports by email, so it has to finish inside the
            // test: the mail mock is torn down before the framework settles jobs
            await jobsService.allSettled();
            mockManager.assert.sentEmailCount(1);
        });
    });

    describe('over the threshold', function () {
        it('defers to a background job and reports no stats yet', async function () {
            configUtils.set('members:importer:inlineThreshold', 1);

            const res = await upload('valid-members-import.csv');

            assert.equal(res.status, 202);
            assert.equal(res.body.meta.stats, undefined);

            await jobsService.allSettled();
            mockManager.assert.sentEmailCount(1);
        });

        it('treats the threshold as inclusive', async function () {
            configUtils.set('members:importer:inlineThreshold', 2);

            const res = await upload('valid-members-import.csv');

            assert.equal(res.status, 201);
            assert.equal(res.body.meta.stats.imported, 2);
        });
    });
});
