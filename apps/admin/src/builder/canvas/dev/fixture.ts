// Recorded API responses plus the complete, version-matched Core theme fixtures.
import instance from '../../../../../../packages/theme-renderer/test/browser/fixtures/instance.json';
import responses from '../../../../../../packages/theme-renderer/test/browser/fixtures/content-api.json';

export type ThemeFixtureId = 'casper' | 'source';
const root = '../../../../../../ghost/core/test/utils/fixtures/themes/';
const files = import.meta.glob<string>(
  '../../../../../../ghost/core/test/utils/fixtures/themes/{casper,source}/**/*.{hbs,json}',
  { eager: true, query: '?raw', import: 'default' },
);
function themeFixture(id: ThemeFixtureId, label: string) {
  const prefix = `${root}${id}/`;
  const theme = Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, content]) => [path.slice(prefix.length), content]),
  );
  const version = (JSON.parse(theme['package.json']) as { version: string }).version;
  return { id, label, version, revision: `${id}-${version}-recorded-content`, theme };
}
const fixtures = {
  casper: themeFixture('casper', 'Casper'),
  source: themeFixture('source', 'Source'),
};
export function getThemeFixture(id: ThemeFixtureId) {
  if (id !== 'casper' && id !== 'source') {
    throw new Error('Unknown canvas theme fixture.');
  }
  return fixtures[id];
}
const textAssets = import.meta.glob<string>(
  '../../../../../../ghost/core/test/utils/fixtures/themes/{casper,source}/assets/**/*.{css,js,svg}',
  { eager: true, query: '?raw', import: 'default' },
);
const binaryAssets = import.meta.glob<string>(
  '../../../../../../ghost/core/test/utils/fixtures/themes/{casper,source}/assets/**/*.{png,gif,woff2}',
  { eager: true, query: '?url', import: 'default' },
);

export async function loadAssets(id: ThemeFixtureId = 'casper') {
  getThemeFixture(id);
  const prefix = `${root}${id}/`;
  const assets: Record<string, { content: string | null; binary: Uint8Array | null }> =
    Object.fromEntries(
      Object.entries(textAssets)
        .filter(([path]) => path.startsWith(prefix))
        .map(([path, content]) => [path.slice(prefix.length), { content, binary: null }]),
    );
  for (const [path, url] of Object.entries(binaryAssets).filter(([assetPath]) =>
    assetPath.startsWith(prefix),
  )) {
    // eslint-disable-next-line no-restricted-syntax -- These are local Vite fixture assets, not Admin API requests.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load the ${id} fixture asset ${path}`);
    }
    assets[path.slice(prefix.length)] = {
      content: null,
      binary: new Uint8Array(await response.arrayBuffer()),
    };
  }
  return assets;
}

export { instance, responses };
