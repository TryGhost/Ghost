import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdir, mkdtemp, rm, realpath, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

for (const fails of [false, true]) {
  test(`rebuild command preserves environment, Core setup and cleanup on ${fails ? 'failure' : 'success'}`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'gx-rebuild-'));
    try {
      await mkdir(join(root, 'tools/gx'), { recursive: true });
      await mkdir(join(root, 'tools/scripts/lib'), { recursive: true });
      await mkdir(join(root, 'ghost/core/server/data/schema'), { recursive: true });
      await mkdir(join(root, 'ghost/core/server/data/db'), { recursive: true });
      for (const file of ['cli.ts', 'run-ghost-command.ts', 'rebuild-in-development-tables.ts']) {
        await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
      }
      await symlink(
        fileURLToPath(new URL('../node_modules', import.meta.url)),
        join(root, 'tools/gx/node_modules'),
      );
      await cp(
        new URL('../../scripts/with-ghost-dev-env.ts', import.meta.url),
        join(root, 'tools/scripts/with-ghost-dev-env.ts'),
      );
      await writeFile(join(root, 'package.json'), '{"type":"module"}');
      await writeFile(join(root, 'ghost/package.json'), '{"type":"commonjs"}');
      await writeFile(
        join(root, 'tools/scripts/lib/dev-compose.ts'),
        `
export const overlayArgs = () => [];
export const composeConfig = () => { throw new Error('Unexpected compose invocation'); };
export const hostOverlayEnv = () => ({});
`,
      );
      await writeFile(
        join(root, 'tools/scripts/lib/ghost-dev-env.ts'),
        `
export const parseEnv = () => ({});
export const resolveGhostDevEnv = async () => ({
  GHOST_DEV_NAME: 'fixture', GHOST_DEV_HOSTNAME: 'fixture.local',
  GHOST_DEV_PORT: '2400', GHOST_DEV_BACKEND_PORT: '2401', GHOST_DEV_DATABASE: 'fixture_db',
});
`,
      );
      await writeFile(
        join(root, 'ghost/core/server/overrides.js'),
        "process.stdout.write('overrides\\n');",
      );
      await writeFile(
        join(root, 'ghost/core/server/data/db/index.js'),
        `
exports.knex = { destroy: async () => process.stdout.write('destroy\\n') };
`,
      );
      await writeFile(
        join(root, 'ghost/core/server/data/schema/in-development.ts'),
        `
exports.rebuildInDevelopmentTables = async () => {
  process.stdout.write(JSON.stringify({ cwd: process.cwd(), env: process.env.NODE_ENV,
    database: process.env.database__connection__database,
    port: process.env.database__connection__port, url: process.env.url }) + '\\n');
  ${fails ? "throw new Error('fixture rebuild failed');" : ''}
};
`,
      );
      const result = spawnSync(
        process.execPath,
        [join(root, 'tools/gx/cli.ts'), 'db', 'rebuild-development-tables'],
        {
          cwd: tmpdir(),
          encoding: 'utf8',
          env: { NODE_ENV: 'testing', database__connection__port: '3333' },
        },
      );
      assert.equal(result.status, fails ? 1 : 0, result.stderr);
      const lines = result.stdout.split('\n');
      assert.equal(lines[0], 'overrides');
      assert.deepEqual(JSON.parse(lines[1] ?? ''), {
        cwd: await realpath(join(root, 'ghost')),
        env: 'testing',
        database: 'fixture_db',
        port: '3333',
        url: 'http://fixture.local:2400/',
      });
      assert(result.stdout.includes('destroy\n'));
      if (fails) {
        assert.match(result.stdout + result.stderr, /fixture rebuild failed/);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
