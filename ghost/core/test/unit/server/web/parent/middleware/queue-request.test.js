const assert = require('node:assert/strict');
const express = require('express');
const expressQueue = require('express-queue');
const sinon = require('sinon');
const request = require('supertest');

const queueRequest = require('../../../../../../core/server/web/parent/middleware/queue-request');

const { SHED_METRIC_NAME } = queueRequest;

/**
 * Minimal stand-in for the parts of an express response the middleware touches
 */
function createFakeRes() {
  const res = {
    headers: {},
    headersSent: false,
    statusCode: 200,
    writableEnded: false,
    set(headers) {
      Object.assign(res.headers, headers);
      return res;
    },
    status(statusCode) {
      res.statusCode = statusCode;
      return res;
    },
    send(body) {
      res.body = body;
      res.headersSent = true;
      res.writableEnded = true;
      return res;
    },
  };

  return res;
}

function createDeferred() {
  const deferred = {};

  deferred.promise = new Promise((resolve) => {
    deferred.resolve = resolve;
  });

  return deferred;
}

describe('Queue request middleware', function () {
  let config, metrics, metric, queueFactory, queue;

  beforeEach(function () {
    config = {
      concurrencyLimit: 123,
    };

    queue = sinon.stub().callsFake((req, res, next) => {
      return next();
    });
    queue.queue = {
      on: sinon.stub(),
      getLength: sinon.stub().returns(0),
      _cancelJob: sinon.stub(),
    };

    queueFactory = sinon.stub().returns(queue);

    metric = { inc: sinon.stub() };
    metrics = {
      registerCounter: sinon.stub(),
      getMetric: sinon.stub().returns(metric),
    };
  });

  function createApp() {
    const app = express();

    app.use(queueRequest(config, queueFactory, metrics));
    app.get(['/foo/bar', '/foo/bar.css'], (req, res) => {
      res.json({ queueDepth: req.queueDepth });
    });

    return app;
  }

  it('should configure the queue using the concurrency limit defined in the config', function () {
    queueRequest(config, queueFactory, metrics);

    assert.deepEqual(queueFactory.callCount, 1, 'queueFactory should be called once');

    const queueConfig = queueFactory.getCall(0).args[0];

    assert.equal(queueConfig.activeLimit, config.concurrencyLimit);
    assert.equal(queueConfig.queuedLimit, -1, 'the queue should be unlimited by default');
    assert.equal(typeof queueConfig.rejectHandler, 'function');
  });

  it('should throw an error if the concurrency limit is not defined in the config', function () {
    assert.throws(
      () => {
        queueRequest({}, queueFactory, metrics);
      },
      /concurrencyLimit must be defined when using queueRequest middleware/,
      'error should be thrown',
    );
  });

  it('should not queue requests for static assets', async function () {
    await request(createApp()).get('/foo/bar.css').expect(200).expect({ queueDepth: 0 });

    assert.equal(queue.callCount, 0, 'queue should not be called');
  });

  it('should queue the request', async function () {
    await request(createApp()).get('/foo/bar').expect(200);

    sinon.assert.calledOnce(queue);
    assert.equal(queue.getCall(0).args[0].path, '/foo/bar');
    assert.equal(typeof queue.getCall(0).args[1].json, 'function');
    assert.equal(typeof queue.getCall(0).args[2], 'function');
  });

  it('should record the queue depth on a request', async function () {
    const queueLength = 123;

    queue.queue.getLength.returns(queueLength);

    await request(createApp()).get('/foo/bar').expect(200).expect({ queueDepth: queueLength });

    sinon.assert.calledOnce(queue.queue.getLength);
  });

  describe('maxQueueDepth', function () {
    it('should limit the queue to the configured depth', function () {
      queueRequest({ ...config, maxQueueDepth: 500 }, queueFactory, metrics);

      assert.equal(queueFactory.getCall(0).args[0].queuedLimit, 500);
    });

    it('should reject a request that arrives when the queue is full', function () {
      queueRequest({ ...config, maxQueueDepth: 500 }, queueFactory, metrics);

      const { rejectHandler } = queueFactory.getCall(0).args[0];
      const res = createFakeRes();

      rejectHandler({ path: '/foo/bar' }, res);

      assert.equal(res.statusCode, 503);
      assert.equal(res.body, 'Service Unavailable');
      assert.equal(res.headers['Retry-After'], '5');
      assert.equal(res.headers['Cache-Control'], 'no-store');
      sinon.assert.calledWithExactly(metric.inc, { reason: 'depth' });
    });

    it('should throw an error if the configured depth is not a positive integer', function () {
      for (const maxQueueDepth of [0, -2, 1.5, '500']) {
        assert.throws(
          () => {
            queueRequest({ ...config, maxQueueDepth }, queueFactory, metrics);
          },
          /maxQueueDepth must be a positive integer when using queueRequest middleware/,
          `error should be thrown for ${maxQueueDepth}`,
        );
      }
    });
  });

  describe('maxQueueTime', function () {
    it('should throw an error if the configured time is not a positive integer', function () {
      for (const maxQueueTime of [-1, 1.5, '1000']) {
        assert.throws(
          () => {
            queueRequest({ ...config, maxQueueTime }, queueFactory, metrics);
          },
          /maxQueueTime must be a positive integer when using queueRequest middleware/,
          `error should be thrown for ${maxQueueTime}`,
        );
      }
    });

    it('should not set a deadline when it is not configured', function () {
      const mw = queueRequest(config, queueFactory, metrics);
      const req = { path: '/foo/bar' };
      const next = sinon.stub();

      mw(req, createFakeRes(), next);

      assert.equal(req.queueDeadline, undefined);
      sinon.assert.calledOnce(next);
    });

    it('should set a deadline on the request when it is configured', function () {
      const mw = queueRequest({ ...config, maxQueueTime: 1000 }, queueFactory, metrics);
      const req = { path: '/foo/bar' };
      const before = Date.now();

      mw(req, createFakeRes(), sinon.stub());

      assert.ok(
        req.queueDeadline >= before + 1000 && req.queueDeadline <= Date.now() + 1000,
        'the deadline should be maxQueueTime in the future',
      );
    });

    it('should shed a request that reaches the front of the queue after its deadline', function () {
      const mw = queueRequest({ ...config, maxQueueTime: 1000 }, queueFactory, metrics);
      const req = { path: '/foo/bar' };
      const res = createFakeRes();
      const next = sinon.stub();

      // The queue stub calls next() synchronously, so move the deadline into
      // the past to stand in for time spent waiting in the queue
      queue.callsFake((queuedReq, queuedRes, queuedNext) => {
        queuedReq.queueDeadline = Date.now() - 1;

        return queuedNext();
      });

      mw(req, res, next);

      sinon.assert.notCalled(next);
      assert.equal(res.statusCode, 503);
      assert.equal(res.body, 'Service Unavailable');
      sinon.assert.calledWithExactly(metric.inc, { reason: 'timeout' });
    });

    it('should serve a request that reaches the front of the queue before its deadline', function () {
      const mw = queueRequest({ ...config, maxQueueTime: 1000 }, queueFactory, metrics);
      const res = createFakeRes();
      const next = sinon.stub();

      mw({ path: '/foo/bar' }, res, next);

      sinon.assert.calledOnce(next);
      assert.equal(res.statusCode, 200);
      sinon.assert.notCalled(metric.inc);
    });

    it('should not respond twice if the response has already been sent', function () {
      queueRequest({ ...config, maxQueueDepth: 500 }, queueFactory, metrics);

      const { rejectHandler } = queueFactory.getCall(0).args[0];
      const res = createFakeRes();

      res.headersSent = true;
      rejectHandler({ path: '/foo/bar' }, res);

      assert.equal(res.statusCode, 200, 'the response should be left alone');
      assert.equal(res.body, undefined);
    });
  });

  describe('metrics', function () {
    it('should register a counter for shed requests', function () {
      metrics.getMetric.returns(undefined);

      queueRequest(config, queueFactory, metrics);

      sinon.assert.calledWithExactly(metrics.registerCounter, {
        name: SHED_METRIC_NAME,
        help: 'Number of requests shed by the request queue without being served',
        labelNames: ['reason'],
      });
    });

    it('should not register the counter twice when Ghost boots more than once', function () {
      metrics.getMetric.onFirstCall().returns(undefined);

      queueRequest(config, queueFactory, metrics);
      queueRequest(config, queueFactory, metrics);

      sinon.assert.calledOnce(metrics.registerCounter);
    });

    it('should work without a metrics client', function () {
      queueRequest({ ...config, maxQueueDepth: 500 }, queueFactory, null);

      const { rejectHandler } = queueFactory.getCall(0).args[0];
      const res = createFakeRes();

      assert.doesNotThrow(() => rejectHandler({ path: '/foo/bar' }, res));
      assert.equal(res.statusCode, 503);
    });
  });
});

describe('Queue request middleware (real queue)', function () {
  let app, releaseSlow, slowStarted;

  beforeEach(function () {
    const started = createDeferred();
    const release = createDeferred();

    slowStarted = started.promise;
    releaseSlow = release.resolve;

    app = express();
    app.use(queueRequest({ concurrencyLimit: 1, maxQueueTime: 50 }, expressQueue, null));

    app.get('/slow', async (req, res) => {
      started.resolve();
      await release.promise;
      res.json({ slow: true });
    });

    app.get('/queued', (req, res) => {
      res.json({ queued: true });
    });
  });

  afterEach(function () {
    releaseSlow();
  });

  it('should shed a request that waits in the queue for longer than maxQueueTime', async function () {
    const slow = request(app).get('/slow');
    const slowResponse = slow.then((res) => res);

    await slowStarted;

    const shed = await request(app).get('/queued');

    assert.equal(shed.status, 503);
    assert.equal(shed.text, 'Service Unavailable');
    assert.equal(shed.headers['retry-after'], '5');
    assert.equal(shed.headers['cache-control'], 'no-store');

    releaseSlow();
    await slowResponse;
  });

  it('should keep serving requests after shedding, without leaking the concurrency slot', async function () {
    const slow = request(app).get('/slow');
    const slowResponse = slow.then((res) => res);

    await slowStarted;
    await request(app).get('/queued').expect(503);

    releaseSlow();
    await slowResponse;

    await request(app).get('/queued').expect(200).expect({ queued: true });
    await request(app).get('/queued').expect(200).expect({ queued: true });
  });

  it('should serve a request that is queued for less than maxQueueTime', async function () {
    const slow = request(app).get('/slow');
    const slowResponse = slow.then((res) => res);

    await slowStarted;

    const queued = request(app)
      .get('/queued')
      .then((res) => res);

    releaseSlow();
    await slowResponse;

    const response = await queued;

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { queued: true });
  });
});
