#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

const DEP_SECTIONS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies'
];

const RENOVATE_ONLY_FILES = new Set([
    '.github/renovate.json5',
    '.github/renovate-bot.cjs',
    '.github/workflows/renovate.yml'
]);

const PUBLIC_APP_PACKAGES = [
    {package_name: '@tryghost/activitypub', package_path: 'apps/activitypub'},
    {package_name: '@tryghost/portal', package_path: 'apps/portal'},
    {package_name: '@tryghost/sodo-search', package_path: 'apps/sodo-search'},
    {package_name: '@tryghost/comments-ui', package_path: 'apps/comments-ui'},
    {package_name: '@tryghost/signup-form', package_path: 'apps/signup-form'},
    {package_name: '@tryghost/announcement-bar', package_path: 'apps/announcement-bar'}
];

const ALWAYS_CORE_RUNTIME_DEPS = new Set([
    'bookshelf',
    'express',
    'knex',
    'mysql',
    'mysql2',
    'sqlite3',
    '@tryghost/api-framework',
    '@tryghost/bookshelf-plugins',
    '@tryghost/database-info',
    '@tryghost/domain-events',
    '@tryghost/errors',
    '@tryghost/job-manager',
    '@tryghost/mw-error-handler',
    '@tryghost/mw-vhost',
    '@tryghost/security',
    '@tryghost/validator'
]);

const PLAYWRIGHT_DEPS = new Set([
    '@playwright/test',
    'playwright'
]);

const TOOLING_DEPS = new Set([
    '@eslint/js',
    '@types/node',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'eslint',
    'eslint-plugin-ghost',
    'eslint-plugin-playwright',
    'knip',
    'nx',
    'prettier',
    'typescript',
    'typescript-eslint',
    'vite',
    'vitest'
]);

const TEST_TOOLING_DEPS = new Set([
    'nx',
    'tsx',
    'typescript',
    'vitest'
]);

function run(command, args, options = {}) {
    return execFileSync(command, args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', options.inheritStderr ? 'inherit' : 'pipe']
    }).trim();
}

function splitLines(output) {
    return output.split('\n').map(line => line.trim()).filter(Boolean);
}

function parseArgs(argv) {
    const args = {};

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (!arg.startsWith('--')) {
            continue;
        }

        const key = arg.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            args[key] = true;
        } else {
            args[key] = next;
            i += 1;
        }
    }

    return args;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
}

function readJsonAtRef(ref, filePath) {
    try {
        return JSON.parse(run('git', ['show', `${ref}:${filePath}`]));
    } catch {
        return null;
    }
}

function getChangedFiles(base, head) {
    if (!base || !head) {
        return [];
    }

    return splitLines(run('git', ['diff', '--name-only', `${base}...${head}`]));
}

function listWorkspacePackages() {
    const packages = [];
    const patterns = ['apps', 'ghost'];

    for (const pattern of patterns) {
        const dir = path.join(ROOT, pattern);
        if (!fs.existsSync(dir)) {
            continue;
        }

        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            if (!entry.isDirectory()) {
                continue;
            }

            const packagePath = `${pattern}/${entry.name}/package.json`;
            const absolutePackagePath = path.join(ROOT, packagePath);
            if (!fs.existsSync(absolutePackagePath)) {
                continue;
            }

            const pkg = readJson(packagePath);
            packages.push({
                name: pkg.name || (pattern === 'ghost' && entry.name === 'core' ? 'ghost' : entry.name),
                root: `${pattern}/${entry.name}`,
                packagePath,
                packageJson: pkg
            });
        }
    }

    if (fs.existsSync(path.join(ROOT, 'e2e/package.json'))) {
        const pkg = readJson('e2e/package.json');
        packages.push({
            name: pkg.name || '@tryghost/e2e',
            root: 'e2e',
            packagePath: 'e2e/package.json',
            packageJson: pkg
        });
    }

    return packages;
}

function projectForPath(filePath, packages = listWorkspacePackages()) {
    const match = packages
        .filter(pkg => filePath === pkg.root || filePath.startsWith(`${pkg.root}/`))
        .sort((a, b) => b.root.length - a.root.length)[0];

    return match ? match.name : null;
}

function changedManifestDiffs(changedFiles, base, packages = listWorkspacePackages()) {
    return changedFiles
        .filter(file => file === 'package.json' || file.endsWith('/package.json'))
        .map((file) => {
            const before = base ? readJsonAtRef(base, file) : null;
            const after = fs.existsSync(path.join(ROOT, file)) ? readJson(file) : null;

            const changedDeps = [];
            for (const section of DEP_SECTIONS) {
                const beforeDeps = before?.[section] || {};
                const afterDeps = after?.[section] || {};
                const names = new Set([...Object.keys(beforeDeps), ...Object.keys(afterDeps)]);
                for (const name of names) {
                    if (beforeDeps[name] !== afterDeps[name]) {
                        changedDeps.push({
                            name,
                            section,
                            before: beforeDeps[name] || null,
                            after: afterDeps[name] || null
                        });
                    }
                }
            }

            return {
                file,
                project: projectForPath(file, packages),
                changedDeps
            };
        });
}

function changedWorkspaceCatalogDiffs(changedFiles, base, head, packages = listWorkspacePackages()) {
    if (!base || !head || !changedFiles.includes('pnpm-workspace.yaml')) {
        return [];
    }

    let diff = '';
    try {
        diff = run('git', ['diff', '--unified=0', `${base}...${head}`, '--', 'pnpm-workspace.yaml']);
    } catch {
        return [];
    }

    const depNames = unique(splitLines(diff)
        .filter(line => /^[+-]/.test(line) && !line.startsWith('+++') && !line.startsWith('---'))
        .map(line => line.match(/^[+-]\s{2,}['"]?([^'":]+)['"]?:\s*/)?.[1])
        .filter(Boolean));

    const diffs = [];
    for (const name of depNames) {
        const consumers = packages.filter(pkg => DEP_SECTIONS.some((section) => {
            const version = pkg.packageJson[section]?.[name];
            return typeof version === 'string' && version.startsWith('catalog');
        }));

        if (consumers.length === 0) {
            diffs.push({
                file: 'pnpm-workspace.yaml',
                project: null,
                changedDeps: [{name, section: 'catalog', before: null, after: null}]
            });
            continue;
        }

        for (const consumer of consumers) {
            diffs.push({
                file: 'pnpm-workspace.yaml',
                project: consumer.name,
                changedDeps: [{name, section: 'catalog', before: null, after: null}]
            });
        }
    }

    return diffs;
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function compactCsv(values) {
    return unique(values).join(',');
}

function bool(value) {
    return value ? 'true' : 'false';
}

function isDocsFile(file) {
    return file.endsWith('.md') || file.startsWith('docs/') || file.startsWith('adr/');
}

function isConfigOnlyFile(file) {
    return file.startsWith('.vscode/') || file.startsWith('.devcontainer/');
}

function shardMatrix(project, total, extra = {}) {
    return Array.from({length: total}, (_, index) => ({
        project,
        shardIndex: index + 1,
        shardTotal: total,
        ...extra
    }));
}

function e2eMatrix({full = false, analytics = false} = {}) {
    const mainTotal = full ? 12 : 6;
    const matrix = Array.from({length: mainTotal}, (_, index) => ({
        projectName: 'Main',
        projects: 'main',
        analytics: 'false',
        shardIndex: index + 1,
        shardTotal: mainTotal
    }));

    if (analytics) {
        matrix.push(
            {projectName: 'Analytics', projects: 'analytics', analytics: 'true', shardIndex: 1, shardTotal: 2},
            {projectName: 'Analytics', projects: 'analytics', analytics: 'true', shardIndex: 2, shardTotal: 2}
        );
    }

    return matrix;
}

function appAcceptanceMatrix(projects) {
    const matrix = [];
    for (const project of unique(projects)) {
        if (project === '@tryghost/admin-x-settings') {
            matrix.push(...shardMatrix(project, 4, {app: project}));
        } else {
            matrix.push({app: project, project, shardIndex: 1, shardTotal: 1});
        }
    }

    return matrix;
}

function coreDbMatrix({full = false} = {}) {
    const dbs = full ? [
        {DB: 'mysql8', NODE_ENV: 'testing-mysql'},
        {DB: 'sqlite3', NODE_ENV: 'testing'}
    ] : [
        {DB: 'mysql8', NODE_ENV: 'testing-mysql'}
    ];
    const suites = full ? ['api', 'integration', 'legacy'] : ['api', 'integration'];
    const matrix = [];

    for (const env of dbs) {
        for (const suite of suites) {
            matrix.push({suite, env});
        }
    }

    return matrix;
}

function classifyDependencyChanges(manifestDiffs) {
    const changedDeps = manifestDiffs.flatMap(diff => diff.changedDeps.map(dep => ({
        ...dep,
        project: diff.project,
        file: diff.file
    })));

    const runtimeCore = changedDeps.some(dep => dep.project === 'ghost' || ALWAYS_CORE_RUNTIME_DEPS.has(dep.name));
    const playwright = changedDeps.some(dep => PLAYWRIGHT_DEPS.has(dep.name));
    const tooling = changedDeps.some(dep => (
        TOOLING_DEPS.has(dep.name) ||
        dep.section === 'devDependencies' ||
        (dep.file === 'pnpm-workspace.yaml' && dep.project === null)
    ));
    const packageProjects = unique(manifestDiffs.map(diff => diff.project));

    return {
        changedDeps,
        runtimeCore,
        playwright,
        tooling,
        packageProjects
    };
}

function buildPlan({
    changedFiles,
    base = '',
    head = '',
    eventName = 'pull_request',
    isTag = false,
    affectedProjects = [],
    unitTestProjects = [],
    playwrightProjects = [],
    i18nProjects = [],
    manifestDiffs: providedManifestDiffs = null
}) {
    const files = unique(changedFiles);
    const packages = listWorkspacePackages();
    const manifestDiffs = providedManifestDiffs || [
        ...changedManifestDiffs(files, base, packages),
        ...changedWorkspaceCatalogDiffs(files, base, head, packages)
    ];
    const dependencyChanges = classifyDependencyChanges(manifestDiffs);
    const allProjectNames = packages.map(pkg => pkg.name);
    const lintableProjectNames = packages.filter(pkg => hasTarget(pkg, 'lint')).map(pkg => pkg.name);

    const hasFiles = files.length > 0;
    const docsOnly = hasFiles && files.every(file => isDocsFile(file) || isConfigOnlyFile(file));
    const renovateOnly = hasFiles && files.every(file => RENOVATE_ONLY_FILES.has(file));
    const ciChanged = files.some(file => (
        file.startsWith('.github/workflows/') ||
        file.startsWith('.github/actions/') ||
        file.startsWith('.github/scripts/')
    ) && !RENOVATE_ONLY_FILES.has(file));
    const full = Boolean(isTag || ciChanged || eventName === 'merge_group');
    const anyCode = hasFiles && !docsOnly && !renovateOnly;
    const tinybird = full || files.some(file => (
        file === 'compose.dev.analytics.yaml' ||
        file.startsWith('ghost/core/core/server/data/tinybird/')
    ) && !file.endsWith('.md'));
    const tinybirdDatafiles = files.some(file => (
        file.startsWith('ghost/core/core/server/data/tinybird/') && !file.endsWith('.md')
    ));

    const directlyChangedProjects = unique(files.map(file => projectForPath(file, packages)));
    const depOnly = anyCode && files.every(file => (
        file === 'pnpm-lock.yaml' ||
        file === 'pnpm-workspace.yaml' ||
        file === 'package.json' ||
        file.endsWith('/package.json')
    ));

    const changedCore = full || files.some(file => (
        file.startsWith('ghost/core/') &&
        !file.startsWith('ghost/core/test/unit/') &&
        file !== 'ghost/core/vitest.config.ts' &&
        !file.startsWith('ghost/core/core/server/data/tinybird/')
    )) || dependencyChanges.runtimeCore;

    const runBrowserE2E = full || files.some(file => (
        file.startsWith('e2e/') ||
        file.startsWith('apps/portal/') ||
        file.startsWith('apps/comments-ui/') ||
        file.startsWith('apps/sodo-search/') ||
        file.startsWith('apps/signup-form/') ||
        file.startsWith('apps/announcement-bar/') ||
        file.startsWith('ghost/core/core/frontend/')
    )) || dependencyChanges.playwright;

    const i18nChanged = full || files.some(file => file.startsWith('ghost/i18n/') || file.includes('/locales/')) || i18nProjects.length > 0;

    const allProjects = full ? allProjectNames : [];
    const affected = full ? allProjects : unique([
        ...affectedProjects,
        ...directlyChangedProjects,
        ...dependencyChanges.packageProjects
    ]);

    const rootToolingChange = dependencyChanges.tooling && dependencyChanges.packageProjects.length === 0;
    const testToolingChange = dependencyChanges.changedDeps.some(dep => TEST_TOOLING_DEPS.has(dep.name));
    const lintProjects = docsOnly || renovateOnly ? [] : (depOnly ? unique([
        ...dependencyChanges.packageProjects,
        ...(dependencyChanges.runtimeCore ? ['ghost'] : []),
        ...(rootToolingChange ? lintableProjectNames : [])
    ]).filter(project => lintableProjectNames.includes(project)) : affected.filter(project => lintableProjectNames.includes(project)));

    const units = docsOnly || renovateOnly ? [] : (full ? unitTestProjects : unique([
        ...unitTestProjects.filter(project => lintProjects.includes(project)),
        ...dependencyChanges.packageProjects.filter(Boolean),
        ...(changedCore ? ['ghost'] : []),
        ...(testToolingChange ? unitTestProjects : [])
    ]));

    const appAcceptanceProjects = docsOnly || renovateOnly ? [] : (full ? playwrightProjects : (depOnly ? (
        dependencyChanges.playwright ? playwrightProjects : []
    ) : unique([
        ...playwrightProjects.filter(project => lintProjects.includes(project)),
        ...directlyChangedProjects.filter(project => project?.startsWith('@tryghost/') && project !== '@tryghost/e2e')
    ])));

    const publicAppBuildProjects = runBrowserE2E ? PUBLIC_APP_PACKAGES : PUBLIC_APP_PACKAGES.filter(project => lintProjects.includes(project.package_name));

    const unitMatrix = units.flatMap(project => (
        project === 'ghost' ? shardMatrix('ghost', 4) : [{project, shardIndex: 1, shardTotal: 1}]
    ));
    const appMatrix = appAcceptanceMatrix(appAcceptanceProjects);
    const coreMatrix = changedCore ? coreDbMatrix({full}) : [];
    const browserMatrix = runBrowserE2E ? e2eMatrix({full, analytics: full || tinybird}) : [];
    const packageBuildMatrix = publicAppBuildProjects;

    return {
        metadata: {
            base,
            head,
            eventName,
            files,
            dependencyChanges: dependencyChanges.changedDeps,
            full,
            depOnly
        },
        outputs: {
            affected_projects: JSON.stringify(affected),
            affected_projects_str: compactCsv(affected),
            lint_projects_str: compactCsv(lintProjects),
            unit_test_projects_str: compactCsv(units),
            affected_playwright_projects: JSON.stringify(appAcceptanceProjects),
            changed_i18n_apps: bool(i18nChanged),
            changed_core: bool(changedCore),
            changed_tinybird: bool(tinybird),
            changed_tinybird_datafiles: bool(tinybirdDatafiles),
            changed_any_code: bool(anyCode),
            run_e2e: bool(runBrowserE2E),
            run_coverage: bool(full || eventName === 'push'),
            unit_test_matrix: JSON.stringify({include: unitMatrix}),
            app_acceptance_matrix: JSON.stringify({include: appMatrix}),
            core_db_matrix: JSON.stringify({include: coreMatrix}),
            e2e_matrix: JSON.stringify({include: browserMatrix}),
            package_build_matrix: JSON.stringify({include: packageBuildMatrix})
        }
    };
}

function hasTarget(pkg, target) {
    return Boolean(pkg.packageJson.scripts?.[target] || pkg.packageJson.nx?.targets?.[target]);
}

function writeGithubOutputs(outputs, outputPath) {
    const lines = [];
    for (const [key, value] of Object.entries(outputs)) {
        lines.push(`${key}=${value}`);
    }
    fs.appendFileSync(outputPath, `${lines.join('\n')}\n`);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const base = args.base || process.env.NX_BASE || '';
    const head = args.head || process.env.NX_HEAD || process.env.HEAD_COMMIT || 'HEAD';
    const eventName = args.event || process.env.GITHUB_EVENT_NAME || 'pull_request';
    const isTag = args['is-tag'] === 'true' || process.env.IS_TAG === 'true';

    const packages = listWorkspacePackages();
    const changedFiles = isTag ? splitLines(run('git', ['ls-files'])) : getChangedFiles(base, head);
    const affectedProjects = unique(changedFiles.map(file => projectForPath(file, packages)));
    const unitTestProjects = packages.filter(pkg => hasTarget(pkg, 'test:unit')).map(pkg => pkg.name);
    const playwrightProjects = packages
        .filter(pkg => pkg.root.startsWith('apps/') && hasTarget(pkg, 'test:acceptance'))
        .map(pkg => pkg.name);

    const plan = buildPlan({
        changedFiles,
        base,
        head,
        eventName,
        isTag,
        affectedProjects,
        unitTestProjects,
        playwrightProjects,
        i18nProjects: []
    });

    console.log(JSON.stringify(plan, null, 2));

    if (process.env.GITHUB_OUTPUT) {
        writeGithubOutputs(plan.outputs, process.env.GITHUB_OUTPUT);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    buildPlan,
    classifyDependencyChanges,
    projectForPath
};
