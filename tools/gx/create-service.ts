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

Create a TypeScript service and starter root test.
Use lowercase kebab-case beginning with a letter, e.g. delivery-receipts.
`;

function templates(name: string) {
  const className = `${name
    .split('-')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')}Service`;
  return {
    [`${SERVICES}/${name}/index.ts`]: `import { defineService } from '../../../../bootstrap/transition/define-service';
import { ${className} } from './${name}-service';

// A definition: importing it builds nothing. Ghost builds the service the first time it is
// used, and keeps that instance until it stops.
export default defineService('${className}', () => {
  // Require application instances here, so importing the root does no startup work.
  // Add only the dependencies this service needs, with matching implementation types:
  // const models = require('../../models');
  // const settingsCache = require('../../../shared/settings-cache');
  // const config = require('../../../shared/config');
  return new ${className}({
    logging: require('@tryghost/logging'),
    // models,
    // Keep settings live when they can change: getTitle: () => settingsCache.get('title'),
  });
});

// create builds and returns, synchronously: it does not subscribe, schedule or wait. When the
// service needs more, pass options in place of the callback:
//
// export default defineService('${className}', {
//   // Other service roots. Ghost builds them first and hands create their instances.
//   needs: { tiers },
//   create: ({ tiers }) => new ${className}({ logging: require('@tryghost/logging'), tiers }),
//   // Events the service handles. Ghost listens for them and builds the service when one
//   // arrives. Add the root to \`listening\` in ghost/bootstrap/services.ts.
//   listeners: [{ event: legacyEvent('site.changed'), handle: (service) => service.reset() }],
//   // Work with no caller behind it, such as polling. It may be awaited. Add the root to
//   // \`background\` in ghost/bootstrap/services.ts, and release in stop what start acquired.
//   start: (service) => service.poll(),
//   stop: (service) => service.close(),
// });
`,
    [`${SERVICES}/${name}/${name}-service.ts`]: `import type { GhostLogger } from '@tryghost/logging';

// Import allowlisted libraries directly here; inject application instances from index.ts.
// For example: import { getUnixTime } from '#kernel/clock';
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
import { openServices } from '../../../../utils/services';

// Required, as server code requires them, so the root and its class are the copies Ghost uses.
const root = require('../../../../../core/server/services/${name}')
  .default as typeof import('../../../../../core/server/services/${name}').default;
const { ${className} } = require('../../../../../core/server/services/${name}/${name}-service') as typeof import('../../../../../core/server/services/${name}/${name}-service');

describe('${className} root', function () {
  it('is refused before Ghost can build services', function () {
    assert.throws(() => root.service, IncorrectUsageError);
  });

  it('builds one wired instance on first use', function () {
    // What boot does once settings are loaded. The unit setup closes services after each test.
    openServices();

    const service = root.service;
    assert.ok(service instanceof ${className});
    assert.equal(service.logging, require('@tryghost/logging'));
    assert.equal(root.service, service);
  });

  // Add tests of what the service does. Test a listener by emitting its event after
  // openServices(), and a start with startAsBoot(root) from the same helper.
});
`,
  };
}

export function nextSteps(name: string) {
  return `Next steps:
  1. Implement the capability and inject its application dependencies in index.ts.
     Name other service roots in needs, so create is handed their instances.
  2. There is nothing to register and no boot change: Ghost builds the service the
     first time it is used. Only two kinds of root are listed in
     ghost/bootstrap/services.ts:
       - a root that declares listeners is added to \`listening\`;
       - a root whose start is background work is added to \`background\`.
  3. Extend the root test. If the root declares extras, catalogue them in
     ${legacyInventoryFile}.
  4. Run pnpm nx run ghost:test:unit test/unit/server/services/${name}/index.test.ts
     and pnpm check.
  5. Commit, then run pnpm gx services verify ${name}.
`;
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

${nextSteps(name)}
See ghost/core/server/services/README.md for the service contract.\n`);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
