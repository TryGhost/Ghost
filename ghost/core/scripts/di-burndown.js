/**
 * DI migration ratchet: counts require-time singletons and direct requires of
 * the global choke points. Compares against the committed baseline and fails
 * if any count goes up. Run with --update after landing a migration to lower
 * the baseline.
 */

const fs = require('fs');
const path = require('path');

const CHOKE_POINTS = [
    'core/shared/config',
    'core/shared/settings-cache',
    'core/server/data/db',
    'core/server/models',
    'core/server/lib/common/events',
    'core/server/services/adapter-manager'
];

const CHOKE_POINT_PACKAGES = [
    '@tryghost/domain-events'
];

const EXEMPT_DIRS = [
    'core/shared/container',
    ...CHOKE_POINTS
];

const BASELINE_PATH = path.join(__dirname, 'di-burndown-baseline.json');

const stripExtension = filePath => filePath.replace(/\.(js|ts)$/, '');

const isExempt = (filePath) => {
    const withoutExtension = stripExtension(filePath);
    return EXEMPT_DIRS.some(dir => withoutExtension === dir || filePath.startsWith(`${dir}/`));
};

const countModuleSingletons = (files) => {
    return files.reduce((count, file) => {
        // `new Proxy` exports are container facades, not require-time state
        return count + (file.content.match(/module\.exports\s*=\s*new\s(?!Proxy\b)/g) || []).length;
    }, 0);
};

const isChokePointSpecifier = (filePath, specifier) => {
    if (CHOKE_POINT_PACKAGES.includes(specifier)) {
        return true;
    }
    if (!specifier.startsWith('.')) {
        return false;
    }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), specifier));
    return CHOKE_POINTS.some(chokePoint => resolved === chokePoint || resolved === `${chokePoint}/index`);
};

const countChokePointRequires = (files) => {
    let count = 0;
    for (const file of files) {
        if (isExempt(file.path)) {
            continue;
        }
        const specifiers = [...file.content.matchAll(/(?:require\(|from )['"]([^'"]+)['"]/g)].map(match => match[1]);
        count += specifiers.filter(specifier => isChokePointSpecifier(file.path, specifier)).length;
    }
    return count;
};

const collectFiles = (root) => {
    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (/\.(js|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
                files.push({
                    path: path.relative(path.join(__dirname, '..'), fullPath).split(path.sep).join('/'),
                    content: fs.readFileSync(fullPath, 'utf8')
                });
            }
        }
    };
    walk(root);
    return files;
};

const measure = () => {
    const files = collectFiles(path.join(__dirname, '../core'));
    return {
        moduleSingletons: countModuleSingletons(files),
        chokePointRequires: countChokePointRequires(files),
        bootLines: fs.readFileSync(path.join(__dirname, '../core/boot.js'), 'utf8').split('\n').length
    };
};

const main = () => {
    const counts = measure();

    if (process.argv.includes('--update')) {
        fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 4)}\n`);
        console.log('Baseline updated:', counts);
        return;
    }

    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    let failed = false;
    for (const [metric, value] of Object.entries(counts)) {
        const allowed = baseline[metric];
        const status = value > allowed ? 'INCREASED' : (value < allowed ? 'improved — run with --update' : 'ok');
        console.log(`${metric}: ${value} (baseline ${allowed}) ${status}`);
        if (value > allowed) {
            failed = true;
        }
    }
    if (failed) {
        console.error('DI burn-down counts increased — new code must take dependencies via the container instead');
        process.exit(1);
    }
};

module.exports = {countModuleSingletons, countChokePointRequires, measure};

if (require.main === module) {
    main();
}
