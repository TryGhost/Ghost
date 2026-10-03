import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { SiteCanvasDriver } from './site-canvas-driver';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';
import { withThemeRevision } from '@/builder/workspaces/theme/theme-state';
import type { ThemeRendererInitialization } from '@/builder/workspaces/theme/preview/preview-bridge';

const renderer = vi.hoisted(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  render: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('@/builder/workspaces/theme/preview/preview-bridge', () => ({
  createThemeRendererClient: () => renderer,
}));

async function loadDraft() {
  const signal = new AbortController().signal;
  const archive = await new JSZip()
    .file('casper/package.json', JSON.stringify({ name: 'casper', version: '1.0.0' }))
    .file('casper/index.hbs', '<h1>Home</h1>')
    .file('casper/post.hbs', '<h1>Post</h1>')
    .generateAsync({ type: 'arraybuffer' });
  return loadThemeDraft(
    {
      archive,
      theme: { name: 'casper', builtIn: true },
      settings: [],
      customSettings: [
        { id: 'show', key: 'show_author', type: 'boolean', value: false, default: false },
        {
          id: 'label',
          key: 'author_label',
          type: 'text',
          value: 'Stored author label',
          default: 'Author',
          visibility: 'show_author:true',
        },
      ],
      site: { url: 'https://example.com/', contentApiKey: 'public-key', liveHtml: '<html></html>' },
    },
    signal,
  );
}

it('reports successful publication separately from a failed preview refresh', async () => {
  const signal = new AbortController().signal;
  const draft = await loadDraft();
  let published = false;
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({
      url,
      status: published && url.endsWith('/post/') ? 500 : 200,
      html: '<h1>Rendered</h1>',
      diagnostics: [],
    }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', post: 'https://example.com/post/' },
    publish: async (candidate) => {
      published = true;
      const copy = await withThemeRevision({
        ...candidate,
        theme: { ...candidate.theme, name: 'casper-edited', builtIn: false },
      });
      return { ok: true, revision: copy.revision, draft: copy };
    },
  });
  try {
    await driver.start();
    const result = await driver.publish(signal);
    expect(result).toMatchObject({
      ok: true,
      revision: driver.workspace.draft.revision,
    });
    expect(result.previewWarning).toContain('published');
    expect(driver.workspace.draft.theme.name).toBe('casper-edited');
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('masks hidden stored custom values on initial render and subsequent theme edits', async () => {
  const draft = await loadDraft();
  const settings: Array<ThemeRendererInitialization['customThemeSettings']> = [];
  renderer.initialize.mockImplementation((input: ThemeRendererInitialization) => {
    settings.push(input.customThemeSettings);
    return Promise.resolve();
  });
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    expect(settings.at(-1)).toEqual({ show_author: false, author_label: null });
    const initial = await driver.render();
    const marker = Object.keys(initial.inlineTextTargets).find((key) =>
      key.startsWith('index.hbs:'),
    )!;
    const edited = await driver.render({
      marker,
      tagName: 'h1',
      newText: 'Edited Home',
      expectedRevision: initial.revision,
    });
    expect(settings.at(-1)).toEqual({ show_author: false, author_label: null });
    const shown = await driver.applyThemePatch({
      expectedRevision: edited.revision,
      expectedDataGeneration: 0,
      settings: { 'theme.show_author': true },
    });
    expect(settings.at(-1)).toEqual({ show_author: true, author_label: 'Stored author label' });
    await driver.applyThemePatch({
      expectedRevision: shown.revision,
      expectedDataGeneration: 0,
      settings: { 'theme.show_author': false },
    });
    expect(settings.at(-1)).toEqual({ show_author: false, author_label: null });
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});
