const assert = require('node:assert/strict');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const {captureLoggerOutput, findByEvent} = require('../../../../utils/logging-utils');
const StartOutboxProcessingEvent = require('../../../../../core/server/services/outbox/events/start-outbox-processing-event');
const jobs = require('../../../../../core/server/services/outbox/jobs');
const service = require('../../../../../core/server/services/outbox/index.js');

describe('Outbox Service', function () {
    let processOutboxStub;
    let logCapture;

    beforeEach(function () {
        // `service` is a singleton; reset its processing flag so each test
        // starts from a clean state (the fresh-module load this replaced did
        // the same).
        service.processing = false;

        processOutboxStub = sinon.stub(service._private, 'processOutbox').resolves('Processed');
        sinon.stub(jobs, 'scheduleOutboxJob');
        logCapture = captureLoggerOutput();
    });

    afterEach(async function () {
        logCapture.restore();
        sinon.restore();
        await DomainEvents.allSettled();
    });

    describe('StartOutboxProcessingEvent subscription', function () {
        it('calls startProcessing when event is dispatched', async function () {
            service.init();

            DomainEvents.dispatch(StartOutboxProcessingEvent.create());

            await DomainEvents.allSettled();

            sinon.assert.calledOnce(processOutboxStub);
        });
    });

    describe('startProcessing guard', function () {
        it('skips processing if already running', async function () {
            service.init();
            service.processing = true;

            await service.startProcessing();

            sinon.assert.notCalled(processOutboxStub);
            const infoLog = findByEvent(logCapture.output, 'outbox.processing.skipped_already_running');
            assert.ok(infoLog);
            assert.deepEqual(infoLog.system, {
                event: 'outbox.processing.skipped_already_running'
            });
        });
    });

    describe('startProcessing error handling', function () {
        it('logs structured error when processOutbox throws', async function () {
            processOutboxStub.rejects(new Error('Unexpected failure'));
            service.init();

            await service.startProcessing();

            const errorLog = findByEvent(logCapture.output, 'outbox.processing.error');
            assert.ok(errorLog);
            assert.deepEqual(errorLog.system, {
                event: 'outbox.processing.error'
            });
        });
    });
});
