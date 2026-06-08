const assert = require('node:assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const automationsApi = require('../../../core/server/services/automations/automations-api');
const adapterManager = require('../../../core/server/services/adapter-manager');
const mailService = require('../../../core/server/services/mail');
const membersService = require('../../../core/server/services/members');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');

const HOUR_MS = 60 * 60 * 1000;

let agent;
let schedulerKey;

async function getFreeMemberSignupAutomation() {
    const {body: {automations}} = await agent
        .get('automations')
        .expectStatus(200);
    const summary = automations.find(automation => automation.slug === MEMBER_WELCOME_EMAIL_SLUGS.free);
    assert(summary, 'Expected free member signup automation to exist');

    const {body} = await agent
        .get(`automations/${summary.id}`)
        .expectStatus(200);
    return body.automations[0];
}

function getSchedulerToken() {
    return getSignedAdminToken({
        publishedAt: new Date().toISOString(),
        apiUrl: '/admin/',
        key: schedulerKey
    });
}

async function runSchedulerPoll() {
    await agent
        .put(`automations/poll/?token=${getSchedulerToken()}`)
        .expectStatus(204)
        .expectEmptyBody();
    await DomainEvents.allSettled();
}

describe('Members Automations', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'integrations', 'api_keys');
        await agent.loginAsOwner();

        schedulerKey = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');
    });

    beforeEach(async function () {
        mockManager.mockLabsEnabled('automations');
        const schedulerAdapter = adapterManager.getAdapter('scheduling');
        sinon.stub(schedulerAdapter, 'schedule');
        sinon.stub(schedulerAdapter, '_pingUrl');
        sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
        automationsApi._resetTestDatabase();
    });

    afterEach(async function () {
        await DomainEvents.allSettled();
        sinon.restore();
        mockManager.restore();
        automationsApi._resetTestDatabase();
    });

    it('runs every step in the free member signup automation', async function () {
        const email = `automation-free-member-${Date.now()}@test.example`;
        const member = await membersService.api.members.create({
            email,
            name: 'Automation Test Member',
            status: 'free',
            email_disabled: false
        });
        assert.equal(member.get('status'), 'free');

        const automation = await getFreeMemberSignupAutomation();
        assert.equal(automation.actions.length, 4);

        await DomainEvents.allSettled();

        const clock = sinon.useFakeTimers({now: new Date(), shouldAdvanceTime: true, shouldClearNativeTimers: true});

        try {
            for (const action of automation.actions) {
                if (action.type === 'wait') {
                    clock.setSystemTime(new Date(Date.now() + action.data.wait_hours * HOUR_MS));
                }

                await runSchedulerPoll();
            }

            await runSchedulerPoll();
        } finally {
            clock.restore();
        }

        const sentEmails = mailService.GhostMailer.prototype.send.getCalls()
            .map(call => call.args[0])
            .filter(emailToSend => emailToSend.tags?.includes('member-welcome-email'));
        assert.equal(sentEmails.length, 2);
        assert.deepEqual(sentEmails.map(({to}) => to), [email, email]);
        assert.deepEqual(sentEmails.map(({subject}) => subject), ['Welcome!', 'Follow up']);
        assert.match(sentEmails[0].html, /Welcome!/);
        assert.match(sentEmails[1].html, /Follow up/);
        assert.deepEqual(sentEmails.map(({forceTextContent}) => forceTextContent), [true, true]);
        assert.deepEqual(sentEmails.map(({replyTo}) => replyTo), ['support@example.com', 'support@example.com']);
        assert.deepEqual(sentEmails.map(({tags}) => tags), [
            ['member-welcome-email'],
            ['member-welcome-email']
        ]);
        sinon.assert.calledWithMatch(mailService.GhostMailer.prototype.send, {
            to: email,
            subject: 'Welcome!'
        });
        sinon.assert.calledWithMatch(mailService.GhostMailer.prototype.send, {
            to: email,
            subject: 'Follow up'
        });
    });
});
