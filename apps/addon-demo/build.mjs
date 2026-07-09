/**
 * Builds each targeting entry module as a self-contained IIFE bundle (the
 * format the sandbox bootstrap evaluates: a classic script assigning its
 * exports to the `__ghostAddonModule` global), then writes manifest.json
 * with sha256 integrity hashes for every bundle — the provider-declared
 * hashes the host pins at install time.
 */
import {build} from 'vite';
import {createHash} from 'node:crypto';
import {readFile, writeFile, rm, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = import.meta.dirname;
const outDir = resolve(root, 'dist');

const ENTRIES = [
    {name: 'dashboard-card', entry: 'src/dashboard-card.tsx', target: 'admin.dashboard.card.render'},
    {name: 'dashboard-card-visibility', entry: 'src/dashboard-card-visibility.ts', target: 'admin.dashboard.card.should-render'},
    {name: 'report-page', entry: 'src/report-page.tsx', target: 'admin.page.render'}
];

await rm(outDir, {recursive: true, force: true});
await mkdir(outDir, {recursive: true});

for (const {name, entry} of ENTRIES) {
    await build({
        root,
        configFile: false,
        logLevel: 'warn',
        build: {
            outDir,
            emptyOutDir: false,
            lib: {
                entry: resolve(root, entry),
                name: '__ghostAddonModule',
                formats: ['iife'],
                fileName: () => `${name}.js`
            },
            minify: true
        }
    });
}

const targeting = await Promise.all(ENTRIES.map(async ({name, target}) => {
    const source = await readFile(resolve(outDir, `${name}.js`));
    const integrity = `sha256-${createHash('sha256').update(source).digest('base64')}`;
    return {target, bundle: `./${name}.js`, integrity};
}));

const manifest = {
    name: 'SEO Assistant (demo)',
    handle: 'seo-assistant-demo',
    version: process.env.ADDON_DEMO_VERSION ?? '0.1.0',
    api_version: '2026-01',
    publisher: 'Ghost Demo Co.',
    description: 'Crawls your published posts for missing meta descriptions, feature images, and overlong titles or slugs, and tracks your SEO score over time.',
    backend: process.env.ADDON_DEMO_ORIGIN ?? 'http://localhost:4650',
    sidebar: {
        label: 'SEO Assistant',
        icon: 'sparkles',
        route: '/'
    },
    targeting
};

await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 4)}\n`);
console.log(`Built ${ENTRIES.length} bundles + manifest.json into dist/`); // eslint-disable-line no-console
