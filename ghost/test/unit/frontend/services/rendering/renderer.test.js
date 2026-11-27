const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const nock = require('nock');
const sinon = require('sinon');
const { queueRequest } = require('../../../../../core/server/web/parent/middleware/queue-request');
const renderer = require('../../../../../core/frontend/services/rendering/renderer');

describe('Renderer', function () {
  let req;
  let res;

  beforeEach(function () {
    req = {
      originalUrl: '/',
      params: {},
      body: {},
    };
    res = {
      locals: {},
      routerOptions: {},
      // an open response: both are always booleans on a real ServerResponse
      destroyed: false,
      writableEnded: false,
      // pre-set so templates.setTemplate returns early
      _template: 'index',
      render: sinon.stub().callsArgWith(2, null, '<html></html>'),
      send: sinon.spy(),
      end: sinon.spy(),
      set: sinon.spy(),
      get: sinon.stub().returns(undefined),
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('sends the rendered html without extra headers by default', function () {
    renderer(req, res, {});

    sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
    sinon.assert.notCalled(res.set);
  });

  it('caps public caching at 60s when the render was degraded', function () {
    res.locals.degradedRender = true;
    res.get.withArgs('Cache-Control').returns('public, max-age=600');

    renderer(req, res, {});

    sinon.assert.calledWithExactly(res.set, 'Cache-Control', 'public, max-age=60');
    sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
    sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
  });

  it('does not raise max-age above the existing public value on a degraded render', function () {
    res.locals.degradedRender = true;
    res.get.withArgs('Cache-Control').returns('public, max-age=0');

    renderer(req, res, {});

    sinon.assert.calledWithExactly(res.set, 'Cache-Control', 'public, max-age=0');
    sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
  });

  it('leaves private responses uncacheable on a degraded render', function () {
    res.locals.degradedRender = true;
    res.get
      .withArgs('Cache-Control')
      .returns(
        'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
      );

    renderer(req, res, {});

    sinon.assert.neverCalledWith(res.set, 'Cache-Control');
    sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
    sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
  });

  it('does not add caching headers when none were set on a degraded render', function () {
    res.locals.degradedRender = true;

    renderer(req, res, {});

    sinon.assert.neverCalledWith(res.set, 'Cache-Control');
    sinon.assert.calledWithExactly(res.set, 'X-Ghost-Degraded-Render', 'aborted-get-helper');
  });

  it('forwards render errors without sending a response', function () {
    req.next = sinon.spy();
    res.render = sinon.stub().callsArgWith(2, new Error('render failed'));

    renderer(req, res, {});

    sinon.assert.calledOnce(req.next);
    sinon.assert.notCalled(res.send);
  });

  it('skips the render when the client hung up before it started', function () {
    res.destroyed = true;
    res.writableEnded = false;

    renderer(req, res, {});

    sinon.assert.notCalled(res.render);
    sinon.assert.notCalled(res.send);
    assert.equal(res.statusCode, 499);
    sinon.assert.calledOnce(res.end);
  });

  it('discards the html when the client hung up during the render', function () {
    res.render = sinon.stub().callsFake(function (template, data, callback) {
      res.destroyed = true;
      res.writableEnded = false;
      callback(null, '<html></html>');
    });

    renderer(req, res, {});

    sinon.assert.calledOnce(res.render);
    sinon.assert.notCalled(res.send);
    assert.equal(res.statusCode, 499);
    sinon.assert.calledOnce(res.end);
  });

  it('does not treat an already-sent response as a disconnect', function () {
    res.destroyed = true;
    res.writableEnded = true;

    renderer(req, res, {});

    sinon.assert.calledOnceWithExactly(res.send, '<html></html>');
  });

  it('forwards render errors even when the client has hung up', function () {
    req.next = sinon.spy();
    res.render = sinon.stub().callsFake(function (template, data, callback) {
      res.destroyed = true;
      callback(new Error('render failed'));
    });

    renderer(req, res, {});

    // a broken template is worth logging whether or not anyone is still listening
    sinon.assert.calledOnce(req.next);
    sinon.assert.notCalled(res.send);
  });

  describe('behind the request queue', function () {
    let server;

    beforeEach(function () {
      nock.enableNetConnect('127.0.0.1');
    });

    afterEach(function () {
      server?.close();
      nock.disableNetConnect();
    });

    it('frees the queue slot when the client hangs up before the render', async function () {
      const app = express();
      let handlerStarted;
      const started = new Promise((resolve) => {
        handlerStarted = resolve;
      });

      app.use(queueRequest({ concurrencyLimit: 1 }));
      app.get('/slow', (request, response) => {
        response.on('close', () => renderer(request, response, {}));
        handlerStarted();
      });
      app.get('/fast', (request, response) => response.send('ok'));

      server = app.listen(0, '127.0.0.1');
      await new Promise((resolve) => {
        server.once('listening', resolve);
      });
      const port = server.address().port;

      // URL string: host/port options throw Invalid URL once another file has loaded Sentry's http wrapper
      const hungUp = http.get(`http://127.0.0.1:${port}/slow`, { agent: false });
      hungUp.on('error', () => {});
      await started;
      hungUp.destroy();

      const status = await new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${port}/fast`, { agent: false, timeout: 1000 }, (response) => {
            response.resume();
            resolve(response.statusCode);
          })
          .on('timeout', function () {
            this.destroy();
            reject(new Error('request stuck behind a leaked queue slot'));
          })
          .on('error', reject);
      });

      assert.equal(status, 200);
    });
  });
});
