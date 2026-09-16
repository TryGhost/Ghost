import JSZip from 'jszip';
import { THEME_EDITOR_ARCHIVE_LIMITS } from '@tryghost/theme-renderer/editor/archive';
import { describe, expect, it } from 'vitest';

import { loadThemeDraft, visibleThemeCustomSettings } from './theme-loader';

import type { ThemeLoadInput } from './theme-loader';

async function archive(
  files: Record<string, string | Uint8Array>,
  order = Object.keys(files),
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const path of order) {
    const content = files[path];
    zip.file(path, content, {
      binary: content instanceof Uint8Array,
      date: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

function replaceBytes(buffer: ArrayBuffer, from: string, to: string): ArrayBuffer {
  if (from.length !== to.length) {
    throw new Error('Replacement paths must have equal lengths');
  }
  const bytes = new Uint8Array(buffer.slice(0));
  const source = new TextEncoder().encode(from);
  const replacement = new TextEncoder().encode(to);
  for (let offset = 0; offset <= bytes.length - source.length; offset += 1) {
    if (source.every((value, index) => bytes[offset + index] === value)) {
      bytes.set(replacement, offset);
    }
  }
  return bytes.buffer;
}

function replaceByteOccurrences(
  buffer: ArrayBuffer,
  from: string,
  to: string,
  occurrences: number[],
): ArrayBuffer {
  if (new TextEncoder().encode(from).byteLength !== new TextEncoder().encode(to).byteLength) {
    throw new Error('Replacement paths must have equal byte lengths');
  }
  const bytes = new Uint8Array(buffer.slice(0));
  const source = new TextEncoder().encode(from);
  const replacement = new TextEncoder().encode(to);
  let occurrence = 0;
  for (let offset = 0; offset <= bytes.length - source.length; offset += 1) {
    if (source.every((value, index) => bytes[offset + index] === value)) {
      occurrence += 1;
      if (occurrences.includes(occurrence)) {
        bytes.set(replacement, offset);
      }
      offset += source.length - 1;
    }
  }
  if (occurrence < Math.max(...occurrences)) {
    throw new Error(`Found only ${occurrence} path occurrences`);
  }
  return bytes.buffer;
}

function setCentralUncompressedSize(
  buffer: ArrayBuffer,
  path: string,
  byteLength: number,
): ArrayBuffer {
  const bytes = new Uint8Array(buffer.slice(0));
  const view = new DataView(bytes.buffer);
  const decoder = new TextDecoder();
  for (let offset = 0; offset <= bytes.byteLength - 46; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      continue;
    }
    const nameLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === path) {
      view.setUint32(offset + 24, byteLength, true);
      return bytes.buffer;
    }
  }
  throw new Error(`Missing central directory entry for ${path}`);
}

function input(themeArchive: ArrayBuffer): ThemeLoadInput {
  return {
    theme: { name: 'demo', builtIn: false },
    archive: themeArchive,
    settings: [
      { key: 'accent_color', value: '#15171A' },
      { key: 'heading_font', value: 'Inter' },
      { key: 'body_font', value: 'Georgia' },
      { key: 'logo', value: 'https://example.com/logo.png' },
    ],
    customSettings: [
      {
        id: 'layout',
        key: 'layout',
        type: 'select',
        value: 'Grid',
        default: 'List',
        options: ['List', 'Grid'],
      },
      { id: 'show-author', key: 'show_author', type: 'boolean', value: false, default: true },
      {
        id: 'author-label',
        key: 'author_label',
        type: 'text',
        value: 'By',
        default: 'By',
        visibility: 'show_author:true',
      },
    ],
    site: {
      url: 'https://example.com/',
      contentApiKey: '0123456789abcdef',
      liveHtml:
        '<html><head><script defer src="https://cdn.example.com/portal.js" data-i18n="true"></script><script defer src="https://cdn.example.com/search.js" data-key="0123456789abcdef" data-styles="https://cdn.example.com/search.css" data-sodo-search="true"></script><link rel="stylesheet" href="/assets/built/screen.css?v=abc123"></head></html>',
    },
    virtualUrl: 'https://example.com/about/',
    selection: { id: 'index.hbs:1:1', label: 'Main heading', data: { path: 'index.hbs' } },
  };
}

describe('loadThemeDraft', () => {
  it('loads normalized text, preserved binaries, settings, renderer config, and an initial revision', async () => {
    const themeArchive = await archive({
      'demo/package.json': JSON.stringify({ name: 'demo', version: '1.2.3' }),
      'demo/index.hbs': '<main>{{@site.title}}</main>',
      'demo/assets/screen.css': 'body { color: black; }',
      'demo/assets/logo.png': new Uint8Array([137, 80, 78, 71, 0, 255]),
    });

    const draft = await loadThemeDraft(input(themeArchive));

    expect(draft.theme).toEqual({
      name: 'demo',
      version: '1.2.3',
      builtIn: false,
      rootPrefix: 'demo/',
    });
    expect(draft.files['index.hbs']).toMatchObject({
      kind: 'text',
      content: '<main>{{@site.title}}</main>',
    });
    expect(draft.files['assets/logo.png']).toMatchObject({ kind: 'binary' });
    expect(Array.from(draft.files['assets/logo.png'].binary ?? [])).toEqual([
      137, 80, 78, 71, 0, 255,
    ]);
    expect(draft.globalSettings).toEqual({
      accent_color: '#15171A',
      heading_font: 'Inter',
      body_font: 'Georgia',
      icon: null,
      logo: 'https://example.com/logo.png',
      cover_image: null,
    });
    expect(Object.keys(visibleThemeCustomSettings(draft.customSettings))).toEqual([
      'layout',
      'show_author',
    ]);
    expect(draft.customSettings.author_label).toMatchObject({ visibility: 'show_author:true' });
    const enabledSettings = structuredClone(draft.customSettings);
    if (enabledSettings.show_author?.type === 'boolean') {
      enabledSettings.show_author.value = true;
    }
    expect(Object.keys(visibleThemeCustomSettings(enabledSettings))).toEqual([
      'layout',
      'show_author',
      'author_label',
    ]);
    expect(draft.renderer).toMatchObject({
      siteUrl: 'https://example.com/',
      contentApiKey: '0123456789abcdef',
      settingsPayload: {
        accent_color: '#15171A',
        heading_font: 'Inter',
        body_font: 'Georgia',
        logo: 'https://example.com/logo.png',
      },
      config: {
        assetHash: 'abc123',
        portal: { url: 'https://cdn.example.com/portal.js' },
        sodoSearch: {
          url: 'https://cdn.example.com/search.js',
          styles: 'https://cdn.example.com/search.css',
        },
      },
    });
    expect(draft.virtualUrl).toBe('https://example.com/about/');
    expect(draft.selection).toMatchObject({ id: 'index.hbs:1:1' });
    expect(draft.revision).toMatch(/^theme-[a-f0-9]{64}$/);
  });

  it('uses the decoded Content API settings payload for rendering', async () => {
    const source = input(
      await archive({
        'demo/package.json': JSON.stringify({ name: 'demo', version: '1.2.3' }),
        'demo/index.hbs': '<main>{{navigation}}</main>',
      }),
    );
    source.site = {
      ...source.site,
      settingsPayload: {
        title: 'Rendered site',
        navigation: [{ label: 'Home', url: '/' }],
        labs: { members: true },
      },
    };

    const draft = await loadThemeDraft(source);

    expect(draft.renderer.settingsPayload).toEqual({
      title: 'Rendered site',
      navigation: [{ label: 'Home', url: '/' }],
      labs: { members: true },
    });
  });

  it('produces the same revision regardless of archive entry order and dates', async () => {
    const files = {
      'demo/package.json': JSON.stringify({ name: 'demo', version: '1.0.0' }),
      'demo/index.hbs': '<main>Stable</main>',
      'demo/assets/logo.bin': new Uint8Array([3, 2, 1]),
    };
    const first = await loadThemeDraft(input(await archive(files)));
    const second = await loadThemeDraft(input(await archive(files, Object.keys(files).reverse())));

    expect(first.revision).toBe(second.revision);
  });

  it('rejects unsafe archive paths before extraction', async () => {
    const safe = await archive({
      'demo/package.json': JSON.stringify({ name: 'demo' }),
      'demo/xx/evil.hbs': 'unsafe',
    });
    const unsafe = replaceBytes(safe, 'demo/xx/evil.hbs', 'demo/../evil.hbs');

    await expect(loadThemeDraft(input(unsafe))).rejects.toMatchObject({ code: 'unsafe_path' });
  });

  it('rejects an unsafe common root and Windows traversal separators', async () => {
    const rooted = await archive({
      'xx/package.json': JSON.stringify({ name: 'demo' }),
      'xx/index.hbs': 'unsafe root',
    });
    const traversalRoot = replaceBytes(rooted, 'xx/', '../');
    const windowsPath = await archive({
      'demo/package.json': JSON.stringify({ name: 'demo' }),
      'demo/..\\evil.hbs': 'unsafe separator',
    });

    await expect(loadThemeDraft(input(traversalRoot))).rejects.toMatchObject({
      code: 'unsafe_path',
    });
    await expect(loadThemeDraft(input(windowsPath))).rejects.toMatchObject({ code: 'unsafe_path' });
  });

  it('rejects duplicate normalized archive paths', async () => {
    const distinct = await archive({
      'demo/package.json': JSON.stringify({ name: 'demo' }),
      'demo/a.hbs': 'first',
      'demo/b.hbs': 'second',
    });
    const duplicate = replaceBytes(distinct, 'demo/b.hbs', 'demo/a.hbs');

    await expect(loadThemeDraft(input(duplicate))).rejects.toMatchObject({
      code: 'duplicate_path',
    });
  });

  it('rejects distinct raw paths that resolve to the same Unicode path', async () => {
    const distinct = await archive({
      'demo/package.json': JSON.stringify({ name: 'demo' }),
      'demo/ä.hbs': 'first',
      'demo/ö.hbs': 'second',
    });
    const duplicate = replaceByteOccurrences(distinct, 'demo/ö.hbs', 'demo/ä.hbs', [2, 4]);

    await expect(loadThemeDraft(input(duplicate))).rejects.toMatchObject({
      code: 'duplicate_path',
    });
  });

  it('rejects unsupported text encodings', async () => {
    const themeArchive = await archive({
      'demo/package.json': JSON.stringify({ name: 'demo' }),
      'demo/index.hbs': new Uint8Array([0xc3, 0x28]),
    });

    await expect(loadThemeDraft(input(themeArchive))).rejects.toMatchObject({
      code: 'unsupported_encoding',
    });
  });

  it('maps theme editor archive limits into a stable loader error', async () => {
    const files: Record<string, string> = {
      'demo/package.json': JSON.stringify({ name: 'demo' }),
    };
    for (let index = 0; index < THEME_EDITOR_ARCHIVE_LIMITS.maxFiles; index += 1) {
      files[`demo/assets/file-${index}.txt`] = '';
    }

    await expect(loadThemeDraft(input(await archive(files)))).rejects.toMatchObject({
      code: 'archive_limit',
    });
  });

  it('bounds inflation even when a compressed entry forges a small declared size', async () => {
    const zip = new JSZip();
    zip.file('demo/package.json', JSON.stringify({ name: 'demo' }));
    zip.file(
      'demo/assets/huge.bin',
      new Uint8Array(THEME_EDITOR_ARCHIVE_LIMITS.maxExtractedBytes + 1),
      {
        binary: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 1 },
      },
    );
    const generated = await zip.generateAsync({ type: 'arraybuffer' });
    const themeArchive = setCentralUncompressedSize(generated, 'demo/assets/huge.bin', 1);

    await expect(loadThemeDraft(input(themeArchive))).rejects.toMatchObject({
      code: 'archive_limit',
    });
  }, 15_000);

  it('rejects missing or invalid theme package metadata', async () => {
    const missing = await archive({ 'demo/index.hbs': '<main></main>' });
    const invalid = await archive({
      'demo/package.json': '{bad json}',
      'demo/index.hbs': '<main></main>',
    });

    await expect(loadThemeDraft(input(missing))).rejects.toMatchObject({
      code: 'missing_metadata',
    });
    await expect(loadThemeDraft(input(invalid))).rejects.toMatchObject({
      code: 'invalid_metadata',
    });
  });
});
