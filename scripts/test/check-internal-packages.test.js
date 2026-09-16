import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { checkInternalPackages } from '../check-internal-packages.js';

const temporaryDirectories = [];

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createRepository() {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'ghost-internal-packages-'));
  temporaryDirectories.push(rootDirectory);
  await writeJson(path.join(rootDirectory, 'package.json'), {
    name: 'test-workspace',
    private: true,
  });
  await writeFile(
    path.join(rootDirectory, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/**'\n  - '!packages/_template'\n  - 'koenig/*'\n",
  );
  const templateManifest = compliantManifest('packages/template');
  templateManifest.name = '@tryghost/{{NAME}}';
  templateManifest.description = '{{DESCRIPTION}}';
  templateManifest.repository.directory = '{{DIRECTORY}}';
  await createCompliantPackage(rootDirectory, 'packages/_template', templateManifest);
  return rootDirectory;
}

function compliantManifest(directory = 'packages/example') {
  return {
    name: '@tryghost/example',
    version: '0.0.0',
    private: true,
    type: 'module',
    repository: {
      type: 'git',
      url: 'git+https://github.com/TryGhost/Ghost.git',
      directory,
    },
    author: 'Ghost Foundation',
    license: 'MIT',
    exports: {
      '.': {
        source: './src/index.ts',
        types: './build/index.d.ts',
        default: './build/index.js',
      },
    },
    main: 'build/index.js',
    types: 'build/index.d.ts',
    scripts: {
      build: 'tsc',
      'test:unit': 'NODE_ENV=testing vitest run --coverage',
      'test:types': 'tsc --noEmit -p test/tsconfig.json',
      test: "pnpm run '/^test:/'",
      'lint:code': 'eslint src/ --cache',
      'lint:test': 'eslint test/ --cache',
      lint: "pnpm run '/^lint:/'",
    },
    files: ['build'],
    devDependencies: { ...REQUIRED_DEV_DEPENDENCIES_FOR_TEST },
    nx: { targets: { build: { outputs: ['{projectRoot}/build'] } } },
    ghostPackage: { goldenPath: 'compliant' },
  };
}

const REQUIRED_DEV_DEPENDENCIES_FOR_TEST = {
  '@internal/cfg-eslint': 'workspace:*',
  '@internal/cfg-typescript': 'workspace:*',
  '@internal/cfg-vitest': 'workspace:*',
  '@types/node': 'catalog:',
  '@vitest/coverage-v8': 'catalog:',
  '@typescript/native': 'catalog:',
  eslint: 'catalog:',
  typescript: 'catalog:',
  vitest: 'catalog:',
};

async function createCompliantPackage(
  rootDirectory,
  directory = 'packages/example',
  manifest = compliantManifest(directory),
) {
  const packageDirectory = path.join(rootDirectory, directory);
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);
  await writeJson(path.join(packageDirectory, 'tsconfig.json'), {
    extends: '@internal/cfg-typescript/esm.json',
    compilerOptions: { rootDir: 'src', outDir: 'build' },
    include: ['src/**/*'],
  });
  await writeJson(path.join(packageDirectory, 'test', 'tsconfig.json'), {
    extends: '../tsconfig.json',
    compilerOptions: { rootDir: '..', noEmit: true },
    include: ['../src/**/*', '**/*'],
  });
  await mkdir(path.join(packageDirectory, 'src'), { recursive: true });
  await writeFile(path.join(packageDirectory, 'src', 'index.ts'), 'export const value = true;\n');
  await writeFile(
    path.join(packageDirectory, 'eslint.config.mjs'),
    "import {nodeLibConfig} from '@internal/cfg-eslint';\nexport default nodeLibConfig();\n",
  );
  await writeFile(
    path.join(packageDirectory, 'vitest.config.ts'),
    "import {createVitestConfig} from '@internal/cfg-vitest';\nexport default createVitestConfig();\n",
  );
  return packageDirectory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('accepts a compliant nested private package', async () => {
  const rootDirectory = await createRepository();
  await createCompliantPackage(rootDirectory, 'packages/adapters/example');

  assert.deepEqual(await checkInternalPackages(rootDirectory), []);
});

test('reports workspace discovery failures through the checker interface', async () => {
  const rootDirectory = await createRepository();
  await writeFile(path.join(rootDirectory, 'pnpm-workspace.yaml'), 'packages: [invalid\n');

  assert.match(
    (await checkInternalPackages(rootDirectory))[0],
    /^Unable to list pnpm workspace packages/,
  );
});

test('requires every private package to declare its golden path status', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  delete manifest.ghostPackage;
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);

  assert.deepEqual(await checkInternalPackages(rootDirectory), [
    'packages/example/package.json: ghostPackage.goldenPath must be one of compliant, migration, exempt',
  ]);
});

test('accepts documented migration and exempt states without applying the golden path', async () => {
  const rootDirectory = await createRepository();
  await writeJson(path.join(rootDirectory, 'packages', 'migrating', 'package.json'), {
    name: '@tryghost/migrating',
    private: true,
    ghostPackage: {
      goldenPath: 'migration',
      reason: 'Imported unchanged before a separate modernization PR.',
    },
  });
  await writeJson(path.join(rootDirectory, 'packages', 'special', 'package.json'), {
    name: '@tryghost/special',
    private: true,
    ghostPackage: { goldenPath: 'exempt', reason: 'This is a source-only test helper.' },
  });

  assert.deepEqual(await checkInternalPackages(rootDirectory), []);
});

test('requires migration and exempt states to explain the exception', async () => {
  const rootDirectory = await createRepository();
  await writeJson(path.join(rootDirectory, 'packages', 'special', 'package.json'), {
    name: '@tryghost/special',
    private: true,
    ghostPackage: { goldenPath: 'exempt' },
  });

  assert.deepEqual(await checkInternalPackages(rootDirectory), [
    'packages/special/package.json: ghostPackage.reason is required when goldenPath is exempt',
  ]);
});

test('reports manifest, export, config and source violations together', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  manifest.version = '1.0.0';
  manifest.exports['.'] = {
    types: './build/index.d.ts',
    source: './src/index.ts',
    default: './build/index.js',
  };
  delete manifest.scripts.build;
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);
  await writeFile(path.join(packageDirectory, 'src', 'legacy.js'), 'module.exports = {};\n');
  await writeFile(path.join(packageDirectory, 'test', 'legacy.test.js'), 'export {};\n');

  const errors = await checkInternalPackages(rootDirectory);
  assert.ok(errors.includes('packages/example/package.json: version must be "0.0.0"'));
  assert.ok(
    errors.includes(
      'packages/example/package.json: exports.. conditions must be source, types, default in that order',
    ),
  );
  assert.ok(errors.includes('packages/example/package.json: scripts.build must be "tsc"'));
  assert.ok(
    errors.includes(
      'packages/example/package.json: authored source must be TypeScript (src/legacy.js)',
    ),
  );
  assert.ok(
    errors.includes(
      'packages/example/package.json: authored tests must be TypeScript (test/legacy.test.js)',
    ),
  );
});

test('rejects package names that are not kebab-case', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  manifest.name = '@tryghost/example--';
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);

  assert.ok(
    (await checkInternalPackages(rootDirectory)).includes(
      'packages/example/package.json: name must use the @tryghost/<kebab-case-name> form',
    ),
  );
});

test('does not accept config factory names that appear only in comments', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  await writeFile(
    path.join(packageDirectory, 'eslint.config.mjs'),
    "// import {nodeLibConfig} from '@internal/cfg-eslint';\n// export default nodeLibConfig();\nexport default [];\n",
  );
  await writeFile(
    path.join(packageDirectory, 'vitest.config.ts'),
    "// import {createVitestConfig} from '@internal/cfg-vitest';\n// export default createVitestConfig();\nexport default {};\n",
  );

  const errors = await checkInternalPackages(rootDirectory);
  assert.ok(
    errors.includes(
      'packages/example/package.json: eslint.config.mjs must use nodeLibConfig from @internal/cfg-eslint',
    ),
  );
  assert.ok(
    errors.includes(
      'packages/example/package.json: vitest.config.ts must use createVitestConfig from @internal/cfg-vitest',
    ),
  );
});

test('reports non-string export conditions without terminating validation', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  manifest.exports['.'] = { source: 42, types: false, default: {} };
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);

  const errors = await checkInternalPackages(rootDirectory);
  assert.ok(errors.includes('packages/example/package.json: exports...source must be a string'));
  assert.ok(errors.includes('packages/example/package.json: exports...types must be a string'));
  assert.ok(errors.includes('packages/example/package.json: exports...default must be a string'));
});

test('validates the complete package template contract', async () => {
  const rootDirectory = await createRepository();
  const templatePath = path.join(rootDirectory, 'packages', '_template', 'package.json');
  const manifest = compliantManifest('packages/template');
  manifest.name = '@tryghost/{{NAME}}';
  manifest.repository.directory = '{{DIRECTORY}}';
  delete manifest.scripts.build;
  await writeJson(templatePath, manifest);

  assert.ok(
    (await checkInternalPackages(rootDirectory)).includes(
      'packages/_template/package.json: scripts.build must be "tsc"',
    ),
  );
});

test('reports an unreadable package template accurately', async () => {
  const rootDirectory = await createRepository();
  await rm(path.join(rootDirectory, 'packages', '_template', 'package.json'));

  assert.match(
    (await checkInternalPackages(rootDirectory))[0],
    /^packages\/_template\/package\.json: unreadable or invalid JSON/,
  );
});

test('ignores public packages but rejects golden path metadata on them', async () => {
  const rootDirectory = await createRepository();
  await writeJson(path.join(rootDirectory, 'packages', 'public', 'package.json'), {
    name: '@tryghost/public',
    version: '1.0.0',
  });
  assert.deepEqual(await checkInternalPackages(rootDirectory), []);

  await writeJson(path.join(rootDirectory, 'packages', 'public', 'package.json'), {
    name: '@tryghost/public',
    version: '1.0.0',
    ghostPackage: { goldenPath: 'compliant' },
  });
  assert.deepEqual(await checkInternalPackages(rootDirectory), [
    'packages/public/package.json: ghostPackage.goldenPath is only valid for private internal packages',
  ]);
});

test('requires dependencies on packages in this workspace to use workspace:*', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  manifest.dependencies = { '@tryghost/other': 'catalog:' };
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);
  await writeJson(path.join(rootDirectory, 'packages', 'other', 'package.json'), {
    name: '@tryghost/other',
    version: '1.0.0',
  });

  assert.deepEqual(await checkInternalPackages(rootDirectory), [
    'packages/example/package.json: dependencies.@tryghost/other must use workspace:*',
  ]);
});

test('recognizes workspace packages outside packages/', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  manifest.dependencies = { '@tryghost/koenig-example': 'catalog:' };
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);
  await writeJson(path.join(rootDirectory, 'koenig', 'example', 'package.json'), {
    name: '@tryghost/koenig-example',
  });

  assert.deepEqual(await checkInternalPackages(rootDirectory), [
    'packages/example/package.json: dependencies.@tryghost/koenig-example must use workspace:*',
  ]);
});

test('requires peer dependencies on workspace packages to use workspace:*', async () => {
  const rootDirectory = await createRepository();
  const packageDirectory = await createCompliantPackage(rootDirectory);
  const manifest = compliantManifest();
  manifest.peerDependencies = { '@tryghost/koenig-example': '>=1' };
  await writeJson(path.join(packageDirectory, 'package.json'), manifest);
  await writeJson(path.join(rootDirectory, 'koenig', 'example', 'package.json'), {
    name: '@tryghost/koenig-example',
  });

  assert.deepEqual(await checkInternalPackages(rootDirectory), [
    'packages/example/package.json: peerDependencies.@tryghost/koenig-example must use workspace:*',
  ]);
});
