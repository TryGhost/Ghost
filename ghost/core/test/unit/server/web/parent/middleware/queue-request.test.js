const assert = require('node:assert');
const sinon = require('sinon');

const queueRequest = require('../../../../../../core/server/web/parent/middleware/queue-request');

describe('Queue request middleware', function () {
    let req, res, next, config, queueFactory, queue;

    beforeEach(function () {
        req = {};
        res = {};
        next = sinon.stub();
        config = {
            concurrencyLimit: 123
        };

        queue = sinon.stub();
        queue.queue = {
            on: sinon.stub()
        };

        queueFactory = sinon.stub().returns(queue);
    });

    it('should configure the queue using the concurrency limit defined in the config', function () {
        queueRequest(config, queueFactory);

        assert.deepEqual(queueFactory.callCount, 1, 'queueFactory should be called once');
        assert.deepEqual(queueFactory.getCall(0).args[0], {
            activeLimit: config.concurrencyLimit,
            queuedLimit: -1
        }, 'queueFactory should be called with the queue limit from the config');
    });

    it('should throw an error if the concurrency limit is not defined in the config', function () {
        assert.throws(() => {
            queueRequest({}, queueFactory);
        }, /concurrencyLimit must be defined when using queueRequest middleware/, 'error should be thrown');
    });

    it('should not queue requests for static assets', function () {
        req.path = '/foo/bar.css'; // Assume any path with a file extension is a static asset

        const mw = queueRequest(config, queueFactory);

        mw(req, res, next);

        assert(next.calledOnce, 'next should be called once');
        assert.equal(queue.calledOnce, 0, 'queue should not be called');
    });

    it('should queue the request', function () {
        req.path = '/foo/bar';

        const mw = queueRequest(config, queueFactory);

        mw(req, res, next);

        assert(queue.calledOnce, 'queue should be called once');
        assert(queue.calledWith(req, res, next), 'queue should be called with the correct arguments');
    });

    it('should record the queue depth on a request when it has queued', function () {
        const queueEvent = 'queue';
        const queueLength = 123;

        // Assert event listener is added
        queueRequest(config, queueFactory);

        assert(queue.queue.on.calledWith(queueEvent), `"${queueEvent}" event listener should be added`);

        const listener = queue.queue.on.args.find(arg => arg[0] === queueEvent)[1];

        // Assert event listener implementation
        const queueJob = {
            data: {
                req: {
                    path: '/foo/bar'
                }
            },
            queue: {
                getLength() {
                    return queueLength;
                }
            }
        };

        listener(queueJob);

        assert(queueJob.data.req.queueDepth === queueLength, 'queueDepth should be set on the request');
    });
});
