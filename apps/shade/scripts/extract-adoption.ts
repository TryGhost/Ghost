#!/usr/bin/env tsx
/// <reference types="node" />
/* eslint-disable no-console -- this is a CLI script; stdout is the UI */

/**
 * Design System Adoption — snapshot extractor.
 *
 * Scans the Ghost monorepo and writes a single JSON snapshot describing how
 * each Admin React app uses Shade vs. admin-x-design-system, plus a coarse
 * Ember legacy summary and a public-apps count. Output is consumed by the
 * Storybook page at src/docs/adoption-dashboard.stories.tsx.
 *
 * Run with: pnpm --filter @tryghost/shade run adoption:extract
 *
 * Why regex instead of the TypeScript compiler API:
 *  - We only need to count files importing two specific packages and
 *    enumerate their named imports. Dynamic imports and re-exports of these
 *    packages don't occur in this codebase, so the regex captures the full
 *    signal at a fraction of the cost (faster, no `typescript` runtime dep,
 *    smaller and more readable than an AST walker).
 */

import {execSync} from 'node:child_process';
import {readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {globSync} from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..', '..');
const OUT_PATH = join(__dirname, '..', 'src', 'docs', 'adoption-data.json');

// Apps that already adopt Shade as their target system, plus admin-x-settings
// which is the active migration surface from admin-x-design-system → Shade.
const ADMIN_REACT_APPS = [
    'admin',
    'posts',
    'stats',
    'activitypub',
    'admin-x-settings'
] as const;

const PUBLIC_APPS = [
    'portal',
    'comments-ui',
    'signup-form',
    'sodo-search',
    'announcement-bar'
] as const;

type ComponentCount = {name: string; count: number};

type AppReport = {
    name: string;
    files: number;
    shadeFiles: number;
    adminXDsFiles: number;
    shadeComponents: ComponentCount[];
    adminXDsComponents: ComponentCount[];
};

type EmberReport = {
    hbsFiles: number;
    spiritUtilityFiles: number;
    patternFiles: number;
    componentCssFiles: number;
};

type AdoptionData = {
    snapshot: {
        generatedAt: string;
        sha: string;
        branch: string;
    };
    summary: {
        adminReactFilesTotal: number;
        adminReactFilesUsingShade: number;
        shadeAdoptionPct: number;
        uniqueShadeComponentsUsed: number;
        adminXDsComponentsStillUsed: number;
    };
    apps: AppReport[];
    topShadeComponents: ComponentCount[];
    adminXDsComponentsAggregate: ComponentCount[];
    ember: EmberReport | null;
    publicApps: {
        count: number;
        names: readonly string[];
    };
};

// Pull named imports out of a single import statement. Handles multiline,
// type imports, and `as` aliases (we keep the original name).
function parseNamedImports(importSource: string): string[] {
    const named: string[] = [];
    const normalized = importSource.replace(/\s+/g, ' ');
    const m = normalized.match(/import\s+(?:type\s+)?(?:[^{,]*,\s*)?\{([^}]+)\}/);
    if (!m) {
        return named;
    }
    for (const part of m[1].split(',')) {
        const cleaned = part.trim().replace(/^type\s+/, '');
        if (!cleaned) {
            continue;
        }
        // `Foo as Bar` -> we want Foo
        const name = cleaned.split(/\s+as\s+/)[0].trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) {
            named.push(name);
        }
    }
    return named;
}

// Pull every `import ... from 'module'` block out of a file's text where
// `module` matches `targetModuleRegex`.
function extractImports(text: string, targetModuleRegex: RegExp): string[] {
    const results: string[] = [];
    const re = /import\s+(?:type\s+)?[^;]*?from\s+['"]([^'"]+)['"]/gs;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (targetModuleRegex.test(match[1])) {
            results.push(match[0]);
        }
    }
    return results;
}

function scanApp(appName: string): AppReport | null {
    const appDir = join(REPO_ROOT, 'apps', appName, 'src');
    try {
        statSync(appDir);
    } catch {
        return null;
    }
    const files = globSync('**/*.{ts,tsx}', {
        cwd: appDir,
        ignore: [
            '**/node_modules/**',
            '**/dist/**',
            '**/*.stories.tsx',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/test/**',
            '**/tests/**',
            '**/__tests__/**',
            '**/__mocks__/**'
        ],
        absolute: true
    });

    let shadeFiles = 0;
    let adminXDsFiles = 0;
    const shadeComponentCounts = new Map<string, number>();
    const adminXDsComponentCounts = new Map<string, number>();

    for (const filePath of files) {
        const text = readFileSync(filePath, 'utf8');

        const shadeImports = extractImports(text, /^@tryghost\/shade(\/.*)?$/);
        if (shadeImports.length > 0) {
            shadeFiles += 1;
            for (const imp of shadeImports) {
                for (const name of parseNamedImports(imp)) {
                    shadeComponentCounts.set(name, (shadeComponentCounts.get(name) ?? 0) + 1);
                }
            }
        }

        const adminXDsImports = extractImports(text, /^@tryghost\/admin-x-design-system$/);
        if (adminXDsImports.length > 0) {
            adminXDsFiles += 1;
            for (const imp of adminXDsImports) {
                for (const name of parseNamedImports(imp)) {
                    adminXDsComponentCounts.set(name, (adminXDsComponentCounts.get(name) ?? 0) + 1);
                }
            }
        }
    }

    return {
        name: appName,
        files: files.length,
        shadeFiles,
        adminXDsFiles,
        shadeComponents: [...shadeComponentCounts.entries()]
            .map(([name, count]) => ({name, count}))
            .sort((a, b) => b.count - a.count),
        adminXDsComponents: [...adminXDsComponentCounts.entries()]
            .map(([name, count]) => ({name, count}))
            .sort((a, b) => b.count - a.count)
    };
}

function scanEmber(): EmberReport | null {
    const appDir = join(REPO_ROOT, 'ghost', 'admin', 'app');
    try {
        statSync(appDir);
    } catch {
        return null;
    }
    const hbsFiles = globSync('**/*.hbs', {cwd: appDir, ignore: ['**/node_modules/**']}).length;
    const stylesDir = join(appDir, 'styles');
    const spiritUtilityFiles = globSync('spirit/**/*.css', {cwd: stylesDir}).length;
    const patternFiles = globSync('patterns/**/*.css', {cwd: stylesDir}).length;
    const componentCssFiles = globSync('components/**/*.css', {cwd: stylesDir}).length;
    return {hbsFiles, spiritUtilityFiles, patternFiles, componentCssFiles};
}

function getGitInfo(): {sha: string; branch: string} {
    try {
        const sha = execSync('git rev-parse HEAD', {cwd: REPO_ROOT}).toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {cwd: REPO_ROOT}).toString().trim();
        return {sha, branch};
    } catch {
        return {sha: 'unknown', branch: 'unknown'};
    }
}

function main(): void {
    const apps = ADMIN_REACT_APPS
        .map(name => scanApp(name))
        .filter((a): a is AppReport => a !== null);

    const adminReactFilesTotal = apps.reduce((sum, a) => sum + a.files, 0);
    const adminReactFilesUsingShade = apps.reduce((sum, a) => sum + a.shadeFiles, 0);
    const shadeAdoptionPct = adminReactFilesTotal === 0
        ? 0
        : Math.round((adminReactFilesUsingShade / adminReactFilesTotal) * 1000) / 10;

    const allShadeComponents = new Set<string>();
    const adminXDsTotal = new Map<string, number>();
    const aggregateShadeComponentCounts = new Map<string, number>();

    for (const app of apps) {
        for (const c of app.shadeComponents) {
            allShadeComponents.add(c.name);
            aggregateShadeComponentCounts.set(c.name, (aggregateShadeComponentCounts.get(c.name) ?? 0) + c.count);
        }
        for (const c of app.adminXDsComponents) {
            adminXDsTotal.set(c.name, (adminXDsTotal.get(c.name) ?? 0) + c.count);
        }
    }

    const data: AdoptionData = {
        snapshot: {
            generatedAt: new Date().toISOString(),
            ...getGitInfo()
        },
        summary: {
            adminReactFilesTotal,
            adminReactFilesUsingShade,
            shadeAdoptionPct,
            uniqueShadeComponentsUsed: allShadeComponents.size,
            adminXDsComponentsStillUsed: adminXDsTotal.size
        },
        apps,
        topShadeComponents: [...aggregateShadeComponentCounts.entries()]
            .map(([name, count]) => ({name, count}))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20),
        adminXDsComponentsAggregate: [...adminXDsTotal.entries()]
            .map(([name, count]) => ({name, count}))
            .sort((a, b) => b.count - a.count),
        ember: scanEmber(),
        publicApps: {
            count: PUBLIC_APPS.length,
            names: PUBLIC_APPS
        }
    };

    writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`Wrote ${relative(REPO_ROOT, OUT_PATH)}`);
    console.log(`  Admin React files: ${adminReactFilesTotal}`);
    console.log(`  Files using Shade: ${adminReactFilesUsingShade} (${shadeAdoptionPct}%)`);
    console.log(`  Unique Shade components used: ${allShadeComponents.size}`);
    console.log(`  admin-x-DS components still in use: ${adminXDsTotal.size}`);
}

main();
