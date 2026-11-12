#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  legacyInventoryFile,
  readLegacyServices,
  servicesRoot as SERVICES,
} from '../configs/oxlint/legacy-services.ts';

const TESTS = 'ghost/test/unit/server/services';
const FORMATTER = fileURLToPath(new URL('./bin/oxfmt', import.meta.resolve('oxfmt/package.json')));
const USAGE = `Usage: pnpm gx generate service <name>

Create a boot-owned TypeScript service and starter root test.
Use lowercase kebab-case beginning with a letter, e.g. delivery-receipts.
`;

function templates(name: string) {
  const className = `${name
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')}Service`;
  return {
    [`${SERVICES}/${name}/index.ts`]: `import { defineService } from '../../../kernel/define-service';
import { ${className} } from './${name}-service';

// Boot must initialize this root after any dependencies added below.
export default defineService('${className}', () => {
  // Require application instances here, so importing the root does no startup work.
  // Add only the dependencies this service needs, with matching implementation types:
  // const models = require('../../models');
  // const settingsCache = require('../../../shared/settings-cache');
  // const config = require('../../../shared/config');
  // const DomainEvents = require('@tryghost/domain-events');
  // const tiers: typeof import('../tiers').default = require('../tiers').default;
  const service = new ${className}({
    logging: require('@tryghost/logging'),
    // models, DomainEvents, tiers: tiers.service,
    // Keep settings live when they can change: getTitle: () => settingsCache.get('title'),
  });

  // Complete required startup work before returning. If it can fail after acquiring
  // resources, release those resources before rethrowing so init() can be retried.
  return service;
});
`,
    [`${SERVICES}/${name}/${name}-service.ts`]: `import type { GhostLogger } from '@tryghost/logging';

// Import allowlisted libraries directly here; inject application instances from index.ts.
// For example: import { getUnixTime } from '../../../kernel/clock';
interface ${className}Deps {
  logging: GhostLogger;
}

export class ${className} {
  readonly logging: GhostLogger;

  constructor({ logging }: ${className}Deps) {
    this.logging = logging;
  }

  // Add the capability's operations here, keeping state on this instance.
}
`,
    [`${TESTS}/${name}/index.test.ts`]: `import assert from 'node:assert/strict';
import { IncorrectUsageError } from '@tryghost/errors';
import type serviceRoot from '../../../../../core/server/services/${name}';

// Match the root's CommonJS loading path so instanceof uses the same constructor.
const { ${className} } = require('../../../../../core/server/services/${name}/${name}-service') as typeof import('../../../../../core/server/services/${name}/${name}-service');
const ROOT_PATH = require.resolve('../../../../../core/server/services/${name}');

describe('${className} root', function () {
  let originalModule: NodeJS.Module | undefined;
  let root: typeof serviceRoot;

  beforeEach(function () {
    // Reload only the root and restore its cache entry for other tests' consumers.
    originalModule = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    root = require(ROOT_PATH).default as typeof serviceRoot;
  });

  afterEach(function () {
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  it('requires initialization and retains one wired instance', async function () {
    assert.throws(() => root.service, IncorrectUsageError);

    await Promise.all([root.init(), root.init()]);
    const service = root.service;
    assert.ok(service instanceof ${className});
    assert.equal(service.logging, require('@tryghost/logging'));

    await root.init();
    assert.equal(root.service, service);
  });

  // Add behavior, dependency timing, and partial-startup failure/retry tests as needed.
});
`,
  };
}

function formatSource(rootDir: string, file: string, source: string) {
  return execFileSync(
    process.execPath,
    [FORMATTER, '--config', '.oxfmtrc.json', '--stdin-filepath', file],
    {
      cwd: rootDir,
      input: source,
      encoding: 'utf8',
    },
  );
}

export function createService({ name, rootDir }: { name: string; rootDir: string }) {
  if (
    typeof name !== 'string' ||
    name.length > 100 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)
  ) {
    throw new Error(
      `Invalid service name: "${name}". Use lowercase kebab-case beginning with a letter (up to 100 characters).`,
    );
  }
  const serviceDir = path.join(rootDir, SERVICES, name);
  const testDir = path.join(rootDir, TESTS, name);
  // Also reject standalone files (including metadata) with the same stem.
  const existing = readdirSync(path.join(rootDir, SERVICES)).some(
    (entry) => entry.toLowerCase() === name || path.parse(entry).name.toLowerCase() === name,
  );
  if (existing || lstatSync(testDir, { throwIfNoEntry: false })) {
    throw new Error(`Service or test path already exists: ${name}`);
  }
  // A new service is standard: it is checked because it is not listed as legacy.
  // A leftover legacy entry with this name would exempt it, so refuse.
  const legacy = [...readLegacyServices(rootDir).keys()];
  if (legacy.some((key) => key.replace(/\.[^.]+$/, '') === name)) {
    throw new Error(`Service is listed in ${legacyInventoryFile}: ${name}`);
  }
  // Format before writing so any template or formatter failure leaves the checkout untouched.
  const files = Object.fromEntries(
    Object.entries(templates(name)).map(([file, content]) => [
      file,
      formatSource(rootDir, file, content),
    ]),
  );
  const created: string[] = [];
  try {
    for (const dir of [serviceDir, testDir]) {
      mkdirSync(dir);
      created.push(dir);
    }
    for (const [file, content] of Object.entries(files)) {
      writeFileSync(path.join(rootDir, file), content, { flag: 'wx' });
    }
  } catch (error) {
    for (const dir of created.reverse()) {
      rmSync(dir, { recursive: true, force: true });
    }
    throw error;
  }
  return Object.keys(files);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: { help: { type: 'boolean', short: 'h' } },
    });
    if (values.help) {
      process.stdout.write(USAGE);
    } else {
      if (positionals.length !== 1) {
        throw new Error(USAGE);
      }
      const name = positionals[0]!;
      const files = createService({
        name,
        rootDir: fileURLToPath(new URL('../..', import.meta.url)),
      });
      process.stdout.write(`Created:\n${files.map((file) => `  ${file}`).join('\n')}\n
Lint, boundary lint and the inventory test already check it: a service needs
no inventory entry or lint registration.

Next steps:
  1. Implement the capability and inject its application dependencies in index.ts.
  2. Add await require('./server/services/${name}').default.init() in ghost/core/boot.js,
     after its dependencies are ready and before its consumers run. Document that order.
  3. Add startup failure cleanup and shutdown wiring if the service owns resources.
  4. Extend the root test. If the root declares extras, catalogue them in
     ${legacyInventoryFile}.
  5. Run pnpm nx run ghost:test:unit test/unit/server/services/${name}/index.test.ts
     and pnpm check.

See ghost/core/server/services/README.md for the service contract.\n`);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
