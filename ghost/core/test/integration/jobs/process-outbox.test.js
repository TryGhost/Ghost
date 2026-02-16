// @ts-nocheck - Models are dynamically loaded
const assert = require('node:assert/strict');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const mailService = require('../../../core/server/services/mail');
const mockManager = require('../../utils/e2e-framework-mock-manager');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../../core/server/services/member-welcome-emails/constants');

const JOB_NAME = 'process-outbox-test';
const processOutbox = require('../../../core/server/services/outbox/jobs/lib/process-outbox');

describe('Process Outbox Job', function () {
    let jobService;

    before(async function () {
        await testUtils.startGhost();
        jobService = require('../../../core/server/services/jobs/job-service');
    });

    afterEach(async function () {
        sinon.restore();
        mockManager.restore();
        await db.knex('outbox').del();
        await db.knex('automated_emails').where('slug', MEMBER_WELCOME_EMAIL_SLUGS.free).del();
        try {
            await jobService.removeJob(JOB_NAME);
        } catch (err) {
            // Job might not exist if test failed early
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

    describe('with welcomeEmails enabled', function () {
        beforeEach(async function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
            mockManager.mockLabsEnabled('welcomeEmails');

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
        });

        it('processes pending outbox entries and deletes them after success', async function () {
            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member123',
                    email: 'test@example.com',
                    name: 'Test Member',
                    source: 'member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            const entriesBeforeJob = await models.Outbox.findAll();
            assert.equal(entriesBeforeJob.length, 1);

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 0);
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 1);
        });

        it('does nothing when there are no pending entries', async function () {
            const entriesBeforeJob = await models.Outbox.findAll();
            assert.equal(entriesBeforeJob.length, 0);

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 0);
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 0);
        });

        it('processes multiple entries in a batch', async function () {
            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    email: 'test1@example.com',
                    name: 'Test Member 1',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member2',
                    email: 'test2@example.com',
                    name: 'Test Member 2',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member3',
                    email: 'test3@example.com',
                    name: 'Test Member 3',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            const entriesBeforeJob = await models.Outbox.findAll();
            assert.equal(entriesBeforeJob.length, 3);

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 0);
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 3);
        });

        it('ignores entries that are not pending', async function () {
            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    email: 'test1@example.com',
                    name: 'Test Member 1',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PROCESSING
            });

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member2',
                    email: 'test2@example.com',
                    name: 'Test Member 2',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.FAILED
            });

            const entriesBeforeJob = await models.Outbox.findAll();
            assert.equal(entriesBeforeJob.length, 2);

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 2);
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 0);
        });

        it('increments retry_count and keeps entry pending when handler fails', async function () {
            mailService.GhostMailer.prototype.send.rejects(new Error('Mail service unavailable'));

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    email: 'retry@example.com',
                    name: 'Retry Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING,
                retry_count: 0
            });

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);

            const entry = entriesAfterJob.models[0];
            assert.equal(entry.get('status'), OUTBOX_STATUSES.PENDING);
            assert.equal(entry.get('retry_count'), 1);
            assert.ok(entry.get('message').includes('Mail service unavailable'));
        });

        it('marks entry as failed when max retries exceeded', async function () {
            mailService.GhostMailer.prototype.send.rejects(new Error('Persistent failure'));

            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member1',
                    email: 'maxretry@example.com',
                    name: 'Max Retry Member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING,
                retry_count: 1
            });

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);

            const entry = entriesAfterJob.models[0];
            assert.equal(entry.get('status'), OUTBOX_STATUSES.FAILED);
            assert.equal(entry.get('retry_count'), 2);
        });
    });

    describe('with welcomeEmails disabled', function () {
        beforeEach(async function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
            mockManager.mockLabsDisabled('welcomeEmails');
        });

        it('skips processing and leaves entries pending', async function () {
            await models.Outbox.add({
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({
                    memberId: 'member123',
                    email: 'test@example.com',
                    name: 'Test Member',
                    source: 'member',
                    status: 'free'
                }),
                status: OUTBOX_STATUSES.PENDING
            });

            const entriesBeforeJob = await models.Outbox.findAll();
            assert.equal(entriesBeforeJob.length, 1);

            await scheduleInlineJob();

            const entriesAfterJob = await models.Outbox.findAll();
            assert.equal(entriesAfterJob.length, 1);
            assert.equal(entriesAfterJob.models[0].get('status'), OUTBOX_STATUSES.PENDING);
            assert.equal(mailService.GhostMailer.prototype.send.callCount, 0);
        });
    });
});
