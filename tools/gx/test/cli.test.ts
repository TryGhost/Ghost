import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { runCli } from '../src/cli.ts';
import { generatePackage } from '../src/generate/package.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ghost-gx-'));
  roots.push(root);
  await mkdir(join(root, 'packages'), { recursive: true });
  await cp(
    new URL('../../../packages/_template', import.meta.url),
    join(root, 'packages/_template'),
    { recursive: true },
  );
  await writeFile(
    join(root, 'pnpm-workspace.yaml'),
    `packages:\n  - 'packages/**'\n  - '!packages/_template'\nversioning:\n  ignore:\n    # ignore private packages\n    - '@tryghost/zzz'\n`,
  );
  return root;
}
async function cli(args: string[], root = '/does-not-exist') {
  let output = '';
  let error = '';
  const code = await runCli(args, {
    root,
    stdout: (text) => {
      output += text;
    },
    stderr: (text) => {
      error += text;
    },
  });
  return { code, output, error };
}

describe('gx command interface', () => {
  it.each(
    [[], ['--help'], ['generate'], ['generate', '--help'], ['generate', 'package', '--help']].map(
      (args) => ({ args }),
    ),
  )('shows help without needing a repository: %j', async ({ args }) => {
    const result = await cli(args);
    expect(result.code).toBe(0);
    expect(result.output).toContain('package');
    expect(result.error).toBe('');
  });
  it.each(
    [
      ['unknown'],
      ['generate', 'service'],
      ['generate', 'package'],
      ['generate', 'package', 'a', 'b'],
      ['generate', 'package', 'valid', '--unknown'],
    ].map((args) => ({ args })),
  )('rejects invalid invocation: %j', async ({ args }) => {
    const result = await cli(args);
    expect(result.code).toBe(1);
    expect(result.error).toContain('pnpm gx --help');
    expect(result.output).toBe('');
  });
  it('runs source directly from a fixture checkout and another working directory', async () => {
    const root = await fixture();
    await mkdir(join(root, 'tools/gx'), { recursive: true });
    await cp(new URL('../src', import.meta.url), join(root, 'tools/gx/src'), { recursive: true });
    await writeFile(join(root, 'tools/gx/package.json'), '{"type":"module"}');
    const result = spawnSync(
      process.execPath,
      [join(root, 'tools/gx/src/cli.ts'), 'generate', 'package', 'cli-fixture'],
      { cwd: tmpdir(), encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(
      JSON.parse(await readFile(join(root, 'packages/cli-fixture/package.json'), 'utf8')).name,
    ).toBe('@tryghost/cli-fixture');
  });
});

describe('package generation', () => {
  it('renders the real template and registers a nested private package, preserving YAML comments', async () => {
    const root = await fixture();
    const result = await cli(
      [
        'generate',
        'package',
        'example',
        '--dir',
        'packages/nested/example',
        '--description',
        'An "example"\nwith a newline',
      ],
      root,
    );
    expect(result.code, result.error).toBe(0);
    const packageRoot = join(root, 'packages/nested/example');
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    expect(manifest).toMatchObject({
      name: '@tryghost/example',
      description: 'An "example"\nwith a newline',
      private: true,
      type: 'module',
      repository: { directory: 'packages/nested/example' },
      ghostPackage: { goldenPath: 'compliant' },
    });
    expect(await readFile(join(packageRoot, 'README.md'), 'utf8')).not.toContain('{{');
    expect(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')).toContain(
      "# ignore private packages\n    - '@tryghost/example'\n    - '@tryghost/zzz'",
    );
    expect((await readdir(root)).filter((name) => name.startsWith('.gx-package-'))).toEqual([]);
  });
  it.each(['Bad_Name', '@tryghost/name', '../escape'])(
    'rejects invalid names: %s',
    async (name) => {
      const root = await fixture();
      await expect(generatePackage(root, { name })).rejects.toThrow('Invalid package name');
      expect(await readdir(join(root, 'packages'))).toEqual(['_template']);
    },
  );
  it('creates a package accepted by the repository package checker', async () => {
    const root = await fixture();
    await writeFile(join(root, 'package.json'), '{"name":"gx-fixture","private":true}');
    await generatePackage(root, { name: 'validated' });
    const checker = pathToFileURL(
      fileURLToPath(new URL('../../scripts/check-internal-packages.js', import.meta.url)),
    ).href;
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import { checkInternalPackages } from ${JSON.stringify(checker)};
      const errors = await checkInternalPackages(${JSON.stringify(root)});
      if (errors.length) { console.error(errors.join('\\n')); process.exitCode = 1; }
    `,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
  });
  it('refuses existing destinations without changing their contents or the manifest', async () => {
    const root = await fixture();
    const before = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
    await mkdir(join(root, 'packages/existing'));
    await writeFile(join(root, 'packages/existing/keep.txt'), 'keep');
    await expect(generatePackage(root, { name: 'existing' })).rejects.toThrow('already exists');
    expect(await readFile(join(root, 'packages/existing/keep.txt'), 'utf8')).toBe('keep');
    expect(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')).toBe(before);
  });
  it('rejects repository escapes including symlinked parents', async () => {
    const root = await fixture();
    const outside = await fixture();
    await symlink(outside, join(root, 'outside'));
    await expect(generatePackage(root, { name: 'escape', directory: '../escape' })).rejects.toThrow(
      'inside the repository',
    );
    await expect(
      generatePackage(root, { name: 'escape', directory: 'outside/escape' }),
    ).rejects.toThrow('inside the repository');
    expect(await readdir(outside)).toEqual(['packages', 'pnpm-workspace.yaml']);
  });
  it('cleans up when the template cannot be rendered, leaving the manifest unchanged', async () => {
    const root = await fixture();
    const before = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
    await writeFile(join(root, 'packages/_template/package.json'), 'invalid JSON');
    await expect(generatePackage(root, { name: 'broken' })).rejects.toThrow();
    expect(await readdir(join(root, 'packages'))).toEqual(['_template']);
    expect(await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')).toBe(before);
    expect((await readdir(root)).filter((name) => name.startsWith('.gx-package-'))).toEqual([]);
  });
  it('requires valid versioning configuration before creating files', async () => {
    const root = await fixture();
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: []');
    await expect(generatePackage(root, { name: 'broken' })).rejects.toThrow(
      'ignore private packages',
    );
    expect(await readdir(join(root, 'packages'))).toEqual(['_template']);
  });
  it('excludes stale template build artifacts', async () => {
    const root = await fixture();
    await mkdir(join(root, 'packages/_template/build'));
    await writeFile(join(root, 'packages/_template/build/stale.js'), 'stale');
    await generatePackage(root, { name: 'clean' });
    expect(await readdir(join(root, 'packages/clean'))).not.toContain('build');
  });
});
