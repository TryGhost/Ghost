import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { legacyInventoryFile, servicesRoot } from '../../configs/oxlint/legacy-services.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const requireRoot = createRequire(path.join(root, 'package.json'));
const binary = path.join(path.dirname(requireRoot.resolve('oxlint/package.json')), 'bin/oxlint');
const config = JSON.parse(readFileSync(path.join(root, '.oxlintrc.json'), 'utf8'));
const ruleName = 'ghost/boot-awaits-service-init';
const bootFile = 'ghost/core/boot.js';

interface Diagnostic {
  code: string;
  message: string;
  severity: string;
  labels: { span: { line: number } }[];
}

function run(cwd: string) {
  const result = spawnSync(
    process.execPath,
    [binary, '--deny-warnings', '--format', 'json', bootFile],
    {
      cwd,
      env: { ...process.env, FORCE_COLOR: undefined, NO_COLOR: '1' },
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.ok(result.status === 0 || result.status === 1, result.stdout);
  const output = JSON.parse(result.stdout) as { diagnostics: Diagnostic[] };
  return { ...output, status: result.status, stdout: result.stdout };
}

// alpha and beta are standard: they are directories the inventory does not list.
// A standalone file is the inventory test's concern, not this rule's.
function lint(
  source: string,
  {
    directories = ['alpha', 'beta', 'legacy'],
    inventory = JSON.stringify({ services: { legacy: {} } }),
  }: { directories?: string[]; inventory?: string | null } = {},
) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'ghost-boot-init-oxlint-'));
  try {
    const localConfig = structuredClone(config);
    cpSync(path.join(root, 'tools/configs/oxlint'), path.join(cwd, 'tools/configs/oxlint'), {
      recursive: true,
    });
    // The rules load the shared service policy from the repository root.
    for (const file of [
      '.dependency-cruiser.cjs',
      'tools/scripts/ci/service-dependency-resolver.mjs',
    ]) {
      mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
      cpSync(path.join(root, file), path.join(cwd, file));
    }
    for (const directory of directories) {
      mkdirSync(path.join(cwd, servicesRoot, directory), { recursive: true });
    }
    writeFileSync(path.join(cwd, servicesRoot, 'README.md'), '');
    writeFileSync(path.join(cwd, servicesRoot, 'standalone.ts'), '');
    if (inventory !== null) {
      writeFileSync(path.join(cwd, legacyInventoryFile), inventory);
    }
    for (const plugin of localConfig.jsPlugins) {
      plugin.specifier = `./tools/configs/oxlint/${path.basename(plugin.specifier)}`;
    }
    writeFileSync(path.join(cwd, '.oxlintrc.json'), JSON.stringify(localConfig));
    writeFileSync(path.join(cwd, bootFile), source);
    return run(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const alpha = `  const alpha = require('./server/services/alpha').default;
  await alpha.init();`;
const group = `  await Promise.all([beta.init(), legacy.init()]);`;
const phases = `    await initCore();
    const app = await initServices();`;
// Each case replaces one of these parts.
function boot({ core = alpha, services = group, entry = phases } = {}) {
  return `async function initCore() {
${core}
}
async function initServices() {
  const beta = require('./server/services/beta').default;
  const legacy = require('./server/services/legacy');
${services}
}
async function bootGhost() {
  try {
${entry}
    return app;
  } catch (error) {
    process.exit(1);
  }
}
module.exports = bootGhost;
`;
}

const valid = [
  ['an awaited init and an awaited Promise.all', boot()],
  [
    'init arguments and an index path',
    boot({
      core: `  const alpha = require('./server/services/alpha/index').default;
  await alpha.init({ config: read() });`,
    }),
  ],
  [
    'a second binding that only reads the ready instance',
    boot({
      services: `${group}
  const alphaAgain = require('./server/services/alpha').default;
  use(alphaAgain.service);`,
    }),
  ],
  [
    'a legacy service that boot does not wait for',
    boot({ services: '  legacy.init();\n  await beta.init();' }),
  ],
] as const;
for (const [name, code] of valid) {
  test(`accepts ${name}`, () => {
    const result = lint(code);
    assert.equal(result.status, 0, JSON.stringify(result.diagnostics));
    assert.deepEqual(result.diagnostics, []);
  });
}

const messages = {
  missing: /Boot never initializes (\w+)\. In the right boot phase, add: const example = require/,
  notAwaited: /Await (\w+)\.init\(\) as a statement of its boot phase/,
  inline: /Bind the root, then await init\(\) on the binding/,
  phase: /bootGhost does not await (\w+), so nothing waits for (\w+)/,
};
const rejected = [
  ['a service that boot never mentions', boot({ core: '' }), 'missing', 'alpha'],
  ['a dropped await', boot({ core: alpha.replace('await alpha', 'alpha') }), 'notAwaited', 'alpha'],
  [
    'a discarded promise inside Promise.all',
    boot({ services: group.replace('beta.init()', 'void beta.init()') }),
    'notAwaited',
    'beta',
  ],
  [
    'a Promise.all that is not awaited',
    boot({ services: group.replace('await ', '') }),
    'notAwaited',
    'beta',
  ],
  [
    'a Promise.all assigned and never awaited',
    boot({ services: group.replace('await ', 'const pending = ') }),
    'notAwaited',
    'beta',
  ],
  [
    'a root bound without .default',
    boot({ core: alpha.replace('.default', '') }),
    'missing',
    'alpha',
  ],
  [
    'an inline call that services verify cannot follow',
    boot({ core: "  await require('./server/services/alpha').default.init();" }),
    'inline',
    undefined,
  ],
  [
    'an init inside a branch',
    boot({
      core: alpha.replace('await alpha.init();', 'if (enabled) {\n    await alpha.init();\n  }'),
    }),
    'notAwaited',
    'alpha',
  ],
  [
    'an init inside a callback',
    boot({
      core: alpha.replace(
        'await alpha.init();',
        'onReady(async () => {\n    await alpha.init();\n  });',
      ),
    }),
    'notAwaited',
    'alpha',
  ],
  [
    'a root bound in one phase and initialized in another',
    boot({
      core: "  const alpha = require('./server/services/alpha').default;",
      services: `${group}\n  await alpha.init();`,
    }),
    'missing',
    'alpha',
  ],
  [
    'a phase that boot starts without awaiting',
    boot({ entry: phases.replace('await initCore', 'initCore') }),
    'phase',
    'initCore',
  ],
  [
    'a phase that boot only awaits in a branch',
    boot({
      entry: phases.replace('await initCore();', 'if (enabled) {\n      await initCore();\n    }'),
    }),
    'phase',
    'initCore',
  ],
] as const;
for (const [name, code, messageId, subject] of rejected) {
  test(`rejects ${name}`, () => {
    const result = lint(code);
    assert.equal(result.status, 1, JSON.stringify(result.diagnostics));
    assert.equal(result.diagnostics.length, 1, JSON.stringify(result.diagnostics));
    const [diagnostic] = result.diagnostics;
    assert.equal(diagnostic?.code, `${ruleName.replace('/', '(')})`);
    assert.equal(diagnostic?.severity, 'error');
    const match = messages[messageId].exec(diagnostic?.message ?? '');
    assert.ok(match, diagnostic?.message);
    if (subject) {
      assert.equal(match[1], subject);
    }
  });
}

test('requires a new service directory to be initialized without any registration', () => {
  const result = lint(boot(), { directories: ['alpha', 'beta', 'legacy', 'brand-new'] });
  assert.equal(result.status, 1);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0]?.message ?? '', /Boot never initializes brand-new\./);
  assert.match(
    result.diagnostics[0]?.message ?? '',
    /require\('\.\/server\/services\/brand-new'\)\.default; await example\.init\(\);/,
  );
});

test('applies to a service once its legacy entry is deleted', () => {
  const result = lint(boot(), { inventory: JSON.stringify({ services: {} }) });
  assert.equal(result.status, 1);
  assert.deepEqual(
    result.diagnostics.map(({ message }) => messages.missing.exec(message)?.[1]),
    ['legacy'],
  );
});

test('fails instead of passing when the legacy service inventory cannot be read', () => {
  for (const inventory of [null, '[]']) {
    const result = lint(boot(), { inventory });
    assert.equal(result.status, 1, String(inventory));
    assert.match(result.stdout, /legacy-service-inventory\.yaml/, String(inventory));
  }
});

test('the checked-in boot.js awaits every standard service and the rule is configured for it', () => {
  const overrides = config.overrides.filter(
    (override: { rules: Record<string, unknown> }) => override.rules[ruleName],
  );
  assert.deepEqual(
    overrides.map((override: { files: string[]; rules: Record<string, unknown> }) => [
      override.files,
      override.rules[ruleName],
    ]),
    [[[bootFile], 'error']],
  );
  const result = run(root);
  assert.equal(result.status, 0, JSON.stringify(result.diagnostics));
});
