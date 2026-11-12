import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  addedAllowances,
  allowanceProblems,
  builtOnlyViolations,
  changedAuditShas,
  findInventoryReferences,
  findNewJavaScript,
  fixturePath,
  mutateBootInit,
  serviceTerms,
  verifyService,
  type Cruise,
  type RunCommand,
  type ServiceRule,
} from '../services-verify.ts';

const inventoryPath = 'ghost/core/server/services/service-inventory.yaml';
const inventory = `services:
  staff:
    migrated: true
  other:
    disposition: migrate
`;
const boot = `const staffService = require('./server/services/staff').default;
async function initServices() {
  await Promise.all([staffService.init()]);
}
`;

const rule: ServiceRule = {
  from: {
    path: '^ghost/core/server/services/(staff)(?:/|$)',
    pathNot: '^ghost/core/server/services/[^/]+/index\\.ts$',
  },
  to: { pathNot: ['^ghost/core/server/lib/a\\.ts$', '^ghost/core/server/services/$1/'] },
};

function cruise(
  imports: Array<[source: string, module: string, resolved: string, type?: string]>,
  violations: Cruise['summary']['violations'] = [],
): Cruise {
  return {
    modules: imports.map(([source, module, resolved, type = 'local']) => ({
      source,
      dependencies: [{ module, resolved, dependencyTypes: [type] }],
    })),
    summary: { violations },
  };
}

const empty = cruise([]);

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'gx-verify-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  const write = async (file: string, content: string) => {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), content);
  };
  const commit = (message: string) => {
    git('add', '-A');
    git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q');
  await write(inventoryPath, inventory);
  await write('ghost/core/boot.js', boot);
  const base = commit('base');
  const calls: string[] = [];
  const cruises: Record<string, Cruise> = { source: empty, built: empty };
  const run: RunCommand = (command, args, { cwd, env }) => {
    if (command === 'git') {
      const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
      return { status: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
    }
    if (args[1] === 'depcruise') {
      const output = JSON.stringify(cruises[env?.GHOST_DEPENDENCY_RESOLUTION ?? 'source']);
      return { status: 0, output: `${output}\nnoise on stderr`, stdout: output };
    }
    calls.push(args.join(' '));
    return { status: 0, output: '' };
  };
  const verify = (service = 'staff', staticOnly = true, runner = run) =>
    verifyService({ repository: root, service, base, staticOnly, run: runner });
  const status = (service?: string) =>
    Object.fromEntries(verify(service).map((check) => [check.name, check.status]));
  return { root, base, write, commit, verify, status, calls, run, cruises };
}

test('only new JavaScript outside fixtures is rejected', () => {
  assert.deepEqual(
    findNewJavaScript([
      'ghost/core/server/services/mentions/post-urls.js',
      'ghost/core/server/services/mentions/post-urls.ts',
      'ghost/test/utils/fixtures/themes/casper/index.js',
      'apps/admin/src/thing.js',
    ]),
    ['ghost/core/server/services/mentions/post-urls.js'],
  );
});

test('audit SHAs come from added lines only', () => {
  const diff = [
    '-    reviewedAt: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '+    reviewedAt: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    '+    auditedAt: cccccccccccccccccccccccccccccccccccccccc',
    ' reviewedAt: dddddddddddddddddddddddddddddddddddddddd',
  ].join('\n');
  assert.deepEqual(changedAuditShas(diff), [
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'cccccccccccccccccccccccccccccccccccccccc',
  ]);
});

test('service terms match the loose names prose uses', () => {
  assert.deepEqual(serviceTerms('member-welcome-emails'), [
    'member[- ]?welcome[- ]?emails?',
    'welcome[- ]?emails?',
  ]);
  assert.deepEqual(serviceTerms('users.js'), ['users?']);
});

test('inventory references skip the service entry and lines without lifecycle words', () => {
  const text = `services:
  member-welcome-emails:
    notes: welcome emails init on boot
  stripe:
    notes: |
      welcome-email capability is initialized on demand.
      welcome emails use a template.
  unrelated-emails:
    notes: nothing about the service, init on boot
`;
  assert.deepEqual(findInventoryReferences(text, 'member-welcome-emails'), [
    {
      line: 6,
      entry: 'stripe',
      text: 'welcome-email capability is initialized on demand.',
    },
  ]);
});

test('added allowances must match imports under both resolutions and have regression cases', () => {
  const service = 'ghost/core/server/services/staff/a.ts';
  const source = cruise([
    [service, 'pkg', 'packages/pkg/src/index.ts'],
    [service, 'lib', 'node_modules/.pnpm/lib@1/node_modules/lib/index.js'],
    [service, 'typed', 'packages/typed/src/index.ts', 'type-only'],
    ['ghost/core/server/services/staff/index.ts', 'root', 'packages/root/src/index.ts'],
  ]);
  const built = cruise([[service, 'pkg', 'packages/pkg/build/esm/index.js']]);
  assert.deepEqual(
    allowanceProblems({
      allowances: [
        '^pkg$|^packages/pkg/(src/index\\.ts|build/esm/index\\.js)$',
        '^lib$|(^|/)node_modules/lib/index\\.js$',
        '^packages/typed/',
        '^packages/root/',
      ],
      rule,
      cruises: [source, built],
      regressionCases: "'packages/pkg/src/index.ts' 'packages/pkg/build/esm/index.js'",
    }),
    [
      'node_modules/lib/index.js has no regression case naming it in full.',
      '^packages/typed/ matches no import from a service.',
      '^packages/root/ matches no import from a service.',
    ],
  );
  assert.equal(fixturePath('packages/pkg/src/index.ts'), 'packages/pkg/src/index.ts');
  assert.deepEqual(addedAllowances("+  'one', // why\n-  'two',\n   'three',\n"), ['one']);
});

test('only service rule violations new to built output are reported', () => {
  const service = 'ghost/core/server/services/staff/a.ts';
  const known = { from: service, to: 'lib/known.js', rule: { name: 'service-dependencies' } };
  const source = cruise(
    [
      [service, 'pkg', 'packages/pkg/src/index.ts'],
      [service, 'known', 'lib/known.js'],
    ],
    [known],
  );
  const built = cruise(
    [
      [service, 'pkg', 'packages/pkg/build/index.js'],
      [service, 'known', 'lib/known.js'],
      ['b.ts', 'missing', 'missing'],
      ['c.ts', 'd', 'd.ts'],
    ],
    [
      known,
      { from: service, to: 'packages/pkg/build/index.js', rule: { name: 'service-dependencies' } },
      { from: 'b.ts', to: 'missing', rule: { name: 'service-unresolved' } },
      { from: 'c.ts', to: 'd.ts', rule: { name: 'shared-not-server-or-frontend' } },
    ],
  );
  assert.deepEqual(builtOnlyViolations(source, built), [
    `${service} → packages/pkg/build/index.js breaks service-dependencies.`,
    'b.ts → missing breaks service-unresolved.',
  ]);
});

test('the boot mutation stops boot waiting but keeps rejections', async () => {
  const mutated = mutateBootInit(boot, 'staff');
  assert.equal(mutated?.variable, 'staffService');
  assert.match(
    mutated?.source ?? '',
    /Promise\.all\(\[Promise\.race\(\[staffService\.init\(\), Array\.from\(\{ length: 50 \}\)/,
  );
  assert.equal(mutateBootInit(boot, 'tiers'), undefined);
  const withArguments = mutateBootInit(
    boot.replace('staffService.init()', 'staffService.init({ a: f(1) })'),
    'staff',
  );
  assert.match(withArguments?.source ?? '', /race\(\[staffService\.init\(\{ a: f\(1\) \}\), Array/);

  // Run the mutated boot as the boot tests do, in a context without Node globals,
  // against the two kinds of init they use.
  const startBoot = (init: () => Promise<unknown>) =>
    runInNewContext(`${mutated?.source}\ninitServices();`, {
      require: () => ({ default: { init } }),
    }) as Promise<void>;
  let released = false;
  await startBoot(
    () =>
      new Promise((resolve) => {
        setImmediate(() => {
          released = true;
          resolve(undefined);
        });
      }),
  );
  assert.equal(released, false, 'boot waited for an init that was still pending');
  class InitFailure extends Error {}
  const failure = new InitFailure('init failed');
  await assert.rejects(
    startBoot(async () => {
      await null;
      throw failure;
    }),
    (error) => error === failure,
  );
});

test('a dirty tree or stale base stops before any other check', async (t) => {
  const f = await fixture(t);
  await f.write('untracked.txt', 'x');
  assert.deepEqual(
    f.verify().map((check) => [check.name, check.status]),
    [
      ['clean-tree', 'fail'],
      ['base-current', 'pass'],
    ],
  );
  await rm(join(f.root, 'untracked.txt'));
  const stale = verifyService({
    repository: f.root,
    service: 'staff',
    base: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    staticOnly: true,
    run: f.run,
  });
  assert.deepEqual(
    stale.map((check) => [check.name, check.status]),
    [
      ['clean-tree', 'pass'],
      ['base-current', 'fail'],
    ],
  );
});

test('static checks fail on new JavaScript and audit SHAs missing from the base', async (t) => {
  const f = await fixture(t);
  await f.write('ghost/core/server/services/staff/helper.js', '');
  const first = f.commit('helper');
  await f.write(inventoryPath, `${inventory}    reviewedAt: ${first}\n`);
  f.commit('inventory');
  const result = f.status();
  assert.equal(result['new-files-typescript'], 'fail');
  assert.equal(result['audit-shas-on-base'], 'fail');
  assert.equal(result['tests-and-lint'], 'skip');
  assert.deepEqual(f.calls, []);
});

test('audit SHAs already on the base pass', async (t) => {
  const f = await fixture(t);
  await f.write(inventoryPath, `${inventory}    reviewedAt: ${f.base}\n`);
  f.commit('inventory');
  assert.equal(f.status()['audit-shas-on-base'], 'pass');
});

test('an added allowance that only holds for authored source fails on built output', async (t) => {
  const f = await fixture(t);
  const allowance = '^pkg$|^packages/pkg/(src|build)/index\\.(ts|js)$';
  await f.write(
    '.dependency-cruiser.cjs',
    [
      `const from = ${JSON.stringify(rule.from)};`,
      "module.exports = { forbidden: [{ name: 'service-dependencies', from, to: { pathNot: [",
      `  '${allowance.replaceAll('\\', '\\\\')}',`,
      "  '^ghost/core/server/services/$1/',",
      '] } }] };',
      '',
    ].join('\n'),
  );
  await f.write('tools/scripts/test/service-dependencies.test.ts', 'packages/pkg/src/index.ts');
  f.commit('allowance');
  const service = 'ghost/core/server/services/staff/a.ts';
  f.cruises.source = cruise([[service, 'pkg', 'packages/pkg/src/index.ts']]);
  f.cruises.built = cruise(
    [[service, 'pkg', 'packages/pkg/build/esm/index.js']],
    [
      {
        from: service,
        to: 'packages/pkg/build/esm/index.js',
        rule: { name: 'service-dependencies' },
      },
    ],
  );
  const result = f.status();
  assert.equal(result['allowances-accurate'], 'pass');
  assert.equal(result['built-boundaries'], 'fail');
  f.cruises.source = empty;
  f.cruises.built = empty;
  assert.equal(f.status()['allowances-accurate'], 'fail');
});

test('unreadable dependency-cruiser output fails the run that produced it', async (t) => {
  const f = await fixture(t);
  const runner: RunCommand = (command, args, options) =>
    args[1] === 'depcruise' ? { status: 1, output: 'boom' } : f.run(command, args, options);
  const checks = verifyService({
    repository: f.root,
    service: 'staff',
    base: f.base,
    staticOnly: true,
    run: runner,
  });
  assert.deepEqual(checks.find((item) => item.name === 'dependencies-source')?.details, ['boom']);
  assert.equal(
    checks.find((item) => item.name === 'built-boundaries'),
    undefined,
  );
});

test('other inventory entries that mention the service are returned for review', async (t) => {
  const f = await fixture(t);
  await f.write(
    inventoryPath,
    `${inventory.replace('  other:\n', '  other:\n    notes: staff is initialized on demand\n')}`,
  );
  f.commit('note');
  const check = f.verify().find((item) => item.name === 'inventory-references');
  assert.equal(check?.status, 'review');
  assert.match(check?.details[0] ?? '', /:5 \(other\): notes: staff is initialized on demand/);
});

test('unknown services are rejected', async (t) => {
  const f = await fixture(t);
  assert.throws(() => f.verify('missing'), /Unknown service: missing/);
});

test('changed unit tests run shuffled and alone after the full suite', async (t) => {
  const f = await fixture(t);
  await f.write('ghost/test/unit/boot/a.test.ts', '');
  f.commit('test');
  const seen: Array<[string, string]> = [];
  const runner: RunCommand = (command, args, options) => {
    if (command !== 'git' && args[1] !== 'depcruise') {
      seen.push([args.join(' '), options.cwd]);
      return { status: args.includes('test/unit/boot') ? 1 : 0, output: '' };
    }
    return f.run(command, args, options);
  };
  const checks = f.verify('staff', false, runner);
  const commands = seen.map(([command]) => command);
  const full = commands.indexOf('nx run ghost:test:unit');
  const seeded = commands.findIndex((command) => command.includes('--sequence.seed=1'));
  assert.ok(full >= 0 && full < seeded);
  assert.ok(commands.includes('exec vitest run --project unit test/unit/boot/a.test.ts'));
  assert.ok(checks.every((check) => check.status !== 'fail'));
});

test('the boot check fails when tests survive the mutation and restores boot.js', async (t) => {
  const f = await fixture(t);
  let during = '';
  const runner: RunCommand = (command, args, options) => {
    if (command !== 'git' && args[1] !== 'depcruise' && args.includes('test/unit/boot')) {
      during = execFileSync('cat', ['ghost/core/boot.js'], { cwd: f.root, encoding: 'utf8' });
      return { status: 0, output: '' };
    }
    return command === 'git' || args[1] === 'depcruise'
      ? f.run(command, args, options)
      : { status: 0, output: '' };
  };
  await f.write('marker.ts', '');
  f.commit('change');
  const check = f.verify('staff', false, runner).at(-1);
  assert.equal(check?.name, 'boot-waits-for-init');
  assert.equal(check?.status, 'fail');
  assert.match(during, /Promise\.race\(\[staffService\.init\(\)/);
  assert.equal(await readFile(join(f.root, 'ghost/core/boot.js'), 'utf8'), boot);
});

test('a failing tool reports its failure and the end of its output', async (t) => {
  const f = await fixture(t);
  await f.write('marker.ts', '');
  f.commit('change');
  const runner: RunCommand = (command, args, options) => {
    if (command === 'git' || args[1] === 'depcruise') {
      return f.run(command, args, options);
    }
    return args[0] === 'lint:oxlint'
      ? { status: 1, output: 'first\nboom\n' }
      : args[0] === 'nx'
        ? { status: 1, output: 'noise\n FAIL  |unit| a test\nnoise\n' }
        : { status: args.includes('test/unit/boot') ? 1 : 0, output: '' };
  };
  const checks = f.verify('staff', false, runner);
  const check = checks.find((item) => item.name === 'oxlint');
  assert.equal(check?.status, 'fail');
  assert.deepEqual(check?.details, ['first', 'boom']);
  assert.deepEqual(checks.find((item) => item.name === 'unit')?.details, [' FAIL  |unit| a test']);
});
