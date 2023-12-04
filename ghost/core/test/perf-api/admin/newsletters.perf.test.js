const should = require('should');
const { Benchmark } = require('kelonio');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

const supertest = require('supertest');
const testUtils = require('../../utils');


describe('Newsletters Performance', function () {
    let agent;
    let benchmark;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
        benchmark = new Benchmark();
    });

    it('browse newsletters', async function () {
        await benchmark.record(async () => {
            await agent.get(`newsletters`)
        }, { iterations: 10, meanUnder: 10});
    });

    it('browse newsletters with active member counts', async function () {
        await benchmark.record(async () => {
            await agent.get(`newsletters/include=count.active_members`);
        }, { iterations: 10, meanUnder: 1000});
    });

    it('browse newsletters with total post counts', async function () {
        await benchmark.record(async () => {
            await agent.get(`newsletters/include=count.posts`);
        }, { iterations: 10, meanUnder: 1000});
    });
});