const assert = require('node:assert/strict');
const papaparse = require('papaparse');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const configUtils = require('../../utils/config-utils');
const config = require('../../../core/shared/config');
const jobsService = require('../../../core/server/services/jobs');
const {mockManager} = require('../../utils/e2e-framework');

// When the uploaded CSV has no subscription/comp columns at all, the import must not
// invent a subscription state for those rows. Pinned against origin/main's behaviour:
// an absent column leaves the emitted error report's subscribed_to_emails and
// complimentary_plan cells blank, rather than defaulting them to true/false. One row
// imports (so the run reports as a completion) and one fails, so it reaches the report.
const CSV = [
    'email,name',
    'valid+ok@example.com,Good Member',
    'not-a-valid-email,Bad Member'
].join('\n');

describe('Members import with absent subscription columns', function () {
    let request;
    let failedRow;

    beforeAll(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'newsletters', 'members:newsletters');

        mockManager.mockMail();
        configUtils.set('members:importer:inlineThreshold', 1);

        const res = await request
            .post(localUtils.API.getApiQuery('members/upload/'))
            .attach('membersfile', Buffer.from(CSV), {filename: 'members.csv', contentType: 'text/csv'})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);
        assert.equal(res.status, 202, 'over the threshold the import defers');

        await jobsService.allSettled();

        const email = mockManager.assert.sentEmail({subject: 'Your member import is complete'});
        const parsed = papaparse.parse(email.attachments[0].content.trim(), {header: true});
        failedRow = parsed.data.find(row => row.email === 'not-a-valid-email');
        assert.ok(failedRow, 'the failed row is in the error report');
    });

    afterAll(async function () {
        mockManager.restore();
        await configUtils.restore();
    });

    it('leaves subscribed_to_emails blank when the column was absent', function () {
        assert.equal(failedRow.subscribed_to_emails, '');
    });

    it('leaves complimentary_plan blank when the column was absent', function () {
        assert.equal(failedRow.complimentary_plan, '');
    });
});
