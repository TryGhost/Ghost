const assert = require('node:assert/strict');
const Module = require('module');
const sinon = require('sinon');

describe('JobService boot logging summary', function () {
    const jobServicePath = '../../../../../core/server/services/jobs/job-service';
    let originalLoad;
    let loggingStub;
    let jobService;

    beforeEach(function () {
        originalLoad = Module._load;
        loggingStub = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };

        // Fake JobManager that emits the same chatty INFO log lines as the real
        // @tryghost/job-manager v1.0.9 so we can assert our wrapper filters them
        // and replaces them with a single summary line.
        Module._load = function (request, parent, isMain) {
            if (request === '@tryghost/job-manager') {
                const logging = loggingStub;
                return class FakeJobManager {
                    addJob(opts) {
                        const {name, at, offloaded = true} = opts || {};
                        if (offloaded) {
                            logging.info('Adding offloaded job to the inline job queue');
                            if (at) {
                                logging.info(`Scheduling job ${name} at ${at}. Next run on: 2099-01-01T00:00:00.000Z`);
                            } else {
                                logging.info(`Scheduling job ${name} to run immediately`);
                            }
                        }
                    }

                    addOneOffJob(opts) {
                        this.addJob(opts);
                    }
                };
            }

            if (request === '@tryghost/logging') {
                return loggingStub;
            }

            if (request === './worker-model-event-bridge') {
                return class WorkerModelEventBridge {
                    isModelEventMessage() {
                        return false;
                    }
                    handle() {}
                };
            }

            if (request === '../../models') {
                return {Job: {}};
            }

            if (request === '../../../shared/sentry') {
                return {captureException: sinon.stub()};
            }

            if (request === '@tryghost/domain-events') {
                return {};
            }

            if (request === '../../../shared/config') {
                return {};
            }

            if (request === '../../lib/common/events') {
                return {emit: sinon.stub()};
            }

            return originalLoad.call(this, request, parent, isMain);
        };

        delete require.cache[require.resolve(jobServicePath)];
        jobService = require(jobServicePath);
    });

    afterEach(function () {
        Module._load = originalLoad;
        delete require.cache[require.resolve(jobServicePath)];
        sinon.restore();
    });

    function flushSummary() {
        return new Promise((resolve) => {
            setImmediate(resolve);
        });
    }

    it('suppresses the per-job "Scheduling job" and "Adding offloaded" INFO chatter', async function () {
        jobService.addJob({name: 'one', at: '5 * * * *', job: () => {}});
        jobService.addJob({name: 'two', at: '10 * * * *', job: () => {}});

        await flushSummary();

        const allMessages = loggingStub.info.getCalls().map(call => call.args[0]);
        const chattyMessages = allMessages.filter(msg =>
            typeof msg === 'string'
            && (msg.startsWith('Adding offloaded job') || msg.startsWith('Scheduling job '))
        );
        assert.equal(
            chattyMessages.length,
            0,
            `expected no chatty per-job INFO calls, got: ${JSON.stringify(chattyMessages)}`
        );
    });

    it('emits a single summary INFO line covering all registered jobs', async function () {
        jobService.addJob({name: 'one', at: '5 * * * *', job: () => {}});
        jobService.addJob({name: 'two', at: '10 * * * *', job: () => {}});
        jobService.addJob({name: 'three', at: '15 * * * *', job: () => {}});
        jobService.addJob({name: 'inline-one', offloaded: false, job: () => {}});

        await flushSummary();

        const summaryCalls = loggingStub.info.getCalls()
            .map(call => call.args[0])
            .filter(msg => typeof msg === 'string' && msg.startsWith('[Jobs] Registered'));
        assert.equal(
            summaryCalls.length,
            1,
            `expected exactly one summary line, got: ${JSON.stringify(summaryCalls)}`
        );
        assert.equal(summaryCalls[0], '[Jobs] Registered 4 jobs (3 scheduled, 1 inline)');
    });
});
