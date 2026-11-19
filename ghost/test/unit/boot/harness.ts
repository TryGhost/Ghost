import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createApplication, type Entry } from '@tryghost/foundry/application';

const GHOST = resolve(__dirname, '../../..');
const BOOT_PATH = resolve(GHOST, 'core/boot.js');

export type BootFunction = (args: Record<string, unknown>) => Promise<void>;

type Options = {
  // Answers a dependency the test did not list. Without it, an unlisted dependency fails the test.
  fallback?: (name: string) => unknown;
  // Extra globals for boot.js, such as `process`.
  globals?: Record<string, unknown>;
};

function stubbedRequire(modules: Record<string, unknown>, fallback: Options['fallback']) {
  const available: Record<string, unknown> = {
    // Loaded at the top of boot.js by every phase.
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    ...modules,
  };
  return (dependency: string) => {
    if (Object.hasOwn(available, dependency)) {
      return available[dependency];
    }
    assert.ok(fallback, `Unexpected boot dependency: ${dependency}`);
    return fallback(dependency);
  };
}

/**
 * Loads one boot phase from core/boot.js with `require` answered from `modules`, so a test can
 * drive that phase's orchestration without booting the services it calls.
 */
export function loadBootFunction(
  name: string,
  modules: Record<string, unknown>,
  { fallback, globals = {} }: Options = {},
): BootFunction {
  const context = {
    ...globals,
    require: stubbedRequire(modules, fallback),
    module: { exports: {} },
  };
  return runInNewContext(`${readFileSync(BOOT_PATH, 'utf8')}\n${name};`, context);
}

// Evaluates a TypeScript file of ghost/bootstrap with `require` answered by the test.
function loadBootstrapFile(file: string, require: (dependency: string) => unknown) {
  const { outputText } = ts.transpileModule(
    readFileSync(resolve(GHOST, 'bootstrap', file), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  );
  const module = { exports: {} as Record<string, any> };
  runInNewContext(outputText, { require, module, exports: module.exports });
  return module.exports;
}

type SequenceOptions = Options & {
  // Functions of boot.js to call first, each with the config.
  before?: string[];
  // The part of the services list to run: from and to are entry names, both included.
  from?: string;
  to?: string;
  // Also run the jobs step and what follows it.
  jobs?: boolean;
};

type SequenceArgs = {
  config?: unknown;
  ghostServer?: unknown;
  jobsService?: unknown;
  prometheusClient?: unknown;
  bootLogger?: unknown;
  frontend?: boolean;
};

/**
 * Runs the real services list (bootstrap/services.ts) through the real start sequence, with
 * every module it or core/boot.js requires answered from `modules`. Keys are written as boot.js
 * requires them (`./server/services/tiers`); the list's `../core/` prefix is mapped onto them.
 */
export function loadBootSequence(
  modules: Record<string, unknown>,
  { fallback, globals = {}, before = [], from, to, jobs = false }: SequenceOptions = {},
) {
  const require = stubbedRequire(modules, fallback);
  const boot: Record<string, (args: unknown) => unknown> = runInNewContext(
    `${readFileSync(BOOT_PATH, 'utf8')}\nmodule.exports;`,
    { ...globals, require, module: { exports: {} } },
  );
  const { legacySteps } = loadBootstrapFile('transition/legacy-steps.ts', (dependency) => {
    assert.equal(dependency, '../../core/boot');
    return boot;
  });
  const list: Entry<any>[] = loadBootstrapFile('services.ts', (dependency) =>
    dependency === './transition/legacy-steps'
      ? { legacySteps }
      : require(dependency.replace(/^\.\.\/core\//, './')),
  ).services;
  const names = list.map((entry) => entry.name);
  const first = from === undefined ? 0 : names.indexOf(from);
  const last = to === undefined ? list.length - 1 : names.indexOf(to);
  assert.ok(first >= 0 && last >= 0, `The services list has no entry ${from ?? to}`);

  let config: unknown;
  const application = createApplication<any, { frontend: boolean }, Record<string, unknown>>({
    name: 'Ghost under test',
    config: () => config,
    logging: () => ({ error() {} }) as never,
    database: () => undefined,
    events: () => ({ subscribe() {}, dispatch() {} }),
    steps: {
      shared: {
        before: before.map((name) => ({ name, run: () => boot[name]!({ config }) })),
        modules: [],
      },
      services: { modules: list.slice(first, last + 1) },
      jobs: jobs
        ? { run: legacySteps.jobs, after: [{ name: 'after jobs', run: legacySteps.afterJobs }] }
        : {},
    },
  });

  return {
    names,
    async start({ frontend = true, ...args }: SequenceArgs = {}): Promise<void> {
      config = args.config ?? {};
      await application.start({ frontend }, { ...args });
    },
    stop: () => application.stop(),
  };
}
