const assert = require('assert');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');

let agent;

const sleep = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000));

describe.only('Members API', function () {
    before(async function () {
        agent = await agentProvider.getMembersAPIAgent();
        await sleep(2);
        await fixtureManager.init('members');
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
        mockManager.mockMail();
        mockManager.mockStripe();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can communicate with the frontend Members API', async function () {
        const res = await agent.get('/api/site/');

        assert.equal(res.statusCode, 200, `Expected a successful response but received a status of ${res.statusCode}`);
    });
});
