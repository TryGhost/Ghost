const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const DomainEvents = require('@tryghost/domain-events');
const bunyan = require('bunyan');
const {PassThrough} = require('stream');
const logging = require('@tryghost/logging');
const StartOutboxProcessingEvent = require('../../../../../core/server/services/outbox/events/start-outbox-processing-event');

describe('Outbox Service', function () {
    let service;
    let processOutboxStub;
    let loggingStub;
    let jobsStub;

    beforeEach(function () {
        service = rewire('../../../../../core/server/services/outbox/index.js');

        processOutboxStub = sinon.stub().resolves('Processed');
        loggingStub = {info: sinon.stub(), error: sinon.stub()};
        jobsStub = {scheduleOutboxJob: sinon.stub()};

        service.__set__('processOutbox', processOutboxStub);
        service.__set__('logging', loggingStub);
        service.__set__('jobs', jobsStub);
    });

    afterEach(async function () {
        sinon.restore();
        await DomainEvents.allSettled();
    });

    function captureLoggerOutput() {
        const output = [];
        const stream = new PassThrough();
        let buffered = '';

        stream.on('data', (chunk) => {
            buffered += chunk.toString();
            const lines = buffered.split('\n');
            buffered = lines.pop();

            for (const line of lines) {
                if (!line.trim()) {
                    continue;
                }

                output.push(JSON.parse(line));
            }
        });

        const originalStreams = logging.streams;
        logging.streams = {
            capture: {
                name: 'capture',
                log: bunyan.createLogger({
                    name: 'test-logger',
                    streams: [{
                        type: 'stream',
                        stream,
                        level: 'trace'
                    }]
                })
            }
        };

        return {
            output,
            restore() {
                logging.streams = originalStreams;
                stream.destroy();
            }
        };
    }

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
            sinon.assert.calledOnce(loggingStub.info);
        });

        it('logs structured info if already running', async function () {
            const capture = captureLoggerOutput();
            service.__set__('logging', logging);

            try {
                service.init();
                service.processing = true;

                await service.startProcessing();

                sinon.assert.notCalled(processOutboxStub);

                const infoLog = capture.output.find(log => log.level === 30 && log.msg === 'Outbox job already running, skipping');
                assert.ok(infoLog);
                assert.deepEqual(infoLog.system, {
                    event: 'outbox.processing.skipped_already_running'
                });
            } finally {
                capture.restore();
            }
        });
    });
});
