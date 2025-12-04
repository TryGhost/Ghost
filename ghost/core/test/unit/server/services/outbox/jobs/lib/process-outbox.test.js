const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');

describe('Outbox - process-outbox', function () {
    let processOutbox;
    let loggingStub;
    let processEntriesStub;
    let memberWelcomeEmailServiceStub;
    let dbStub;
    let trxStub;
    let queryStub;

    const OUTBOX_STATUSES = {
        PENDING: 'pending',
        PROCESSING: 'processing',
        FAILED: 'failed',
        COMPLETED: 'completed'
    };

    const MESSAGES = {
        CANCELLED: 'Outbox processing cancelled',
        NO_ENTRIES: 'No pending outbox entries to process'
    };

    beforeEach(function () {
        loggingStub = {
            info: sinon.stub(),
            error: sinon.stub()
        };

        processEntriesStub = sinon.stub().resolves({processed: 0, failed: 0});

        memberWelcomeEmailServiceStub = {
            init: sinon.stub(),
            api: {
                loadMemberWelcomeEmails: sinon.stub().resolves()
            }
        };

        queryStub = {
            where: sinon.stub().returnsThis(),
            whereNull: sinon.stub().returnsThis(),
            orWhere: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            limit: sinon.stub().returnsThis(),
            forUpdate: sinon.stub().returnsThis(),
            select: sinon.stub().resolves([]),
            whereIn: sinon.stub().returnsThis(),
            update: sinon.stub().resolves()
        };

        trxStub = sinon.stub().returns(queryStub);

        dbStub = {
            knex: {
                transaction: sinon.stub().callsFake(async (callback) => {
                    await callback(trxStub);
                }),
                raw: sinon.stub().returns('CURRENT_TIMESTAMP')
            }
        };

        processOutbox = rewire('../../../../../../../core/server/services/outbox/jobs/lib/process-outbox');
        processOutbox.__set__('logging', loggingStub);
        processOutbox.__set__('db', dbStub);
        processOutbox.__set__('processEntries', processEntriesStub);
        processOutbox.__set__('memberWelcomeEmailService', memberWelcomeEmailServiceStub);
        processOutbox.__set__('OUTBOX_STATUSES', OUTBOX_STATUSES);
        processOutbox.__set__('MESSAGES', MESSAGES);
        processOutbox.__set__('BATCH_SIZE', 100);
        processOutbox.__set__('MAX_ENTRIES_PER_JOB', 1000);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('service initialization', function () {
        it('initializes welcome email service before processing', async function () {
            await processOutbox();

            sinon.assert.calledOnce(memberWelcomeEmailServiceStub.init);
        });

        it('loads templates before processing', async function () {
            await processOutbox();

            sinon.assert.calledOnce(memberWelcomeEmailServiceStub.api.loadMemberWelcomeEmails);
        });

        it('logs error and returns early when service initialization fails', async function () {
            memberWelcomeEmailServiceStub.api.loadMemberWelcomeEmails.rejects(new Error('Template load failed'));

            const result = await processOutbox();

            // Logs error
            sinon.assert.calledOnce(loggingStub.error);
            loggingStub.error.getCall(0).args[0].should.containEql('Service initialization failed');

            // Returns abort message
            result.should.containEql('Job aborted');
            result.should.containEql('Service initialization failed');
        });
    });

    describe('fetchPendingEntries', function () {
        it('fetches pending entries with PENDING status', async function () {
            await processOutbox();

            sinon.assert.called(trxStub);
            sinon.assert.calledWith(trxStub, 'outbox');
            sinon.assert.calledWith(queryStub.where, 'status', OUTBOX_STATUSES.PENDING);
        });

        it('orders entries by created_at ascending', async function () {
            await processOutbox();

            sinon.assert.calledWith(queryStub.orderBy, 'created_at', 'asc');
        });

        it('uses forUpdate lock for entries', async function () {
            await processOutbox();

            sinon.assert.calledOnce(queryStub.forUpdate);
        });

        it('updates fetched entries to PROCESSING status', async function () {
            queryStub.select
                .onFirstCall().resolves([
                    {id: '1', event_type: 'MemberCreatedEvent', payload: '{}'},
                    {id: '2', event_type: 'MemberCreatedEvent', payload: '{}'}
                ])
                .onSecondCall().resolves([]);
            processEntriesStub.resolves({processed: 2, failed: 0});

            await processOutbox();

            sinon.assert.calledWith(queryStub.whereIn, 'id', ['1', '2']);
            sinon.assert.calledOnce(queryStub.update);
            const updateArgs = queryStub.update.getCall(0).args[0];
            updateArgs.status.should.equal(OUTBOX_STATUSES.PROCESSING);
        });
    });

    describe('batch processing', function () {
        it('processes entries in batches', async function () {
            queryStub.select
                .onFirstCall().resolves([{id: '1', event_type: 'MemberCreatedEvent', payload: '{}'}])
                .onSecondCall().resolves([]);
            processEntriesStub.resolves({processed: 1, failed: 0});

            await processOutbox();

            sinon.assert.calledOnce(processEntriesStub);
        });

        it('continues processing batches until no more entries', async function () {
            queryStub.select
                .onFirstCall().resolves([{id: '1', event_type: 'MemberCreatedEvent', payload: '{}'}])
                .onSecondCall().resolves([{id: '2', event_type: 'MemberCreatedEvent', payload: '{}'}])
                .onThirdCall().resolves([]);
            processEntriesStub.resolves({processed: 1, failed: 0});

            await processOutbox();

            sinon.assert.calledTwice(processEntriesStub);
        });

        it('logs batch completion info', async function () {
            queryStub.select
                .onFirstCall().resolves([{id: '1', event_type: 'MemberCreatedEvent', payload: '{}'}])
                .onSecondCall().resolves([]);
            processEntriesStub.resolves({processed: 1, failed: 0});

            await processOutbox();

            sinon.assert.calledOnce(loggingStub.info);
            const infoMessage = loggingStub.info.getCall(0).args[0];
            infoMessage.should.containEql('Batch complete');
            infoMessage.should.containEql('1 processed');
            infoMessage.should.containEql('0 failed');
        });

        it('respects MAX_ENTRIES_PER_JOB limit', async function () {
            processOutbox.__set__('MAX_ENTRIES_PER_JOB', 5);
            processOutbox.__set__('BATCH_SIZE', 3);

            queryStub.select
                .onFirstCall().resolves([
                    {id: '1', event_type: 'MemberCreatedEvent', payload: '{}'},
                    {id: '2', event_type: 'MemberCreatedEvent', payload: '{}'},
                    {id: '3', event_type: 'MemberCreatedEvent', payload: '{}'}
                ])
                .onSecondCall().resolves([
                    {id: '4', event_type: 'MemberCreatedEvent', payload: '{}'},
                    {id: '5', event_type: 'MemberCreatedEvent', payload: '{}'}
                ])
                .onThirdCall().resolves([]);
            processEntriesStub
                .onFirstCall().resolves({processed: 3, failed: 0})
                .onSecondCall().resolves({processed: 2, failed: 0});

            await processOutbox();

            processEntriesStub.callCount.should.equal(2);
        });
    });

    describe('return messages', function () {
        it('returns "No pending outbox entries" message when no entries found', async function () {
            queryStub.select.resolves([]);

            const result = await processOutbox();

            result.should.containEql('No pending outbox entries to process');
        });

        it('returns summary message with processed count, failed count, and duration', async function () {
            queryStub.select
                .onFirstCall().resolves([
                    {id: '1', event_type: 'MemberCreatedEvent', payload: '{}'},
                    {id: '2', event_type: 'MemberCreatedEvent', payload: '{}'}
                ])
                .onSecondCall().resolves([]);
            processEntriesStub.resolves({processed: 1, failed: 1});

            const result = await processOutbox();

            result.should.containEql('Job complete');
            result.should.containEql('Processed 1 outbox entries');
            result.should.containEql('1 failed');
            result.should.match(/\d+\.\d+s$/);
        });
    });

    describe('error handling', function () {
        it('handles unknown errors during template loading', async function () {
            memberWelcomeEmailServiceStub.api.loadMemberWelcomeEmails.rejects(new Error());

            const result = await processOutbox();

            result.should.containEql('Job aborted');
        });
    });
});

