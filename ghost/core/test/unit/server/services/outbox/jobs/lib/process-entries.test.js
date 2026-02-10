const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');

describe('process-entries', function () {
    let processEntries;
    let loggingStub;
    let updateFailedEntryStub;
    let deleteProcessedEntryStub;
    let markEntryCompletedStub;
    let originalOutboxModelModule;
    let outboxModelPath;

    beforeEach(function () {
        outboxModelPath = require.resolve('../../../../../../../core/server/models/outbox');
        originalOutboxModelModule = require.cache[outboxModelPath];
        require.cache[outboxModelPath] = {
            id: outboxModelPath,
            filename: outboxModelPath,
            loaded: true,
            exports: {
                OUTBOX_STATUSES: {
                    PENDING: 'pending',
                    FAILED: 'failed',
                    COMPLETED: 'completed'
                }
            }
        };

        processEntries = rewire('../../../../../../../core/server/services/outbox/jobs/lib/process-entries.js');

        loggingStub = {
            warn: sinon.stub(),
            error: sinon.stub()
        };
        updateFailedEntryStub = sinon.stub().resolves();
        deleteProcessedEntryStub = sinon.stub().resolves();
        markEntryCompletedStub = sinon.stub().resolves();

        processEntries.__set__('logging', loggingStub);
        processEntries.__set__('updateFailedEntry', updateFailedEntryStub);
        processEntries.__set__('deleteProcessedEntry', deleteProcessedEntryStub);
        processEntries.__set__('markEntryCompleted', markEntryCompletedStub);
    });

    afterEach(function () {
        if (originalOutboxModelModule) {
            require.cache[outboxModelPath] = originalOutboxModelModule;
        } else {
            delete require.cache[outboxModelPath];
        }

        sinon.restore();
    });

    it('logs structured warning when handler is missing', async function () {
        processEntries.__set__('EVENT_HANDLERS', {});

        const result = await processEntries({
            db: {},
            entries: [{id: 'entry-1', event_type: 'UnknownEvent', retry_count: 0, payload: '{}'}]
        });

        assert.deepEqual(result, {processed: 0, failed: 1});
        sinon.assert.calledOnce(loggingStub.warn);
        assert.equal(loggingStub.warn.firstCall.args[0].event, 'outbox.entry.handler_missing');
        assert.equal(loggingStub.warn.firstCall.args[0].outbox_entry_id, 'entry-1');
    });

    it('logs structured error when payload parsing fails', async function () {
        processEntries.__set__('EVENT_HANDLERS', {
            MemberCreatedEvent: {
                LOG_KEY: '[OUTBOX][MEMBER-WELCOME-EMAIL]',
                handle: sinon.stub().resolves(),
                getLogInfo: sinon.stub().returns('member@example.com')
            }
        });

        const result = await processEntries({
            db: {},
            entries: [{id: 'entry-2', event_type: 'MemberCreatedEvent', retry_count: 0, payload: '{'}]
        });

        assert.deepEqual(result, {processed: 0, failed: 1});
        sinon.assert.calledOnce(loggingStub.error);
        assert.equal(loggingStub.error.firstCall.args[0].event, 'outbox.entry.payload_parse_failed');
        assert.equal(loggingStub.error.firstCall.args[0].outbox_entry_id, 'entry-2');
    });

    it('logs structured error when handler processing fails', async function () {
        const handlerError = new Error('Mail failed');
        processEntries.__set__('EVENT_HANDLERS', {
            MemberCreatedEvent: {
                LOG_KEY: '[OUTBOX][MEMBER-WELCOME-EMAIL]',
                handle: sinon.stub().rejects(handlerError),
                getLogInfo: sinon.stub().returns('Test Member (test@example.com)'),
                getLogContext: sinon.stub().returns({
                    member_email: 'test@example.com',
                    member_name: 'Test Member'
                })
            }
        });

        const result = await processEntries({
            db: {},
            entries: [{
                id: 'entry-3',
                event_type: 'MemberCreatedEvent',
                retry_count: 0,
                payload: JSON.stringify({email: 'test@example.com', name: 'Test Member'})
            }]
        });

        assert.deepEqual(result, {processed: 0, failed: 1});
        sinon.assert.calledOnce(loggingStub.error);
        assert.equal(loggingStub.error.firstCall.args[0].event, 'outbox.entry.handler_failed');
        assert.equal(loggingStub.error.firstCall.args[0].member_email, 'test@example.com');
    });

    it('logs structured cleanup error if entry deletion fails', async function () {
        processEntries.__set__('EVENT_HANDLERS', {
            MemberCreatedEvent: {
                LOG_KEY: '[OUTBOX][MEMBER-WELCOME-EMAIL]',
                handle: sinon.stub().resolves(),
                getLogInfo: sinon.stub().returns('member@example.com'),
                getLogContext: sinon.stub().returns({
                    member_email: 'member@example.com'
                })
            }
        });
        deleteProcessedEntryStub.rejects(new Error('delete failed'));

        const result = await processEntries({
            db: {},
            entries: [{
                id: 'entry-4',
                event_type: 'MemberCreatedEvent',
                retry_count: 0,
                payload: JSON.stringify({email: 'member@example.com'})
            }]
        });

        assert.deepEqual(result, {processed: 1, failed: 0});
        sinon.assert.calledOnce(markEntryCompletedStub);
        sinon.assert.calledOnce(loggingStub.error);
        assert.equal(loggingStub.error.firstCall.args[0].event, 'outbox.entry.cleanup_failed');
        assert.equal(loggingStub.error.firstCall.args[0].outbox_entry_id, 'entry-4');
    });
});
