import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

test('dev commands preserve arguments, input, working directory and exit status', async (t) => {
  const root = await mkdtemp(join(import.meta.dirname, '../.gx-dev-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'tools/gx'), { recursive: true });
  for (const file of ['cli.ts', 'run-ghost-command.ts']) {
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  await writeFile(join(root, 'package.json'), '{"type":"module"}');
  const { scripts } = JSON.parse(
    await readFile(new URL('../../../package.json', import.meta.url), 'utf8'),
  ) as { scripts: Record<string, string> };
  for (const [command, args] of [
    ['up', ['dev:analytics', '--timeout', '42']],
    ['down', ['--orphans', '/a checkout']],
    ['status', ['--all', '--json', '--prs']],
    ['gc', ['--yes']],
  ] as const) {
    await writeFile(
      join(root, `tools/gx/dev-${command}.ts`),
      `import {readFileSync} from 'node:fs';
       process.stdout.write(JSON.stringify({args: process.argv.slice(2), input: readFileSync(0, 'utf8'), cwd: process.cwd()}));
       process.exitCode = 7;`,
    );
    const shortcut = scripts[`dev:${command}`]!;
    assert.match(shortcut, /^node /);
    for (const invocation of [
      ['tools/gx/cli.ts', 'dev', command],
      [shortcut.slice('node '.length)],
    ]) {
      const result = spawnSync(process.execPath, [...invocation, ...args], {
        cwd: root,
        input: 'terminal input',
        encoding: 'utf8',
      });
      assert.equal(result.status, 7, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), {
        args,
        input: 'terminal input',
        cwd: await realpath(root),
      });
    }
  }
});
