const assert = require('node:assert/strict');
const sinon = require('sinon');

const limits = require('../../../../core/server/services/limits');
const logging = require('@tryghost/logging');
const { fromHostSettings } = require('../../../../core/server/services/limits/host-settings');

describe('Limit Service', function () {
  let loggerStub;

  beforeEach(function () {
    loggerStub = sinon.spy(logging);
  });

  afterEach(function () {
    sinon.restore();
  });

  // Ghost's configuration, as a host fills it in. Going through this rather than handing
  // the service its limits directly is what a boot does, and what decides which limits a
  // site ends up with.
  const asHost = (hostSettings) => ({
    get: (key) =>
      key
        .replace(/^hostSettings:?/, '')
        .split(':')
        .filter(Boolean)
        .reduce((value, part) => (value === undefined ? undefined : value[part]), hostSettings),
  });

  const boot = (hostSettings) => limits.init(fromHostSettings(asHost(hostSettings)));

  it('starts a site whose host sends no limits', function () {
    boot({});

    assert.equal(limits.service.isLimited('staff'), false);
    sinon.assert.notCalled(loggerStub.error);
  });

  it('applies the limits a host configured', function () {
    boot({ limits: { staff: { max: 1 } } });

    assert.equal(limits.service.isLimited('staff'), true);
    sinon.assert.notCalled(loggerStub.error);
  });

  it('keeps serving without a limit it cannot use, and says so', function () {
    // A limit that resets needs a subscription to reset against, and a host that sends one
    // without the other is misconfigured. Ghost still has to start, so the log is the only
    // place that records a limit this site is paying for and not getting.
    boot({ limits: { emails: { maxPeriodic: 1 } } });

    assert.equal(limits.service.isLimited('emails'), false);
    sinon.assert.called(loggerStub.error);
  });

  it('keeps every limit it can use alongside one it cannot', function () {
    boot({ limits: { staff: { max: 1 }, emails: { maxPeriodic: 1 } } });

    // One limit a host got wrong used to take the others down with it, leaving a site
    // unlimited in ways nobody chose.
    assert.equal(limits.service.isLimited('staff'), true);
    assert.equal(limits.service.isLimited('emails'), false);
    sinon.assert.called(loggerStub.error);
  });

  it('forgets the limits it was holding once the host sends none', function () {
    boot({ limits: { newsletters: { max: 0 } } });
    assert.equal(limits.service.isLimited('newsletters'), true);

    boot({});

    assert.equal(limits.service.isLimited('newsletters'), false);
  });

  it('anchors a periodic limit to the subscription the host sends', function () {
    boot({
      limits: { emails: { maxPeriodic: 1 } },
      subscription: { start: '2026-01-01T00:00:00.000Z' },
    });

    assert.equal(limits.service.isLimited('emails'), true);
    sinon.assert.notCalled(loggerStub.error);
  });

  it('drops a periodic limit whose start date cannot be read', function () {
    // Counting from a date nobody can read judges a site's whole history against an
    // allowance meant for one period, which reaches a publisher as a send they cannot make.
    boot({
      limits: { emails: { maxPeriodic: 1 } },
      subscription: { start: 'not a date' },
    });

    assert.equal(limits.service.isLimited('emails'), false);
    sinon.assert.called(loggerStub.error);
  });

  it('sends a publisher to Ghost help when the host configured no billing link', async function () {
    // An empty URL is no URL. Reading it as one leaves the refusal with nowhere to send
    // the publisher, which is the one thing the message is for.
    boot({
      limits: { limitStripeConnect: { disabled: true } },
      billing: { enabled: true, url: '' },
    });

    await assert.rejects(
      () => limits.service.errorIfWouldGoOverLimit('limitStripeConnect'),
      (err) => {
        assert.equal(err.help, 'https://ghost.org/help/');
        return true;
      },
    );
  });

  it('uses the billing link the host configured', async function () {
    boot({
      limits: { limitStripeConnect: { disabled: true } },
      billing: { enabled: true, url: 'https://billing.example.com' },
    });

    await assert.rejects(
      () => limits.service.errorIfWouldGoOverLimit('limitStripeConnect'),
      (err) => {
        assert.equal(err.help, 'https://billing.example.com');
        return true;
      },
    );
  });
});
