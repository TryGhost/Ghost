const assert = require('assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');

const {DataGenerator} = require('../../../utils');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');

let agent;
let clock;
let sandbox;

// We currently use the owner, but it would be better to switch this to an Administrator in the future
// for these tests, when the issue with roles in test fixtures is resolved.
const userId = DataGenerator.Content.users[0].id;

describe('Update User Last Seen', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();

        // Important to enable the fake timers before logging in
        // Because the last_seen of the owner will be set already here
        sandbox = sinon.createSandbox();
        clock = sinon.useFakeTimers();

        await agent.loginAsOwner();

        // Fixtures aren't working for roles. So need to use the owner for now.
        /*await fixtureManager.init('roles', 'users');
        await agent.loginAs(
            DataGenerator.Content.users[1].email,
            DataGenerator.Content.users[1].password
        );*/
    });

    after(function () {
        clock.restore();
        sandbox.restore();
    });

    it('Should update last seen for active users', async function () {
        // Fetching should work fine
        await agent
            .get(`posts/`)
            .expectStatus(200);

        const user = await models.User.findOne({id: userId});
        assertExists(user);
        const lastSeen = user.get('last_seen');
        assertExists(lastSeen);

        clock.tick(1000 * 60 * 60 * 24);

        await agent
            .get(`posts/`)
            .expectStatus(200);

        const ownerAfter = await models.User.findOne({id: userId});
        assertExists(ownerAfter);
        assert.notDeepEqual(ownerAfter.get('last_seen'), lastSeen);
    });

    it('Should only update last seen after 1 hour', async function () {
        const user = await models.User.findOne({id: userId});
        const lastSeen = user.get('last_seen');
        assertExists(lastSeen);

        clock.tick(1000 * 60 * 30);

        // Fetching should work fine
        await agent
            .get(`posts/`)
            .expectStatus(200);

        const ownerAfter = await models.User.findOne({id: userId});
        assertExists(ownerAfter);
        assert.deepEqual(ownerAfter.get('last_seen'), lastSeen);
    });

    it('Should always update last seen after login', async function () {
        const user = await models.User.findOne({id: userId});
        const lastSeen = user.get('last_seen');
        assertExists(lastSeen);

        await agent.loginAsOwner();

        const ownerAfter = await models.User.findOne({id: userId});
        assertExists(ownerAfter);
        assert.notDeepEqual(ownerAfter.get('last_seen'), lastSeen);
    });

    it('Should not update last seen for suspended users', async function () {
        // Fetching should work fine
        await agent
            .get(`posts/`)
            .expectStatus(200);

        // Suspend the user
        const user = await models.User.findOne({id: userId});
        assertExists(user);

        await models.User.edit({status: 'inactive'}, {id: userId});
        const lastSeen = user.get('last_seen');
        assertExists(lastSeen);

        clock.tick(1000 * 60 * 60 * 24);

        await agent
            .get(`posts/`)
            .expectStatus(403);

        const ownerAfter = await models.User.findOne({id: userId});
        assertExists(ownerAfter);
        assert.deepEqual(ownerAfter.get('last_seen'), lastSeen);
    });
});
