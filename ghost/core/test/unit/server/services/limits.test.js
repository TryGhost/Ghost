const assert = require('node:assert/strict');
const sinon = require('sinon');

const limits = require('../../../../core/server/services/limits');
const logging = require('@tryghost/logging');

const db = require('../../../../core/server/data/db');

describe('Limit Service Init', function () {
  let loggerStub;

  beforeEach(function () {
    loggerStub = sinon.spy(logging);
  });

  afterEach(function () {
    sinon.restore();
  });

  const options = (overrides = {}) => ({
    limits: {},
    helpLink: 'https://ghost.org/help/',
    db,
    ...overrides,
  });

  it('initiates and loads limits - minimal setup', function () {
    limits.init(options());

    sinon.assert.notCalled(loggerStub.warn);
  });

  it('handles limit-service incorrect usage errors gracefully with a warning', function () {
    // A limit that resets needs a subscription to reset against, and a host that sends one
    // without the other is misconfigured. Ghost still has to start.
    limits.init(options({ limits: { emails: { maxPeriodic: 1 } } }));

    sinon.assert.called(loggerStub.warn);
  });

  it('does not keep the limits a failed configuration was meant to replace', function () {
    limits.init(options({ limits: { staff: { max: 1 } } }));
    assert.equal(limits.service.isLimited('staff'), true);

    // A limit that resets needs a subscription, so this configuration cannot be built.
    limits.init(options({ limits: { emails: { maxPeriodic: 1 } } }));

    assert.equal(limits.service.isLimited('staff'), false);
    sinon.assert.called(loggerStub.warn);
  });

  it('handles limit-service other errors with exit', function () {
    // Anything that is not a misconfiguration is the caller's problem, not the site's.
    assert.throws(() => limits.init(options({ limits: null })));

    sinon.assert.notCalled(loggerStub.warn);
  });
});
