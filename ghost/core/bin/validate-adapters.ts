#!/usr/bin/env node

// Checks that custom adapters load and implement everything their base class
// requires. Ghost only verifies an adapter fully on first use (`getAdapter`), so a
// missing method on a storage adapter otherwise surfaces at first upload - run
// this at image build time to fail the build instead.
//
// Usage: bin/validate-adapters.js [--check-duplicate-deps] <type>:<AdapterClassName> ...
//   e.g. bin/validate-adapters.js cache:Redis sso:ProSSO storage:S3Storage
//
// Adapters are named explicitly rather than read from config, which may not be
// present at build time

import { parseArgs } from 'node:util';
import {
  checkDuplicateDependencies,
  collectLoadedFiles,
  formatDuplicateReport,
} from './lib/duplicate-deps';
import { adapterPaths } from '../core/server/services/adapter-manager/adapter-paths';
import {
  baseClasses,
  baseClassPackages,
} from '../core/server/services/adapter-manager/base-classes';
import { loadAdapterClass } from '../core/server/services/adapter-manager/utils';

type AdapterType = keyof typeof baseClasses;

function validate(spec: string): void {
  const parts = spec.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`expected <type>:<AdapterClassName>, got "${spec}"`);
  }

  const [type, className] = parts;
  const BaseClass = baseClasses[type as AdapterType];
  if (!BaseClass) {
    throw new Error(
      `unknown adapter type "${type}" - expected one of: ${Object.keys(baseClasses).join(', ')}`,
    );
  }

  // Same loader the adapter manager uses, so resolution and its failure messages
  // are identical to what the running server would report.
  const Adapter = loadAdapterClass(type, className, adapterPaths, require);

  // Matches the adapter manager's check, including its tolerance for a base class
  // loaded from a second copy of the package, where instanceof fails.
  const inherits =
    Adapter.prototype instanceof BaseClass ||
    Object.getPrototypeOf(Adapter).name === BaseClass.name;
  if (!inherits) {
    throw new Error(`does not inherit from ${BaseClass.name}`);
  }

  // requiredFns is defined by the base constructor and can't be overridden by a
  // subclass, so the base instance is the authority on what must be implemented.
  // The bases are abstract, which constrains the type checker but not the runtime.
  const Base = BaseClass as unknown as new () => { requiredFns: readonly string[] };
  const missing = new Base().requiredFns.filter(
    (fn) => typeof Adapter.prototype[fn] !== 'function',
  );
  if (missing.length) {
    throw new Error(`missing method(s): ${missing.join(', ')}`);
  }
}

/**
 * Report the packages the loaded adapters brought a second copy of. Reads what the
 * process has already loaded, so it has to run after the adapters have. In a Ghost
 * Pro image `module.paths` reaches the `/home/ghost/node_modules` that an adapter's
 * unbundled dependencies fall back to, which is the other side of the comparison.
 */
function reportDuplicateDeps(): boolean {
  const report = checkDuplicateDependencies({
    cachedFiles: collectLoadedFiles(Object.keys(require.cache)),
    // The blank entry means "Ghost's own node_modules", which is the other side
    // of the comparison rather than an adapter tree.
    adapterRoots: adapterPaths.filter((adapterPath) => adapterPath !== ''),
    ghostNodeModulesRoots: module.paths,
    mustBeSingleCopy: Object.values(baseClassPackages),
  });

  process.stdout.write(formatDuplicateReport(report));

  return report.blocking.length > 0;
}

/** `parseArgs` is strict, so a bad option throws instead of passing for a name. */
function parseCliArgs(argv: string[]) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'check-duplicate-deps': { type: 'boolean', default: false },
      },
    });
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return null;
  }
}

function main(argv: string[]): void {
  const parsed = parseCliArgs(argv);
  if (!parsed?.positionals.length) {
    process.stderr.write(
      'Usage: bin/validate-adapters.js [--check-duplicate-deps] <type>:<AdapterClassName> ...\n',
    );
    process.exit(1);
  }

  const { values, positionals: specs } = parsed;

  const failures: { spec: string; message: string }[] = [];

  for (const spec of specs) {
    try {
      validate(spec);
      process.stdout.write(`  ok    ${spec}\n`);
    } catch (err) {
      failures.push({ spec, message: (err as Error).message });
      process.stdout.write(`  FAIL  ${spec}\n`);
    }
  }

  // Off unless asked for: a self-hosted adapter in content/adapters may
  // legitimately bundle its own dependencies, and that must not fail anyone's
  // build. Only the image build installing adapters itself opts in.
  const duplicatesBlocked = values['check-duplicate-deps'] && reportDuplicateDeps();

  if (failures.length) {
    process.stderr.write(`\n${failures.length} of ${specs.length} adapter(s) failed validation:\n`);
    for (const { spec, message } of failures) {
      process.stderr.write(`- ${spec}: ${message}\n`);
    }
  }

  if (failures.length || duplicatesBlocked) {
    process.exit(1);
  }

  process.stdout.write(`Validated ${specs.length} adapter(s).\n`);
}

main(process.argv.slice(2));
