// @ts-nocheck - Models are dynamically loaded
const assert = require('assert/strict');
const path = require('path');
const sinon = require('sinon');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const {OUTBOX_STATUSES} = require('../../../core/server/models/outbox');
const db = require('../../../core/server/data/db');
const mailService = require('../../../core/server/services/mail');

const JOB_NAME = 'process-outbox-test';
const JOB_PATH = path.resolve(__dirname, '../../../core/server/services/member-welcome-emails/jobs/process-outbox.js');
const runProcessOutbox = require(JOB_PATH);

describe('Process Outbox Job', function () {
    let jobService;

    before(async function () {
        await testUtils.startGhost();
        jobService = require('../../../core/server/services/jobs/job-service');
    });

    beforeEach(function () {
        sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail sent');
    });

    afterEach(async function () {
        sinon.restore();
        await db.knex('outbox').del();
        try {
            await jobService.removeJob(JOB_NAME);
        } catch (err) {
            // Job might not exist if test failed early
        }
    });

    async function scheduleInlineJob() {
        await jobService.addJob({
            name: JOB_NAME,
            job: () => runProcessOutbox({inline: true}),
            offloaded: false
        });

        await jobService.awaitCompletion(JOB_NAME);
    }

    it('processes pending outbox entries and deletes them after success', async function () {
        await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({
                memberId: 'member123',
                email: 'test@example.com',
                name: 'Test Member',
                source: 'member'
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
                name: 'Test Member 1'
            }),
            status: OUTBOX_STATUSES.PENDING
        });

        await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({
                memberId: 'member2',
                email: 'test2@example.com',
                name: 'Test Member 2'
            }),
            status: OUTBOX_STATUSES.PENDING
        });

        await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({
                memberId: 'member3',
                email: 'test3@example.com',
                name: 'Test Member 3'
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
                name: 'Test Member 1'
            }),
            status: OUTBOX_STATUSES.PROCESSING
        });

        await models.Outbox.add({
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({
                memberId: 'member2',
                email: 'test2@example.com',
                name: 'Test Member 2'
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
});
