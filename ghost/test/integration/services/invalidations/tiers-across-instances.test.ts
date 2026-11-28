import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sinon from 'sinon';
import { InvalidationsService } from '../../../../core/server/services/invalidations/invalidations-service';
import { RedisTransport } from '../../../../core/server/services/invalidations/redis-transport';
import { FakeProductModel } from '../../../utils/fake-product-model';
import { createLoggingFake } from '../../../utils/logging-utils';
import { RedisProxy, eventually, redis } from './redis-test-utils';

const Tier = require('../../../../core/server/services/tiers/tier');
const TierRepository = require('../../../../core/server/services/tiers/tier-repository');

function goldTier() {
  return Tier.create({
    name: 'Gold',
    slug: 'gold',
    type: 'paid',
    status: 'active',
    currency: 'USD',
    monthlyPrice: 500,
    yearlyPrice: 5000,
  });
}

// Skipped unless the integration globalSetup found Redis (vitest-globalsetup-services.ts).
describe.skipIf(process.env.GHOST_TEST_REDIS_AVAILABLE !== '1')(
  'Integration: tiers across Ghost instances',
  function () {
    const closing: Array<() => Promise<unknown>> = [];
    let channel: string;
    let database: FakeProductModel;
    let proxy: RedisProxy;

    /** One Ghost instance's tier cache, with its own registry and Redis connections. */
    async function instance(name: string, connection = redis) {
      const logging = createLoggingFake();
      const transport = new RedisTransport({
        // Retry fast, so a test does not wait on ioredis' backoff
        connection: { ...connection, retryStrategy: () => 20 },
        channel,
        logging,
        heartbeat: { intervalMs: 25, timeoutMs: 250 },
      });
      const invalidations = new InvalidationsService({ transport, instanceId: name, logging });
      closing.push(() => invalidations.stop());
      await invalidations.start();
      const dispatch = sinon.stub();
      const tiers = new TierRepository({
        ProductModel: database,
        DomainEvents: { dispatch },
        invalidations,
      });
      await tiers.init();
      return { tiers, invalidations, logging, dispatch };
    }

    beforeEach(async function () {
      channel = `ghost:invalidations:test:${randomUUID()}`;
      database = new FakeProductModel();
      proxy = new RedisProxy(redis);
      closing.push(() => proxy.close());
    });

    afterEach(async function () {
      await Promise.all(closing.splice(0).map((close) => close()));
    });

    it('shows a tier saved on one instance on another', async function () {
      const a = await instance('a');
      const b = await instance('b');
      const tier = await goldTier();

      await a.tiers.save(tier);

      await eventually(
        async () => (await b.tiers.getById(tier.id)) !== null,
        'The other instance never saw the tier',
      );
      assert.equal((await b.tiers.getById(tier.id)).name, 'Gold');
      sinon.assert.calledOnce(a.dispatch);
      sinon.assert.notCalled(b.dispatch);
      sinon.assert.calledWithMatch(b.logging.info, {
        event: { name: 'invalidations.received' },
        invalidation: { name: 'tiers', origin: 'a', deliveryLatencyMs: sinon.match.number },
      });
    });

    it('catches up on a tier saved while it was disconnected, and is not ready until it has', async function () {
      const a = await instance('a');
      const b = await instance('b', await proxy.listen());
      // Still connected, to show the message went out while b was cut off
      const c = await instance('c');
      const tier = await goldTier();

      proxy.cut();
      await eventually(() => !b.invalidations.isReady(), 'It did not notice the lost connection');
      await a.tiers.save(tier);
      await eventually(
        async () => (await c.tiers.getById(tier.id)) !== null,
        'The instance still connected never saw the tier',
      );
      assert.equal(await b.tiers.getById(tier.id), null);

      const releaseReload = database.holdNext('read');
      proxy.restore();
      await eventually(
        () => b.logging.info.calledWithMatch({ event: { name: 'invalidations.reset.started' } }),
        'It never reconnected',
      );
      assert.equal(b.invalidations.isReady(), false);
      assert.equal(await b.tiers.getById(tier.id), null);

      releaseReload();
      await eventually(() => b.invalidations.isReady(), 'It never became ready again');
      assert.equal((await b.tiers.getById(tier.id))?.name, 'Gold');
      sinon.assert.notCalled(b.dispatch);
    });
  },
);
