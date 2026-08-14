const assert = require('node:assert/strict');
const sinon = require('sinon');
const {captureLoggerOutput, findByEvent} = require('../../../../../../utils/logging-utils');
const processEntries = require('../../../../../../../core/server/services/outbox/jobs/lib/process-entries.js');
const memberCreatedHandler = require('../../../../../../../core/server/services/outbox/handlers/member-created');

const MEMBER_CREATED_EVENT = 'MemberCreatedEvent';

describe('processEntries', function () {
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
        handlerStub = {
            handle: sinon.stub(memberCreatedHandler, 'handle').resolves(),
            getLogInfo: sinon.stub(memberCreatedHandler, 'getLogInfo').returns('test@example.com')
        };

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
            event_type: MEMBER_CREATED_EVENT,
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
            event_type: MEMBER_CREATED_EVENT,
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
            event_type: MEMBER_CREATED_EVENT,
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
