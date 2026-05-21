const assert = require('node:assert/strict');
const express = require('express');
const sinon = require('sinon');
const request = require('supertest');

const queueRequest = require('../../../../../../core/server/web/parent/middleware/queue-request');

describe('Queue request middleware', function () {
    let config, queueFactory, queue;

    beforeEach(function () {
        config = {
            concurrencyLimit: 123
        };

        queue = sinon.stub().callsFake((req, res, next) => {
            return next();
        });
        queue.queue = {
            on: sinon.stub(),
            getLength: sinon.stub().returns(0)
        };

        queueFactory = sinon.stub().returns(queue);
    });

    function createApp() {
        const app = express();

        app.use(queueRequest(config, queueFactory));
        app.get(['/foo/bar', '/foo/bar.css'], (req, res) => {
            res.json({queueDepth: req.queueDepth});
        });

        return app;
    }

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

    it('should not queue requests for static assets', async function () {
        await request(createApp())
            .get('/foo/bar.css')
            .expect(200)
            .expect({queueDepth: 0});

        assert.equal(queue.callCount, 0, 'queue should not be called');
    });

    it('should queue the request', async function () {
        await request(createApp())
            .get('/foo/bar')
            .expect(200);

        sinon.assert.calledOnce(queue);
        assert.equal(queue.getCall(0).args[0].path, '/foo/bar');
        assert.equal(typeof queue.getCall(0).args[1].json, 'function');
        assert.equal(typeof queue.getCall(0).args[2], 'function');
    });

    it('should record the queue depth on a request', async function () {
        const queueLength = 123;

        queue.queue.getLength.returns(queueLength);

        await request(createApp())
            .get('/foo/bar')
            .expect(200)
            .expect({queueDepth: queueLength});

        sinon.assert.calledOnce(queue.queue.getLength);
    });
});
