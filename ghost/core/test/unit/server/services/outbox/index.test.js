const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const DomainEvents = require('@tryghost/domain-events');
const {captureLoggerOutput, findByEvent} = require('../../../../utils/logging-utils');
const StartOutboxProcessingEvent = require('../../../../../core/server/services/outbox/events/start-outbox-processing-event');

describe('Outbox Service', function () {
    let service;
    let processOutboxStub;
    let jobsStub;
    let logCapture;

    beforeEach(function () {
        service = rewire('../../../../../core/server/services/outbox/index.js');

        processOutboxStub = sinon.stub().resolves('Processed');
        jobsStub = {scheduleOutboxJob: sinon.stub()};
        logCapture = captureLoggerOutput();

        service.__set__('processOutbox', processOutboxStub);
        service.__set__('jobs', jobsStub);
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
});
