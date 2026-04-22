const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const {captureLoggerOutput, findByEvent} = require('../../../../../../utils/logging-utils');

describe('processEntries', function () {
    let processEntries;
    let handlerStub;
    let dbStub;
    let logCapture;

    function createDbStub({deleteShouldFail = false} = {}) {
        const chainable = {
            where: sinon.stub().returnsThis(),
            whereIn: sinon.stub().returnsThis(),
            update: sinon.stub().resolves(),
            delete: deleteShouldFail
                ? sinon.stub().rejects(new Error('Delete failed'))
                : sinon.stub().resolves()
        };
        const knex = sinon.stub().returns(chainable);
        knex.raw = sinon.stub().returns('RAW_TIMESTAMP');
        return {knex};
    }

    beforeEach(function () {
        processEntries = rewire('../../../../../../../core/server/services/outbox/jobs/lib/process-entries.js');

        handlerStub = {
            handle: sinon.stub().resolves(),
            getLogInfo: sinon.stub().returns('test@example.com'),
            LOG_KEY: '[OUTBOX][MEMBER-WELCOME-EMAIL]'
        };

        processEntries.__set__('EVENT_HANDLERS', {
            MemberCreatedEvent: handlerStub
        });

        dbStub = createDbStub();

        logCapture = captureLoggerOutput();
    });

    afterEach(function () {
        logCapture.restore();
        sinon.restore();
    });

    it('logs structured warning when no handler exists for event type', async function () {
        const entries = [{
            id: 'entry-1',
            event_type: 'UnknownEvent',
            payload: '{}',
            retry_count: 0
        }];

        await processEntries({db: dbStub, entries});

        const warningLog = findByEvent(logCapture.output, 'outbox.entry.no_handler');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.entry.no_handler',
            event_type: 'UnknownEvent'
        });
    });

    it('logs structured error when payload parsing fails', async function () {
        const entries = [{
            id: 'entry-2',
            event_type: 'MemberCreatedEvent',
            payload: 'invalid-json',
            retry_count: 0
        }];

        await processEntries({db: dbStub, entries});

        const errorLog = findByEvent(logCapture.output, 'outbox.entry.payload_parse_failed');
        assert.ok(errorLog);
        assert.deepEqual(errorLog.system, {
            event: 'outbox.entry.payload_parse_failed',
            entry_id: 'entry-2'
        });
    });

    it('logs structured error when handler fails', async function () {
        handlerStub.handle.rejects(new Error('Send failed'));

        const entries = [{
            id: 'entry-3',
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({email: 'test@example.com'}),
            retry_count: 0
        }];

        await processEntries({db: dbStub, entries});

        const errorLog = findByEvent(logCapture.output, 'outbox.entry.send_failed');
        assert.ok(errorLog);
        assert.deepEqual(errorLog.system, {
            event: 'outbox.entry.send_failed',
            entry_id: 'entry-3'
        });
    });

    it('logs structured error when delete fails after successful processing', async function () {
        dbStub = createDbStub({deleteShouldFail: true});

        const entries = [{
            id: 'entry-4',
            event_type: 'MemberCreatedEvent',
            payload: JSON.stringify({email: 'test@example.com'}),
            retry_count: 0
        }];

        await processEntries({db: dbStub, entries});

        const errorLog = findByEvent(logCapture.output, 'outbox.entry.delete_failed');
        assert.ok(errorLog);
        assert.deepEqual(errorLog.system, {
            event: 'outbox.entry.delete_failed',
            entry_id: 'entry-4'
        });
    });
});
