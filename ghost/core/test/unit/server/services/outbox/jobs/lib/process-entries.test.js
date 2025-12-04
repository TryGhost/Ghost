const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');

describe('Outbox - process-entries', function () {
    let processEntries;
    let loggingStub;
    let mockHandler;
    let knexChain;
    let knexFn;
    let dbStub;

    const OUTBOX_STATUSES = {
        PENDING: 'pending',
        PROCESSING: 'processing',
        FAILED: 'failed',
        COMPLETED: 'completed'
    };

    beforeEach(function () {
        loggingStub = {
            warn: sinon.stub(),
            error: sinon.stub()
        };

        mockHandler = {
            handle: sinon.stub().resolves(),
            getLogInfo: sinon.stub().returns('test@example.com'),
            LOG_KEY: '[OUTBOX][MEMBER-WELCOME-EMAIL]'
        };

        knexChain = {
            where: sinon.stub().returnsThis(),
            delete: sinon.stub().resolves(),
            update: sinon.stub().resolves()
        };

        knexFn = sinon.stub().returns(knexChain);
        knexFn.raw = sinon.stub().returns('CURRENT_TIMESTAMP');

        dbStub = {knex: knexFn};

        processEntries = rewire('../../../../../../../core/server/services/outbox/jobs/lib/process-entries');
        processEntries.__set__('logging', loggingStub);
        processEntries.__set__('OUTBOX_STATUSES', OUTBOX_STATUSES);
        processEntries.__set__('EVENT_HANDLERS', {
            MemberCreatedEvent: mockHandler
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('processEntries', function () {
        it('processes entries using correct handler based on event_type', async function () {
            const entries = [{
                id: '1',
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({email: 'test@example.com'}),
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            sinon.assert.calledOnce(mockHandler.handle);
        });

        it('parses JSON payload and passes to handler', async function () {
            const payload = {name: 'John', email: 'john@example.com'};
            const entries = [{
                id: '1',
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify(payload),
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            const handleCall = mockHandler.handle.getCall(0);
            handleCall.args[0].payload.should.deepEqual(payload);
        });

        it('deletes entry after successful processing', async function () {
            const entries = [{
                id: 'entry-123',
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({email: 'test@example.com'}),
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            sinon.assert.calledWith(knexFn, 'outbox');
            sinon.assert.calledWith(knexChain.where, 'id', 'entry-123');
            sinon.assert.calledOnce(knexChain.delete);
        });

        it('returns processed and failed counts', async function () {
            const entries = [
                {id: '1', event_type: 'MemberCreatedEvent', payload: '{}', retry_count: 0},
                {id: '2', event_type: 'MemberCreatedEvent', payload: '{}', retry_count: 0}
            ];

            const result = await processEntries({db: dbStub, entries});

            result.should.have.property('processed', 2);
            result.should.have.property('failed', 0);
        });

        it('counts failures correctly', async function () {
            mockHandler.handle.rejects(new Error('Send failed'));

            const entries = [
                {id: '1', event_type: 'MemberCreatedEvent', payload: '{}', retry_count: 0}
            ];

            const result = await processEntries({db: dbStub, entries});

            result.should.have.property('processed', 0);
            result.should.have.property('failed', 1);
        });
    });

    describe('handler not found', function () {
        it('logs warning, updates entry as failed, and returns failure', async function () {
            const entries = [{
                id: '1',
                event_type: 'UnknownEvent',
                payload: '{}',
                retry_count: 0
            }];

            const result = await processEntries({db: dbStub, entries});

            // Logs warning
            sinon.assert.calledOnce(loggingStub.warn);
            loggingStub.warn.getCall(0).args[0].should.containEql('No handler for event type');

            // Updates entry (status is PENDING since retry_count=0 allows retry)
            sinon.assert.calledOnce(knexChain.update);
            knexChain.update.getCall(0).args[0].message.should.containEql('No handler for event type');
            knexChain.update.getCall(0).args[0].status.should.equal(OUTBOX_STATUSES.PENDING);

            // Returns failure
            result.failed.should.equal(1);
        });
    });

    describe('retry logic', function () {
        it('updates entry with retry count and pending status on failure when retries remain', async function () {
            mockHandler.handle.rejects(new Error('Temporary failure'));

            const entries = [{
                id: 'entry-789',
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            sinon.assert.calledOnce(knexChain.update);
            const updateArgs = knexChain.update.getCall(0).args[0];
            updateArgs.retry_count.should.equal(1);
            updateArgs.status.should.equal(OUTBOX_STATUSES.PENDING);
        });

        it('updates entry with failed status when max retries exceeded', async function () {
            mockHandler.handle.rejects(new Error('Persistent failure'));

            const entries = [{
                id: 'entry-999',
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                retry_count: 1
            }];

            await processEntries({db: dbStub, entries});

            const updateArgs = knexChain.update.getCall(0).args[0];
            updateArgs.retry_count.should.equal(2);
            updateArgs.status.should.equal(OUTBOX_STATUSES.FAILED);
        });

        it('truncates error messages to 2000 chars', async function () {
            const longError = 'x'.repeat(3000);
            mockHandler.handle.rejects(new Error(longError));

            const entries = [{
                id: '1',
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            const updateArgs = knexChain.update.getCall(0).args[0];
            updateArgs.message.length.should.equal(2000);
        });
    });

    describe('delete failure handling', function () {
        it('marks entry as completed if delete fails after successful processing', async function () {
            knexChain.delete.rejects(new Error('Delete failed'));

            const entries = [{
                id: 'entry-abc',
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            const updateCalls = knexChain.update.getCalls();
            const completedUpdate = updateCalls.find(call => call.args[0].status === OUTBOX_STATUSES.COMPLETED
            );
            should.exist(completedUpdate);
            completedUpdate.args[0].message.should.equal('Processed, but failed to delete outbox entry');
        });

        it('logs error when delete fails', async function () {
            knexChain.delete.rejects(new Error('Delete failed'));

            const entries = [{
                id: 'entry-def',
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            sinon.assert.calledOnce(loggingStub.error);
            const errorMessage = loggingStub.error.getCall(0).args[0];
            errorMessage.should.containEql('failed to delete outbox entry');
        });

        it('still returns success when delete fails but processing succeeded', async function () {
            knexChain.delete.rejects(new Error('Delete failed'));

            const entries = [{
                id: '1',
                event_type: 'MemberCreatedEvent',
                payload: '{}',
                retry_count: 0
            }];

            const result = await processEntries({db: dbStub, entries});

            result.processed.should.equal(1);
            result.failed.should.equal(0);
        });
    });

    describe('payload parsing errors', function () {
        it('logs error, updates entry, and returns failure when payload is invalid JSON', async function () {
            const entries = [{
                id: '1',
                event_type: 'MemberCreatedEvent',
                payload: 'not valid json',
                retry_count: 0
            }];

            const result = await processEntries({db: dbStub, entries});

            // Logs error
            sinon.assert.calledOnce(loggingStub.error);
            loggingStub.error.getCall(0).args[0].should.containEql('Failed to parse payload');

            // Updates entry
            sinon.assert.calledOnce(knexChain.update);

            // Returns failure
            result.failed.should.equal(1);
        });
    });

    describe('handler error logging', function () {
        it('logs error with member info when handler fails', async function () {
            mockHandler.handle.rejects(new Error('Send failed'));
            mockHandler.getLogInfo.returns('John (john@example.com)');

            const entries = [{
                id: '1',
                event_type: 'MemberCreatedEvent',
                payload: JSON.stringify({name: 'John', email: 'john@example.com'}),
                retry_count: 0
            }];

            await processEntries({db: dbStub, entries});

            sinon.assert.calledOnce(loggingStub.error);
            const errorMessage = loggingStub.error.getCall(0).args[0];
            errorMessage.should.containEql('John (john@example.com)');
            errorMessage.should.containEql('Send failed');
        });
    });
});
