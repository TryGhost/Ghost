const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const sinon = require('sinon');

const logging = require('@tryghost/logging');
const configUtils = require('../../../../../utils/config-utils');

const logRequest = require('../../../../../../core/server/web/parent/middleware/log-request');

describe('Log request middleware', function () {
  beforeEach(function () {
    sinon.stub(logging, 'error');
    sinon.stub(logging, 'warn');
    sinon.stub(logging, 'info');
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  function createReq({ statusCode } = {}) {
    const req = {};
    if (statusCode !== undefined) {
      req.err = { statusCode };
    }
    return req;
  }

  function run(req, event = 'finish') {
    // res behaves like the real Express response: an EventEmitter that the
    // middleware subscribes to, then fires logResponse on 'finish' or 'close'.
    const res = new EventEmitter();
    res.statusCode = 200;
    res.writableFinished = false;
    const next = sinon.stub();

    logRequest(req, res, next);
    if (event === 'finish') {
      res.writableFinished = true;
    }
    res.emit(event);

    return { res, next };
  }

  it('logs a 500 request error via logging.error', function () {
    run(createReq({ statusCode: 500 }));

    sinon.assert.calledOnce(logging.error);
    sinon.assert.notCalled(logging.warn);
    sinon.assert.notCalled(logging.info);
  });

  it('logs a 4xx request error via logging.warn when logClientErrorsAsError is false', function () {
    configUtils.set('logging:logClientErrorsAsError', false);

    run(createReq({ statusCode: 422 }));

    sinon.assert.calledOnce(logging.warn);
    sinon.assert.notCalled(logging.error);
    sinon.assert.notCalled(logging.info);
  });

  it('logs a 4xx request error via logging.error when logClientErrorsAsError is true', function () {
    configUtils.set('logging:logClientErrorsAsError', true);

    run(createReq({ statusCode: 422 }));

    sinon.assert.calledOnce(logging.error);
    sinon.assert.notCalled(logging.warn);
    sinon.assert.notCalled(logging.info);
  });

  it('logs a 404 request error via logging.info', function () {
    run(createReq({ statusCode: 404 }));

    sinon.assert.calledOnce(logging.info);
    sinon.assert.notCalled(logging.error);
    sinon.assert.notCalled(logging.warn);
  });

  it('keeps the response status when the response finished', function () {
    const { res } = run(createReq(), 'finish');

    sinon.assert.calledOnce(logging.info);
    assert.equal(res.statusCode, 200);
  });

  it('logs a 499 when the client disconnects before the response finished', function () {
    const { res } = run(createReq(), 'close');

    sinon.assert.calledOnce(logging.info);
    assert.equal(logging.info.getCall(0).args[0].res.statusCode, 499);
    assert.equal(res.statusCode, 499);
  });

  it('never logs theme preview tokens, in a preview asset path or a preview header', function () {
    const req = {
      url: '/assets/built/screen.css',
      originalUrl: '/assets/_preview/abc.def/built/screen.css?v=1',
      headers: { 'x-ghost-preview': 'c=%23fff&theme_token=abc.def', accept: 'text/css' },
    };
    run(req);

    sinon.assert.calledOnce(logging.info);
    const logged = logging.info.firstCall.args[0].req;
    assert.equal(logged.originalUrl, '/assets/_preview/[redacted]/built/screen.css?v=1');
    assert.equal(logged.headers['x-ghost-preview'], 'c=%23fff&theme_token=[redacted]');
    assert.equal(logged.headers.accept, 'text/css');
    // The request itself is untouched
    assert.equal(req.originalUrl, '/assets/_preview/abc.def/built/screen.css?v=1');
  });
});
