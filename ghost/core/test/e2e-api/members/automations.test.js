const assert = require('node:assert/strict');
const sinon = require('sinon');
const {mockSystemTime} = require('../../utils/clock-utils');
const DomainEvents = require('@tryghost/domain-events');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const adapterManager = require('../../../core/server/services/adapter-manager');
const mailService = require('../../../core/server/services/mail');
const membersService = require('../../../core/server/services/members');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');
const {cleanupAutomationsFixture, setupAutomationsFixture} = require('../../utils/automations-fixtures');

const HOUR_MS = 60 * 60 * 1000;
const AUTOMATION_EMAIL_REPLY_TO = 'support@example.com';

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

async function upsertEmailDesignSetting({id, senderReplyTo}) {
    const currentTime = new Date();

    await db.knex('email_design_settings')
        .insert({
            id,
            slug: `automation-test-email-design-${id}`,
            background_color: 'light',
            header_background_color: 'transparent',
            show_header_icon: true,
            show_header_title: true,
            button_color: 'accent',
            button_corners: 'rounded',
            button_style: 'fill',
            link_color: 'accent',
            link_style: 'underline',
            body_font_category: 'sans_serif',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            image_corners: 'square',
            show_badge: true,
            sender_reply_to: senderReplyTo,
            created_at: currentTime,
            updated_at: currentTime
        })
        .onConflict('id')
        .merge({
            sender_reply_to: senderReplyTo,
            updated_at: currentTime
        });
}

async function updateAutomationEmailDesignSetting(automation, emailDesignSettingId) {
    const actions = automation.actions.map((action) => {
        if (action.type !== 'send_email') {
            return action;
        }

        return {
            ...action,
            data: {
                ...action.data,
                email_design_setting_id: emailDesignSettingId
            }
        };
    });

    const {body} = await agent
        .put(`automations/${automation.id}`)
        .body({
            automations: [{
                status: automation.status,
                actions,
                edges: automation.edges
            }]
        })
        .expectStatus(200);

    return body.automations[0];
}

async function updateAutomation(automation, overrides = {}) {
    const {body} = await agent
        .put(`automations/${automation.id}`)
        .body({
            automations: [{
                status: automation.status,
                actions: automation.actions,
                edges: automation.edges,
                ...overrides
            }]
        })
        .expectStatus(200);

    return body.automations[0];
}

function getAutomationEmailSends() {
    return mailService.GhostMailer.prototype.send.getCalls()
        .map(call => call.args[0])
        .filter(emailToSend => emailToSend.tags?.includes('automation-email'));
}

describe('Members Automations', function () {
    beforeAll(async function () {
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
        await setupAutomationsFixture();
    });

    afterEach(async function () {
        await DomainEvents.allSettled();
        sinon.restore();
        mockManager.restore();
        await cleanupAutomationsFixture();
    });

    it('runs every step in the free member signup automation', async function () {
        let automation = await getFreeMemberSignupAutomation();
        assert.equal(automation.actions.length, 4);

        const sendEmailActions = automation.actions.filter(action => action.type === 'send_email');
        assert.equal(sendEmailActions.length, 2);

        const emailDesignSettingId = sendEmailActions[0].data.email_design_setting_id;
        assert(emailDesignSettingId, 'Expected send email action to have an email design setting');
        await upsertEmailDesignSetting({
            id: emailDesignSettingId,
            senderReplyTo: AUTOMATION_EMAIL_REPLY_TO
        });

        automation = await updateAutomationEmailDesignSetting(automation, emailDesignSettingId);
        assert.deepEqual(
            automation.actions
                .filter(action => action.type === 'send_email')
                .map(action => action.data.email_design_setting_id),
            [emailDesignSettingId, emailDesignSettingId]
        );

        const email = `automation-free-member-${Date.now()}@test.example`;
        const member = await membersService.api.members.create({
            email,
            name: 'Automation Test Member',
            status: 'free',
            email_disabled: false
        });
        assert.equal(member.get('status'), 'free');

        await DomainEvents.allSettled();

        const clock = mockSystemTime(new Date());

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

        const sentEmails = getAutomationEmailSends();
        assert.equal(sentEmails.length, 2);
        assert.deepEqual(sentEmails.map(({to}) => to), [email, email]);
        assert.deepEqual(sentEmails.map(({subject}) => subject), ['Welcome!', 'Follow up']);
        assert.match(sentEmails[0].html, /Welcome!/);
        assert.match(sentEmails[1].html, /Follow up/);
        assert.deepEqual(sentEmails.map(({forceTextContent}) => forceTextContent), [true, true]);
        assert.deepEqual(sentEmails.map(({replyTo}) => replyTo), [AUTOMATION_EMAIL_REPLY_TO, AUTOMATION_EMAIL_REPLY_TO]);
        assert.deepEqual(sentEmails.map(({tags}) => tags), [
            ['automation-email'],
            ['automation-email']
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

    it('does nothing when the automation is inactive', async function () {
        const automation = await getFreeMemberSignupAutomation();
        await updateAutomation(automation, {status: 'inactive'});

        const email = `automation-free-member-${Date.now()}@test.example`;
        const member = await membersService.api.members.create({
            email,
            name: 'Inactive Automation Test Member',
            status: 'free',
            email_disabled: false
        });
        assert.equal(member.get('status'), 'free');

        await DomainEvents.allSettled();
        await runSchedulerPoll();

        assert.equal(getAutomationEmailSends().length, 0);
    });

    it('stops an automation run when its automation is deactivated before poll', async function () {
        const automation = await getFreeMemberSignupAutomation();
        const firstWaitAction = automation.actions.find(action => action.type === 'wait');
        assert(firstWaitAction, 'Expected free automation to start with a wait action');

        const email = `automation-free-member-${Date.now()}@test.example`;
        const member = await membersService.api.members.create({
            email,
            name: 'Disabled Step Test Member',
            status: 'free',
            email_disabled: false
        });
        assert.equal(member.get('status'), 'free');

        await DomainEvents.allSettled();
        await updateAutomation(automation, {status: 'inactive'});

        const clock = mockSystemTime(new Date());

        try {
            clock.setSystemTime(new Date(Date.now() + firstWaitAction.data.wait_hours * HOUR_MS));
            await runSchedulerPoll();
        } finally {
            clock.restore();
        }

        assert.equal(getAutomationEmailSends().length, 0);
    });

    it('stops an automation run when the associated member changes their status', async function () {
        const automation = await getFreeMemberSignupAutomation();
        const firstWaitAction = automation.actions.find(action => action.type === 'wait');
        assert(firstWaitAction, 'Expected free automation to start with a wait action');

        const email = `automation-status-changed-${Date.now()}@test.example`;
        const member = await membersService.api.members.create({
            email,
            name: 'Changed Status Test Member',
            status: 'free',
            email_disabled: false
        });
        assert.equal(member.get('status'), 'free');
        await DomainEvents.allSettled();

        await db.knex('members')
            .where('id', member.id)
            .update({
                status: 'paid',
                updated_at: new Date()
            });

        const clock = mockSystemTime(new Date());

        try {
            clock.setSystemTime(new Date(Date.now() + firstWaitAction.data.wait_hours * HOUR_MS));
            await runSchedulerPoll();
        } finally {
            clock.restore();
        }

        assert.equal(getAutomationEmailSends().length, 0);
    });
});
