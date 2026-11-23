import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import sinon from 'sinon';
import type { AnyServiceDefinition } from '#kernel/define-service';

const { agentProvider } = require('../utils/e2e-framework');
const { services } = require('../utils/services') as typeof import('../utils/services');
const DomainEvents = require('@tryghost/domain-events');
const legacyEvents = require('../../core/server/lib/common/events');

const servicesRoot = path.resolve(__dirname, '../../core/server/services');
const legacy = Object.keys(
  (
    yaml.load(readFileSync(path.join(servicesRoot, 'legacy-service-inventory.yaml'), 'utf8')) as {
      services: object;
    }
  ).services,
);
const standard = readdirSync(servicesRoot, { withFileTypes: true })
  .filter(
    (item) =>
      item.isDirectory() &&
      !legacy.includes(item.name) &&
      ['index.ts', 'index.js'].some((file) => existsSync(path.join(servicesRoot, item.name, file))),
  )
  .map((item) => item.name);

// Every standard service root, built by a booted Ghost exactly as its first reader would build it.
describe('Service roots in a booted Ghost', function () {
  const sandbox = sinon.createSandbox();

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('builds every standard root on first use, and none subscribes to an event while it is built', function () {
    assert.ok(standard.length > 20, `Only found ${standard.length} standard services`);
    const subscribed: string[] = [];
    let building = '';
    for (const method of ['subscribe'] as const) {
      const original = DomainEvents[method];
      sandbox.stub(DomainEvents, method).callsFake((...args: unknown[]) => {
        if (building) {
          subscribed.push(
            `${building}: DomainEvents.${method}(${(args[0] as { name: string }).name})`,
          );
        }
        return original.apply(DomainEvents, args);
      });
    }
    for (const method of ['on', 'once', 'addListener', 'prependListener'] as const) {
      const original = legacyEvents[method];
      sandbox.stub(legacyEvents, method).callsFake((...args: unknown[]) => {
        if (building) {
          subscribed.push(`${building}: events.${method}(${String(args[0])})`);
        }
        return original.apply(legacyEvents, args);
      });
    }

    for (const service of standard) {
      const root: AnyServiceDefinition = require(path.join(servicesRoot, service)).default;
      building = service;
      try {
        const built = services.get(root);
        assert.notEqual(built, undefined, `${service} built nothing`);
        assert.equal(
          typeof (built as { then?: unknown } | null)?.then,
          'undefined',
          `${service} is built asynchronously`,
        );
        // A root that still has the transitional getter reads the same instance through it.
        if ('service' in root) {
          assert.equal(root.service, built);
        }
      } finally {
        building = '';
      }
    }

    // A root declares its listeners; the application attaches them. A subscription made while a
    // service is built would outlive the instance and be made again for the next one.
    assert.deepEqual(subscribed, []);
  });
});
