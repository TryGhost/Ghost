#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {basename, dirname, relative, resolve} from 'node:path';
import {brotliCompressSync, constants, gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const defaultOutDir = resolve(repoRoot, 'apps/superportal/dist/bundle-visualizer');

const args = process.argv.slice(2);
const shouldBuild = args.includes('--build');
const outDirArg = args.indexOf('--out-dir');
const outDir = outDirArg === -1 ? defaultOutDir : resolve(process.cwd(), args[outDirArg + 1]);
const visualizerTheme = 'superhero';

const replacedLegacyApps = [
    {id: 'portal', label: 'Portal', path: 'apps/portal/umd/portal.min.js'},
    {id: 'sodo-search', label: 'Sodo Search', path: 'apps/sodo-search/umd/sodo-search.min.js'},
    {id: 'announcement-bar', label: 'Announcement Bar', path: 'apps/announcement-bar/umd/announcement-bar.min.js'}
];

const contextApps = [
    {id: 'comments-ui', label: 'Comments UI', path: 'apps/comments-ui/umd/comments-ui.min.js', note: 'Loaded by {{comments}}, not Super Portal'},
    {id: 'admin-toolbar', label: 'Admin Toolbar', path: 'apps/admin-toolbar/umd/admin-toolbar.min.js', note: 'Staff-only frontend tooling'}
];

const signupEmbedComparison = {
    legacy: {id: 'signup-form', label: 'Legacy Signup Form Embed', path: 'apps/signup-form/umd/signup-form.min.js'},
    superportal: {id: 'superportal-signup-form', label: 'Super Portal Signup Embed', path: 'apps/superportal/dist/embed/signup-form.min.js'}
};

const buildTargets = [
    {filter: '@tryghost/portal'},
    {filter: '@tryghost/sodo-search'},
    {filter: '@tryghost/announcement-bar'},
    {filter: '@tryghost/signup-form'},
    {filter: '@tryghost/comments-ui'},
    {filter: '@tryghost/admin-toolbar'},
    {filter: '@tryghost/superportal'},
    {filter: '@tryghost/superportal', env: {SP_TARGET: 'embed'}}
];

function runBuilds() {
    for (const target of buildTargets) {
        execFileSync('pnpm', ['--filter', target.filter, 'build'], {
            cwd: repoRoot,
            env: {...process.env, ...target.env},
            stdio: 'inherit'
        });
    }
}

function rel(file) {
    return relative(repoRoot, file);
}

function formatKb(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    return `${(bytes / 1024).toFixed(1)} kB`;
}

function measure(file) {
    const absolute = resolve(repoRoot, file);
    if (!existsSync(absolute)) {
        return null;
    }

    const buffer = readFileSync(absolute);
    return {
        path: rel(absolute),
        name: basename(absolute),
        raw: buffer.length,
        gzip: gzipSync(buffer, {level: 9}).length,
        brotli: brotliCompressSync(buffer, {
            params: {
                [constants.BROTLI_PARAM_QUALITY]: 11
            }
        }).length
    };
}

function measureBuffer(buffer) {
    return {
        raw: buffer.length,
        gzip: gzipSync(buffer, {level: 9}).length,
        brotli: brotliCompressSync(buffer, {
            params: {
                [constants.BROTLI_PARAM_QUALITY]: 11
            }
        }).length
    };
}

function measureFileList(files) {
    return {
        files: files.length,
        ...measureBuffer(Buffer.concat(files.map(file => readFileSync(file))))
    };
}

function sum(items) {
    return items.reduce((total, item) => ({
        raw: total.raw + item.raw,
        gzip: total.gzip + item.gzip,
        brotli: total.brotli + item.brotli
    }), {raw: 0, gzip: 0, brotli: 0});
}

function walkFiles(dir, predicate) {
    if (!existsSync(dir)) {
        return [];
    }

    const files = [];
    for (const entry of readdirSync(dir)) {
        const absolute = resolve(dir, entry);
        const stat = statSync(absolute);
        if (stat.isDirectory()) {
            files.push(...walkFiles(absolute, predicate));
        } else if (predicate(absolute)) {
            files.push(absolute);
        }
    }
    return files.sort();
}

function walkJsFiles(dir) {
    return walkFiles(dir, file => file.endsWith('.js'));
}

function readStaticImports(file) {
    const source = readFileSync(file, 'utf8');
    const imports = new Set();
    const fromImportPattern = /\b(?:import|export)\s*[^;]*?\s*from\s*["']([^"']+\.js)["']/g;
    const sideEffectImportPattern = /\bimport\s*["']([^"']+\.js)["']/g;

    for (const pattern of [fromImportPattern, sideEffectImportPattern]) {
        let match;
        while ((match = pattern.exec(source)) !== null) {
            const specifier = match[1];
            if (specifier.startsWith('.')) {
                imports.add(resolve(dirname(file), specifier));
            }
        }
    }

    return [...imports];
}

function readEntryChunkReferences(file) {
    const source = readFileSync(file, 'utf8');
    const imports = new Set();
    const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+\.js)["']\s*\)/g;
    const assetUrlPattern = /\bnew\s+URL\s*\(\s*["']([^"']+\.js)["']/g;

    for (const pattern of [dynamicImportPattern, assetUrlPattern]) {
        let match;
        while ((match = pattern.exec(source)) !== null) {
            const specifier = match[1];
            if (specifier.startsWith('.')) {
                imports.add(resolve(dirname(file), specifier));
            }
        }
    }

    return [...imports];
}

function getStaticImportClosure(entryFile) {
    const seen = new Set();
    const pending = [entryFile, ...readEntryChunkReferences(entryFile)];

    while (pending.length > 0) {
        const file = pending.pop();
        if (!file || seen.has(file) || !existsSync(file)) {
            continue;
        }
        seen.add(file);
        pending.push(...readStaticImports(file));
    }

    return seen;
}

function classifySuperportalFile(file, bootFiles) {
    const name = basename(file);
    const lowerName = name.toLowerCase();
    if (name === 'portal.min.js') {
        return {group: 'boot', label: 'entry'};
    }
    if (bootFiles.has(file)) {
        return {group: 'boot', label: 'boot dependency'};
    }
    if (lowerName.includes('sentry')) {
        return {group: 'sentry', label: 'Sentry'};
    }
    if (name.startsWith('feature-')) {
        return {group: 'lazy feature', label: name.replace(/-[A-Za-z0-9_-]+\.js$/, '')};
    }
    if (name.startsWith('shared-') || name.startsWith('shell-')) {
        return {group: 'shared lazy', label: name.replace(/-[A-Za-z0-9_-]+\.js$/, '')};
    }
    return {group: 'other', label: 'other'};
}

function collectLegacyApps(apps) {
    return apps.map(app => {
        const size = measure(app.path);
        return {
            ...app,
            missing: !size,
            ...size
        };
    });
}

function collectSuperportal() {
    const distDir = resolve(repoRoot, 'apps/superportal/dist/portal');
    const entryFile = resolve(distDir, 'portal.min.js');
    const bootFiles = getStaticImportClosure(entryFile);
    const files = walkJsFiles(distDir).map(file => {
        const size = measure(rel(file));
        const classification = classifySuperportalFile(file, bootFiles);
        return {
            id: rel(file),
            path: rel(file),
            name: basename(file),
            boot: bootFiles.has(file),
            ...classification,
            ...size
        };
    });

    const boot = files.filter(file => file.boot);
    const lazy = files.filter(file => !file.boot);
    const features = files.filter(file => file.group === 'lazy feature');
    const sentry = files.filter(file => file.group === 'sentry');

    return {
        files,
        boot,
        lazy,
        features,
        sentry,
        totals: {
            all: sum(files),
            boot: sum(boot),
            lazy: sum(lazy),
            features: sum(features),
            sentry: sum(sentry)
        }
    };
}

function collectSignupEmbedComparison() {
    const legacySize = measure(signupEmbedComparison.legacy.path);
    const superportalSize = measure(signupEmbedComparison.superportal.path);

    return {
        label: 'Signup form embed replacement',
        legacy: {
            ...signupEmbedComparison.legacy,
            missing: !legacySize,
            ...legacySize
        },
        superportal: {
            ...signupEmbedComparison.superportal,
            missing: !superportalSize,
            ...superportalSize
        }
    };
}

function collectI18nComparison() {
    const legacyLocaleDir = resolve(repoRoot, 'ghost/i18n/locales');
    const superportalLocaleDir = resolve(repoRoot, 'apps/superportal/dist/portal/locales');
    const legacyPortalLocaleFiles = walkFiles(legacyLocaleDir, file => basename(file) === 'portal.json');
    const superportalLocaleFiles = walkFiles(superportalLocaleDir, file => file.endsWith('.json'));
    const superportalLocales = superportalLocaleFiles.map(file => ({
        id: `locale-${basename(file, '.json')}`,
        label: basename(file, '.json'),
        locale: basename(file, '.json'),
        ...measure(rel(file))
    }));
    const nonEnglishLocales = superportalLocales.filter(locale => locale.locale !== 'en');
    const activeLocale = superportalLocales.find(locale => locale.locale === 'fr') || nonEnglishLocales[0] || superportalLocales[0];
    const defaultLocale = superportalLocales.find(locale => locale.locale === 'en') || superportalLocales[0];
    const largestLocale = [...superportalLocales].sort((a, b) => b.gzip - a.gzip)[0];

    return {
        label: 'Translation delivery',
        legacy: {
            id: 'legacy-portal-locales',
            label: 'Legacy Portal locale resources',
            path: 'ghost/i18n/locales/*/portal.json',
            note: 'Portal builds every supported portal locale into portal.min.js',
            ...measureFileList(legacyPortalLocaleFiles)
        },
        superportal: {
            allEmitted: {
                id: 'superportal-all-locales',
                label: 'Super Portal emitted locale assets',
                path: 'apps/superportal/dist/portal/locales/*.json',
                note: 'Available on disk/CDN, not all downloaded on page load',
                ...measureFileList(superportalLocaleFiles)
            },
            activeLocale,
            defaultLocale,
            largestLocale,
            locales: superportalLocales
        }
    };
}

function buildReport() {
    const legacy = collectLegacyApps(replacedLegacyApps);
    const context = collectLegacyApps(contextApps);
    const superportal = collectSuperportal();
    const signupEmbed = collectSignupEmbedComparison();
    const i18n = collectI18nComparison();
    const legacyPresent = legacy.filter(item => !item.missing);
    const contextPresent = context.filter(item => !item.missing);

    return {
        createdAt: new Date().toISOString(),
        generatedBy: 'apps/superportal/scripts/visualize-bundles.mjs',
        metrics: ['gzip', 'brotli', 'raw'],
        comparison: {
            legacyReplaced: {
                label: 'Legacy replaced by Super Portal',
                apps: legacy,
                totals: sum(legacyPresent)
            },
            superportal: {
                label: 'Super Portal',
                ...superportal
            },
            i18n,
            signupEmbed,
            context: {
                label: 'Related apps not replaced',
                apps: context,
                totals: sum(contextPresent)
            }
        }
    };
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function jsonForScript(value) {
    return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function renderStyles() {
    return scopeSuperheroStyles(renderSuperheroStyles());
}

function scopeSuperheroStyles(css) {
    return css
        .replace(':root {', 'body.theme-superhero {')
        .replace(/^body \{/gm, 'body.theme-superhero {')
        .replace(/^body::before \{/gm, 'body.theme-superhero::before {')
        .replace(/^main \{/gm, 'body.theme-superhero main {')
        .replace(/^header \{/gm, 'body.theme-superhero header {')
        .replace(/^header::before \{/gm, 'body.theme-superhero header::before {')
        .replace(/^header > \* \{/gm, 'body.theme-superhero header > * {')
        .replace(/^h1 \{/gm, 'body.theme-superhero h1 {')
        .replace(/^h2 \{/gm, 'body.theme-superhero h2 {')
        .replace(/^p \{/gm, 'body.theme-superhero p {')
        .replace(/^\.note \{/gm, 'body.theme-superhero .note {')
        .replace(/^\.controls \{/gm, 'body.theme-superhero .controls {')
        .replace(/^\.controls button \{/gm, 'body.theme-superhero .controls button {')
        .replace(/^\.controls button\.active \{/gm, 'body.theme-superhero .controls button.active {')
        .replace(/^\.header-actions \{/gm, 'body.theme-superhero .header-actions {')
        .replace(/^\.theme-toggle \{/gm, 'body.theme-superhero .theme-toggle {')
        .replace(/^\.theme-toggle::before \{/gm, 'body.theme-superhero .theme-toggle::before {')
        .replace(/^\.theme-toggle:hover \{/gm, 'body.theme-superhero .theme-toggle:hover {')
        .replace(/^\.theme-toggle:active \{/gm, 'body.theme-superhero .theme-toggle:active {')
        .replace(/^\.comic-callout \{/gm, 'body.theme-superhero .comic-callout {')
        .replace(/^\.comic-callout svg \{/gm, 'body.theme-superhero .comic-callout svg {')
        .replace(/^\.comic-callout span \{/gm, 'body.theme-superhero .comic-callout span {')
        .replace(/^\.comic-callout--left \{/gm, 'body.theme-superhero .comic-callout--left {')
        .replace(/^\.comic-callout--right \{/gm, 'body.theme-superhero .comic-callout--right {')
        .replace(/^\.comic-callout--bottom \{/gm, 'body.theme-superhero .comic-callout--bottom {')
        .replace(/^\.comic-callout--lower-right \{/gm, 'body.theme-superhero .comic-callout--lower-right {')
        .replace(/^\.grid \{/gm, 'body.theme-superhero .grid {')
        .replace(/^\.card, section \{/gm, 'body.theme-superhero .card, body.theme-superhero section {')
        .replace(/^\.card \{/gm, 'body.theme-superhero .card {')
        .replace(/^\.card::before \{/gm, 'body.theme-superhero .card::before {')
        .replace(/^\.card \.label \{/gm, 'body.theme-superhero .card .label {')
        .replace(/^\.card \.value \{/gm, 'body.theme-superhero .card .value {')
        .replace(/^\.card \.sub \{/gm, 'body.theme-superhero .card .sub {')
        .replace(/^section \{/gm, 'body.theme-superhero section {')
        .replace(/^\.bar-list \{/gm, 'body.theme-superhero .bar-list {')
        .replace(/^\.bar-row \{/gm, 'body.theme-superhero .bar-row {')
        .replace(/^\.name \{/gm, 'body.theme-superhero .name {')
        .replace(/^\.path \{/gm, 'body.theme-superhero .path {')
        .replace(/^\.track \{/gm, 'body.theme-superhero .track {')
        .replace(/^\.fill \{/gm, 'body.theme-superhero .fill {')
        .replace(/^\.size \{/gm, 'body.theme-superhero .size {')
        .replace(/^table \{/gm, 'body.theme-superhero table {')
        .replace(/^th, td \{/gm, 'body.theme-superhero th, body.theme-superhero td {')
        .replace(/^th \{/gm, 'body.theme-superhero th {')
        .replace(/^td\.num \{/gm, 'body.theme-superhero td.num {')
        .replace(/^\.pill \{/gm, 'body.theme-superhero .pill {')
        .replace(/^\.stacked \{/gm, 'body.theme-superhero .stacked {')
        .replace(/^\.stacked span \{/gm, 'body.theme-superhero .stacked span {')
        .replace(/^\.legend \{/gm, 'body.theme-superhero .legend {')
        .replace(/^\.legend i \{/gm, 'body.theme-superhero .legend i {')
        .replace(/@media \(max-width: 820px\) \{\n    header \{ align-items: flex-start; flex-direction: column; \}\n    h1 \{ font-size: 28px; \}\n    \.grid \{ grid-template-columns: 1fr; \}\n    \.bar-row \{ grid-template-columns: 1fr; gap: 5px; \}\n    \.size \{ text-align: left; \}\n\}/, `@media (max-width: 820px) {
    body.theme-superhero header { align-items: flex-start; flex-direction: column; }
    body.theme-superhero h1 { font-size: 28px; }
    body.theme-superhero .comic-callout { display: none; }
    body.theme-superhero .grid { grid-template-columns: 1fr; }
    body.theme-superhero .bar-row { grid-template-columns: 1fr; gap: 5px; }
    body.theme-superhero .size { text-align: left; }
}`);
}

function renderClassicStyles() {
    return `:root {
    color-scheme: light;
    --bg: #f6f8fb;
    --panel: #fff;
    --ink: #111827;
    --muted: #64748b;
    --line: #d9e1ea;
    --legacy: #d84f39;
    --super: #1f8f75;
    --boot: #2364aa;
    --lazy: #8a63d2;
    --sentry: #6f3a9d;
    --context: #7c8795;
}
* { box-sizing: border-box; }
body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
main {
    width: min(1180px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 32px 0 48px;
}
header {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
}
h1 {
    margin: 0 0 6px;
    font-size: 30px;
    line-height: 1.1;
}
h2 {
    margin: 0 0 14px;
    font-size: 18px;
}
p {
    margin: 0;
    color: var(--muted);
}
.note {
    margin: -4px 0 14px;
    max-width: 760px;
}
.controls {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
}
.controls button {
    border: 0;
    border-radius: 5px;
    padding: 7px 11px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    cursor: pointer;
}
.controls button.active {
    background: #111827;
    color: white;
}
.header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
}
.theme-toggle {
    position: relative;
    overflow: hidden;
    border: 2px solid #172033;
    border-radius: 999px;
    padding: 10px 16px 10px 38px;
    background:
        linear-gradient(115deg, rgba(255, 255, 255, 0.72) 0 24%, transparent 24% 100%),
        linear-gradient(135deg, #f8c301 0%, #ffef8f 45%, #e3372f 100%);
    color: #172033;
    font: inherit;
    font-weight: 900;
    box-shadow: 4px 4px 0 #172033;
    cursor: pointer;
}
.theme-toggle::before {
    content: "";
    position: absolute;
    left: 14px;
    top: 50%;
    width: 12px;
    height: 18px;
    background: #172033;
    clip-path: polygon(45% 0, 100% 0, 62% 42%, 100% 42%, 28% 100%, 42% 55%, 0 55%);
    transform: translateY(-50%);
}
.theme-toggle:hover {
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0 #172033;
}
.theme-toggle:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0 #172033;
}
.comic-callout {
    display: none;
}
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
}
.card, section {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.card {
    padding: 16px;
}
.card .label {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
}
.card .value {
    margin-top: 6px;
    font-size: 28px;
    font-weight: 700;
}
.card .sub {
    margin-top: 4px;
    color: var(--muted);
    font-size: 13px;
}
section {
    padding: 18px;
    margin-top: 18px;
}
.bar-list {
    display: grid;
    gap: 9px;
}
.bar-row {
    display: grid;
    grid-template-columns: minmax(180px, 280px) 1fr 86px;
    align-items: center;
    gap: 12px;
}
.name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.path {
    display: block;
    color: var(--muted);
    font-size: 12px;
}
.track {
    height: 18px;
    overflow: hidden;
    border-radius: 999px;
    background: #eef2f7;
}
.fill {
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
}
.legacy { background: var(--legacy); }
.super { background: var(--super); }
.boot { background: var(--boot); }
.lazy { background: var(--lazy); }
.sentry { background: var(--sentry); }
.context { background: var(--context); }
.size {
    text-align: right;
    color: #334155;
    font-variant-numeric: tabular-nums;
}
table {
    width: 100%;
    border-collapse: collapse;
}
th, td {
    padding: 9px 8px;
    border-bottom: 1px solid var(--line);
    text-align: left;
}
th {
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}
td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 2px 8px;
    background: #eef2f7;
    color: #334155;
    font-size: 12px;
}
.stacked {
    display: flex;
    overflow: hidden;
    height: 30px;
    border-radius: 8px;
    background: #eef2f7;
}
.stacked span {
    display: block;
    min-width: 1px;
}
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 10px;
    color: var(--muted);
    font-size: 12px;
}
.legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 5px;
    border-radius: 2px;
}
@media (max-width: 820px) {
    header { align-items: flex-start; flex-direction: column; }
    .grid { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 1fr; gap: 5px; }
    .size { text-align: left; }
}`;
}

function renderSuperheroStyles() {
    return `:root {
    color-scheme: light;
    --bg: #fff4cf;
    --panel: #fffef7;
    --ink: #111827;
    --muted: #475569;
    --line: #172033;
    --legacy: #e3372f;
    --super: #0f9f7a;
    --boot: #1f62d0;
    --lazy: #8b5cf6;
    --sentry: #b91c8d;
    --context: #64748b;
    --spark: #f8c301;
    --sky: #1d4ed8;
}
* { box-sizing: border-box; }
body {
    margin: 0;
    min-height: 100vh;
    background:
        linear-gradient(135deg, rgba(227, 55, 47, 0.14) 0 10%, transparent 10% 100%),
        radial-gradient(circle at 14px 14px, rgba(23, 32, 51, 0.10) 2px, transparent 2.5px),
        linear-gradient(180deg, #fff8dc 0%, #eaf3ff 100%);
    background-size: auto, 28px 28px, auto;
    color: var(--ink);
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
        linear-gradient(118deg, transparent 0 67%, rgba(227, 55, 47, 0.10) 67% 69%, transparent 69%),
        linear-gradient(118deg, transparent 0 76%, rgba(248, 195, 1, 0.22) 76% 80%, transparent 80%);
}
main {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 34px 0 54px;
}
header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
    padding: 20px;
    border: 3px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: 7px 7px 0 #172033;
}
header::before {
    content: none;
}
header > * {
    position: relative;
    z-index: 1;
}
h1 {
    margin: 0 0 6px;
    color: #172033;
    font-family: "Bangers", Impact, "Arial Black", sans-serif;
    font-size: 34px;
    font-weight: 400;
    line-height: 1.05;
    text-transform: uppercase;
}
h2 {
    display: inline-block;
    margin: 0 0 14px;
    padding: 4px 9px;
    border: 2px solid var(--line);
    border-radius: 5px;
    background: var(--spark);
    color: #172033;
    font-size: 18px;
    text-transform: uppercase;
    box-shadow: 2px 2px 0 #172033;
}
p {
    margin: 0;
    color: var(--muted);
}
.note {
    margin: 0 0 15px;
    max-width: 820px;
}
.controls {
    display: inline-flex;
    gap: 4px;
    padding: 5px;
    border: 2px solid var(--line);
    border-radius: 8px;
    background: #fff;
    box-shadow: 3px 3px 0 #172033;
}
.controls button {
    border: 0;
    border-radius: 5px;
    padding: 7px 11px;
    background: transparent;
    color: #334155;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}
.controls button.active {
    background: #172033;
    color: #fff;
}
.header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
}
.theme-toggle {
    border: 2px solid var(--line);
    border-radius: 8px;
    padding: 9px 13px;
    background: #fff;
    color: #334155;
    font: inherit;
    font-weight: 800;
    box-shadow: 2px 2px 0 #172033;
    cursor: pointer;
}
.theme-toggle::before {
    content: none;
}
.theme-toggle:hover {
    background: #f8fafc;
}
.theme-toggle:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #172033;
}
.comic-callout {
    position: fixed;
    z-index: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 190px;
    min-height: 146px;
    color: #172033;
    font-family: "Bangers", Impact, "Arial Black", sans-serif;
    font-size: 30px;
    line-height: 1;
    letter-spacing: 1px;
    text-transform: uppercase;
    pointer-events: none;
}
.comic-callout svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}
.comic-callout span {
    position: relative;
}
.comic-callout--left {
    left: max(20px, calc((100vw - 1180px) / 2 - 212px));
    top: 176px;
    transform: rotate(-8deg);
}
.comic-callout--right {
    right: max(20px, calc((100vw - 1180px) / 2 - 212px));
    top: 340px;
    transform: rotate(7deg);
}
.comic-callout--bottom {
    left: max(26px, calc((100vw - 1180px) / 2 - 202px));
    top: 650px;
    transform: rotate(5deg);
}
.comic-callout--lower-right {
    right: max(26px, calc((100vw - 1180px) / 2 - 202px));
    top: 766px;
    transform: rotate(-6deg);
}
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
}
.card, section {
    border: 3px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: 6px 6px 0 #172033;
}
.card {
    position: relative;
    overflow: hidden;
    padding: 16px;
}
.card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 5px;
    background: linear-gradient(90deg, var(--legacy), var(--spark), var(--super), var(--sky));
}
.card .label {
    color: #334155;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
}
.card .value {
    margin-top: 6px;
    color: #111827;
    font-family: "Bangers", Impact, "Arial Black", sans-serif;
    font-size: 30px;
    font-weight: 400;
    letter-spacing: 0.5px;
}
.card .sub {
    margin-top: 4px;
    color: var(--muted);
    font-size: 13px;
}
section {
    padding: 18px;
    margin-top: 20px;
}
.bar-list {
    display: grid;
    gap: 10px;
}
.bar-row {
    display: grid;
    grid-template-columns: minmax(180px, 280px) 1fr 86px;
    align-items: center;
    gap: 12px;
}
.name {
    min-width: 0;
    overflow: hidden;
    color: #172033;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.path {
    display: block;
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
}
.track {
    height: 20px;
    overflow: hidden;
    border: 2px solid var(--line);
    border-radius: 999px;
    background: #fff;
}
.fill {
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
}
.legacy { background: var(--legacy); }
.super { background: var(--super); }
.boot { background: var(--boot); }
.lazy { background: var(--lazy); }
.sentry { background: var(--sentry); }
.context { background: var(--context); }
.size {
    text-align: right;
    color: #172033;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
}
table {
    width: 100%;
    border-collapse: collapse;
}
th, td {
    padding: 10px 8px;
    border-bottom: 2px solid #d5dae4;
    text-align: left;
}
th {
    color: #334155;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
}
td.num {
    text-align: right;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
}
.pill {
    display: inline-flex;
    align-items: center;
    border: 2px solid var(--line);
    border-radius: 999px;
    padding: 1px 7px;
    background: #fff;
    color: #172033;
    font-size: 12px;
    font-weight: 800;
}
.stacked {
    display: flex;
    overflow: hidden;
    height: 32px;
    border: 3px solid var(--line);
    border-radius: 8px;
    background: #fff;
}
.stacked span {
    display: block;
    min-width: 1px;
}
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 11px;
    color: #334155;
    font-size: 12px;
    font-weight: 750;
}
.legend i {
    display: inline-block;
    width: 11px;
    height: 11px;
    margin-right: 5px;
    border: 1px solid var(--line);
    border-radius: 2px;
}
@media (max-width: 820px) {
    header { align-items: flex-start; flex-direction: column; }
    h1 { font-size: 28px; }
    .comic-callout { display: none; }
    .grid { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 1fr; gap: 5px; }
    .size { text-align: left; }
}`;
}

const comicCallouts = [
    {variant: 'left', word: 'Zap!', outer: '#f8c301', mid: '#e3372f', sparkle: '#e3372f', points: '209.5,82.3 167.7,93.6 200.7,122.5 155.7,119.2 157.6,148.7 130.1,133.7 112.3,158.3 92.8,126.9 58.5,150.5 64.3,114.9 22.8,118.7 53.4,96.7 6.8,85.8 44.7,74.3 18.7,49.8 61.5,49.9 63.2,15.1 95.4,37.4 115.1,15.4 128,41.4 157,13.6 153.5,50.8 191.7,47.9 170,75.4'},
    {variant: 'right', word: 'Pow!', outer: '#e3372f', mid: '#2364aa', sparkle: '#f8c301', points: '214.5,82.1 174.4,98.3 203.2,119.5 155.7,115.1 163.3,154.7 125.3,130.5 109.7,163.6 90.5,128.7 62.4,150.2 67.3,116.1 18.6,127 49.6,99.9 16.6,85.2 46.7,73.2 21.5,44.5 65.4,49.9 52.7,17.2 94.8,40.9 103.4,9.7 125.9,42.5 157.9,15.7 152.9,55.9 192.9,49.3 170.4,74.2'},
    {variant: 'bottom', word: 'Boom!', outer: '#7dd3fc', mid: '#8a63d2', sparkle: '#2364aa', points: '216.1,82.2 173.4,96.3 204.2,123.9 150.7,119.7 160.6,145.2 129.2,127.5 102.9,162 97.4,127.7 52.6,151.5 64.9,119.1 20.3,127.6 52.4,96.5 13.7,88.2 50.2,75.3 15.5,46.7 65.9,54.7 55.2,16.9 95.4,38.8 113.3,10.9 124.1,38.9 151.6,21.6 158.8,50.6 191.9,48.5 171.4,74.9'},
    {variant: 'lower-right', word: 'Wham!', outer: '#34d399', mid: '#f8c301', sparkle: '#e3372f', points: '204.4,82.5 175.5,94.8 206.4,120.6 149.8,116.4 162.4,148 124.4,134.9 104.5,159.4 96.1,135 57,154.4 67.4,115.5 10.6,121.8 50,99.2 -0.4,83.3 50.3,72.7 25.7,48.1 63,49.4 58.9,24.4 92.9,42 105.1,7 127.8,43.3 167.9,19.7 153.7,56.2 194.5,52.1 170.1,72.3'}
];

function renderComicCallout({variant, word, outer, mid, sparkle, points}) {
    return `<div class="comic-callout comic-callout--${variant}">
<svg viewBox="0 0 220 170" aria-hidden="true">
<defs>
<pattern id="sp-halftone-${variant}" patternUnits="userSpaceOnUse" width="9" height="9">
<circle cx="4.5" cy="4.5" r="1.7" fill="#172033"/>
</pattern>
</defs>
<circle cx="38" cy="32" r="40" fill="url(#sp-halftone-${variant})" opacity="0.3"/>
<circle cx="194" cy="62" r="44" fill="url(#sp-halftone-${variant})" opacity="0.3"/>
<circle cx="64" cy="148" r="36" fill="url(#sp-halftone-${variant})" opacity="0.3"/>
<polygon points="${points}" fill="${outer}" transform="rotate(8 110 85) translate(110 85) scale(1.18) translate(-110 -85)"/>
<polygon points="${points}" fill="${mid}" transform="rotate(-5 110 85) translate(110 85) scale(1.09) translate(-110 -85)"/>
<polygon points="${points}" fill="#fff" stroke="#172033" stroke-width="3" stroke-linejoin="miter" stroke-miterlimit="12"/>
<g fill="#fff" stroke="#172033" stroke-width="2.5">
<circle cx="60" cy="12" r="9"/><circle cx="49" cy="17" r="6"/><circle cx="71" cy="17" r="5.5"/>
<circle cx="178" cy="146" r="8"/><circle cx="168" cy="151" r="5.5"/><circle cx="188" cy="150" r="5"/>
<circle cx="18" cy="128" r="7"/><circle cx="9" cy="132" r="4.5"/><circle cx="27" cy="133" r="4.5"/>
</g>
<g fill="${sparkle}">
<path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" transform="translate(204 22)"/>
<path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" transform="translate(14 28) scale(0.75)"/>
<path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" transform="translate(120 166) scale(0.65)"/>
</g>
</svg>
<span>${word}</span>
</div>`;
}

function renderHtml(report) {
    const legacyTotal = report.comparison.legacyReplaced.totals;
    const superTotal = report.comparison.superportal.totals.all;
    const superBoot = report.comparison.superportal.totals.boot;
    const superLazy = report.comparison.superportal.totals.lazy;
    const superSentry = report.comparison.superportal.totals.sentry;
    const i18n = report.comparison.i18n;
    const i18nActiveLocale = i18n.superportal.activeLocale;
    const i18nDefaultLocale = i18n.superportal.defaultLocale;
    const i18nLargestLocale = i18n.superportal.largestLocale;
    const legacySignup = report.comparison.signupEmbed.legacy;
    const superSignup = report.comparison.signupEmbed.superportal;
    const generated = new Date(report.createdAt).toLocaleString();

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Super Portal Bundle Visualizer</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
:root {
    color-scheme: light;
    --bg: #f6f8fb;
    --panel: #fff;
    --ink: #111827;
    --muted: #64748b;
    --line: #d9e1ea;
    --legacy: #d84f39;
    --super: #1f8f75;
    --boot: #2364aa;
    --lazy: #8a63d2;
    --sentry: #6f3a9d;
    --context: #7c8795;
}
* { box-sizing: border-box; }
body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
main {
    width: min(1180px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 32px 0 48px;
}
header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
}
h1 {
    margin: 0 0 6px;
    font-size: 30px;
    line-height: 1.1;
}
h2 {
    margin: 0 0 14px;
    font-size: 18px;
}
p {
    margin: 0;
    color: var(--muted);
}
.note {
    margin: -4px 0 14px;
    max-width: 760px;
}
.controls {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
}
.controls button {
    border: 0;
    border-radius: 5px;
    padding: 7px 11px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    cursor: pointer;
}
.controls button.active {
    background: #111827;
    color: white;
}
.header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
}
.theme-toggle {
    position: relative;
    overflow: hidden;
    border: 2px solid #172033;
    border-radius: 999px;
    padding: 10px 16px 10px 38px;
    background:
        linear-gradient(115deg, rgba(255, 255, 255, 0.72) 0 24%, transparent 24% 100%),
        linear-gradient(135deg, #f8c301 0%, #ffef8f 45%, #e3372f 100%);
    color: #172033;
    font: inherit;
    font-weight: 900;
    box-shadow: 4px 4px 0 #172033;
    cursor: pointer;
}
.theme-toggle::before {
    content: "";
    position: absolute;
    left: 14px;
    top: 50%;
    width: 12px;
    height: 18px;
    background: #172033;
    clip-path: polygon(45% 0, 100% 0, 62% 42%, 100% 42%, 28% 100%, 42% 55%, 0 55%);
    transform: translateY(-50%);
}
.theme-toggle:hover {
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0 #172033;
}
.theme-toggle:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0 #172033;
}
.comic-callout {
    display: none;
}
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
}
.card, section {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.card {
    padding: 16px;
}
.card .label {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
}
.card .value {
    margin-top: 6px;
    font-size: 28px;
    font-weight: 700;
}
.card .sub {
    margin-top: 4px;
    color: var(--muted);
    font-size: 13px;
}
section {
    padding: 18px;
    margin-top: 18px;
}
.bar-list {
    display: grid;
    gap: 9px;
}
.bar-row {
    display: grid;
    grid-template-columns: minmax(180px, 280px) 1fr 86px;
    align-items: center;
    gap: 12px;
}
.name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.path {
    display: block;
    color: var(--muted);
    font-size: 12px;
}
.track {
    height: 18px;
    overflow: hidden;
    border-radius: 999px;
    background: #eef2f7;
}
.fill {
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
}
.legacy { background: var(--legacy); }
.super { background: var(--super); }
.boot { background: var(--boot); }
.lazy { background: var(--lazy); }
.sentry { background: var(--sentry); }
.context { background: var(--context); }
.size {
    text-align: right;
    color: #334155;
    font-variant-numeric: tabular-nums;
}
table {
    width: 100%;
    border-collapse: collapse;
}
th, td {
    padding: 9px 8px;
    border-bottom: 1px solid var(--line);
    text-align: left;
}
th {
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}
td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 2px 8px;
    background: #eef2f7;
    color: #334155;
    font-size: 12px;
}
.stacked {
    display: flex;
    overflow: hidden;
    height: 30px;
    border-radius: 8px;
    background: #eef2f7;
}
.stacked span {
    display: block;
    min-width: 1px;
}
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 10px;
    color: var(--muted);
    font-size: 12px;
}
.legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 5px;
    border-radius: 2px;
}
@media (max-width: 820px) {
    header { align-items: flex-start; flex-direction: column; }
    .grid { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 1fr; gap: 5px; }
    .size { text-align: left; }
}
${renderStyles()}
@media (max-width: 1440px) {
    body.theme-superhero .comic-callout { display: none; }
}
</style>
</head>
<body class="theme-${visualizerTheme}">
${comicCallouts.map(renderComicCallout).join('\n')}
<main>
    <header>
        <div>
            <h1>Super Portal Bundle Visualizer</h1>
            <p>Generated ${escapeHtml(generated)}. Shell replacement and signup embed are separate delivery paths.</p>
        </div>
        <div class="header-actions">
            <div class="controls" aria-label="Metric">
                <button type="button" data-metric="gzip" class="active">gzip</button>
                <button type="button" data-metric="brotli">brotli</button>
                <button type="button" data-metric="raw">raw</button>
            </div>
            <button type="button" class="theme-toggle" data-theme-toggle></button>
        </div>
    </header>

    <section>
        <h2>Shell Replacement Total</h2>
        <p class="note">This is the headline comparison: the legacy ghost_head apps replaced by the Super Portal shell versus all possible Super Portal shell JS. Super Portal all JS already includes boot and lazy chunks.</p>
        <div class="grid">
            <div class="card">
                <div class="label">Legacy ghost_head apps</div>
                <div class="value" data-card="legacy-shell">${formatKb(legacyTotal.gzip)}</div>
                <div class="sub">Portal + Sodo Search + Announcement Bar</div>
            </div>
            <div class="card">
                <div class="label">Super Portal shell total</div>
                <div class="value" data-card="sp-total-headline">${formatKb(superTotal.gzip)}</div>
                <div class="sub">Boot + lazy chunks, ${report.comparison.superportal.files.length} emitted JS files</div>
            </div>
        </div>
        <div id="summary-bars" class="bar-list"></div>
    </section>

    <section>
        <h2>Super Portal Shell Breakdown</h2>
        <p class="note">A page initially loads the boot files. Lazy chunks are additional chunks that load only when their features are used. The total below is boot plus lazy chunks.</p>
        <div class="grid">
            <div class="card">
                <div class="label">Initial boot</div>
                <div class="value" data-card="sp-boot">${formatKb(superBoot.gzip)}</div>
                <div class="sub">Entry plus static ESM imports</div>
            </div>
            <div class="card">
                <div class="label">Lazy chunks</div>
                <div class="value" data-card="sp-lazy">${formatKb(superLazy.gzip)}</div>
                <div class="sub">Loaded only as features are used</div>
            </div>
            <div class="card">
                <div class="label">Sentry</div>
                <div class="value" data-card="sp-sentry">${formatKb(superSentry.gzip)}</div>
                <div class="sub">SDK/runtime chunk, included in lazy</div>
            </div>
            <div class="card">
                <div class="label">All shell JS</div>
                <div class="value" data-card="sp-all">${formatKb(superTotal.gzip)}</div>
                <div class="sub">Boot + lazy chunks</div>
            </div>
        </div>
        <div id="stacked" class="stacked" aria-label="Super Portal chunks by group"></div>
        <div id="legend" class="legend"></div>
    </section>

    <section>
        <h2>Legacy Apps Replaced By Super Portal</h2>
        <div id="legacy-bars" class="bar-list"></div>
    </section>

    <section>
        <h2>Super Portal Files</h2>
        <div id="super-bars" class="bar-list"></div>
    </section>

    <section>
        <h2>Translation Delivery</h2>
        <p class="note">Legacy Portal builds every supported Portal locale into the UMD bundle; that figure is measured from the locale JSON resources included by the build target. Super Portal emits the locale catalog as separate JSON assets and fetches only the active locale before mounting features.</p>
        <div class="grid">
            <div class="card">
                <div class="label">Legacy Portal translations</div>
                <div class="value" data-card="i18n-legacy">${formatKb(i18n.legacy.gzip)}</div>
                <div class="sub">${i18n.legacy.files} portal locale files bundled into portal.min.js</div>
            </div>
            <div class="card">
                <div class="label">SP active locale</div>
                <div class="value" data-card="i18n-active">${formatKb(i18nActiveLocale.gzip)}</div>
                <div class="sub">${i18nActiveLocale.locale}.json fetched once</div>
            </div>
            <div class="card">
                <div class="label">SP default English</div>
                <div class="value" data-card="i18n-default">${formatKb(i18nDefaultLocale.gzip)}</div>
                <div class="sub">English falls back to keys, so en.json is tiny</div>
            </div>
            <div class="card">
                <div class="label">SP largest locale</div>
                <div class="value" data-card="i18n-largest">${formatKb(i18nLargestLocale.gzip)}</div>
                <div class="sub">${i18nLargestLocale.locale}.json worst single-locale fetch</div>
            </div>
        </div>
        <div id="i18n-bars" class="bar-list"></div>
    </section>

    <section>
        <h2>Signup Embed Replacement</h2>
        <p class="note">The signup embed is a separate UMD script. It is not part of the normal Super Portal shell payload unless the page separately embeds the signup-form script.</p>
        <div class="grid">
            <div class="card">
                <div class="label">Legacy signup embed</div>
                <div class="value" data-card="legacy-signup">${legacySignup.missing ? 'missing' : formatKb(legacySignup.gzip)}</div>
                <div class="sub">Standalone UMD signup-form</div>
            </div>
            <div class="card">
                <div class="label">SP signup embed</div>
                <div class="value" data-card="sp-signup">${superSignup.missing ? 'missing' : formatKb(superSignup.gzip)}</div>
                <div class="sub">Super Portal UMD embed target</div>
            </div>
        </div>
        <div id="signup-embed-bars" class="bar-list"></div>
    </section>

    <section>
        <h2>Related Apps Not Replaced</h2>
        <table>
            <thead>
                <tr><th>App</th><th>Why separate</th><th class="num">Size</th></tr>
            </thead>
            <tbody id="context-rows"></tbody>
        </table>
    </section>
</main>
<script>
const report = ${jsonForScript(report)};
let metric = 'gzip';
const defaultTheme = '${visualizerTheme}';
const themeStorageKey = 'superportal-bundle-visualizer-theme';
const themeToggle = document.querySelector('[data-theme-toggle]');

function isTheme(value) {
    return value === 'classic' || value === 'superhero';
}

function applyTheme(theme) {
    const activeTheme = isTheme(theme) ? theme : defaultTheme;
    document.body.classList.toggle('theme-superhero', activeTheme === 'superhero');
    document.body.classList.toggle('theme-classic', activeTheme === 'classic');
    if (themeToggle) {
        themeToggle.textContent = activeTheme === 'superhero' ? 'Boring mode' : 'Superhero mode';
        themeToggle.setAttribute('aria-label', activeTheme === 'superhero' ? 'Switch to boring mode' : 'Switch to superhero mode');
    }
    localStorage.setItem(themeStorageKey, activeTheme);
}

applyTheme(isTheme(localStorage.getItem(themeStorageKey)) ? localStorage.getItem(themeStorageKey) : defaultTheme);

function size(bytes) {
    if (bytes < 1024) {
        return bytes + ' B';
    }
    return (bytes / 1024).toFixed(1) + ' kB';
}

function row({name, path, bytes, max, className}) {
    const width = max > 0 ? Math.max(0.4, (bytes / max) * 100) : 0;
    return '<div class="bar-row">' +
        '<div class="name">' + name + (path ? '<span class="path">' + path + '</span>' : '') + '</div>' +
        '<div class="track"><div class="fill ' + className + '" style="width:' + width + '%"></div></div>' +
        '<div class="size">' + size(bytes) + '</div>' +
    '</div>';
}

function renderBars(target, items, className) {
    const max = Math.max(...items.map(item => item[metric]), 1);
    document.getElementById(target).innerHTML = items.map(item => row({
        name: item.label || item.name,
        path: item.path || '',
        bytes: item[metric],
        max,
        className
    })).join('');
}

function renderSummary() {
    const legacy = report.comparison.legacyReplaced.totals;
    const sp = report.comparison.superportal.totals;
    const items = [
        {label: 'Legacy replaced total', path: 'portal + sodo-search + announcement-bar', [metric]: legacy[metric]},
        {label: 'Super Portal shell total', path: 'boot + lazy chunks', [metric]: sp.all[metric]}
    ];
    const max = Math.max(...items.map(item => item[metric]), 1);
    document.getElementById('summary-bars').innerHTML = items.map((item, index) => row({
        name: item.label,
        path: item.path,
        bytes: item[metric],
        max,
        className: index === 0 ? 'legacy' : 'super'
    })).join('');
}

function renderI18n() {
    const i18n = report.comparison.i18n;
    const active = i18n.superportal.activeLocale;
    const largest = i18n.superportal.largestLocale;
    const allEmitted = i18n.superportal.allEmitted;
    const items = [
        {label: 'Legacy Portal: all locales bundled', path: i18n.legacy.files + ' portal locale files in the JS delivery path', bytes: i18n.legacy[metric], className: 'legacy'},
        {label: 'Super Portal: active locale only', path: active.path, bytes: active[metric], className: 'super'},
        {label: 'Super Portal: largest single locale', path: largest.path, bytes: largest[metric], className: 'lazy'},
        {label: 'Super Portal: all emitted locale assets', path: allEmitted.files + ' files available, not downloaded together', bytes: allEmitted[metric], className: 'context'}
    ];
    const max = Math.max(...items.map(item => item.bytes), 1);
    document.getElementById('i18n-bars').innerHTML = items.map(item => row({
        name: item.label,
        path: item.path,
        bytes: item.bytes,
        max,
        className: item.className
    })).join('');
}

function renderStacked() {
    const files = report.comparison.superportal.files;
    const groups = [
        {name: 'boot', className: 'boot', total: 0},
        {name: 'lazy feature', className: 'lazy', total: 0},
        {name: 'sentry', className: 'sentry', total: 0},
        {name: 'shared lazy', className: 'context', total: 0},
        {name: 'other', className: 'super', total: 0}
    ];
    for (const file of files) {
        const group = groups.find(item => item.name === file.group) || groups[3];
        group.total += file[metric];
    }
    const total = groups.reduce((memo, group) => memo + group.total, 0) || 1;
    document.getElementById('stacked').innerHTML = groups
        .filter(group => group.total > 0)
        .map(group => '<span class="' + group.className + '" style="width:' + ((group.total / total) * 100) + '%"></span>')
        .join('');
    document.getElementById('legend').innerHTML = groups
        .filter(group => group.total > 0)
        .map(group => '<span><i class="' + group.className + '"></i>' + group.name + ': ' + size(group.total) + '</span>')
        .join('');
}

function renderSuperFiles() {
    const files = [...report.comparison.superportal.files].sort((a, b) => b[metric] - a[metric]);
    const max = Math.max(...files.map(item => item[metric]), 1);
    document.getElementById('super-bars').innerHTML = files.map(file => row({
        name: file.name + ' <span class="pill">' + file.group + '</span>',
        path: file.path,
        bytes: file[metric],
        max,
        className: file.boot ? 'boot' : file.group === 'lazy feature' ? 'lazy' : file.group === 'sentry' ? 'sentry' : 'context'
    })).join('');
}

function renderSignupEmbed() {
    const signup = report.comparison.signupEmbed;
    const items = [signup.legacy, signup.superportal].filter(item => !item.missing);
    const max = Math.max(...items.map(item => item[metric]), 1);
    document.getElementById('signup-embed-bars').innerHTML = items.map(item => row({
        name: item.label,
        path: item.path,
        bytes: item[metric],
        max,
        className: item.id === 'signup-form' ? 'legacy' : 'super'
    })).join('');
}

function renderContext() {
    const rows = report.comparison.context.apps;
    document.getElementById('context-rows').innerHTML = rows.map(app =>
        '<tr><td>' + app.label + '<span class="path">' + app.path + '</span></td>' +
        '<td>' + app.note + '</td>' +
        '<td class="num">' + (app.missing ? 'missing' : size(app[metric])) + '</td></tr>'
    ).join('');
}

function renderCards() {
    const legacy = report.comparison.legacyReplaced.totals;
    const sp = report.comparison.superportal.totals;
    const i18n = report.comparison.i18n;
    const signup = report.comparison.signupEmbed;
    document.querySelector('[data-card="legacy-shell"]').textContent = size(legacy[metric]);
    document.querySelector('[data-card="sp-total-headline"]').textContent = size(sp.all[metric]);
    document.querySelector('[data-card="i18n-legacy"]').textContent = size(i18n.legacy[metric]);
    document.querySelector('[data-card="i18n-active"]').textContent = size(i18n.superportal.activeLocale[metric]);
    document.querySelector('[data-card="i18n-default"]').textContent = size(i18n.superportal.defaultLocale[metric]);
    document.querySelector('[data-card="i18n-largest"]').textContent = size(i18n.superportal.largestLocale[metric]);
    document.querySelector('[data-card="sp-boot"]').textContent = size(sp.boot[metric]);
    document.querySelector('[data-card="sp-lazy"]').textContent = size(sp.lazy[metric]);
    document.querySelector('[data-card="sp-sentry"]').textContent = size(sp.sentry[metric]);
    document.querySelector('[data-card="sp-all"]').textContent = size(sp.all[metric]);
    document.querySelector('[data-card="legacy-signup"]').textContent = signup.legacy.missing ? 'missing' : size(signup.legacy[metric]);
    document.querySelector('[data-card="sp-signup"]').textContent = signup.superportal.missing ? 'missing' : size(signup.superportal[metric]);
}

function render() {
    renderCards();
    renderSummary();
    renderI18n();
    renderStacked();
    renderBars('legacy-bars', report.comparison.legacyReplaced.apps.filter(item => !item.missing), 'legacy');
    renderSignupEmbed();
    renderSuperFiles();
    renderContext();
}

document.querySelectorAll('[data-metric]').forEach(button => {
    button.addEventListener('click', () => {
        metric = button.dataset.metric;
        document.querySelectorAll('[data-metric]').forEach(item => item.classList.toggle('active', item === button));
        render();
    });
});

themeToggle?.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('theme-superhero') ? 'classic' : 'superhero');
});

render();
</script>
</body>
</html>`;
}

if (args.includes('--help')) {
    console.log(`Usage: pnpm --filter @tryghost/superportal bundle:visualize [-- --build] [-- --out-dir path]

Generates:
  ${relative(repoRoot, outDir)}/index.html
  ${relative(repoRoot, outDir)}/bundle-sizes.json`);
    process.exit(0);
}

if (shouldBuild) {
    runBuilds();
}

const report = buildReport();
mkdirSync(outDir, {recursive: true});
writeFileSync(resolve(outDir, 'bundle-sizes.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(outDir, 'index.html'), renderHtml(report));

console.log(`Bundle visualizer written to ${relative(repoRoot, resolve(outDir, 'index.html'))}`);
console.log(`Legacy replaced: ${formatKb(report.comparison.legacyReplaced.totals.gzip)} gzip`);
console.log(`Super Portal boot: ${formatKb(report.comparison.superportal.totals.boot.gzip)} gzip`);
console.log(`Super Portal all JS: ${formatKb(report.comparison.superportal.totals.all.gzip)} gzip`);
if (!report.comparison.signupEmbed.legacy.missing && !report.comparison.signupEmbed.superportal.missing) {
    console.log(`Legacy signup embed: ${formatKb(report.comparison.signupEmbed.legacy.gzip)} gzip`);
    console.log(`Super Portal signup embed: ${formatKb(report.comparison.signupEmbed.superportal.gzip)} gzip`);
}
