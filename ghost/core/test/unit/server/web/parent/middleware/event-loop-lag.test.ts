import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import sinon from 'sinon';
import {
  createLagMonitor,
  eventLoopLag,
  parseEventLoopLagConfig,
  type LagMonitor,
} from '../../../../../../core/server/web/parent/middleware/event-loop-lag';

const CONFIG = {
  highWaterMarkMs: 250,
  lowWaterMarkMs: 60,
};

function fakeMonitor(overloaded: boolean): LagMonitor & { recordShed: sinon.SinonStub } {
  return {
    isOverloaded: () => overloaded,
    lagMs: () => 0,
    recordShed: sinon.stub(),
    stop: () => {},
  };
}

function createApp(monitor: LagMonitor, config: unknown = CONFIG) {
  const app = express();
  app.use(eventLoopLag(config, monitor));
  app.all(/.*/, (_req, res) => {
    res.status(200).json({ served: true });
  });
  return app;
}

describe('Event loop lag middleware', function () {
  describe('parseEventLoopLagConfig', function () {
    it('rejects a low water mark at or above the high water mark', function () {
      assert.throws(
        () => parseEventLoopLagConfig({ highWaterMarkMs: 100, lowWaterMarkMs: 100 }),
        /must be below highWaterMarkMs/,
      );
    });

    it('resolves to the shipped defaults when nothing is configured', function () {
      const config = parseEventLoopLagConfig(undefined);

      assert.equal(config.enabled, false, 'ships disabled');
      assert.equal(config.highWaterMarkMs, 500);
      assert.equal(config.lowWaterMarkMs, 100);
      assert.deepEqual(config.exemptPathPrefixes, ['/ghost/']);
    });

    it('reads the enabled flag, including as a string from an env var', function () {
      assert.equal(parseEventLoopLagConfig({ enabled: true }).enabled, true);
      assert.equal(parseEventLoopLagConfig({ enabled: 'true' }).enabled, true);
      // 'false' is truthy as a bare string, so it must be parsed, not coerced.
      assert.equal(parseEventLoopLagConfig({ enabled: 'false' }).enabled, false);
    });

    it('falls back to shipped defaults for malformed tuning values', function () {
      // An operator can correct a typo live; it must not take the site down.
      const config = parseEventLoopLagConfig({
        ...CONFIG,
        percentile: 'nope',
        sampleWindowMs: -1,
        exemptPathPrefixes: [42],
      });

      assert.equal(config.percentile, 90);
      assert.equal(config.sampleWindowMs, 500);
      assert.deepEqual(config.exemptPathPrefixes, ['/ghost/']);
    });

    it('throws on water marks that are individually valid but incoherent', function () {
      // No way to guess which of the two the operator meant.
      assert.throws(
        () => parseEventLoopLagConfig({ highWaterMarkMs: 100, lowWaterMarkMs: 250 }),
        /must be below highWaterMarkMs/,
      );
    });

    it('does not let through the values z.coerce.number() would', function () {
      // null/true/'' all coerce to 0, which here would mean "shed everything".
      for (const highWaterMarkMs of [null, true, '', []]) {
        assert.equal(
          parseEventLoopLagConfig({ ...CONFIG, highWaterMarkMs }).highWaterMarkMs,
          500,
          `expected ${JSON.stringify(highWaterMarkMs)} to fall back, not become 0`,
        );
      }
    });

    it('accepts numeric config supplied as strings by argv or env vars', function () {
      // nconf layers JSON files over argv and env vars, so these arrive as
      // strings when set via GHOST_optimization__eventLoopLag__...
      const config = parseEventLoopLagConfig({ highWaterMarkMs: '250', lowWaterMarkMs: '60' });

      assert.equal(config.highWaterMarkMs, 250);
      assert.equal(config.lowWaterMarkMs, 60);
    });

    it('falls back to the shipped value for a malformed water mark', function () {
      const config = parseEventLoopLagConfig({ highWaterMarkMs: 250, lowWaterMarkMs: 'soon' });

      assert.equal(config.highWaterMarkMs, 250);
      assert.equal(config.lowWaterMarkMs, 100, 'shipped value');
    });

    it('rejects a low water mark below the sampling resolution', function () {
      // An idle loop reports ~resolution ms of delay, so such a monitor could
      // never leave the overloaded state.
      assert.throws(
        () =>
          parseEventLoopLagConfig({ highWaterMarkMs: 250, lowWaterMarkMs: 20, resolutionMs: 20 }),
        /must exceed resolutionMs/,
      );
    });

    it('starts healthy and does not hold the process open', function () {
      const monitor = createLagMonitor(parseEventLoopLagConfig(CONFIG));
      assert.equal(monitor.isOverloaded(), false);
      assert.equal(monitor.lagMs(), 0);
      monitor.stop();
    });
  });

  describe('while the loop is healthy', function () {
    it('serves requests it would otherwise shed', async function () {
      await request(createApp(fakeMonitor(false)))
        .get('/some-post')
        .expect(200)
        .expect({ served: true });
    });
  });

  describe('while the loop is overloaded', function () {
    it('sheds a frontend GET with 503, Retry-After and an uncacheable response', async function () {
      const monitor = fakeMonitor(true);

      await request(createApp(monitor))
        .get('/some-post')
        .expect(503)
        .expect('Retry-After', '5')
        .expect('Cache-Control', 'no-store, private');

      sinon.assert.calledOnce(monitor.recordShed);
    });

    it('sheds a HEAD request', async function () {
      await request(createApp(fakeMonitor(true)))
        .head('/some-post')
        .expect(503);
    });

    it('honours a configured Retry-After', async function () {
      await request(createApp(fakeMonitor(true), { ...CONFIG, retryAfterSeconds: 30 }))
        .get('/some-post')
        .expect('Retry-After', '30');
    });

    it('does not shed non-idempotent requests', async function () {
      // A shed GET costs a retry; a shed POST could drop a member signup,
      // a comment, or a Stripe webhook.
      const monitor = fakeMonitor(true);

      await request(createApp(monitor)).post('/members/api/send-magic-link/').expect(200);

      sinon.assert.notCalled(monitor.recordShed);
    });

    it('does not shed static assets', async function () {
      await request(createApp(fakeMonitor(true)))
        .get('/assets/built/screen.css')
        .expect(200);
    });

    it('does not shed admin, so the owner is not locked out mid-incident', async function () {
      await request(createApp(fakeMonitor(true)))
        .get('/ghost/api/admin/site/')
        .expect(200);
      await request(createApp(fakeMonitor(true)))
        .get('/ghost/')
        .expect(200);
    });

    it('honours configured exempt path prefixes', async function () {
      const app = createApp(fakeMonitor(true), {
        ...CONFIG,
        exemptPathPrefixes: ['/critical/'],
      });

      await request(app).get('/critical/thing').expect(200);
      // The default admin exemption is replaced, not merged.
      await request(app).get('/ghost/').expect(503);
    });

    it('accepts a single exempt prefix as a bare string', async function () {
      // An env var can only ever supply one string, never an array.
      const app = createApp(fakeMonitor(true), {
        ...CONFIG,
        exemptPathPrefixes: '/critical/',
      });

      await request(app).get('/critical/thing').expect(200);
    });

    it('falls back to the default when exempt prefixes are not strings', async function () {
      // Unlike the water marks, a malformed prefix list falls back rather than
      // throwing, so admin stays exempt instead of the site failing to boot.
      const app = createApp(fakeMonitor(true), { ...CONFIG, exemptPathPrefixes: [42] });

      await request(app).get('/ghost/').expect(200);
      await request(app).get('/some-post').expect(503);
    });
  });
});
