const assert = require('node:assert/strict');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const mailService = require('../../../core/server/services/mail');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');
const memberWelcomeEmailService = require('../../../core/server/services/member-welcome-emails/service');
const processOutbox = require('../../../core/server/services/outbox/jobs/lib/process-outbox');
const labs = require('../../../core/shared/labs');

function parseDatabaseDate(date) {
    if (date instanceof Date) {
        return date;
    }

    if (typeof date === 'string') {
        return new Date(date.replace(' ', 'T') + 'Z');
    }

    return new Date(date);
}

describe('Member Welcome Emails Integration', function () {
    let membersService;
    let defaultNewsletterSenderState = null;
    let defaultEmailDesignSettingId;
    let originalLabsIsSet;

    before(async function () {
        await testUtils.setup('default')();
        membersService = require('../../../core/server/services/members');
        membersService.init();
        defaultEmailDesignSettingId = await db.knex('email_design_settings')
            .where('slug', 'default-automated-email')
            .first('id')
            .then(row => row.id);
    });

    beforeEach(async function () {
        originalLabsIsSet = labs.isSet;
        sinon.stub(labs, 'isSet').callsFake((flag) => {
            if (flag === 'welcomeEmailsDesignCustomization') {
                return false;
            }

            return originalLabsIsSet(flag);
        });

        const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();
        if (defaultNewsletter) {
            defaultNewsletterSenderState = {
                id: defaultNewsletter.id,
                sender_name: defaultNewsletter.get('sender_name'),
                sender_email: defaultNewsletter.get('sender_email'),
                sender_reply_to: defaultNewsletter.get('sender_reply_to')
            };
        } else {
            defaultNewsletterSenderState = null;
        }

        await db.knex('outbox').del();
        await db.knex('members').del();

        const lexical = JSON.stringify({
            root: {
                children: [{
                    type: 'paragraph',
                    children: [{type: 'text', text: 'Welcome to our site!'}]
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });

        const freeAutomationId = ObjectId().toHexString();
        await db.knex('welcome_email_automations').insert({
            id: freeAutomationId,
            status: 'active',
            name: 'Free Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
            created_at: new Date()
        });
        await db.knex('welcome_email_automated_emails').insert({
            id: ObjectId().toHexString(),
            welcome_email_automation_id: freeAutomationId,
            delay_days: 0,
            subject: 'Welcome to {site_title}',
            lexical,
            email_design_setting_id: defaultEmailDesignSettingId,
            created_at: new Date()
        });

        const paidAutomationId = ObjectId().toHexString();
        await db.knex('welcome_email_automations').insert({
            id: paidAutomationId,
            status: 'active',
            name: 'Paid Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
            created_at: new Date()
        });
        await db.knex('welcome_email_automated_emails').insert({
            id: ObjectId().toHexString(),
            welcome_email_automation_id: paidAutomationId,
            delay_days: 0,
            subject: 'Welcome paid member to {site_title}',
            lexical,
            email_design_setting_id: defaultEmailDesignSettingId,
            created_at: new Date()
        });
    });

    afterEach(async function () {
        sinon.restore();

        if (defaultNewsletterSenderState) {
            await db.knex('newsletters')
                .where('id', defaultNewsletterSenderState.id)
                .update({
                    sender_name: defaultNewsletterSenderState.sender_name,
                    sender_email: defaultNewsletterSenderState.sender_email,
                    sender_reply_to: defaultNewsletterSenderState.sender_reply_to
                });
        }

        await db.knex('automated_email_recipients').del();
        await db.knex('outbox').del();
        await db.knex('members').del();
        await db.knex('welcome_email_automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();
        await db.knex('welcome_email_automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();
    });

    describe('Member creation with welcome emails', function () {
        afterEach(async function () {
            await db.knex('welcome_email_automation_runs').del();
        });

        it('creates automation run when member source is "member"', async function () {
            const before = new Date(Date.now() - 1000);

            const member = await membersService.api.members.create({
                email: 'welcome-test@example.com',
                name: 'Welcome Test Member'
            }, {});

            const after = new Date(Date.now() + 1000);

            const runs = await db.knex('welcome_email_automation_runs')
                .where('member_id', member.id);

            assert.equal(runs.length, 1);
            const run = runs[0];
            assert.equal(run.member_id, member.id);
            assert.ok(run.welcome_email_automation_id);
            assert.ok(run.next_welcome_email_automated_email_id);
            assert.equal(run.step_started_at, null);
            assert.equal(run.step_attempts, 0);
            assert.equal(run.exit_reason, null);

            const timestamp = parseDatabaseDate(run.ready_at);
            assert(timestamp >= before);
            assert(timestamp <= after);
        });

        it('does NOT create automation run when member is imported', async function () {
            await membersService.api.members.create({
                email: 'imported@example.com',
                name: 'Imported Member'
            }, {context: {import: true}});

            const runs = await db.knex('welcome_email_automation_runs');
            assert.equal(runs.length, 0);
        });

        it('does NOT create automation run when member is created by admin', async function () {
            await membersService.api.members.create({
                email: 'admin-created@example.com',
                name: 'Admin Created Member'
            }, {context: {user: true}});

            const runs = await db.knex('welcome_email_automation_runs');
            assert.equal(runs.length, 0);
        });
    });

    describe('Outbox processing for welcome emails', function () {
        const JOB_NAME = 'welcome-email-outbox-test';
        let jobService;

        before(function () {
            jobService = require('../../../core/server/services/jobs/job-service');
        });

        beforeEach(function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
        });

        afterEach(async function () {
            sinon.restore();
            try {
                await jobService.removeJob(JOB_NAME);
            } catch (err) {
                // Job might not exist
            }
        });

        async function scheduleInlineJob() {
            await jobService.addJob({
                name: JOB_NAME,
                job: () => processOutbox(),
                offloaded: false
            });
            await jobService.awaitCompletion(JOB_NAME);
        }

        async function getAutomatedEmailBySlug(slug) {
            return db.knex('welcome_email_automated_emails')
                .join('welcome_email_automations', 'welcome_email_automated_emails.welcome_email_automation_id', 'welcome_email_automations.id')
                .where('welcome_email_automations.slug', slug)
                .first('welcome_email_automated_emails.*');
        }

        it('does not send email when template is inactive', async function () {
            await db.knex('welcome_email_automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .update({status: 'inactive'});

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    uuid: '11111111-1111-4111-8111-111111111111',
                    email: 'inactive@example.com',
                    name: 'Inactive Template Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.ok(entriesAfterJob.models[0].get('message').includes('inactive'));
        });

        it('does not send email when no template exists', async function () {
            await db.knex('welcome_email_automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    uuid: '22222222-2222-4222-8222-222222222222',
                    email: 'notemplate@example.com',
                    name: 'No Template Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.ok(entriesAfterJob.models[0].get('message'));
        });

        it('does not send email when paid template is inactive but entry has status paid', async function () {
            await db.knex('welcome_email_automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid)
                .update({status: 'inactive'});

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'paid_member_1',
                    uuid: '33333333-3333-4333-8333-333333333333',
                    email: 'paid-inactive@example.com',
                    name: 'Paid Inactive Template Member',
                    status: 'paid'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.ok(entriesAfterJob.models[0].get('message').includes('inactive'));
        });

        it('does not send email when no paid template exists but entry has status paid', async function () {
            await db.knex('welcome_email_automations').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'paid_member_2',
                    uuid: '44444444-4444-4444-8444-444444444444',
                    email: 'paid-notemplate@example.com',
                    name: 'Paid No Template Member',
                    status: 'paid'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.notCalled(mailService.GhostMailer.prototype.send);

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.ok(entriesAfterJob.models[0].get('message'));
        });

        it('creates automated_email_recipients record when welcome email is sent', async function () {
            const memberId = ObjectId().toHexString();
            const memberUuid = '550e8400-e29b-41d4-a716-446655440000';
            const memberEmail = 'tracking-test@example.com';
            const memberName = 'Tracking Test Member';

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId,
                    uuid: memberUuid,
                    email: memberEmail,
                    name: memberName,
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);

            const trackingRecords = await db.knex('automated_email_recipients')
                .where('member_id', memberId);

            assert.equal(trackingRecords.length, 1);

            const record = trackingRecords[0];
            assert.equal(record.member_id, memberId);
            assert.equal(record.member_uuid, memberUuid);
            assert.equal(record.member_email, memberEmail);
            assert.equal(record.member_name, memberName);

            const automatedEmail = await db.knex('welcome_email_automated_emails')
                .join('welcome_email_automations', 'welcome_email_automated_emails.welcome_email_automation_id', 'welcome_email_automations.id')
                .where('welcome_email_automations.slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first('welcome_email_automated_emails.id');
            assert.equal(record.automated_email_id, automatedEmail.id);
        });

        it('sends email to member email', async function () {
            const memberEmail = 'real-member@example.com';

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: ObjectId().toHexString(),
                    uuid: '55555555-5555-4555-8555-555555555555',
                    email: memberEmail,
                    name: 'Real Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].to, memberEmail);
            assert.deepEqual(sendCall.args[0].tags, ['member-welcome-email']);
        });

        it('uses configured sender and reply-to when sending member welcome email', async function () {
            const senderEmail = 'editor@example.com';
            const senderReplyTo = 'reply@example.com';
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Scott',
                    sender_email: senderEmail,
                    sender_reply_to: senderReplyTo
                });

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: ObjectId().toHexString(),
                    uuid: '66666666-6666-4666-8666-666666666666',
                    email: 'sender-test@example.com',
                    name: 'Sender Test',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].replyTo, senderReplyTo);
            assert.ok(sendCall.args[0].from.includes(senderEmail));
        });

        it('uses automated email sender overrides when configured', async function () {
            const defaultNewsletter = await models.Newsletter.getDefaultNewsletter();

            await db.knex('newsletters')
                .where('id', defaultNewsletter.id)
                .update({
                    sender_name: 'Newsletter Sender',
                    sender_email: 'newsletter@example.com',
                    sender_reply_to: 'newsletter-reply@example.com'
                });

            const automatedEmail = await getAutomatedEmailBySlug(MEMBER_WELCOME_EMAIL_SLUGS.free);

            await db.knex('welcome_email_automated_emails')
                .where('id', automatedEmail.id)
                .update({
                    sender_name: 'Automation Sender',
                    sender_email: 'automation@example.com',
                    sender_reply_to: 'automation-reply@example.com'
                });

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: ObjectId().toHexString(),
                    uuid: '88888888-8888-4888-8888-888888888888',
                    email: 'automation-sender-test@example.com',
                    name: 'Automation Sender Test',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.ok(sendCall.args[0].from.includes('automation@example.com'));
            assert.equal(sendCall.args[0].replyTo, 'automation-reply@example.com');
        });

        it('uses mock member UUID when sending test welcome emails', async function () {
            const automation = await db.knex('welcome_email_automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first();

            const lexical = JSON.stringify({
                root: {
                    children: [{
                        type: 'paragraph',
                        children: [{type: 'text', text: 'Your feed token is {uuid}'}]
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.init();

            await memberWelcomeEmailService.api.sendTestEmail({
                email: 'test-member@example.com',
                subject: 'Welcome test',
                lexical,
                automatedEmailId: automation.id
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.ok(sendCall.args[0].html.includes('00000000-0000-4000-8000-000000000000'));
            assert(!sendCall.args[0].html.includes('{uuid}'));
            assert(!sendCall.args[0].html.includes('%7Buuid%7D'));
        });

        it('uses automated sender overrides for test welcome emails', async function () {
            memberWelcomeEmailService.init();

            const automation = await db.knex('welcome_email_automations')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first();
            const automatedEmail = await getAutomatedEmailBySlug(MEMBER_WELCOME_EMAIL_SLUGS.free);

            await db.knex('welcome_email_automated_emails')
                .where('id', automatedEmail.id)
                .update({
                    sender_name: 'Automation Sender',
                    sender_email: 'automation@example.com',
                    sender_reply_to: 'automation-reply@example.com'
                });

            await memberWelcomeEmailService.api.sendTestEmail({
                email: 'test-member@example.com',
                subject: 'Welcome test',
                lexical: JSON.stringify({
                    root: {
                        children: [{
                            type: 'paragraph',
                            children: [{type: 'text', text: 'Hello'}]
                        }],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'root',
                        version: 1
                    }
                }),
                automatedEmailId: automation.id
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.ok(sendCall.args[0].from.includes('automation@example.com'));
            assert.equal(sendCall.args[0].replyTo, 'automation-reply@example.com');
        });
    });

    describe('labs flag on', function () {
        beforeEach(function () {
            labs.isSet.restore();
            sinon.stub(labs, 'isSet').callsFake((flag) => {
                if (flag === 'welcomeEmailsDesignCustomization') {
                    return true;
                }

                return originalLabsIsSet(flag);
            });
            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.init();
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
        });

        it('reinitializes the service when the labs mode changes', function () {
            labs.isSet.restore();
            sinon.stub(labs, 'isSet').callsFake((flag) => {
                if (flag === 'welcomeEmailsDesignCustomization') {
                    return false;
                }

                return originalLabsIsSet(flag);
            });

            memberWelcomeEmailService.api = null;
            memberWelcomeEmailService.useDesignCustomization = undefined;
            memberWelcomeEmailService.init();
            const labsOffApi = memberWelcomeEmailService.api;

            labs.isSet.restore();
            sinon.stub(labs, 'isSet').callsFake((flag) => {
                if (flag === 'welcomeEmailsDesignCustomization') {
                    return true;
                }

                return originalLabsIsSet(flag);
            });

            memberWelcomeEmailService.init();

            assert.notEqual(memberWelcomeEmailService.api, labsOffApi);
        });

        it('uses cached design settings after welcome emails are loaded', async function () {
            await memberWelcomeEmailService.api.loadMemberWelcomeEmails();

            await db.knex('email_design_settings')
                .where('id', defaultEmailDesignSettingId)
                .update({
                    footer_content: '<p>Fresh footer content</p>',
                    show_badge: false
                });

            await memberWelcomeEmailService.api.send({
                member: {
                    email: 'fresh-design@example.com',
                    name: 'Fresh Design',
                    uuid: '77777777-7777-4777-8777-777777777777'
                },
                memberStatus: 'free'
            });

            sinon.assert.calledOnce(mailService.GhostMailer.prototype.send);
            const sendCall = mailService.GhostMailer.prototype.send.firstCall;
            assert.equal(sendCall.args[0].html.includes('Fresh footer content</p>'), false);
            assert.equal(sendCall.args[0].html.includes('https://ghost.org/?via=pbg-newsletter'), true);
        });
    });
});
