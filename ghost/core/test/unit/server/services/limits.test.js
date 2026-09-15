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

describe('Limit Service Config', function () {
  const { fromHostSettings } = require('../../../../core/server/services/limits/host-settings');

  const asHost = (hostSettings) => ({
    get: (key) =>
      key
        .replace(/^hostSettings:?/, '')
        .split(':')
        .filter(Boolean)
        .reduce((value, part) => (value === undefined ? undefined : value[part]), hostSettings),
  });

  it('sends a publisher to Ghost help when the host configured no billing link', async function () {
    // An empty URL is no URL. Reading it as one leaves the refusal with nowhere to send
    // the publisher, which is the one thing the message is for.
    limits.init(
      fromHostSettings(
        asHost({
          limits: { limitStripeConnect: { disabled: true } },
          billing: { enabled: true, url: '' },
        }),
      ),
    );

    await assert.rejects(
      () => limits.service.errorIfWouldGoOverLimit('limitStripeConnect'),
      (err) => {
        assert.equal(err.help, 'https://ghost.org/help/');
        return true;
      },
    );
  });

  it('uses the billing link the host configured', async function () {
    limits.init(
      fromHostSettings(
        asHost({
          limits: { limitStripeConnect: { disabled: true } },
          billing: { enabled: true, url: 'https://billing.example.com' },
        }),
      ),
    );

    await assert.rejects(
      () => limits.service.errorIfWouldGoOverLimit('limitStripeConnect'),
      (err) => {
        assert.equal(err.help, 'https://billing.example.com');
        return true;
      },
    );
  });
});
