// Recorded API responses plus the complete, version-matched Casper fixture already in Core.
import instance from '../../../../../../packages/theme-renderer/test/browser/fixtures/instance.json';
import responses from '../../../../../../packages/theme-renderer/test/browser/fixtures/content-api.json';

const prefix = '../../../../../../ghost/core/test/utils/fixtures/themes/casper/';
const files = import.meta.glob<string>(
  '../../../../../../ghost/core/test/utils/fixtures/themes/casper/**/*.{hbs,json}',
  { eager: true, query: '?raw', import: 'default' },
);
const theme = Object.fromEntries(
  Object.entries(files).map(([path, content]) => [path.slice(prefix.length), content]),
);
const textAssets = import.meta.glob<string>(
  '../../../../../../ghost/core/test/utils/fixtures/themes/casper/assets/**/*.{css,js,svg}',
  { eager: true, query: '?raw', import: 'default' },
);
const imageAssets = import.meta.glob<string>(
  '../../../../../../ghost/core/test/utils/fixtures/themes/casper/assets/images/*.{png,gif}',
  { eager: true, query: '?url', import: 'default' },
);

export async function loadAssets() {
  const assets: Record<string, { content: string | null; binary: Uint8Array | null }> =
    Object.fromEntries(
      Object.entries(textAssets).map(([path, content]) => [
        path.slice(prefix.length),
        { content, binary: null },
      ]),
    );
  for (const [path, url] of Object.entries(imageAssets)) {
    // eslint-disable-next-line no-restricted-syntax -- These are local Vite fixture assets, not Admin API requests.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not load the Casper fixture asset ${path}`);
    }
    assets[path.slice(prefix.length)] = {
      content: null,
      binary: new Uint8Array(await response.arrayBuffer()),
    };
  }
  return assets;
}

export { instance, responses, theme };
