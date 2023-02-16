const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
const assert = require('assert');
const nock = require('nock');
const sinon = require('sinon');
const models = require('../../../core/server/models');
const moment = require('moment');

const milestonesService = require('../../../core/server/services/milestones');

let agent;
let counter = 0;
let membersCounter = 0;

async function createMemberWithSubscription(interval, amount, currency, date) {
    counter += 1;
    membersCounter += 1;

    const fakePrice = {
        id: 'price_' + counter,
        product: '',
        active: true,
        nickname: 'Paid',
        unit_amount: amount,
        currency,
        type: 'recurring',
        recurring: {
            interval
        }
    };

    const fakeSubscription = {
        id: 'sub_' + counter,
        customer: 'cus_' + counter,
        status: 'active',
        cancel_at_period_end: false,
        metadata: {},
        current_period_end: Date.now() / 1000 + 1000,
        start_date: moment(date).unix(),
        plan: fakePrice,
        items: {
            data: [{
                price: fakePrice
            }]
        }
    };

    const fakeCustomer = {
        id: 'cus_' + counter,
        name: 'Test Member',
        email: 'create-member-subscription-' + counter + '@email.com',
        subscriptions: {
            type: 'list',
            data: [fakeSubscription]
        }
    };
    nock('https://api.stripe.com')
        .persist()
        .get(/v1\/.*/)
        .reply((uri, body) => {
            const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

            if (!match) {
                return [500];
            }

            if (resource === 'customers') {
                return [200, fakeCustomer];
            }

            if (resource === 'subscriptions') {
                return [200, fakeSubscription];
            }
        });

    const initialMember = {
        name: fakeCustomer.name,
        email: fakeCustomer.email,
        subscribed: true,
        stripe_customer_id: fakeCustomer.id
    };

    await agent
        .post(`/members/`)
        .body({members: [initialMember]})
        .expectStatus(201);

    nock.cleanAll();
}

async function createFreeMembers(amount, amountImported = 0) {
    const members = [];

    const newsletters = await agent.get(`/newsletters/`);
    const newsletter = newsletters.body?.newsletters?.[0];

    for (let index = 0; index < amount; index++) {
        let membersAddRequest;
        membersCounter += 1;

        const member = {
            name: 'Test Member',
            email: 'free-member-' + membersCounter + '@email.com',
            status: 'free',
            uuid: `f6f91461-d7d8-4a3f-aa5d-8e582c40b99${membersCounter}`
        };

        if (amountImported > 0) {
            member.subscribed = true;
            member.newsletters = [newsletter];

            const createMemberEvent = await agent
                .post(`/members/`)
                .body({members: [member]})
                .expectStatus(201);

            const id = createMemberEvent.body.members[0].id;

            // Manually add the members_subscribe_event so we can test imported members
            const editedEvent = await models.MemberSubscribeEvent.add({
                newsletter_id: newsletter.id,
                member_id: id,
                subscribed: true,
                source: index < amountImported ? 'import' : 'member'
            });

            membersAddRequest = Promise.all([createMemberEvent, editedEvent]);
        } else {
            membersAddRequest = await agent
                .post(`/members/`)
                .body({members: [member]})
                .expectStatus(201);
        }

        members.push(membersAddRequest);
    }

    await Promise.all(members);
}

describe('Milestones Service', function () {
    const milestonesConfig = {
        arr: [{currency: 'usd', values: [100, 150]}],
        members: [10, 20, 30]
    };

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        sinon.createSandbox();
        configUtils.set('milestones', milestonesConfig);
        mockManager.mockLabsEnabled('milestoneEmails');
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
        sinon.restore();
    });

    it('Inits milestone service', async function () {
        await milestonesService.init();

        assert.ok(milestonesService.api);
    });

    it('Runs ARR and Members milestone jobs', async function () {
        mockManager.mockSetting('stripe_connect_publishable_key', 'pk_live_89843uihsidfh98832uo8ri');

        // No ARR and no members
        const firstRun = await milestonesService.initAndRun();
        assert(firstRun.members === undefined);
        assert(firstRun.arr === undefined);

        await createFreeMembers(7);
        await createMemberWithSubscription('year', 5000, 'usd', '2000-01-10');
        await createMemberWithSubscription('month', 100, 'usd', '2000-01-10');
        const secondRun = await milestonesService.initAndRun();
        assert(secondRun.members === undefined);
        assert(secondRun.arr === undefined);

        // Reached the first milestone for members
        await createFreeMembers(1);
        const thirdRun = await milestonesService.initAndRun();
        assert(thirdRun.members.value === 10);
        assert(thirdRun.members.emailSentAt !== undefined);
        assert(thirdRun.arr === undefined);

        // Reached the first milestone for ARR
        // but has already reached members milestone, so no new one
        // will be created
        await createMemberWithSubscription('month', 500, 'usd', '2000-01-10');
        await createMemberWithSubscription('month', 500, 'eur', '2000-01-10');
        const fourthRun = await milestonesService.initAndRun();
        assert(fourthRun.members === undefined);
        assert(fourthRun.arr.value === 100);
        assert(fourthRun.arr.emailSentAt !== undefined);
    });

    it('Does not send emails for milestones when imported members present', async function () {
        mockManager.mockSetting('stripe_publishable_key', 'pk_live_89843uihsidfh98832uo8ri');
        mockManager.mockSetting('stripe_connect_publishable_key', 'pk_test_89843uihsidfh98832uo8ri');

        await createFreeMembers(10, 1);
        await createMemberWithSubscription('month', 1000, 'usd', '2023-01-10');
        const result = await milestonesService.initAndRun();

        assert(result.members.value === 20);
        assert(result.members.emailSentAt === null);
        assert(result.arr.value === 150);
        assert(result.arr.emailSentAt === null);
    });

    it('Does not run when milestoneEmails labs flag is not set', async function () {
        mockManager.mockLabsDisabled('milestoneEmails');

        const result = await milestonesService.initAndRun();
        assert(result === undefined);
    });

    it('Does not run ARR milestones when Stripe is not live enabled', async function () {
        mockManager.mockSetting('stripe_publishable_key', 'pk_test_89843uihsidfh98832uo8ri');
        mockManager.mockSetting('stripe_connect_publishable_key', 'pk_test_89843uihsidfh98832uo8ri');
        await createFreeMembers(10);

        const result = await milestonesService.initAndRun();
        assert(result.members.value === 30);
        assert(result.members.emailSentAt !== undefined);
        assert(result.arr === undefined);
    });
});
