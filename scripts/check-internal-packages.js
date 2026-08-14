import {execFile} from 'node:child_process';
import {readdir, readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

import {ROOT_DIR} from './lib/constants.js';
import {applyPackageTemplateTokens, isValidPackageName} from './lib/package-template.js';

const execFileAsync = promisify(execFile);

const GOLDEN_PATH_STATUSES = new Set(['compliant', 'migration', 'exempt']);
// These expectations intentionally remain independent of packages/_template.
// Deriving them from the template would allow accidental template drift to
// redefine the contract and approve itself.
const REQUIRED_SCRIPTS = {
    build: 'tsc',
    'test:unit': 'NODE_ENV=testing vitest run --coverage',
    'test:types': 'tsc --noEmit -p test/tsconfig.json',
    test: "pnpm run '/^test:/'",
    'lint:code': 'eslint src/ --cache',
    'lint:test': 'eslint test/ --cache',
    lint: "pnpm run '/^lint:/'"
};
const REQUIRED_DEV_DEPENDENCIES = {
    '@internal/cfg-eslint': 'workspace:*',
    '@internal/cfg-typescript': 'workspace:*',
    '@internal/cfg-vitest': 'workspace:*',
    '@types/node': 'catalog:',
    '@vitest/coverage-v8': 'catalog:',
    '@typescript/native': 'catalog:',
    eslint: 'catalog:',
    typescript: 'catalog:',
    vitest: 'catalog:'
};

async function exists(filePath) {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

async function listWorkspacePackages(rootDirectory) {
    const {stdout} = await execFileAsync('pnpm', [
        'm', 'ls', '--depth', '-1', '--json'
    ], {
        cwd: rootDirectory,
        maxBuffer: 10 * 1024 * 1024
    });

    return JSON.parse(stdout);
}

function sameArray(actual, expected) {
    return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function addExactValueError(errors, manifestPath, actual, expected, field) {
    if (actual !== expected) {
        errors.push(`${manifestPath}: ${field} must be ${JSON.stringify(expected)}`);
    }
}

function usesStandardConfigFactory(config, moduleName, factoryName) {
    const importPattern = new RegExp(`^\\s*import\\s*\\{\\s*${factoryName}\\s*\\}\\s*from\\s*['"]${moduleName}['"];?\\s*$`, 'm');
    const exportPattern = new RegExp(`^\\s*export\\s+default\\s+${factoryName}\\s*\\(`, 'm');
    return importPattern.test(config) && exportPattern.test(config);
}

async function findJavaScriptFiles(directory) {
    if (!await exists(directory)) {
        return [];
    }

    const files = [];
    for (const entry of await readdir(directory, {withFileTypes: true})) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findJavaScriptFiles(entryPath));
        } else if (/\.(?:c|m)?jsx?$/.test(entry.name)) {
            files.push(entryPath);
        }
    }
    return files;
}

async function validateConfigFiles(packageDirectory, manifestPath, errors) {
    const tsconfigPath = path.join(packageDirectory, 'tsconfig.json');
    const testTsconfigPath = path.join(packageDirectory, 'test', 'tsconfig.json');
    const eslintPath = path.join(packageDirectory, 'eslint.config.mjs');
    const vitestPath = path.join(packageDirectory, 'vitest.config.ts');

    for (const requiredPath of [tsconfigPath, testTsconfigPath, eslintPath, vitestPath]) {
        if (!await exists(requiredPath)) {
            errors.push(`${manifestPath}: missing ${path.relative(packageDirectory, requiredPath)}`);
        }
    }

    if (await exists(tsconfigPath)) {
        try {
            const config = await readJson(tsconfigPath);
            addExactValueError(errors, manifestPath, config.extends, '@internal/cfg-typescript/esm.json', 'tsconfig.json extends');
            addExactValueError(errors, manifestPath, config.compilerOptions?.rootDir, 'src', 'tsconfig.json compilerOptions.rootDir');
            addExactValueError(errors, manifestPath, config.compilerOptions?.outDir, 'build', 'tsconfig.json compilerOptions.outDir');
            if (!sameArray(config.include, ['src/**/*'])) {
                errors.push(`${manifestPath}: tsconfig.json include must be ["src/**/*"]`);
            }
        } catch (error) {
            errors.push(`${manifestPath}: invalid tsconfig.json (${error.message})`);
        }
    }

    if (await exists(testTsconfigPath)) {
        try {
            const config = await readJson(testTsconfigPath);
            addExactValueError(errors, manifestPath, config.extends, '../tsconfig.json', 'test/tsconfig.json extends');
            addExactValueError(errors, manifestPath, config.compilerOptions?.rootDir, '..', 'test/tsconfig.json compilerOptions.rootDir');
            addExactValueError(errors, manifestPath, config.compilerOptions?.noEmit, true, 'test/tsconfig.json compilerOptions.noEmit');
            if (!sameArray(config.include, ['../src/**/*', '**/*'])) {
                errors.push(`${manifestPath}: test/tsconfig.json include must be ["../src/**/*", "**/*"]`);
            }
        } catch (error) {
            errors.push(`${manifestPath}: invalid test/tsconfig.json (${error.message})`);
        }
    }

    if (await exists(eslintPath)) {
        const config = await readFile(eslintPath, 'utf8');
        if (!usesStandardConfigFactory(config, '@internal/cfg-eslint', 'nodeLibConfig')) {
            errors.push(`${manifestPath}: eslint.config.mjs must use nodeLibConfig from @internal/cfg-eslint`);
        }
    }

    if (await exists(vitestPath)) {
        const config = await readFile(vitestPath, 'utf8');
        if (!usesStandardConfigFactory(config, '@internal/cfg-vitest', 'createVitestConfig')) {
            errors.push(`${manifestPath}: vitest.config.ts must use createVitestConfig from @internal/cfg-vitest`);
        }
    }
}

async function validateCompliantPackage({rootDirectory, packageDirectory, manifest, workspaceNames, packagePath: explicitPackagePath}) {
    const manifestPath = path.relative(rootDirectory, path.join(packageDirectory, 'package.json'));
    const packagePath = explicitPackagePath ?? path.relative(rootDirectory, packageDirectory).split(path.sep).join('/');
    const errors = [];

    if (typeof manifest.name !== 'string' || !manifest.name.startsWith('@tryghost/') || !isValidPackageName(manifest.name.slice('@tryghost/'.length))) {
        errors.push(`${manifestPath}: name must use the @tryghost/<kebab-case-name> form`);
    }
    addExactValueError(errors, manifestPath, manifest.version, '0.0.0', 'version');
    addExactValueError(errors, manifestPath, manifest.private, true, 'private');
    addExactValueError(errors, manifestPath, manifest.type, 'module', 'type');
    addExactValueError(errors, manifestPath, manifest.author, 'Ghost Foundation', 'author');
    addExactValueError(errors, manifestPath, manifest.license, 'MIT', 'license');
    addExactValueError(errors, manifestPath, manifest.repository?.type, 'git', 'repository.type');
    addExactValueError(errors, manifestPath, manifest.repository?.url, 'git+https://github.com/TryGhost/Ghost.git', 'repository.url');
    addExactValueError(errors, manifestPath, manifest.repository?.directory, packagePath, 'repository.directory');

    if (manifest.publishConfig !== undefined) {
        errors.push(`${manifestPath}: compliant internal packages must not define publishConfig`);
    }
    if (!sameArray(manifest.files, ['build'])) {
        errors.push(`${manifestPath}: files must be ["build"]`);
    }

    const exports = manifest.exports;
    if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
        errors.push(`${manifestPath}: exports must define explicit entry points`);
    } else {
        for (const [entryPoint, conditions] of Object.entries(exports)) {
            if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) {
                errors.push(`${manifestPath}: exports.${entryPoint} must be an object`);
                continue;
            }

            if (!sameArray(Object.keys(conditions), ['source', 'types', 'default'])) {
                errors.push(`${manifestPath}: exports.${entryPoint} conditions must be source, types, default in that order`);
                continue;
            }

            for (const condition of ['source', 'types', 'default']) {
                if (typeof conditions[condition] !== 'string') {
                    errors.push(`${manifestPath}: exports.${entryPoint}.${condition} must be a string`);
                }
            }

            const sourceMatch = typeof conditions.source === 'string' && /^\.\/src\/(.+)\.ts$/.exec(conditions.source);
            if (!sourceMatch || sourceMatch[1].split('/').includes('..')) {
                errors.push(`${manifestPath}: exports.${entryPoint}.source must point to ./src/<path>.ts`);
                continue;
            }

            const sourceStem = sourceMatch[1];
            addExactValueError(errors, manifestPath, conditions.types, `./build/${sourceStem}.d.ts`, `exports.${entryPoint}.types`);
            addExactValueError(errors, manifestPath, conditions.default, `./build/${sourceStem}.js`, `exports.${entryPoint}.default`);
            if (!await exists(path.join(packageDirectory, conditions.source))) {
                errors.push(`${manifestPath}: exports.${entryPoint}.source does not exist (${conditions.source})`);
            }
        }

        const rootExport = exports['.'];
        if (!rootExport) {
            errors.push(`${manifestPath}: exports must define the "." entry point`);
        } else {
            if (typeof rootExport.default === 'string') {
                addExactValueError(errors, manifestPath, manifest.main, rootExport.default.replace(/^\.\//, ''), 'main');
            }
            if (typeof rootExport.types === 'string') {
                addExactValueError(errors, manifestPath, manifest.types, rootExport.types.replace(/^\.\//, ''), 'types');
            }
        }
    }

    for (const [script, expected] of Object.entries(REQUIRED_SCRIPTS)) {
        addExactValueError(errors, manifestPath, manifest.scripts?.[script], expected, `scripts.${script}`);
    }
    for (const [dependency, expected] of Object.entries(REQUIRED_DEV_DEPENDENCIES)) {
        addExactValueError(errors, manifestPath, manifest.devDependencies?.[dependency], expected, `devDependencies.${dependency}`);
    }
    if (!sameArray(manifest.nx?.targets?.build?.outputs, ['{projectRoot}/build'])) {
        errors.push(`${manifestPath}: nx.targets.build.outputs must be ["{projectRoot}/build"]`);
    }

    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const [dependency, version] of Object.entries(manifest[section] ?? {})) {
            if (dependency !== manifest.name && workspaceNames.has(dependency) && version !== 'workspace:*') {
                errors.push(`${manifestPath}: ${section}.${dependency} must use workspace:*`);
            }
        }
    }

    await validateConfigFiles(packageDirectory, manifestPath, errors);

    for (const javascriptFile of await findJavaScriptFiles(path.join(packageDirectory, 'src'))) {
        errors.push(`${manifestPath}: authored source must be TypeScript (${path.relative(packageDirectory, javascriptFile)})`);
    }
    for (const javascriptFile of await findJavaScriptFiles(path.join(packageDirectory, 'test'))) {
        errors.push(`${manifestPath}: authored tests must be TypeScript (${path.relative(packageDirectory, javascriptFile)})`);
    }

    return errors;
}

export async function checkInternalPackages(rootDirectory) {
    rootDirectory = await realpath(rootDirectory);
    const packagesDirectory = path.join(rootDirectory, 'packages');
    let workspacePackages;
    try {
        workspacePackages = await listWorkspacePackages(rootDirectory);
    } catch (error) {
        const detail = error.stderr?.trim() || error.message;
        return [`Unable to list pnpm workspace packages (${detail})`];
    }
    const packageDirectories = workspacePackages
        .map(workspace => workspace.path)
        .filter(directory => directory.startsWith(`${packagesDirectory}${path.sep}`))
        .sort();
    const packages = [];
    const errors = [];

    for (const packageDirectory of packageDirectories) {
        const manifestPath = path.join(packageDirectory, 'package.json');
        try {
            packages.push({packageDirectory, manifest: await readJson(manifestPath)});
        } catch (error) {
            errors.push(`${path.relative(rootDirectory, manifestPath)}: invalid JSON (${error.message})`);
        }
    }

    const workspaceNames = new Set();
    for (const workspace of workspacePackages) {
        if (workspace.name) {
            workspaceNames.add(workspace.name);
        }
    }

    for (const pkg of packages) {
        const manifestPath = path.relative(rootDirectory, path.join(pkg.packageDirectory, 'package.json'));
        const status = pkg.manifest.ghostPackage?.goldenPath;

        if (pkg.manifest.private !== true) {
            if (status !== undefined) {
                errors.push(`${manifestPath}: ghostPackage.goldenPath is only valid for private internal packages`);
            }
            continue;
        }

        if (!GOLDEN_PATH_STATUSES.has(status)) {
            errors.push(`${manifestPath}: ghostPackage.goldenPath must be one of compliant, migration, exempt`);
            continue;
        }

        if (status === 'migration' || status === 'exempt') {
            if (typeof pkg.manifest.ghostPackage.reason !== 'string' || pkg.manifest.ghostPackage.reason.trim().length === 0) {
                errors.push(`${manifestPath}: ghostPackage.reason is required when goldenPath is ${status}`);
            }
            continue;
        }

        errors.push(...await validateCompliantPackage({
            rootDirectory,
            packageDirectory: pkg.packageDirectory,
            manifest: pkg.manifest,
            workspaceNames
        }));
    }

    const templateManifestPath = path.join(packagesDirectory, '_template', 'package.json');
    let templateManifest;
    try {
        const templateManifestSource = await readFile(templateManifestPath, 'utf8');
        templateManifest = JSON.parse(applyPackageTemplateTokens(templateManifestSource, {
            name: 'template',
            directory: 'packages/template',
            description: 'Template package'
        }));
    } catch (error) {
        errors.push(`packages/_template/package.json: unreadable or invalid JSON (${error.message})`);
    }

    if (templateManifest) {
        errors.push(...await validateCompliantPackage({
            rootDirectory,
            packageDirectory: path.dirname(templateManifestPath),
            packagePath: 'packages/template',
            manifest: templateManifest,
            workspaceNames
        }));
    }

    return errors;
}

if (import.meta.main) {
    const errors = await checkInternalPackages(ROOT_DIR);
    if (errors.length > 0) {
        console.error(`Internal package golden path check failed:\n\n${errors.join('\n')}`);
        process.exitCode = 1;
    } else {
        console.log('All private internal packages have a valid golden path status.');
    }
}
