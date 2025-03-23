const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
const assert = require('assert/strict');
const nock = require('nock');
const sinon = require('sinon');
const models = require('../../../core/server/models');
const moment = require('moment');
const logging = require('@tryghost/logging');

const milestonesService = require('../../../core/server/services/milestones');

let agent;
let counter = 0;
let membersCounter = 0;
const fifteenDays = 1000 * 60 * 60 * 24 * 15;

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
        current_period_end: Math.floor(Date.now() / 1000 + 1000),
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
        .reply((uri) => {
            const [match, resource] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

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
    let clock;
    let loggingStub;

    const milestonesConfig = {
        arr: [{currency: 'usd', values: [0, 100, 150]}],
        members: [0, 10, 20, 30],
        minDaysSinceImported: 7,
        minDaysSinceLastEmail: 14
    };

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        loggingStub = sinon.stub(logging, 'info');
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        clock = sinon.useFakeTimers({
            now: threeMonthsAgo.getTime(),
            shouldAdvanceTime: true,
            toFake: ['setTimeout']
        });
        configUtils.set('milestones', milestonesConfig);
        mockManager.mockMail();
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
        clock.restore();
        clock = undefined;
        sinon.restore();
    });

    it('Inits milestone service', async function () {
        await milestonesService.init();

        assert.ok(milestonesService.api);
    });

    it('Runs ARR and Members milestone jobs', async function () {
        mockManager.mockSetting('stripe_connect_publishable_key', 'pk_live_89843uihsidfh98832uo8ri');

        // No ARR and no members
        const firstResultPromise = milestonesService.initAndRun(fifteenDays);
        await clock.tickAsync(fifteenDays);
        const firstRun = await firstResultPromise;
        assert(firstRun.members.value === 0);
        assert(firstRun.arr === undefined);

        await createFreeMembers(7);
        await createMemberWithSubscription('year', 5000, 'usd', '2000-01-10');
        await createMemberWithSubscription('month', 100, 'usd', '2000-01-10');
        const secondResultPromise = milestonesService.initAndRun(fifteenDays);
        await clock.tickAsync(fifteenDays);
        const secondRun = await secondResultPromise;

        assert(secondRun.members.value === 0);
        assert(secondRun.arr.value === 0);

        // Reached the first milestone for members
        await createFreeMembers(1);
        const thirdResultPromise = milestonesService.initAndRun(fifteenDays);
        await clock.tickAsync(fifteenDays);
        const thirdRun = await thirdResultPromise;

        assert(thirdRun.members.value === 10);
        assert(thirdRun.members.emailSentAt !== undefined);
        assert(thirdRun.arr.value === 0);

        const memberMilestoneModel = await models.Milestone.findOne({value: 10, type: 'members'});

        assert.ok(memberMilestoneModel.get('id'));
        assert.equal(memberMilestoneModel.get('type'), 'members');
        assert.equal(memberMilestoneModel.get('value'), 10);
        assert.ok(memberMilestoneModel.get('created_at'));
        assert.ok(memberMilestoneModel.get('email_sent_at'));

        // Reached the first milestone for ARR
        // - Members already reached, no new one will be created
        // - Less than two weeks since last milestone email, no email will be sent
        await createMemberWithSubscription('month', 500, 'usd', '2000-01-10');
        await createMemberWithSubscription('month', 500, 'eur', '2000-01-10');
        await createMemberWithSubscription('year', 1000, 'usd', '2000-01-10');
        const fourthResultPromise = milestonesService.initAndRun(100);
        await clock.tickAsync(100);
        const fourthRun = await fourthResultPromise;
        assert(fourthRun.members.value === 10);
        assert(fourthRun.arr.value === 100);
        assert(fourthRun.arr.emailSentAt !== undefined);

        const arrMilestoneModel = await models.Milestone.findOne({value: 100, type: 'arr'});

        assert.ok(arrMilestoneModel.get('id'));
        assert.equal(arrMilestoneModel.get('type'), 'arr');
        assert.equal(arrMilestoneModel.get('value'), 100);
        assert.ok(arrMilestoneModel.get('created_at'));
        assert.equal(arrMilestoneModel.get('email_sent_at'), null);

        assert(loggingStub.called);
    });

    it('Does not run ARR milestones when Stripe is not live enabled', async function () {
        mockManager.mockSetting('stripe_publishable_key', 'pk_test_89843uihsidfh98832uo8ri');
        mockManager.mockSetting('stripe_connect_publishable_key', 'pk_test_89843uihsidfh98832uo8ri');
        await createFreeMembers(12);

        const resultPromise = milestonesService.initAndRun(fifteenDays);
        await clock.tickAsync(fifteenDays);
        const result = await resultPromise;
        assert(result.members.value === 20);
        assert(result.members.emailSentAt !== undefined);
        assert(result.arr === undefined);

        const memberMilestoneModel = await models.Milestone.findOne({value: 20, type: 'members'});

        assert.ok(memberMilestoneModel.get('id'));
        assert.equal(memberMilestoneModel.get('type'), 'members');
        assert.equal(memberMilestoneModel.get('value'), 20);
        assert.ok(memberMilestoneModel.get('created_at'));
        assert.equal(memberMilestoneModel.get('email_sent_at'), null);

        assert(loggingStub.called);
    });

    it('Does not send emails for milestones when imported members present', async function () {
        mockManager.mockSetting('stripe_publishable_key', 'pk_live_89843uihsidfh98832uo8ri');
        mockManager.mockSetting('stripe_connect_publishable_key', 'pk_test_89843uihsidfh98832uo8ri');

        await createFreeMembers(10, 1);
        const resultPromise = milestonesService.initAndRun(fifteenDays);

        await clock.tickAsync(fifteenDays);
        const result = await resultPromise;

        assert(result.members.value === 30);
        assert(result.members.emailSentAt === null);

        assert(result.arr.value === 100);

        const memberMilestoneModel = await models.Milestone.findOne({value: 30, type: 'members'});

        assert.ok(memberMilestoneModel.get('id'));
        assert.equal(memberMilestoneModel.get('type'), 'members');
        assert.equal(memberMilestoneModel.get('value'), 30);
        assert.ok(memberMilestoneModel.get('created_at'));
        assert.equal(memberMilestoneModel.get('email_sent_at'), null);

        const arrMilestoneModel = await models.Milestone.findOne({value: 150, type: 'arr'});

        assert.equal(arrMilestoneModel, null);

        assert(loggingStub.called);
    });
});
