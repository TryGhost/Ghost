const assert = require('node:assert/strict');
const Module = require('module');
const sinon = require('sinon');

describe('JobService', function () {
    const jobServicePath = '../../../../../core/server/services/jobs/job-service';
    let originalLoad;
    let workerMessageHandler;
    let handleModelEvent;

    beforeEach(function () {
        originalLoad = Module._load;
        handleModelEvent = sinon.stub().resolves(true);

        Module._load = function (request, parent, isMain) {
            if (request === '@tryghost/job-manager') {
                return class JobManager {
                    constructor(options) {
                        workerMessageHandler = options.workerMessageHandler;
                    }
                };
            }

            if (request === './worker-model-event-bridge') {
                return class WorkerModelEventBridge {
                    isModelEventMessage(message) {
                        return message && message.type === 'model-event';
                    }

                    handle(message, meta) {
                        return handleModelEvent(message, meta);
                    }
                };
            }

            if (request === '@tryghost/logging') {
                return {
                    info: sinon.stub(),
                    warn: sinon.stub(),
                    error: sinon.stub()
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
        require(jobServicePath);
    });

    afterEach(function () {
        Module._load = originalLoad;
        delete require.cache[require.resolve(jobServicePath)];
        sinon.restore();
    });

    it('routes model-event worker messages to the bridge without mutating them', function () {
        const message = {
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'member-id',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        };

        workerMessageHandler({name: 'clean-expired-comped', message});

        sinon.assert.calledOnceWithExactly(handleModelEvent, {
            type: 'model-event',
            eventName: 'member.edited',
            model: 'Member',
            id: 'member-id',
            previous: {status: 'comped'},
            changed: {status: 'free'}
        }, {
            jobName: 'clean-expired-comped'
        });
        // No reserved `event` key, so job-manager will not dispatch it as a raw domain event
        assert.equal(message.event, undefined);
        assert.equal(message.eventName, 'member.edited');
    });
});

describe('JobService model-event bridge wiring', function () {
    const jobServicePath = '../../../../../core/server/services/jobs/job-service';
    const bridgePath = '../../../../../core/server/services/jobs/worker-model-event-bridge';
    let originalLoad;
    let workerMessageHandler;
    let emit;
    let findOne;

    beforeEach(function () {
        originalLoad = Module._load;
        emit = sinon.stub();
        findOne = sinon.stub();

        Module._load = function (request, parent, isMain) {
            if (request === '@tryghost/job-manager') {
                return class JobManager {
                    constructor(options) {
                        workerMessageHandler = options.workerMessageHandler;
                    }
                };
            }

            if (request === '@tryghost/logging') {
                return {
                    info: sinon.stub(),
                    warn: sinon.stub(),
                    error: sinon.stub()
                };
            }

            if (request === '../../models') {
                return {Job: {}, Member: {findOne}};
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
                return {emit};
            }

            return originalLoad.call(this, request, parent, isMain);
        };

        delete require.cache[require.resolve(jobServicePath)];
        delete require.cache[require.resolve(bridgePath)];
        require(jobServicePath);
    });

    afterEach(function () {
        Module._load = originalLoad;
        delete require.cache[require.resolve(jobServicePath)];
        delete require.cache[require.resolve(bridgePath)];
        sinon.restore();
    });

    // Exercises the real bridge (unstubbed) end-to-end: a posted message is reconstructed
    // into a model and emitted on the events bus that webhooks listen on.
    it('reconstructs and emits a member.edited event through the real bridge', async function () {
        const model = {
            attributes: {
                id: 'member-id',
                email: 'member@example.com',
                status: 'free'
            }
        };
        findOne.resolves(model);

        const emitted = new Promise((resolve) => {
            emit.callsFake((...args) => resolve(args));
        });

        workerMessageHandler({
            name: 'clean-expired-comped',
            message: {
                type: 'model-event',
                eventName: 'member.edited',
                model: 'Member',
                id: 'member-id',
                previous: {status: 'comped'},
                changed: {status: 'free'}
            }
        });

        const [eventName, emittedModel, options] = await emitted;

        sinon.assert.calledOnceWithExactly(findOne, {
            id: 'member-id'
        }, {
            require: true,
            context: {internal: true}
        });
        assert.equal(eventName, 'member.edited');
        assert.equal(emittedModel, model);
        assert.equal(emittedModel._previousAttributes.status, 'comped');
        assert.equal(emittedModel._changed.status, 'free');
        assert.equal(options.context.internal, true);
    });
});
