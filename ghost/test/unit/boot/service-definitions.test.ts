import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { AnyServiceDefinition } from '#kernel/define-service';

const core = path.resolve(__dirname, '../../../core');
const servicesRoot = path.join(core, 'server/services');
const legacy = Object.keys(
  (
    yaml.load(readFileSync(path.join(servicesRoot, 'legacy-service-inventory.yaml'), 'utf8')) as {
      services: object;
    }
  ).services,
);
// A service directory that the legacy service inventory does not list is standard.
// A directory with no root is not a service: switching branches can leave one behind.
const standard = readdirSync(servicesRoot, { withFileTypes: true })
  .filter(
    (item) =>
      item.isDirectory() &&
      !legacy.includes(item.name) &&
      ['index.ts', 'index.js'].some((file) => existsSync(path.join(servicesRoot, item.name, file))),
  )
  .map((item) => item.name);

const {
  listening,
  background,
}: typeof import('../../../bootstrap/services') = require('../../../bootstrap/services');
const steps = readFileSync(path.join(core, '../bootstrap/transition/steps.ts'), 'utf8');

// Roots whose start is an entry of its own in Ghost's start list, because Ghost cannot serve
// before it has finished. Each must be started there by name.
const STARTED_BY_AN_ENTRY: Record<string, string> = {
  'signing-keys': "await services.start(core('server/services/signing-keys').default);",
};

function rootOf(service: string): AnyServiceDefinition {
  return require(path.join(servicesRoot, service)).default;
}

const named = (list: readonly (() => AnyServiceDefinition)[]) => list.map((entry) => entry());

// Boot starts no service root by calling it. What makes a root work is what it declares, and
// that the application is told about the roots it has to know before their first use.
describe('Service roots and what the application is told about them', function () {
  it('finds the standard service roots', function () {
    assert.ok(standard.length > 20, `Only found ${standard.length} standard services`);
  });

  for (const service of standard) {
    describe(service, function () {
      it('default-exports a definition, which loading does not build', function () {
        const root = rootOf(service);

        assert.equal(typeof root.name, 'string');
        assert.equal(typeof root.create, 'function');
        assert.ok(Array.isArray(root.listeners));
        assert.equal(typeof root.needs, 'object');
        for (const [key, need] of Object.entries(root.needs as Record<string, unknown>)) {
          assert.equal(
            typeof (need as AnyServiceDefinition).create,
            'function',
            `${service} needs ${key}, which is not a service definition`,
          );
        }
        // The form with init() and stop() is gone: the application builds and stops services.
        assert.equal('init' in root, false);
      });

      it('is built synchronously', function () {
        assert.notEqual(
          Object.getPrototypeOf(rootOf(service).create)?.constructor?.name,
          'AsyncFunction',
          `${service} has an asynchronous create: move what it waits for into start`,
        );
      });

      it('is in the list the application listens from if, and only if, it declares listeners', function () {
        const root = rootOf(service);

        assert.equal(
          named(listening).includes(root),
          root.listeners.length > 0,
          root.listeners.length > 0
            ? `${service} declares listeners: name it in \`listening\` in ghost/bootstrap/services.ts`
            : `${service} declares no listeners: remove it from \`listening\` in ghost/bootstrap/services.ts`,
        );
      });

      it('is started by the application if, and only if, it declares a start', function () {
        const root = rootOf(service);
        const startedByBoot = STARTED_BY_AN_ENTRY[service];
        if (startedByBoot) {
          assert.ok(
            steps.includes(startedByBoot),
            `bootstrap/transition/steps.ts must contain: ${startedByBoot}`,
          );
        }
        const started = named(background).includes(root) || startedByBoot !== undefined;

        assert.equal(
          started,
          root.start !== undefined,
          root.start
            ? `${service} declares a start: name it in \`background\` in ghost/bootstrap/services.ts`
            : `${service} declares no start: nothing should start it`,
        );
      });
    });
  }

  it('lists only standard service roots', function () {
    const roots = standard.map(rootOf);
    for (const root of [...named(listening), ...named(background)]) {
      assert.ok(roots.includes(root), `${root.name} is listed but is not a standard service root`);
    }
  });
});
