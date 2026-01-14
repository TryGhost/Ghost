const assert = require('assert/strict');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const configUtils = require('../../utils/config-utils');
const mailService = require('../../../core/server/services/mail');
const config = require('../../../core/shared/config');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');
const processOutbox = require('../../../core/server/services/outbox/jobs/lib/process-outbox');

describe('Member Welcome Emails Integration', function () {
    let membersService;

    before(async function () {
        await testUtils.setup('default')();
        membersService = require('../../../core/server/services/members');
    });

    beforeEach(async function () {
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
            subject: 'Welcome to {{site.title}}',
            lexical,
            created_at: new Date()
        });

        await db.knex('automated_emails').insert({
            id: ObjectId().toHexString(),
            status: 'active',
            name: 'Paid Member Welcome Email',
            slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
            subject: 'Welcome paid member to {{site.title}}',
            lexical,
            created_at: new Date()
        });
    });

    afterEach(async function () {
        await db.knex('outbox').del();
        await db.knex('members').del();
        await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();
        await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();
        await configUtils.restore();
    });

    describe('Member creation with welcome emails enabled', function () {
        it('creates outbox entry when member source is "member"', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

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

        it('does NOT create outbox entry when config is not set', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', '');

            await membersService.api.members.create({
                email: 'no-welcome@example.com',
                name: 'No Welcome Member'
            }, {});

            const outboxEntries = await models.Outbox.findAll({
                filter: 'event_type:MemberCreatedEvent'
            });

            assert.equal(outboxEntries.length, 0);
        });

        it('does NOT create outbox entry when member is imported', async function () {
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

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
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

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
            configUtils.set('memberWelcomeEmailTestInbox', 'test-inbox@example.com');

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
            sinon.stub(config, 'get').callsFake(function (key) {
                if (key === 'memberWelcomeEmailTestInbox') {
                    return 'test-inbox@example.com';
                }
                return config.get.wrappedMethod.call(config, key);
            });
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

            assert.equal(mailService.GhostMailer.prototype.send.callCount, 0);

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.ok(entriesAfterJob.models[0].get('message').includes('inactive'));
        });

        it('sends email using default template when no DB template exists', async function () {
            // Delete the free welcome email from the database
            await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    email: 'default-template@example.com',
                    name: 'Default Template Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            // Email should be sent using default template
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 1);
            const sentEmail = mailService.GhostMailer.prototype.send.firstCall.args[0];
            assert.ok(sentEmail.html.includes('Thanks for subscribing'));
            assert.equal(sentEmail.to, 'test-inbox@example.com');

            // Outbox entry should be processed (deleted after success)
            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 0);
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

            assert.equal(mailService.GhostMailer.prototype.send.callCount, 0);

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.ok(entriesAfterJob.models[0].get('message').includes('inactive'));
        });

        it('sends email using default paid template when no DB paid template exists', async function () {
            // Delete the paid welcome email from the database
            await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.paid).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'paid_member_2',
                    email: 'paid-default-template@example.com',
                    name: 'Paid Default Template Member',
                    status: 'paid'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            // Email should be sent using default paid template
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 1);
            const sentEmail = mailService.GhostMailer.prototype.send.firstCall.args[0];
            assert.ok(sentEmail.html.includes('thank you for your support'));
            assert.equal(sentEmail.to, 'test-inbox@example.com');

            // Outbox entry should be processed (deleted after success)
            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 0);
        });

        it('prefers DB template over default when DB template exists and is active', async function () {
            // DB template is already set up in beforeEach with custom content
            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member_db_template',
                    email: 'db-template@example.com',
                    name: 'DB Template Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            // Email should be sent using DB template content
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 1);
            const sentEmail = mailService.GhostMailer.prototype.send.firstCall.args[0];
            // The DB template has "Welcome to our site!" not the default "Thanks for subscribing"
            assert.ok(sentEmail.html.includes('Welcome to our site!'));
            assert.ok(!sentEmail.html.includes('Thanks for subscribing'));

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 0);
        });

        it('transforms __GHOST_URL__ placeholders to actual site URL in default templates', async function () {
            await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member_url_test',
                    email: 'url-test@example.com',
                    name: 'URL Test Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await scheduleInlineJob();

            assert.equal(mailService.GhostMailer.prototype.send.callCount, 1);
            const sentEmail = mailService.GhostMailer.prototype.send.firstCall.args[0];
            assert.ok(!sentEmail.html.includes('__GHOST_URL__'), 'Email should not contain __GHOST_URL__ placeholder');
            assert.ok(sentEmail.html.includes('http://'), 'Email should contain actual URL');
        });
    });
});

