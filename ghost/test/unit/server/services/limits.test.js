const assert = require('node:assert/strict');
const sinon = require('sinon');

const {
  limitService: limits,
  init: initLimits,
  getHelpLink,
} = require('../../../../core/server/services/limits');
const configUtils = require('../../../utils/config-utils');
const logging = require('@tryghost/logging');

const errors = require('@tryghost/errors');

describe('Limit Service Init', function () {
  let loggerStub;
  let limitServiceStub;

  beforeEach(function () {
    loggerStub = sinon.spy(logging);
    limitServiceStub = sinon.stub();

    sinon.stub(limits, 'loadLimits').callsFake(limitServiceStub);

    configUtils.set({
      hostSettings: {},
    });
  });

  afterEach(async function () {
    await configUtils.restore();
    sinon.restore();
  });

  it('only uses the billing help link when billing is explicitly enabled', function () {
    for (const enabled of [undefined, false, 'true', true]) {
      configUtils.set({
        hostSettings: { billing: { enabled, url: 'https://billing.example.com' } },
      });
      assert.equal(
        getHelpLink(),
        enabled === true ? 'https://billing.example.com' : 'https://ghost.org/help/',
      );
    }
    configUtils.set({ hostSettings: { billing: { enabled: true } } });
    assert.equal(getHelpLink(), 'https://ghost.org/help/');
  });

  it('initiates and loads limits - minimal setup', async function () {
    limitServiceStub.returns(Promise.resolve());
    await initLimits();

    sinon.assert.notCalled(loggerStub.warn);
  });
  it('handles limit-service incorrect usage errors gracefully with a warning', async function () {
    const thrownError = new errors.IncorrectUsageError('Incorrect limits');
    limitServiceStub.throws(thrownError);

    await initLimits();

    sinon.assert.calledOnceWithExactly(loggerStub.warn, thrownError);
  });
  it('propagates other limit-service errors without warning', function () {
    const thrownError = new errors.InternalServerError('Something went wrong');
    limitServiceStub.throws(thrownError);

    assert.throws(
      () => initLimits(),
      (error) => error === thrownError,
    );
    sinon.assert.notCalled(loggerStub.warn);
  });
});
