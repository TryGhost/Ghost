#!/usr/bin/env node

/**
 * Design System Adoption — snapshot extractor.
 *
 * Scans the Ghost monorepo and writes a single JSON snapshot describing how
 * each Admin React app uses Shade vs. admin-x-design-system, plus a coarse
 * Ember legacy summary and a public-apps count. Output is consumed by the
 * Storybook page at src/docs/adoption-dashboard.stories.tsx.
 *
 * Run with: pnpm --filter @tryghost/shade run adoption:extract
 */

import {execSync} from 'node:child_process';
import {readFileSync, writeFileSync, statSync} from 'node:fs';
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
];

const PUBLIC_APPS = [
    'portal',
    'comments-ui',
    'signup-form',
    'sodo-search',
    'announcement-bar'
];

const SHADE_IMPORT_RE = /from\s+['"]@tryghost\/shade(?:\/[^'"]*)?['"]/g;
const ADMINX_DS_IMPORT_RE = /from\s+['"]@tryghost\/admin-x-design-system['"]/g;

// Pull named imports out of a single import statement. Handles multiline,
// type imports, and `As` aliases (we keep the original name).
function parseNamedImports(importSource) {
    const named = [];
    // Match `import { ... } from '...'` (greedy on braces, single-line after
    // normalizing newlines to spaces).
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

// Pull every `import ... from 'module'` block out of a file's text.
function extractImports(text, targetModuleRegex) {
    const results = [];
    // Match the full import block ending at the matching `from '...'`.
    const re = /import\s+(?:type\s+)?[^;]*?from\s+['"]([^'"]+)['"]/gs;
    let match;
    while ((match = re.exec(text)) !== null) {
        if (targetModuleRegex.test(match[1])) {
            results.push(match[0]);
        }
    }
    return results;
}

function scanApp(appName) {
    const appDir = join(REPO_ROOT, 'apps', appName, 'src');
    let files;
    try {
        statSync(appDir);
    } catch {
        return null;
    }
    files = globSync('**/*.{ts,tsx}', {
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
    const shadeComponentCounts = new Map();
    const adminXDsComponentCounts = new Map();

    for (const filePath of files) {
        const text = readFileSync(filePath, 'utf8');

        const shadeImports = extractImports(text, /^@tryghost\/shade(\/.*)?$/);
        if (shadeImports.length > 0) {
            shadeFiles += 1;
            for (const imp of shadeImports) {
                for (const name of parseNamedImports(imp)) {
                    shadeComponentCounts.set(name, (shadeComponentCounts.get(name) || 0) + 1);
                }
            }
        }

        const adminXDsImports = extractImports(text, /^@tryghost\/admin-x-design-system$/);
        if (adminXDsImports.length > 0) {
            adminXDsFiles += 1;
            for (const imp of adminXDsImports) {
                for (const name of parseNamedImports(imp)) {
                    adminXDsComponentCounts.set(name, (adminXDsComponentCounts.get(name) || 0) + 1);
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

function scanEmber() {
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

function getGitInfo() {
    try {
        const sha = execSync('git rev-parse HEAD', {cwd: REPO_ROOT}).toString().trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {cwd: REPO_ROOT}).toString().trim();
        return {sha, branch};
    } catch {
        return {sha: 'unknown', branch: 'unknown'};
    }
}

function main() {
    const apps = ADMIN_REACT_APPS.map(scanApp).filter(Boolean);

    const adminReactFilesTotal = apps.reduce((sum, a) => sum + a.files, 0);
    const adminReactFilesUsingShade = apps.reduce((sum, a) => sum + a.shadeFiles, 0);
    const shadeAdoptionPct = adminReactFilesTotal === 0
        ? 0
        : Math.round((adminReactFilesUsingShade / adminReactFilesTotal) * 1000) / 10;

    const allShadeComponents = new Set();
    let adminXDsComponentsStillUsed = 0;
    const adminXDsTotal = new Map();
    for (const app of apps) {
        for (const c of app.shadeComponents) {
            allShadeComponents.add(c.name);
        }
        for (const c of app.adminXDsComponents) {
            adminXDsTotal.set(c.name, (adminXDsTotal.get(c.name) || 0) + c.count);
        }
    }
    adminXDsComponentsStillUsed = adminXDsTotal.size;

    const aggregateShadeComponentCounts = new Map();
    for (const app of apps) {
        for (const c of app.shadeComponents) {
            aggregateShadeComponentCounts.set(c.name, (aggregateShadeComponentCounts.get(c.name) || 0) + c.count);
        }
    }

    const data = {
        snapshot: {
            generatedAt: new Date().toISOString(),
            ...getGitInfo()
        },
        summary: {
            adminReactFilesTotal,
            adminReactFilesUsingShade,
            shadeAdoptionPct,
            uniqueShadeComponentsUsed: allShadeComponents.size,
            adminXDsComponentsStillUsed
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
    console.log(`  admin-x-DS components still in use: ${adminXDsComponentsStillUsed}`);
}

main();
