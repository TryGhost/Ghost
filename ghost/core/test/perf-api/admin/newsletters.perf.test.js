const {benchmark} = require('kelonio');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');

describe('Newsletters Performance', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    it('browse newsletters', async function () {
        await benchmark.record(async () => {
            await agent.get(`newsletters`).expectStatus(200);
        }, {iterations: 10, meanUnder: 3});
    });

    it('browse newsletters with active member counts', async function () {
        await benchmark.record(async () => {
            await agent.get(`newsletters/?include=count.active_members`).expectStatus(200);
        }, {iterations: 10, meanUnder: 10});
    });

    it('browse newsletters with total post counts', async function () {
        await benchmark.record(async () => {
            await agent.get(`newsletters/?include=count.posts`).expectStatus(200);
        }, {iterations: 10, meanUnder: 10});
    });
});