import { build } from 'vite';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const outDir = resolve(root, 'dist');
const entries = [
  { name: 'page', entry: 'src/page.tsx' },
  { name: 'editor-content', entry: 'src/editor-content.tsx' },
  { name: 'editor-settings', entry: 'src/editor-settings.tsx' },
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

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
        fileName: () => `${entry.name}.js`,
      },
      minify: true,
    },
  });
}

async function bundle(name) {
  const source = await readFile(resolve(outDir, `${name}.js`));
  return {
    bundle: `./${name}.js`,
    integrity: `sha256-${createHash('sha256').update(source).digest('base64')}`,
  };
}

const content = await bundle('editor-content');
const settings = await bundle('editor-settings');

const page = await bundle('page');
const version = createHash('sha256')
  .update(JSON.stringify({ content, settings, page }))
  .digest('hex')
  .slice(0, 12);
const manifest = {
  name: 'Podcasts',
  handle: 'podcast',
  version: `0.3.0-${version}`,
  api_version: '2026-01',
  publisher: 'Ghost',
  description: 'Podcast episodes in ordinary posts, with audio and video feeds.',
  backend: 'http://localhost:4655',
  sidebar: { label: 'Podcasts', icon: 'podcast', route: '/' },
  targeting: [{ target: 'admin.page.render', ...page }],
  editor: {
    blocks: [
      {
        name: 'episode',
        label: 'Podcast episode',
        icon: 'podcast',
        description: 'Add an episode to a podcast show',
        keywords: ['audio', 'video', 'show'],
        initialProperties: { version: 1 },
        hydrate: true,
        resourcePolicy: { images: ['https:'], media: ['https:', 'http:'] },
      },
    ],
    content,
    settings,
  },
};
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Built podcast card and show settings.');
