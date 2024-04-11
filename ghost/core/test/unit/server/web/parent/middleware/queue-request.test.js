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
            on: sinon.stub(),
            getLength: sinon.stub().returns(0)
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

    it('should record the queue depth on a request', function () {
        const queueLength = 123;

        queue.queue.getLength.returns(queueLength);

        req.path = '/foo/bar';

        const mw = queueRequest(config, queueFactory);

        mw(req, res, next);

        assert(queue.queue.getLength, 'queue should be called once');
        assert(req.queueDepth === queueLength, 'queue depth should be set on the request');
    });
});
