import assert from 'node:assert/strict';
import { defineService } from '../../../../core/kernel/define-service';
import {
  defineDomain,
  defineEvent,
  defineJob,
  defineListener,
  defineRoutes,
  defineSettings,
} from '../../../../core/kernel/domains/definitions';
import type {
  DomainFile,
  DomainFileKind,
  DomainManifest,
} from '../../../../core/kernel/domains/discover';
import { createDomainLayer, type ScheduledJob } from '../../../../core/kernel/domains/domain-layer';
import { createLoggingFake } from '../../../utils/logging-utils';

// A manifest written by hand: these tests are about what is done with found
// files, not about finding them.
function manifestOf(
  files: Record<string, unknown>,
  modules: Record<string, unknown> = {},
): DomainManifest & { loaded: string[] } {
  const loaded: string[] = [];
  const kinds: [RegExp, DomainFileKind, (match: RegExpExecArray) => string][] = [
    [/^([^/]+)\/boot$/, 'domain', (match) => match[1]!],
    [/^([^/]+)\/settings$/, 'settings', (match) => match[1]!],
    [/^([^/]+)\/http\/routes$/, 'routes', (match) => match[1]!],
    [/^[^/]+\/services\/([^/]+)\/index$/, 'service', (match) => match[1]!],
    [/^[^/]+\/listeners\/(.+)\.listener$/, 'listener', (match) => match[1]!],
    [/^[^/]+\/jobs\/(.+)\.job$/, 'job', (match) => match[1]!],
  ];
  const found: DomainFile[] = Object.entries(files).map(([id, value]) => {
    const [pattern, kind, name] = kinds.find(([candidate]) => candidate.test(id))!;
    return {
      domain: id.split('/')[0]!,
      kind,
      name: name(pattern.exec(id)!),
      id,
      module: `/domains/${id}`,
      load() {
        loaded.push(id);
        return { default: value };
      },
    };
  });
  return {
    root: '/domains',
    domains: [...new Set(found.map((file) => file.domain))].sort(),
    files: found,
    load: (module) => {
      loaded.push(module);
      return modules[module];
    },
    loaded,
  };
}

function layerOf(manifest: DomainManifest, foundation?: unknown) {
  const handlers = new Map<string, ((event: unknown) => unknown)[]>();
  const scheduled: ScheduledJob[] = [];
  const logging = createLoggingFake();
  // What the layer logged, as the argument lists of each error() call.
  const errors = logging.error.args as unknown[][];
  const layer = createDomainLayer({
    manifest,
    foundation,
    subscribe: (event, handler) => {
      handlers.set(event.name, [...(handlers.get(event.name) ?? []), handler]);
    },
    schedule: (job) => scheduled.push(job),
    logging,
  });
  const dispatch = (name: string, event: unknown) =>
    Promise.all((handlers.get(name) ?? []).map((handler) => handler(event)));
  return { layer, handlers, scheduled, errors, dispatch };
}

describe('domain layer', function () {
  describe('service roots', function () {
    it('starts roots after the ones they name, whatever their folder order', async function () {
      const order: string[] = [];
      const root = (name: string, startAfter: string[] = []) =>
        defineService(name, { create: () => order.push(name), startAfter });
      const { layer } = layerOf(
        manifestOf({
          'shop/services/a-last/index': root('a-last', ['m-middle']),
          'shop/services/m-middle/index': root('m-middle', ['z-first']),
          'shop/services/z-first/index': root('z-first'),
        }),
      );
      await layer.start();
      assert.deepEqual(order, ['z-first', 'm-middle', 'a-last']);
    });

    it('refuses to start after a root that is not in the same domain', async function () {
      const { layer } = layerOf(
        manifestOf({
          'shop/services/orders/index': defineService('orders', {
            create: () => ({}),
            startAfter: ['stock'],
          }),
          'warehouse/services/stock/index': defineService('stock', () => ({})),
        }),
      );
      await assert.rejects(
        layer.start(),
        /orders starts after stock, which is not a service root in the same domain/,
      );
    });

    it('refuses a cycle', async function () {
      const { layer } = layerOf(
        manifestOf({
          'shop/services/a/index': defineService('a', { create: () => ({}), startAfter: ['b'] }),
          'shop/services/b/index': defineService('b', { create: () => ({}), startAfter: ['a'] }),
        }),
      );
      await assert.rejects(layer.start(), /in a cycle/);
    });

    it('fails boot when a blocking root fails', async function () {
      const failure = new Error('no database');
      const { layer } = layerOf(
        manifestOf({
          'shop/services/orders/index': defineService('orders', () => {
            throw failure;
          }),
        }),
      );
      await assert.rejects(layer.start(), (error) => error === failure);
    });

    it('starts a root that does not block boot only once Ghost is ready, and logs its failure', async function () {
      const order: string[] = [];
      const { layer, errors } = layerOf(
        manifestOf({
          'shop/services/orders/index': defineService('orders', () => order.push('orders')),
          'shop/services/reports/index': defineService('reports', {
            create: () => order.push('reports'),
            blocking: false,
            startAfter: ['orders'],
          }),
          'warehouse/services/audit/index': defineService('audit', {
            create: () => {
              throw new Error('audit unavailable');
            },
            blocking: false,
          }),
        }),
      );
      await layer.start();
      assert.deepEqual(order, ['orders']);
      await layer.ready();
      assert.deepEqual(order, ['orders', 'reports']);
      assert.equal(errors.length, 1);
      assert.match(String(errors[0]![0]), /warehouse failed to start a non-blocking service/);
    });

    it('refuses a blocking root that starts after one that does not block', async function () {
      const { layer } = layerOf(
        manifestOf({
          'shop/services/orders/index': defineService('orders', {
            create: () => ({}),
            startAfter: ['reports'],
          }),
          'shop/services/reports/index': defineService('reports', {
            create: () => ({}),
            blocking: false,
          }),
        }),
      );
      await assert.rejects(layer.start(), /orders blocks boot but starts after reports/);
    });

    it('hands each root what its domain file supplies, built once', async function () {
      let built = 0;
      const received: Record<string, unknown> = {};
      const { layer } = layerOf(
        manifestOf({
          'shop/boot': defineDomain({
            dependencies: () => {
              built += 1;
              return { clock: 'tick' };
            },
          }),
          'shop/services/orders/index': defineService('orders', (dependencies: unknown) => {
            received.orders = dependencies;
            return {};
          }),
          'shop/services/stock/index': defineService('stock', (dependencies: unknown) => {
            received.stock = dependencies;
            return {};
          }),
          'warehouse/services/audit/index': defineService('audit', (dependencies: unknown) => {
            received.audit = dependencies;
            return {};
          }),
        }),
      );
      await layer.start();
      assert.equal(built, 1);
      assert.deepEqual(received, {
        orders: { clock: 'tick' },
        stock: { clock: 'tick' },
        // A domain with no domain file supplies nothing more than the foundation,
        // and this layer was given none.
        audit: undefined,
      });
    });

    it('hands the domain file the foundation, and the roots what it makes of it', async function () {
      const foundation = { logging: 'the logger', config: 'the config' };
      const received: Record<string, unknown> = {};
      const { layer } = layerOf(
        manifestOf({
          'shop/boot': defineDomain({
            // The foundation arrives as an argument. The domain says what its roots get.
            dependencies: (given: typeof foundation) => ({ log: given.logging }),
          }),
          'shop/services/orders/index': defineService('orders', (dependencies: unknown) => {
            received.orders = dependencies;
            return {};
          }),
          'warehouse/services/audit/index': defineService('audit', (dependencies: unknown) => {
            received.audit = dependencies;
            return {};
          }),
        }),
        foundation,
      );
      await layer.start();
      assert.deepEqual(received.orders, { log: 'the logger' });
      // Without a domain file, the roots are handed the foundation itself.
      assert.equal(received.audit, foundation);
    });

    it('fails boot when a domain file cannot build what its roots need', async function () {
      const { layer } = layerOf(
        manifestOf({
          'shop/boot': defineDomain({
            dependencies: () => {
              throw new Error('The shop config is not valid.');
            },
          }),
          'shop/services/orders/index': defineService('orders', () => ({})),
        }),
      );
      await assert.rejects(layer.start(), /The shop config is not valid/);
    });

    it('stops what it started in reverse, and starts it again', async function () {
      const log: string[] = [];
      const root = (name: string, startAfter: string[] = []) =>
        defineService(name, {
          create: () => name,
          start: () => log.push(`start ${name}`),
          stop: () => log.push(`stop ${name}`),
          startAfter,
        });
      const { layer } = layerOf(
        manifestOf({
          'shop/services/orders/index': root('orders', ['stock']),
          'shop/services/stock/index': root('stock'),
        }),
      );
      await layer.start();
      await layer.stop();
      await layer.start();
      assert.deepEqual(log, [
        'start stock',
        'start orders',
        'stop orders',
        'stop stock',
        'start stock',
        'start orders',
      ]);
    });

    it('rejects a services folder whose index is not a defineService root', async function () {
      const { layer } = layerOf(manifestOf({ 'shop/services/orders/index': { nope: true } }));
      await assert.rejects(
        layer.start(),
        /shop\/services\/orders\/index must default-export a defineService root/,
      );
    });
  });

  describe('listeners', function () {
    const OrderPlaced = defineEvent<{ id: string }>('OrderPlaced');

    it('subscribes a listener to its event after the domain has started', async function () {
      const seen: unknown[] = [];
      let serviceReady = false;
      const { layer, dispatch, handlers } = layerOf(
        manifestOf({
          'shop/services/orders/index': defineService('orders', () => {
            serviceReady = true;
            return {};
          }),
          'shop/listeners/pack-order.listener': defineListener({
            event: OrderPlaced,
            handle: (event: unknown) => seen.push([serviceReady, event]),
          }),
          'shop/listeners/legacy.listener': defineListener({
            event: 'LegacyThingHappened',
            handle: (event: unknown) => seen.push(event),
          }),
        }),
      );
      assert.equal(handlers.size, 0);
      await layer.start();
      const event = OrderPlaced.create({ id: '1' });
      await dispatch('OrderPlaced', event);
      await dispatch('LegacyThingHappened', 'by name');
      assert.deepEqual(seen, [[true, event], 'by name']);
    });

    it('subscribes once per process and ignores events while stopped', async function () {
      let handled = 0;
      const { layer, dispatch, handlers } = layerOf(
        manifestOf({
          'shop/listeners/pack-order.listener': defineListener({
            event: OrderPlaced,
            handle: () => {
              handled += 1;
            },
          }),
        }),
      );
      await dispatch('OrderPlaced', {});
      await layer.start();
      await dispatch('OrderPlaced', {});
      await layer.stop();
      await dispatch('OrderPlaced', {});
      await layer.start();
      await dispatch('OrderPlaced', {});
      assert.equal(handled, 2);
      assert.equal(handlers.get('OrderPlaced')!.length, 1);
    });

    it('rejects a listener file that does not export a listener', async function () {
      const { layer } = layerOf(manifestOf({ 'shop/listeners/pack-order.listener': () => {} }));
      await assert.rejects(layer.start(), /must default-export a listener definition/);
    });
  });

  describe('jobs', function () {
    it('loads and schedules jobs only once Ghost is ready', async function () {
      const manifest = manifestOf({
        'shop/jobs/clean-carts.job': defineJob({ schedule: { cron: '0 * * * *' }, run() {} }),
        'shop/jobs/warm-cache.job': defineJob({ schedule: { once: 'boot', delay: 5 }, run() {} }),
        'shop/jobs/broken.job': { run() {} },
      });
      const { layer, scheduled, errors } = layerOf(manifest);
      await layer.start();
      assert.deepEqual(manifest.loaded, []);
      assert.deepEqual(scheduled, []);
      await layer.ready();
      assert.deepEqual(
        scheduled.map(({ name, schedule }) => [name, schedule]),
        [
          ['shop/clean-carts', { cron: '0 * * * *' }],
          ['shop/warm-cache', { once: 'boot', delay: 5 }],
        ],
      );
      assert.equal(errors.length, 1);
      assert.match(String(errors[0]![0]), /could not schedule shop\/jobs\/broken\.job/);
    });
  });

  describe('jobs under test', function () {
    it('starts non-blocking roots but schedules nothing when jobs are off', async function () {
      const order: string[] = [];
      const manifest = manifestOf({
        'shop/services/reports/index': defineService('reports', {
          create: () => order.push('reports'),
          blocking: false,
        }),
        'shop/jobs/clean-carts.job': defineJob({ schedule: { cron: '0 * * * *' }, run() {} }),
      });
      const { layer, scheduled } = layerOf(manifest);
      await layer.start();
      await layer.ready({ jobs: false });
      assert.deepEqual(order, ['reports']);
      assert.deepEqual(scheduled, []);
      assert.ok(!manifest.loaded.includes('shop/jobs/clean-carts.job'));
    });
  });

  describe('routes', function () {
    it('gives the routes of a surface without loading any handler', function () {
      const browse = () => 'browsed';
      const manifest = manifestOf(
        {
          'shop/http/routes': defineRoutes([
            {
              surface: 'admin',
              method: 'get',
              path: '/orders',
              middleware: ['authAdminApi'],
              handler: 'order.controller#browse',
            },
            {
              surface: 'content',
              method: 'get',
              path: '/orders',
              handler: 'public.controller#browse',
            },
            {
              surface: 'admin',
              method: 'get',
              path: '/missing',
              handler: 'order.controller#missing',
            },
          ]),
        },
        { '/domains/shop/http/order.controller': { default: { browse } } },
      );
      const { layer } = layerOf(manifest);
      const [route, missing] = layer.routes('admin');
      assert.equal(layer.routes('admin').length, 2);
      assert.deepEqual(
        [route!.domain, route!.method, route!.path, route!.middleware],
        ['shop', 'get', '/orders', ['authAdminApi']],
      );
      assert.deepEqual([...new Set(manifest.loaded)], ['shop/http/routes']);

      assert.equal(route!.loadHandler(), browse);
      assert.equal(route!.loadHandler(), browse);
      assert.equal(manifest.loaded.filter((id) => id.endsWith('order.controller')).length, 1);
      assert.throws(() => missing!.loadHandler(), /order\.controller#missing does not exist/);
    });
  });

  describe('fragments', function () {
    it('collects one kind of fragment from every domain, in domain order', function () {
      const shop = defineSettings({ groups: { shop: {} } });
      const warehouse = defineSettings({ groups: { warehouse: {} } });
      const { layer } = layerOf(
        manifestOf({ 'warehouse/settings': warehouse, 'shop/settings': shop }),
      );
      assert.deepEqual(
        layer.fragments('settings').map(({ domain }) => domain),
        ['warehouse', 'shop'],
      );
      assert.equal(layer.fragments('settings')[1]!.value, shop);
      assert.deepEqual(layer.fragments('schema'), []);
    });
  });
});
