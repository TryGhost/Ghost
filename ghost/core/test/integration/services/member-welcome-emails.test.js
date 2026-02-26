const assert = require('node:assert/strict');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const mailService = require('../../../core/server/services/mail');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');
const processOutbox = require('../../../core/server/services/outbox/jobs/lib/process-outbox');

describe('Member Welcome Emails Integration', function () {
    let membersService;
    let defaultNewsletterSenderState = null;

    before(async function () {
        await testUtils.setup('default')();
        membersService = require('../../../core/server/services/members');
    });

    beforeEach(async function () {
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

        await db.knex('automated_emails').insert({
            id: ObjectId().toHexString(),
            status: 'active',
            name: 'Free Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
            subject: 'Welcome to {site_title}',
            lexical,
            created_at: new Date()
        });

        await db.knex('automated_emails').insert({
            id: ObjectId().toHexString(),
            status: 'active',
            name: 'Paid Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
            subject: 'Welcome paid member to {site_title}',
            lexical,
            created_at: new Date()
        });
    });

    afterEach(async function () {
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
        await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();
        await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();
    });

    describe('Member creation with welcome emails', function () {
        it('creates outbox entry when member source is "member"', async function () {
            const member = await membersService.api.members.create({
                email: 'welcome-test@example.com',
                name: 'Welcome Test Member'
            }, {});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 1);
            const entry = outboxEntries.models[0];
            assert.equal(entry.get('event_type'), 'MemberCreatedEvent');
            assert.equal(entry.get('status'), OUTBOX_STATUSES.PENDING);

            const payload = JSON.parse(entry.get('payload'));
            assert.equal(payload.memberId, member.id);
            assert.equal(payload.email, 'welcome-test@example.com');
            assert.equal(payload.name, 'Welcome Test Member');
            assert.equal(payload.source, 'member');
            assert.equal(payload.status, 'free');
        });

        it('does NOT create outbox entry when member is imported', async function () {
            await membersService.api.members.create({
                email: 'imported@example.com',
                name: 'Imported Member'
            }, {context: {import: true}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('does NOT create outbox entry when member is created by admin', async function () {
            await membersService.api.members.create({
                email: 'admin-created@example.com',
                name: 'Admin Created Member'
            }, {context: {user: true}});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('creates outbox entry with correct timestamp', async function () {
            const beforeCreation = new Date(Date.now() - 1000);

            await membersService.api.members.create({
                email: 'timestamp-test@example.com',
                name: 'Timestamp Test'
            }, {});

            const afterCreation = new Date(Date.now() + 1000);

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 1);
            const entry = outboxEntries.models[0];
            const payload = JSON.parse(entry.get('payload'));

            const timestamp = new Date(payload.timestamp);
            assert.ok(timestamp >= beforeCreation);
            assert.ok(timestamp <= afterCreation);
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

        it('does not send email when template is inactive', async function () {
            await db.knex('automated_emails')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .update({status: 'inactive'});

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
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
            await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
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
            await db.knex('automated_emails')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid)
                .update({status: 'inactive'});

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'paid_member_1',
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
            await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'paid_member_2',
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

            const automatedEmail = await db.knex('automated_emails')
                .where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free)
                .first();
            assert.equal(record.automated_email_id, automatedEmail.id);
        });

        it('sends email to member email', async function () {
            const memberEmail = 'real-member@example.com';

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: ObjectId().toHexString(),
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
    });
});
