import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import type { Foundation } from '@tryghost/kernel/foundation';
import { LimitService } from '@tryghost/limit-service';
import sinon from 'sinon';
import { loadHostLimits } from '../../../../shared/limits/host-limits';

// The root is loaded fresh for each test: it keeps its instance for the life of the module.
function loadRoot(): typeof import('../../../../shared/limits').default {
  const file = require.resolve('../../../../shared/limits');
  delete require.cache[file];
  return require(file).default;
}

function foundationOf(hostSettings: object, warn = sinon.stub()): Foundation {
  const tree: Record<string, unknown> = { hostSettings };
  return {
    config: {
      get: (key: string) =>
        key.split(':').reduce<any>((value, part) => value?.[part], tree) as unknown,
    },
    logging: { warn },
    database: { knex: {} },
    events: {},
  } as unknown as Foundation;
}

describe('Limits shared module', function () {
  it('is not available before the shared step starts it', function () {
    assert.throws(() => loadRoot().service, /Limits used before init\(\)/);
  });

  it('loads the limits the host configured, from the foundation it is given', async function () {
    const limits = loadRoot();

    await limits.init({
      foundation: foundationOf({ limits: { customIntegrations: { disabled: true } } }),
    });

    assert.equal(limits.service.isDisabled('customIntegrations'), true);
    assert.equal(limits.service.isLimited('members'), false);
  });

  it('keeps one instance and reads config again on each start', async function () {
    const limits = loadRoot();
    await limits.init({ foundation: foundationOf({}) });
    const first = limits.service;
    assert.equal(first.isLimited('customIntegrations'), false);

    await limits.stop();
    await limits.init({
      foundation: foundationOf({ limits: { customIntegrations: { disabled: true } } }),
    });

    assert.equal(limits.service, first);
    assert.equal(first.isLimited('customIntegrations'), true);
  });

  describe('loadHostLimits', function () {
    function loaded(hostSettings: object, database: object = { knex: {} }) {
      const limits = new LimitService();
      const loadLimits = sinon.stub(limits, 'loadLimits');
      loadHostLimits(limits, { ...foundationOf(hostSettings), database } as never);
      return loadLimits.firstCall.args[0];
    }

    it('uses the billing help link only when billing is explicitly enabled', function () {
      for (const enabled of [undefined, false, 'true', true]) {
        const { helpLink } = loaded({ billing: { enabled, url: 'https://billing.example.com' } });
        assert.equal(
          helpLink,
          enabled === true ? 'https://billing.example.com' : 'https://ghost.org/help/',
        );
      }
      assert.equal(loaded({ billing: { enabled: true } }).helpLink, 'https://ghost.org/help/');
    });

    it('passes the subscription start and the database handle it was given', function () {
      const database = { knex: {} };
      const options = loaded({ subscription: { start: '2024-01-01' } }, database);

      assert.deepEqual(options.subscription, { startDate: '2024-01-01', interval: 'month' });
      assert.equal(options.db, database);
      assert.equal(loaded({}).subscription, undefined);
    });

    it('logs a wrongly configured limit instead of failing the start', function () {
      const warn = sinon.stub();
      const limits = new LimitService();
      const failure = new errors.IncorrectUsageError({ message: 'Incorrect limits' });
      sinon.stub(limits, 'loadLimits').throws(failure);

      loadHostLimits(limits, foundationOf({}, warn));

      sinon.assert.calledOnceWithExactly(warn, failure);
    });

    it('rethrows any other failure', function () {
      const limits = new LimitService();
      const failure = new errors.InternalServerError({ message: 'broken' });
      sinon.stub(limits, 'loadLimits').throws(failure);

      assert.throws(
        () => loadHostLimits(limits, foundationOf({})),
        (error) => error === failure,
      );
    });
  });
});
