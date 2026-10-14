import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(import.meta.dirname, '../.gx-generator-'));
  roots.push(root);
  await mkdir(join(root, 'tools/gx'), { recursive: true });
  await mkdir(join(root, 'tools/scripts/lib'), { recursive: true });
  for (const file of ['cli.ts', 'create-package.ts']) {
    await cp(new URL(`../${file}`, import.meta.url), join(root, 'tools/gx', file));
  }
  for (const file of ['constants.ts', 'package-template.ts']) {
    await cp(
      new URL(`../../scripts/lib/${file}`, import.meta.url),
      join(root, 'tools/scripts/lib', file),
    );
  }
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      scripts: { gx: 'node tools/gx/cli.ts', 'create-package': 'pnpm gx generate package' },
    }),
  );
  await cp(
    new URL('../../../packages/_template', import.meta.url),
    join(root, 'packages/_template'),
    { recursive: true },
  );
  await writeFile(
    join(root, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/**'\n  - '!packages/_template'\n",
  );
  return root;
}
function run(root: string, args: string[]) {
  return spawnSync(process.execPath, [join(root, 'tools/gx/cli.ts'), ...args], {
    cwd: tmpdir(),
    encoding: 'utf8',
  });
}

test('shows root and generator help, and rejects unknown commands', async () => {
  const root = await fixture();
  for (const args of [[], ['--help'], ['-h'], ['generate', 'package', '--help']]) {
    const result = run(root, args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /pnpm gx/);
    assert.match(result.stdout, /package/);
  }
  for (const args of [
    ['unknown'],
    ['generate'],
    ['generate', 'unknown'],
    ['generate', '--help'],
    ['--help', 'unknown'],
    ['--version'],
  ]) {
    assert.equal(run(root, args).status, 1, args.join(' '));
  }
});

test('generates the existing template and registers a nested private package', async () => {
  const root = await fixture();
  const result = run(root, [
    'generate',
    'package',
    'example',
    '--dir',
    'packages/nested/example',
    '--description',
    'Example package.',
  ]);
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(
    await readFile(join(root, 'packages/nested/example/package.json'), 'utf8'),
  );
  assert.equal(manifest.name, '@tryghost/example');
  assert.equal(manifest.description, 'Example package.');
  assert.equal(manifest.repository.directory, 'packages/nested/example');
  assert.equal(manifest.private, true);
  // The non-semver placeholder keeps the package out of `pnpm version`.
  assert.equal(manifest.version, 'private');
  assert.equal(manifest.ghostPackage.goldenPath, 'compliant');
});

test('preserves the original invalid-name, outside-directory and existing-destination errors', async () => {
  const root = await fixture();
  const before = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
  for (const args of [
    ['generate', 'package'],
    ['generate', 'package', 'valid', '--unknown-option'],
    ['generate', 'package', 'Bad_Name'],
    ['generate', 'package', 'valid', '--dir', '../outside'],
  ]) {
    assert.equal(run(root, args).status, 1);
  }
  await mkdir(join(root, 'packages/existing'));
  await writeFile(join(root, 'packages/existing/keep.txt'), 'keep');
  const result = run(root, ['generate', 'package', 'existing']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists/);
  assert.equal(await readFile(join(root, 'packages/existing/keep.txt'), 'utf8'), 'keep');
  assert.equal(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8'), before);
});
