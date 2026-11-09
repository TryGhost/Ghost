import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import {
  addedAllowances,
  allowancePaths,
  changedAuditShas,
  findInventoryReferences,
  findNewJavaScript,
  mutateBootInit,
  serviceTerms,
  verifyService,
  type RunCommand,
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
  const run: RunCommand = (command, args, { cwd }) => {
    if (command === 'git') {
      const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
      return { status: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
    }
    calls.push(args.join(' '));
    return { status: 0, output: '' };
  };
  const verify = (service = 'staff', staticOnly = true, runner = run) =>
    verifyService({ repository: root, service, base, staticOnly, run: runner });
  const status = (service?: string) =>
    Object.fromEntries(verify(service).map((check) => [check.name, check.status]));
  return { root, base, write, commit, verify, status, calls, run };
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

test('allowance patterns expand to the files they name', () => {
  assert.deepEqual(
    allowancePaths('^cheerio/slim$|(^|/)node_modules/cheerio/dist/(esm|commonjs)/slim\\\\.js$'),
    {
      paths: [
        'node_modules/cheerio/dist/esm/slim.js',
        'node_modules/cheerio/dist/commonjs/slim.js',
      ],
      unparsed: [],
    },
  );
  assert.deepEqual(allowancePaths('^ghost/core/server/lib/a\\\\.ts$'), {
    paths: ['ghost/core/server/lib/a.ts'],
    unparsed: [],
  });
  assert.deepEqual(allowancePaths('^lodash/isEmpty(?:\\\\.js)?$'), { paths: [], unparsed: [] });
  assert.deepEqual(allowancePaths('(^|/)node_modules/a/.*\\\\.js$').unparsed, [
    '(^|/)node_modules/a/.*\\\\.js$',
  ]);
  assert.deepEqual(allowancePaths('^koenig/nodes/(src|build)/index\\\\.(ts|js)$'), {
    paths: [],
    unparsed: ['^koenig/nodes/(src|build)/index\\\\.(ts|js)$'],
  });
  assert.deepEqual(addedAllowances("+  'one', // why\n-  'two',\n   'three',\n"), ['one']);
});

test('the boot mutation stops boot waiting without removing the call', () => {
  const mutated = mutateBootInit(boot, 'staff');
  assert.equal(mutated?.variable, 'staffService');
  assert.match(mutated?.source ?? '', /Promise\.all\(\[void staffService\.init\(\)\]\)/);
  assert.equal(mutateBootInit(boot, 'tiers'), undefined);
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

test('allowances must name real files and have a regression case', async (t) => {
  const f = await fixture(t);
  await f.write('ghost/core/server/lib/real.ts', '');
  await f.write('tools/scripts/test/service-dependencies.test.ts', 'ghost/core/server/lib/real.ts');
  await f.write(
    '.dependency-cruiser.cjs',
    "  '^ghost/core/server/lib/real\\\\.ts$', // ok\n  '^ghost/core/server/lib/gone\\\\.ts$', // bad\n",
  );
  f.commit('allowances');
  const check = f.verify().find((item) => item.name === 'allowances-accurate');
  assert.equal(check?.status, 'fail');
  assert.deepEqual(check?.details, [
    'ghost/core/server/lib/gone.ts does not exist.',
    'ghost/core/server/lib/gone.ts has no regression case.',
  ]);
});

test('allowances the check cannot read are returned for review', async (t) => {
  const f = await fixture(t);
  await f.write('.dependency-cruiser.cjs', "  '^koenig/nodes/index\\\\.ts$', // why\n");
  f.commit('allowance');
  const check = f.verify().find((item) => item.name === 'allowances-accurate');
  assert.equal(check?.status, 'review');
  assert.match(check?.details[0] ?? '', /koenig\/nodes/);
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
    if (command !== 'git') {
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
    if (command !== 'git' && args.includes('test/unit/boot')) {
      during = execFileSync('cat', ['ghost/core/boot.js'], { cwd: f.root, encoding: 'utf8' });
      return { status: 0, output: '' };
    }
    return command === 'git' ? f.run(command, args, options) : { status: 0, output: '' };
  };
  await f.write('marker.ts', '');
  f.commit('change');
  const check = f.verify('staff', false, runner).at(-1);
  assert.equal(check?.name, 'boot-waits-for-init');
  assert.equal(check?.status, 'fail');
  assert.match(during, /void staffService\.init/);
  assert.equal(await readFile(join(f.root, 'ghost/core/boot.js'), 'utf8'), boot);
});

test('a failing tool reports its failure and the end of its output', async (t) => {
  const f = await fixture(t);
  await f.write('marker.ts', '');
  f.commit('change');
  const runner: RunCommand = (command, args, options) => {
    if (command === 'git') {
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
