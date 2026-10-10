import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Nx is a root tool. Use its CLI to check the actual expanded inputs rather
// than reimplementing its named-input and transitive-dependency semantics.
const require = createRequire(new URL('../../package.json', import.meta.url));
const nx = require.resolve('nx/bin/nx.js');

type TaskInputs = {
  files: string[];
  runtime: string[];
  environment: string[];
};

async function nxJson<T>(args: string[]): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), 'admin-inputs-'));
  const output = join(directory, 'inputs.json');
  const file = await open(output, 'w');
  try {
    // A regular file avoids truncating Nx's large JSON output when its CLI
    // exits before an asynchronous stdout pipe has finished flushing.
    const result = spawnSync(process.execPath, [nx, ...args, '--json'], {
      cwd: root,
      env: { ...process.env, NX_NO_CLOUD: 'true', NX_ISOLATE_PLUGINS: 'false' },
      stdio: ['ignore', file.fd, 'pipe'],
    });
    assert.equal(result.status, 0, String(result.stderr));
    return JSON.parse(await readFile(output, 'utf8')) as T;
  } finally {
    await file.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function inputs(target: string): Promise<TaskInputs> {
  return nxJson(['show', 'target', 'inputs', `@tryghost/admin:${target}`]);
}

describe('Admin task inputs', () => {
  it('runs the local aggregate through the cached unit and typecheck tasks', async () => {
    const target = await nxJson<{
      executor: string;
      cache: boolean;
      dependsOn: string[];
      transitiveTasks: string[];
    }>(['show', 'target', '@tryghost/admin:test']);
    assert.equal(target.executor, 'nx:noop');
    assert.equal(target.cache, false);
    assert.deepEqual(target.dependsOn, ['@tryghost/admin:test:types', '@tryghost/admin:test:unit']);
    assert.ok(target.transitiveTasks.includes('@tryghost/shade:build'));
    assert.ok(!target.transitiveTasks.some((task) => task.startsWith('ghost-admin:')));
  });

  it('runs normal dev with the React and Portal watchers and no Ember tasks', async () => {
    const target = await nxJson<{
      dependsOn: string[];
      transitiveTasks: string[];
    }>(['show', 'target', 'ghost-monorepo:docker:dev']);
    const tasks = [...target.dependsOn, ...target.transitiveTasks];
    for (const task of [
      '@tryghost/admin:dev',
      '@tryghost/admin:build:dev',
      'ghost-monorepo:docker:up',
      'ghost:build:assets',
      '@tryghost/admin-x-framework:dev',
      '@tryghost/shade:dev',
      '@tryghost/portal:dev',
    ]) {
      assert.ok(tasks.includes(task), task);
    }
    assert.ok(!tasks.some((task) => task.startsWith('ghost-admin:')));
  });

  for (const target of ['test:unit', 'test:acceptance', 'test:types']) {
    it(`${target} tracks React dependencies and fixtures without Ember source`, async () => {
      const { files } = await inputs(target);
      for (const prefix of [
        'apps/admin/src/',
        'apps/admin/test-utils/',
        'apps/admin-x-framework/src/',
        'apps/shade/src/',
        'packages/testing/test-data/',
        'packages/metafield-csv/',
        'koenig/kg-default-nodes/',
      ]) {
        assert.ok(
          files.some((file) => file.startsWith(prefix)),
          `${target}: ${prefix}`,
        );
      }
      for (const file of [
        'apps/admin/tsconfig.app.json',
        'apps/admin/vitest.acceptance.config.ts',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
      ]) {
        assert.ok(files.includes(file), `${target}: ${file}`);
      }
      assert.ok(!files.some((file) => file.startsWith('apps/ember-admin/')));
    });
  }

  it('keys browser and unit tests on their runtime and aliased card assets', async () => {
    for (const target of ['test:unit', 'test:acceptance']) {
      const { files, runtime, environment } = await inputs(target);
      assert.ok(files.includes('ghost/core/frontend/src/cards/js/video.js'));
      assert.ok(files.includes('scripts/hash-vite-env.ts'));
      assert.ok(runtime.includes('node scripts/hash-vite-env.ts --directory=apps/admin'));
      assert.ok(runtime.includes('node -v'));
      assert.ok(runtime.some((command) => command.includes('process.platform')));
      assert.ok(runtime.some((command) => command.includes('timeZone')));
      for (const variable of ['CI', 'GITHUB_ACTIONS', 'NODE_ENV', 'TZ', 'VITE_TEST']) {
        assert.ok(environment.includes(variable), `${target}: ${variable}`);
      }
    }
  });

  it('keeps card assets in the production build inputs', async () => {
    const { files } = await inputs('build');
    assert.ok(files.includes('ghost/core/frontend/src/cards/js/video.js'));
    assert.ok(!files.some((file) => file.startsWith('apps/ember-admin/')));
  });

  it('runs the test lanes without Ember builds and caches the acceptance report', async () => {
    type Target = {
      cache: boolean;
      command: string;
      outputs: string[];
      dependsOn: string[];
      transitiveTasks: string[];
    };
    for (const name of ['test:unit', 'test:acceptance', 'test:types']) {
      const target = await nxJson<Target>(['show', 'target', `@tryghost/admin:${name}`]);
      assert.equal(target.cache, true);
      assert.ok(
        ![...target.dependsOn, ...target.transitiveTasks].some((task) =>
          task.startsWith('ghost-admin:'),
        ),
      );
      assert.ok(target.dependsOn.includes('@tryghost/shade:build'));
      if (name === 'test:acceptance') {
        assert.deepEqual(target.outputs, ['{projectRoot}/test-results/acceptance.json']);
      }
      if (name === 'test:types') {
        assert.equal(target.command, 'tsc -b');
        assert.deepEqual(target.outputs, []);
      }
    }
  });

  it('reruns the contract suites when their external configuration changes', async () => {
    for (const target of ['test', 'test:unit']) {
      const { files } = await nxJson<TaskInputs>([
        'show',
        'target',
        'inputs',
        `@internal/scripts:${target}`,
      ]);
      for (const file of ['apps/admin/package.json', '.github/workflows/ci.yml']) {
        assert.ok(files.includes(file), `${target}: ${file}`);
        const affected = await nxJson<string[]>([
          'show',
          'projects',
          '--affected',
          `--files=${file}`,
          `--withTarget=${target}`,
        ]);
        assert.ok(affected.includes('@internal/scripts'), `${target}: ${file}`);
      }
    }
  });
});
