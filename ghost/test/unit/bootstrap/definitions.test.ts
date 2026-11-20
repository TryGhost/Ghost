import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ServiceDefinition } from '@tryghost/kernel/define-service';
import application from '../../../bootstrap/app';

const servicesRoot = path.resolve(__dirname, '../../../core/server/services');

// A root written as `defineService({ ... })` is a service definition.
const definitions = readdirSync(servicesRoot, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => ({ name: item.name, file: path.join(servicesRoot, item.name, 'index.ts') }))
  .filter(
    ({ file }) =>
      existsSync(file) && /\bdefineService(?:<[^(]*>)?\(\s*\{/.test(readFileSync(file, 'utf8')),
  );

const { declared = [], modules = [] } = application.steps.services ?? {};
const declares = (name: string) => declared.some((entry) => entry.name === name);
const builds = (name: string) => modules.some((entry) => entry.name === name && 'load' in entry);

// Boot does not start a service definition, so nothing fails when one is
// missing from a list: its events would be missed until its first use, or its
// start would never run. These tests are what notices.
describe('Service definitions and the lists boot reads', function () {
  it('finds the definitions', function () {
    assert.ok(definitions.length > 0);
  });

  for (const { name, file } of definitions) {
    describe(name, function () {
      const definition: ServiceDefinition<unknown> = require(file).default;
      const listens = (definition.listeners?.length ?? 0) > 0;
      const starts = definition.start !== undefined;
      const asynchronous = definition.create.constructor.name === 'AsyncFunction';

      it('builds nothing when its root is loaded, and names itself', function () {
        assert.equal(typeof definition.create, 'function');
        assert.equal(typeof definition.name, 'string');
      });

      if (starts) {
        it('is in the services list, because it declares a start', function () {
          assert.ok(
            builds(name),
            `${name} declares a start that nothing runs. Add it to \`services\` in ghost/bootstrap/services.ts.`,
          );
        });
      } else if (listens) {
        it('is declared, because it declares listeners', function () {
          assert.ok(
            declares(name) || builds(name),
            `${name} declares listeners that nothing attaches. Add it to \`declared\` in ghost/bootstrap/services.ts.`,
          );
        });
      }

      if (!starts && !asynchronous) {
        it('is not built by boot, because it has no start and is built synchronously', function () {
          assert.ok(
            !builds(name),
            `${name} has nothing boot must build. Remove it from \`services\` in ghost/bootstrap/services.ts; it is built on first use.`,
          );
        });
      }

      if (!listens) {
        it('is not declared, because it declares no listeners', function () {
          assert.ok(
            !declares(name),
            `${name} declares no listeners. Remove it from \`declared\` in ghost/bootstrap/services.ts.`,
          );
        });
      }
    });
  }

  it('declares only service definitions', function () {
    for (const entry of declared) {
      assert.ok(
        definitions.some(({ name }) => name === entry.name),
        `${entry.name} is in \`declared\` but its root is not a service definition.`,
      );
    }
  });

  it('loads, for each declared name, the root that name says', function () {
    for (const entry of declared) {
      assert.equal(entry.load(), require(path.join(servicesRoot, entry.name)).default);
    }
  });
});
