// @ts-check
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ObjectId = require('bson-objectid').default;
const sinon = require('sinon');
const testUtils = require('../../../utils');

const {poll} = require('../../../../core/server/services/welcome-email-automations/poll');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../../core/server/services/member-welcome-emails/constants');
const {WelcomeEmailAutomationRun} = require('../../../../core/server/models');

const RETRY_DELAY_MS = 10 * 60 * 1000;
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_RUNS_PER_BATCH = 100;

describe('welcome email automations poll', function () {
    let options;

    before(async function () {
        await testUtils.setup('default')();
    });

    beforeEach(async function () {
        await cleanupTables();

        sinon.useFakeTimers(new Date('2026-04-12T12:00:00.000Z'));

        options = {
            memberWelcomeEmailService: {
                init: sinon.stub(),
                api: {
                    loadMemberWelcomeEmails: sinon.stub().resolves(),
                    send: sinon.stub().resolves()
                }
            },
            enqueueAnotherPollNow: sinon.stub(),
            enqueueAnotherPollAt: sinon.stub()
        };
    });

    afterEach(async function () {
        sinon.restore();
        await cleanupTables();
    });

    async function cleanupTables() {
        await testUtils.knex('automated_email_recipients').del();
        await testUtils.knex('welcome_email_automation_runs').del();
        await testUtils.knex('welcome_email_automated_emails').del();
        await testUtils.knex('welcome_email_automations').del();
        await testUtils.knex('members').del();
        await testUtils.knex('email_design_settings')
            .where('slug', 'like', 'default-automated-email-%')
            .del();
    }

    async function insert(table, attrs) {
        await testUtils.knex(table).insert(attrs);
        return attrs;
    }

    async function createMember(attrs = {}) {
        const currentTime = new Date();
        return insert('members', {
            id: ObjectId().toHexString(),
            uuid: crypto.randomUUID(),
            transient_id: crypto.randomUUID(),
            email: `member-${ObjectId().toHexString()}@example.com`,
            status: 'free',
            name: 'Test Member',
            enable_comment_notifications: true,
            email_count: 0,
            email_opened_count: 0,
            email_disabled: false,
            created_at: currentTime,
            updated_at: currentTime,
            ...attrs
        });
    }

    async function createEmailDesignSetting(attrs = {}) {
        const currentTime = new Date();
        return insert('email_design_settings', {
            id: ObjectId().toHexString(),
            slug: `default-automated-email-${ObjectId().toHexString()}`,
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
            created_at: currentTime,
            updated_at: currentTime,
            ...attrs
        });
    }

    async function createAutomation(attrs = {}) {
        const currentTime = new Date();
        return insert('welcome_email_automations', {
            id: ObjectId().toHexString(),
            status: 'active',
            name: `Automation ${ObjectId().toHexString()}`,
            slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
            created_at: currentTime,
            updated_at: currentTime,
            ...attrs
        });
    }

    async function createAutomatedEmail(attrs = {}) {
        const emailDesignSetting = attrs.email_design_setting_id ? null : await createEmailDesignSetting();
        const currentTime = new Date();
        return insert('welcome_email_automated_emails', {
            id: ObjectId().toHexString(),
            welcome_email_automation_id: attrs.welcome_email_automation_id,
            next_welcome_email_automated_email_id: null,
            delay_days: 0,
            subject: 'Welcome!',
            lexical: null,
            sender_name: null,
            sender_email: null,
            sender_reply_to: null,
            email_design_setting_id: attrs.email_design_setting_id ?? emailDesignSetting.id,
            created_at: currentTime,
            updated_at: currentTime,
            ...attrs
        });
    }

    async function createRun(attrs = {}) {
        const currentTime = new Date();
        return insert('welcome_email_automation_runs', {
            id: ObjectId().toHexString(),
            welcome_email_automation_id: attrs.welcome_email_automation_id,
            member_id: attrs.member_id,
            next_welcome_email_automated_email_id: attrs.next_welcome_email_automated_email_id ?? null,
            ready_at: attrs.ready_at ?? currentTime,
            step_started_at: attrs.step_started_at ?? null,
            step_attempts: attrs.step_attempts ?? 0,
            exit_reason: attrs.exit_reason ?? null,
            created_at: currentTime,
            updated_at: currentTime,
            ...attrs
        });
    }

    async function readRun(id) {
        return await testUtils.knex('welcome_email_automation_runs').where({id}).first();
    }

    async function readTrackedRecipients() {
        return await testUtils.knex('automated_email_recipients').select().orderBy('id');
    }

    it('does nothing if no runs exist in database', async function () {
        await poll(options);

        sinon.assert.notCalled(options.memberWelcomeEmailService.init);
        sinon.assert.notCalled(options.memberWelcomeEmailService.api.loadMemberWelcomeEmails);
        sinon.assert.notCalled(options.memberWelcomeEmailService.api.send);
        sinon.assert.notCalled(options.enqueueAnotherPollNow);
        sinon.assert.notCalled(options.enqueueAnotherPollAt);
        assert.deepEqual(await readTrackedRecipients(), []);
    });

    it('sends nothing but enqueues future poll if no runs are ready now', async function () {
        const automation = await createAutomation();
        const automatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: automation.id
        });
        const member = await createMember();

        // Not ready yet
        await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: automatedEmail.id,
            ready_at: new Date(Date.now() + 60 * 1000)
        });

        // No next email
        await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: null,
            ready_at: new Date(Date.now() - 60 * 1000)
        });

        // Started but still locked
        await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: automatedEmail.id,
            ready_at: new Date(Date.now() - 60 * 1000),
            step_started_at: new Date(Date.now() - LOCK_TIMEOUT_MS + 60 * 1000)
        });

        await poll(options);

        sinon.assert.notCalled(options.memberWelcomeEmailService.init);
        sinon.assert.notCalled(options.memberWelcomeEmailService.api.loadMemberWelcomeEmails);
        sinon.assert.notCalled(options.memberWelcomeEmailService.api.send);
        sinon.assert.notCalled(options.enqueueAnotherPollNow);
        sinon.assert.calledWith(options.enqueueAnotherPollAt, new Date(Date.now() + 60 * 1000));
        assert.deepEqual(await readTrackedRecipients(), []);
    });

    it('loads and sends emails, then marks their jobs finished', async function () {
        const freeAutomation = await createAutomation({
            slug: MEMBER_WELCOME_EMAIL_SLUGS.free
        });
        const freeAutomatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: freeAutomation.id
        });
        const paidAutomation = await createAutomation({
            slug: MEMBER_WELCOME_EMAIL_SLUGS.paid
        });
        const paidAutomatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: paidAutomation.id
        });
        const member1 = await createMember({
            email: 'member1@example.com',
            name: 'Member One'
        });
        const member2 = await createMember({
            email: 'member2@example.com',
            name: 'Member Two',
            status: 'paid'
        });

        const run1 = await createRun({
            welcome_email_automation_id: freeAutomation.id,
            member_id: member1.id,
            next_welcome_email_automated_email_id: freeAutomatedEmail.id,
            ready_at: new Date(Date.now() - 1000)
        });
        const run2 = await createRun({
            welcome_email_automation_id: paidAutomation.id,
            member_id: member2.id,
            next_welcome_email_automated_email_id: paidAutomatedEmail.id,
            ready_at: new Date(Date.now() - 1000)
        });

        await poll(options);

        sinon.assert.calledOnce(options.memberWelcomeEmailService.init);
        sinon.assert.calledOnce(options.memberWelcomeEmailService.api.loadMemberWelcomeEmails);
        sinon.assert.notCalled(options.enqueueAnotherPollNow);

        sinon.assert.calledWith(options.memberWelcomeEmailService.api.send, sinon.match({
            member: {
                name: 'Member One',
                email: 'member1@example.com',
                uuid: member1.uuid
            },
            memberStatus: 'free'
        }));
        sinon.assert.calledWith(options.memberWelcomeEmailService.api.send, sinon.match({
            member: {
                name: 'Member Two',
                email: 'member2@example.com',
                uuid: member2.uuid
            },
            memberStatus: 'paid'
        }));

        const updatedRun1 = await readRun(run1.id);
        assert.equal(updatedRun1.exit_reason, 'finished');
        assert.equal(updatedRun1.next_welcome_email_automated_email_id, null);
        assert.equal(updatedRun1.ready_at, null);
        assert.equal(updatedRun1.step_started_at, null);
        assert.equal(updatedRun1.step_attempts, 0);

        const updatedRun2 = await readRun(run2.id);
        assert.equal(updatedRun2.exit_reason, 'finished');
        assert.equal(updatedRun2.next_welcome_email_automated_email_id, null);
        assert.equal(updatedRun2.ready_at, null);
        assert.equal(updatedRun2.step_started_at, null);
        assert.equal(updatedRun2.step_attempts, 0);

        const recipients = await readTrackedRecipients();
        const memberEmails = recipients.map(r => r.member_email);
        assert.equal(memberEmails.length, 2);
        assert(memberEmails.includes('member1@example.com'));
        assert(memberEmails.includes('member2@example.com'));
    });

    it('requests retry if email send fails', async function () {
        const automation = await createAutomation({
            slug: MEMBER_WELCOME_EMAIL_SLUGS.paid
        });
        const automatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: automation.id
        });
        const member = await createMember({
            email: 'retry@example.com',
            name: 'Retry Member',
            status: 'paid'
        });
        const run = await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: automatedEmail.id,
            ready_at: new Date(Date.now() - 1000)
        });
        const sendError = new Error('send failed');
        options.memberWelcomeEmailService.api.send.rejects(sendError);

        await poll(options);

        sinon.assert.calledOnce(options.memberWelcomeEmailService.init);
        sinon.assert.calledOnce(options.memberWelcomeEmailService.api.loadMemberWelcomeEmails);
        sinon.assert.calledOnce(options.memberWelcomeEmailService.api.send);
        sinon.assert.notCalled(options.enqueueAnotherPollNow);

        sinon.assert.calledWith(options.enqueueAnotherPollAt, new Date(Date.now() + RETRY_DELAY_MS));

        const updatedRun = await readRun(run.id);
        assert.equal(updatedRun.exit_reason, null);
        assert.equal(updatedRun.step_started_at, null);
        assert.equal(updatedRun.next_welcome_email_automated_email_id, automatedEmail.id);
        assert.equal(updatedRun.step_attempts, 1);

        const readyAt = updatedRun.ready_at instanceof Date ?
            updatedRun.ready_at.getTime() :
            Date.parse(updatedRun.ready_at.replace(' ', 'T') + 'Z');
        assert.equal(readyAt, Date.now() + RETRY_DELAY_MS);
    });

    it('rolls back tracked recipient if marking run finished fails', async function () {
        const automation = await createAutomation();
        const automatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: automation.id
        });
        const member = await createMember();
        const run = await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: automatedEmail.id,
            ready_at: new Date(Date.now() - 1000)
        });

        const originalEdit = WelcomeEmailAutomationRun.edit;
        sinon.stub(WelcomeEmailAutomationRun, 'edit').callsFake(async function (attrs) {
            if (attrs.exit_reason === 'finished') {
                throw new Error('mark finished failed');
            }
            return originalEdit.apply(this, arguments);
        });

        await poll(options);

        sinon.assert.calledOnce(options.memberWelcomeEmailService.api.send);
        sinon.assert.calledWith(options.enqueueAnotherPollAt, new Date(Date.now() + RETRY_DELAY_MS));

        const updatedRun = await readRun(run.id);
        assert.equal(updatedRun.exit_reason, null);
        assert.equal(updatedRun.step_started_at, null);
        assert.equal(updatedRun.next_welcome_email_automated_email_id, automatedEmail.id);
        assert.equal(updatedRun.step_attempts, 1);
        assert.deepEqual(await readTrackedRecipients(), []);
    });

    it('marks a run permanently failed if on final attempt', async function () {
        const automation = await createAutomation();
        const automatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: automation.id
        });
        const member = await createMember();
        const run = await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: automatedEmail.id,
            ready_at: new Date(Date.now() - 1000),
            step_attempts: 10
        });
        const sendError = new Error('send failed');
        options.memberWelcomeEmailService.api.send.rejects(sendError);

        await poll(options);

        sinon.assert.notCalled(options.memberWelcomeEmailService.api.send);
        sinon.assert.notCalled(options.enqueueAnotherPollNow);
        sinon.assert.notCalled(options.enqueueAnotherPollAt);

        const updatedRun = await readRun(run.id);
        assert.equal(updatedRun.exit_reason, 'email send failed');
        assert.equal(updatedRun.next_welcome_email_automated_email_id, null);
        assert.equal(updatedRun.ready_at, null);
        assert.equal(updatedRun.step_started_at, null);
        assert.equal(updatedRun.step_attempts, 0);
    });

    it('fails if run stored with more attempts than now supported', async function () {
        const automation = await createAutomation();
        const automatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: automation.id
        });
        const member = await createMember();
        const run = await createRun({
            welcome_email_automation_id: automation.id,
            member_id: member.id,
            next_welcome_email_automated_email_id: automatedEmail.id,
            ready_at: new Date(Date.now() - 1000),
            step_attempts: 99
        });

        await poll(options);

        sinon.assert.notCalled(options.memberWelcomeEmailService.api.send);
        sinon.assert.notCalled(options.enqueueAnotherPollNow);

        const updatedRun = await readRun(run.id);
        assert.equal(updatedRun.exit_reason, 'email send failed');
        assert.equal(updatedRun.next_welcome_email_automated_email_id, null);
        assert.equal(updatedRun.ready_at, null);
        assert.equal(updatedRun.step_started_at, null);
        assert.equal(updatedRun.step_attempts, 0);
    });

    it('dispatches another poll event when batch size reaches limit', async function () {
        const automation = await createAutomation();
        const automatedEmail = await createAutomatedEmail({
            welcome_email_automation_id: automation.id
        });
        const member = await createMember();
        for (let i = 0; i < MAX_RUNS_PER_BATCH + 3; i += 1) {
            await createRun({
                welcome_email_automation_id: automation.id,
                member_id: member.id,
                next_welcome_email_automated_email_id: automatedEmail.id,
                ready_at: new Date(Date.now() - 1000)
            });
        }

        await poll(options);

        sinon.assert.callCount(options.memberWelcomeEmailService.api.send, MAX_RUNS_PER_BATCH);
        sinon.assert.calledOnce(options.enqueueAnotherPollNow);
    });
});
