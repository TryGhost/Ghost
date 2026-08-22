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
        build: {
            outDir,
            emptyOutDir: false,
            lib: {
                entry: resolve(root, entry.entry),
                name: '__ghostAddonModule',
                formats: ['iife'],
                fileName: () => `${entry.name}.js`
            },
            minify: true
        }
    });
}

async function bundle(name) {
    const source = await readFile(resolve(outDir, `${name}.js`));
    return {
        bundle: `./${name}.js`,
        integrity: `sha256-${createHash('sha256').update(source).digest('base64')}`
    };
}

const content = await bundle('editor-content');
const settings = await bundle('editor-settings');

const manifest = {
    name: 'Simple Events (demo)',
    handle: 'simple-events-demo',
    version: process.env.ADDON_DEMO_VERSION ?? '0.1.0-dev',
    api_version: '2026-01',
    publisher: 'Ghost Demo Co.',
    description: 'Adds a durable event card with matching web, email, and RSS content.',
    editor: {
        blocks: [{
            name: 'event',
            label: 'Event',
            description: 'Add a static event card',
            keywords: ['calendar', 'meetup', 'conference'],
            initialProperties: {
                title: 'Independent publishing meetup',
                startsAt: '2026-10-15T16:30:00.000Z',
                location: 'Stockholm Waterfront',
                description: 'An afternoon for independent publishers.',
                url: 'https://example.com/register'
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
console.log('Built events content + settings bundles and manifest.json into dist/'); // eslint-disable-line no-console
