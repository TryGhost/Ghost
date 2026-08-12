const assert = require('node:assert/strict');
const {agentProvider} = require('../../utils/e2e-framework');

describe('Automation performance route', function () {
    let agent;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
    });

    it('renders without authentication', async function () {
        const response = await agent
            .get('automation-performance')
            .expectStatus(200);

        assert.match(response.text, /<button id="setup" type="button">setup<\/button>/);
        assert.match(response.text, /<button id="query" type="button">query<\/button>/);
        assert.match(response.text, /<textarea id="result"/);
    });

    it('returns aggregate run statuses without authentication', async function () {
        const response = await agent
            .post('automation-performance/query')
            .expectStatus(200);

        assert.deepEqual(Object.keys(response.body), [
            'pendingCount',
            'memberChangedStatusCount',
            'failedCount',
            'finishedCount'
        ]);
        for (const count of Object.values(response.body)) {
            assert.equal(typeof count, 'number');
        }
    });
});
