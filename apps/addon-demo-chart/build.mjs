import {build} from 'vite';
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = import.meta.dirname;
const outDir = resolve(root, 'dist');
const entries = [
    {name: 'editor-content', entry: 'src/editor-content.tsx'},
    {name: 'editor-settings', entry: 'src/editor-settings.tsx'}
];

await rm(outDir, {recursive: true, force: true});
await mkdir(outDir, {recursive: true});
for (const entry of entries) {
    await build({
        root,
        configFile: false,
        logLevel: 'warn',
        define: {'process.env.NODE_ENV': JSON.stringify('production')},
        build: {
            outDir,
            emptyOutDir: false,
            lib: {entry: resolve(root, entry.entry), name: '__ghostAddonModule', formats: ['iife'], fileName: () => `${entry.name}.js`},
            minify: true
        }
    });
}

async function bundle(name) {
    const source = await readFile(resolve(outDir, `${name}.js`));
    if (source.includes('process.env.')) {
        throw new Error(`${name}.js contains an unavailable Node process reference`);
    }
    return {bundle: `./${name}.js`, integrity: `sha256-${createHash('sha256').update(source).digest('base64')}`};
}

const content = await bundle('editor-content');
const settings = await bundle('editor-settings');

const manifest = {
    name: 'Chart (demo)',
    handle: 'interactive-chart-demo',
    version: process.env.ADDON_DEMO_VERSION ?? '0.1.0-dev',
    api_version: '2026-01',
    publisher: 'Ghost Demo Co.',
    description: 'Imports local CSV data into a durable SVG chart with presentation-only hydration.',
    editor: {
        blocks: [{
            name: 'interactive-chart',
            label: 'Chart',
            description: 'Import CSV data and publish a chart',
            keywords: ['csv', 'data', 'graph', 'visualization'],
            hydrate: true,
            resourcePolicy: {images: ['https:', 'http://localhost:2368']},
            initialProperties: {
                table: {
                    columns: ['Month', 'Readers'],
                    rows: [['January', 2800], ['February', 3400], ['March', 3900], ['April', 4700], ['May', 5400]]
                },
                type: 'bar',
                labelColumn: 'Month',
                valueColumn: 'Readers',
                smooth: false,
                fallbackImageUrl: null
            }
        }],
        content,
        settings
    },
    targeting: []
};

if (!process.env.ADDON_DEMO_VERSION) {
    manifest.version = `0.1.0-dev.${createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 12)}`;
}

await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 4)}\n`);
console.log('Built chart content + settings bundles and manifest.json into dist/'); // eslint-disable-line no-console
