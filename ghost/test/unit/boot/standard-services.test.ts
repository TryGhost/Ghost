import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import yaml from 'js-yaml';
import { loadBootFunction } from './harness';

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
const boot = readFileSync(path.join(core, 'boot.ts'), 'utf8');
const phases = [...boot.matchAll(/^(?:async )?function (\w+)\(/gm)];

// The phase that binds a root and calls init() on the binding. Lint requires this form.
function phaseOf(service: string) {
  const bound = new RegExp(
    `const (\\w+)(?:: [^=]+?)? =\\s+require\\('\\./server/services/${service}(?:/index)?'\\)\\.default;`,
    'g',
  );
  for (const binding of boot.matchAll(bound)) {
    const index = phases.findLastIndex((phase) => phase.index < binding.index);
    const source = boot.slice(phases[index]?.index, phases[index + 1]?.index);
    if (source.includes(`${binding[1]}.init(`)) {
      return phases[index]![1]!;
    }
  }
  return undefined;
}

// Stands in for everything else boot touches: any property, call or await gives it back.
function anything(overrides: Record<string, unknown> = {}): unknown {
  const stub: unknown = new Proxy(function () {}, {
    get(_target, key) {
      if (typeof key === 'string' && Object.hasOwn(overrides, key)) {
        return overrides[key];
      }
      if (key === 'then') {
        return undefined;
      }
      if (key === Symbol.iterator) {
        return function* () {};
      }
      return key === Symbol.toPrimitive ? () => '' : stub;
    },
    apply: () => stub,
    construct: () => stub as object,
  });
  return stub;
}

function start(service: string, init: () => Promise<void>) {
  const phase = phaseOf(service);
  assert.ok(phase, `No boot phase binds ${service} and calls init() on the binding`);
  const run = loadBootFunction(
    phase,
    { [`./server/services/${service}`]: anything({ default: anything({ init }) }) },
    { fallback: () => anything() },
  );
  return run({ config: anything(), bootLogger: anything(), jobsService: anything() });
}

describe('Boot waits for every standard service', function () {
  for (const service of standard) {
    it(`waits for ${service} initialization before its phase finishes`, async function () {
      const ready = Promise.withResolvers<void>();
      let calls = 0;
      let finished = false;
      const startup = start(service, () => {
        calls += 1;
        return ready.promise;
      }).then(() => {
        finished = true;
      });

      try {
        // Drain runnable continuations while init() stays pending.
        await setImmediate();
        assert.equal(calls, 1, `${service} init() should be called once`);
        assert.equal(finished, false, `Boot moved on before ${service} was ready`);
      } finally {
        ready.resolve();
        await startup;
      }

      assert.equal(finished, true);
    });

    it(`fails its phase with the same error when ${service} initialization fails`, async function () {
      const failure = new Error(`${service} initialization failed`);

      await assert.rejects(
        start(service, () => Promise.reject(failure)),
        (error) => error === failure,
      );
    });
  }
});
