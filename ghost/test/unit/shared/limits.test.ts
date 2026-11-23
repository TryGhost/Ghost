import assert from 'node:assert/strict';
import sinon from 'sinon';
import { openServices, services } from '../../utils/services';

// Required, not imported: an imported copy of the root, of the limit service or of the errors
// would not be the one the root itself requires, so a stub would miss and `instanceof` would fail.
const errors: typeof import('@tryghost/errors') = require('@tryghost/errors');
const {
  LimitService,
}: typeof import('@tryghost/limit-service') = require('@tryghost/limit-service');
const limits: typeof import('../../../shared/limits').default =
  require('../../../shared/limits').default;
const application: typeof import('../../../bootstrap/app').default =
  require('../../../bootstrap/app').default;
const logging = require('@tryghost/logging');
const configUtils = require('../../utils/config-utils');

describe('Limits', function () {
  let loadLimits: sinon.SinonStub;
  let warn: sinon.SinonStub;

  // What the limit service was last asked to load.
  const loaded = () => loadLimits.lastCall.args[0];

  beforeEach(function () {
    loadLimits = sinon.stub(LimitService.prototype, 'loadLimits');
    warn = sinon.stub(logging, 'warn');
    configUtils.set({ hostSettings: {} });
    openServices();
  });

  afterEach(async function () {
    await configUtils.restore();
    sinon.restore();
  });

  it('is built on first use, once, and loaded from config', function () {
    configUtils.set({ hostSettings: { limits: { staff: { max: 2 } } } });

    sinon.assert.notCalled(loadLimits);
    const service = limits.service;

    assert.ok(service instanceof LimitService);
    assert.equal(limits.service, service);
    sinon.assert.calledOnce(loadLimits);
    assert.deepEqual(loaded().limits, { staff: { max: 2 } });
    assert.equal(loaded().subscription, undefined);
    assert.equal(loaded().errors.HostLimitError, errors.HostLimitError);
    sinon.assert.notCalled(warn);
  });

  it('is refused while services cannot be built', async function () {
    await services.close();

    assert.throws(() => limits.service, { errorType: 'IncorrectUsageError' });
    sinon.assert.notCalled(loadLimits);
  });

  it('loads no limits when the host configures none', function () {
    void limits.service;

    assert.deepEqual(loaded().limits, {});
    sinon.assert.notCalled(warn);
  });

  it('only uses the billing help link when billing is explicitly enabled', function () {
    const { load } = limits.extras;
    const service = limits.service;
    const { foundation } = application;

    for (const enabled of [undefined, false, 'true', true]) {
      configUtils.set({
        hostSettings: { billing: { enabled, url: 'https://billing.example.com' } },
      });
      load(service, foundation);
      assert.equal(
        loaded().helpLink,
        enabled === true ? 'https://billing.example.com' : 'https://ghost.org/help/',
      );
    }
    configUtils.set({ hostSettings: { billing: { enabled: true } } });
    load(service, foundation);
    assert.equal(loaded().helpLink, 'https://ghost.org/help/');
  });

  it('counts a periodic limit by month from the start of the subscription', function () {
    configUtils.set({ hostSettings: { subscription: { start: '2026-01-15T00:00:00.000Z' } } });

    void limits.service;

    assert.deepEqual(loaded().subscription, {
      startDate: '2026-01-15T00:00:00.000Z',
      interval: 'month',
    });
  });

  it("hands the limit service the application's database, read only when a limit counts", function () {
    void limits.service;
    assert.equal(loaded().db.knex, application.foundation.database);

    const database = sinon.stub().returns('the handle');
    limits.extras.load(limits.service, {
      config: application.foundation.config,
      logger: application.foundation.logger,
      get database() {
        return database();
      },
    });

    sinon.assert.notCalled(database);
    assert.equal(loaded().db.knex, 'the handle');
  });

  it('warns about an incorrect usage error and is still built', function () {
    const thrownError = new errors.IncorrectUsageError({ message: 'Incorrect limits' });
    loadLimits.throws(thrownError);

    assert.ok(limits.service instanceof LimitService);

    sinon.assert.calledOnceWithExactly(warn, thrownError);
  });

  it('fails the first use with any other error, without a warning, and builds again on the next', function () {
    const thrownError = new errors.InternalServerError({ message: 'Something went wrong' });
    loadLimits.onFirstCall().throws(thrownError);

    assert.throws(
      () => limits.service,
      (error) => error === thrownError,
    );
    sinon.assert.notCalled(warn);

    assert.ok(limits.service instanceof LimitService);
    sinon.assert.calledTwice(loadLimits);
  });
});
