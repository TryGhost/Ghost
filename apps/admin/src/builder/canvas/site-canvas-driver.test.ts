import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { SiteCanvasDriver } from './site-canvas-driver';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';
import { withThemeRevision } from '@/builder/workspaces/theme/theme-state';
import * as themeState from '@/builder/workspaces/theme/theme-state';
import { ThemePublisher } from '@/builder/workspaces/theme/publish/publish-theme';
import type { ThemeRendererInitialization } from '@/builder/workspaces/theme/preview/preview-bridge';

const renderer = vi.hoisted(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  render: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('@/builder/workspaces/theme/preview/preview-bridge', () => ({
  createThemeRendererClient: () => renderer,
}));

async function loadDraft(themeFiles: Record<string, string> = {}) {
  const signal = new AbortController().signal;
  const zip = new JSZip()
    .file('casper/package.json', JSON.stringify({ name: 'casper', version: '1.0.0' }))
    .file('casper/index.hbs', '<h1>Home</h1>')
    .file('casper/post.hbs', '<h1>Post</h1>');
  for (const [path, content] of Object.entries(themeFiles)) {
    zip.file(`casper/${path}`, content);
  }
  const archive = await zip.generateAsync({ type: 'arraybuffer' });
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

it('validates every bound template before adopting a shared theme patch', async () => {
  const draft = await loadDraft();
  let failTag = false;
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({
      url,
      status: failTag && url.includes('/tag/') ? 500 : 200,
      html: `<h1>${url}</h1>`,
      diagnostics: [],
    }),
  );
  const routes = {
    home: 'https://example.com/',
    post: 'https://example.com/post/',
    page: 'https://example.com/about/',
    tag: 'https://example.com/tag/news/',
    author: 'https://example.com/author/jo/',
  };
  const driver = new SiteCanvasDriver({
    draft,
    routes,
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    expect(before.html.page).toContain('/about/');
    expect(before.html.tag).toContain('/tag/news/');
    expect(before.html.author).toContain('/author/jo/');
    const history = driver.readHistory();
    failTag = true;
    await expect(
      driver.applyThemePatch({
        expectedRevision: before.revision,
        expectedDataGeneration: before.dataGeneration,
        files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Candidate</h1>' }],
      }),
    ).rejects.toMatchObject({ code: 'render_invalid' });
    expect(await driver.render()).toEqual(before);
    expect(driver.readHistory()).toEqual(history);
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Home</h1>');
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('rolls back a failed Page selection and guards later selection against stale generations', async () => {
  const draft = await loadDraft();
  const first = { id: 'about', title: 'About', url: 'https://example.com/about/' };
  const second = { id: 'contact', title: 'Contact', url: 'https://example.com/contact/' };
  let fail = true;
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({
      url,
      status: fail && url === second.url ? 500 : 200,
      html: '<h1>Page</h1>',
      diagnostics: [],
    }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', page: first.url },
    content: {
      page: {
        selected: first,
        list: () => Promise.resolve({ posts: [first, second], nextPage: null }),
        read: () => Promise.resolve(second),
      },
    },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    const history = driver.readHistory();
    const selection = {
      kind: 'page' as const,
      id: second.id,
      expectedRevision: before.revision,
      expectedDataGeneration: before.dataGeneration,
    };
    await expect(driver.selectContent(selection)).rejects.toThrow('required render');
    expect(await driver.render()).toEqual(before);
    expect(driver.readHistory()).toEqual(history);
    fail = false;
    const accepted = await driver.selectContent(selection);
    expect(accepted).toMatchObject({
      revision: before.revision,
      dataGeneration: 1,
      routes: { page: second.url },
      representativeContent: { page: second },
    });
    expect(driver.readHistory()).toEqual(history);
    await expect(driver.selectContent(selection)).rejects.toMatchObject({
      code: 'change_rejected',
    });
    expect(await driver.render()).toEqual({ ...accepted, unchanged: false });
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('preflights complete Home/Post validation without adopting a draft, checkpoint or render', async () => {
  const draft = await loadDraft();
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', post: 'https://example.com/post/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    const history = driver.readHistory();
    const states: unknown[] = [];
    driver.workspace.subscribe((state) => states.push(state));
    const patch = {
      expectedRevision: before.revision,
      expectedDataGeneration: before.dataGeneration,
      files: [{ operation: 'write' as const, path: 'index.hbs', content: '<h1>Candidate</h1>' }],
    };
    const result = await driver.validateThemePatch(patch);
    expect(result).toMatchObject({
      valid: true,
      revision: before.revision,
      unchanged: false,
      validationScope: 'source-and-required-renderer-pages',
      runtimeReadiness: 'not-checked',
    });
    expect(result.candidateRevision).not.toBe(before.revision);
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Home</h1>');
    expect(driver.readHistory()).toEqual(history);
    expect(await driver.render()).toEqual(before);
    expect(states).toEqual([expect.objectContaining({ dirty: false })]);
    renderer.render.mockImplementation((url: string) =>
      Promise.resolve({
        url,
        status: url.endsWith('/post/') ? 500 : 200,
        html: '<h1>Rendered</h1>',
        diagnostics: [],
      }),
    );
    await expect(
      driver.validateThemePatch({
        ...patch,
        files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Rejected</h1>' }],
      }),
    ).rejects.toMatchObject({ code: 'render_invalid' });
    expect(await driver.render()).toEqual(before);
    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({ validation: { valid: true } });
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

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

it('keeps accepted source and render when a native caller cancels candidate rendering', async () => {
  const draft = await loadDraft();
  renderer.initialize.mockResolvedValue(undefined);
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  let release!: () => void;
  try {
    await driver.start();
    const initial = await driver.render();
    let started!: () => void;
    const rendering = new Promise<void>((resolve) => {
      started = resolve;
    });
    renderer.initialize.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          started();
        }),
    );
    const caller = new AbortController();
    const pending = driver.applyThemePatch(
      {
        expectedRevision: initial.revision,
        expectedDataGeneration: 0,
        files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Cancelled theme</h1>' }],
      },
      caller.signal,
    );
    await rendering;
    caller.abort();
    release();
    await expect(pending).rejects.toMatchObject({
      name: 'CanvasRejectedError',
      message: 'The theme change was cancelled before acceptance.',
    });
    expect(driver.workspace.draft.revision).toBe(initial.revision);
    expect((await driver.render()).revision).toBe(initial.revision);
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Home</h1>');
  } finally {
    release?.();
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('records accepted changes once and restores files/settings through required-page validation', async () => {
  const draft = await loadDraft();
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', post: 'https://example.com/post/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const initial = await driver.render();
    const first = driver.readHistory().entries[0];
    const changed = await driver.applyThemePatch({
      expectedRevision: initial.revision,
      expectedDataGeneration: 0,
      files: [
        { operation: 'write', path: 'index.hbs', content: '<h1>Changed</h1>' },
        { operation: 'write', path: 'assets/new.css', content: 'body{color:red}' },
      ],
      settings: { 'global.accent_color': '#123456' },
    });
    await driver.applyThemePatch({
      expectedRevision: changed.revision,
      expectedDataGeneration: 0,
      settings: { 'global.accent_color': '#123456' },
    });
    expect(driver.readHistory().entries).toHaveLength(2);
    expect(driver.readHistory().undoId).toBe(first.id);
    const restored = await driver.restoreHistory({
      checkpointId: first.id,
      expectedRevision: changed.revision,
      expectedDataGeneration: 0,
    });
    expect(restored.revision).toBe(initial.revision);
    expect(restored.sourceChanges).toMatchObject({
      'index.hbs': '<h1>Home</h1>',
      'assets/new.css': null,
    });
    expect(driver.workspace.draft.globalSettings.accent_color).toBe(
      draft.globalSettings.accent_color,
    );
    expect(driver.readHistory().redoId).toBeTruthy();
    await driver.restoreHistory({
      checkpointId: driver.readHistory().redoId!,
      expectedRevision: restored.revision,
      expectedDataGeneration: 0,
    });
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Changed</h1>');
    expect(driver.readHistory().entries).toHaveLength(2);
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('rejects history restoration queued behind a newer accepted change', async () => {
  const draft = await loadDraft();
  renderer.initialize.mockResolvedValue(undefined);
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  let release!: () => void;
  try {
    await driver.start();
    const first = driver.readHistory().entries[0];
    const changed = await driver.applyThemePatch({
      expectedRevision: draft.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Changed</h1>' }],
    });
    let started!: () => void;
    const rendering = new Promise<void>((resolve) => {
      started = resolve;
    });
    renderer.initialize.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          started();
        }),
    );
    const newer = driver.applyThemePatch({
      expectedRevision: changed.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Newer</h1>' }],
    });
    await rendering;
    const restoring = vi.spyOn(driver.workspace, 'restore');
    const history = driver.restoreHistory({
      checkpointId: first.id,
      expectedRevision: changed.revision,
      expectedDataGeneration: 0,
    });
    const outcome = history.then(
      () => null,
      (error) => error as unknown,
    );
    await vi.waitFor(() => expect(restoring).toHaveBeenCalledOnce());
    release();
    const accepted = await newer;
    expect(await outcome).toMatchObject({
      name: 'CanvasRejectedError',
      details: { diagnostics: [{ code: 'stale_revision' }] },
    });
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Newer</h1>');
    expect((await driver.render()).revision).toBe(accepted.revision);
    expect(driver.readHistory().entries.find((entry) => entry.current)?.revision).toBe(
      accepted.revision,
    );
  } finally {
    release?.();
    driver.dispose();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  }
});

it('rejects failed Post restoration and stale history writes without moving accepted history', async () => {
  const draft = await loadDraft();
  let fail = false;
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({
      url,
      status: fail && url.endsWith('/post/') ? 500 : 200,
      html: '<h1>Rendered</h1>',
      diagnostics: [],
    }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', post: 'https://example.com/post/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const initial = await driver.render();
    const first = driver.readHistory().entries[0];
    const current = await driver.applyThemePatch({
      expectedRevision: initial.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Accepted</h1>' }],
    });
    const before = driver.readHistory();
    const validity: Array<boolean | null> = [];
    driver.workspace.subscribe((state) => validity.push(state.validation?.valid ?? null));
    await expect(
      driver.restoreHistory({
        checkpointId: first.id,
        expectedRevision: initial.revision,
        expectedDataGeneration: 0,
      }),
    ).rejects.toMatchObject({ name: 'CanvasRejectedError' });
    fail = true;
    await expect(
      driver.restoreHistory({
        checkpointId: first.id,
        expectedRevision: current.revision,
        expectedDataGeneration: 0,
      }),
    ).rejects.toMatchObject({ name: 'CanvasRejectedError' });
    expect((await driver.render()).revision).toBe(current.revision);
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Accepted</h1>');
    expect(driver.readHistory()).toEqual(before);
    expect(validity.at(-1)).toBe(true);
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('keeps a published copy identity when undoing earlier theme content', async () => {
  const draft = await loadDraft();
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const publisher = new ThemePublisher({
    baseline: draft,
    transport: {
      upload: vi.fn().mockResolvedValue(undefined),
      activate: vi.fn().mockResolvedValue(undefined),
      updateGlobalSettings: vi.fn().mockResolvedValue(undefined),
      updateCustomSettings: vi.fn().mockResolvedValue(undefined),
    },
  });
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    publish: (candidate, signal) =>
      publisher.publish(candidate, { copyName: 'casper-edited' }, signal),
  });
  try {
    await driver.start();
    const initial = await driver.render();
    const first = driver.readHistory().entries[0];
    await driver.applyThemePatch({
      expectedRevision: initial.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Published edit</h1>' }],
    });
    const published = await driver.publish(new AbortController().signal);
    expect(published.ok).toBe(true);
    const dirty: boolean[] = [];
    driver.workspace.subscribe((state) => dirty.push(state.dirty));
    const sameSource = await driver.restoreHistory({
      checkpointId: driver.readHistory().undoId!,
      expectedRevision: driver.workspace.draft.revision,
      expectedDataGeneration: 0,
    });
    expect(sameSource).toMatchObject({ unchanged: true, revision: published.revision });
    expect(dirty.at(-1)).toBe(false);
    expect(driver.workspace.draft.files['package.json'].content).toBe(
      draft.files['package.json'].content,
    );
    await driver.restoreHistory({
      checkpointId: first.id,
      expectedRevision: driver.workspace.draft.revision,
      expectedDataGeneration: 0,
    });
    expect(driver.workspace.draft.theme).toMatchObject({ name: 'casper-edited', builtIn: false });
    expect(driver.workspace.draft.files['package.json'].content).toBe(
      draft.files['package.json'].content,
    );
    expect(driver.workspace.draft.files['index.hbs'].content).toBe('<h1>Home</h1>');
    expect(driver.workspace.snapshot().revision).not.toBe(initial.revision);
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('keeps the history cursor when cancellation interrupts hashing an unchanged restore', async () => {
  const draft = await loadDraft();
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  let release!: () => void;
  try {
    await driver.start();
    const first = driver.readHistory().entries[0];
    const changed = await driver.applyThemePatch({
      expectedRevision: draft.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Changed</h1>' }],
    });
    const current = await driver.applyThemePatch({
      expectedRevision: changed.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Home</h1>' }],
    });
    expect(current.revision).toBe(draft.revision);
    const before = driver.readHistory();
    let started!: () => void;
    const hashing = new Promise<void>((resolve) => {
      started = resolve;
    });
    const hash = themeState.withThemeRevision;
    vi.spyOn(themeState, 'withThemeRevision').mockImplementationOnce(async (candidate) => {
      started();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return hash(candidate);
    });
    const caller = new AbortController();
    const restoring = driver.restoreHistory(
      {
        checkpointId: first.id,
        expectedRevision: current.revision,
        expectedDataGeneration: 0,
      },
      caller.signal,
    );
    const outcome = restoring.then(
      () => null,
      (error) => error as unknown,
    );
    await hashing;
    caller.abort();
    release();
    expect(await outcome).toMatchObject({ name: 'CanvasRejectedError', code: 'cancelled' });
    expect(driver.readHistory()).toEqual(before);
    expect((await driver.render()).revision).toBe(current.revision);
  } finally {
    release?.();
    driver.dispose();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  }
});

it('changes representative Post inputs without source checkpoints and rejects stale queued edits', async () => {
  const draft = await loadDraft();
  const post = { id: 'second', title: 'Second post', url: 'https://example.com/second/' };
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: `<h1>${url}</h1>`, diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', post: 'https://example.com/post/' },
    posts: {
      selected: { id: 'first', title: 'First post', url: 'https://example.com/post/' },
      list: () => Promise.resolve({ posts: [post], nextPage: null }),
      read: () => Promise.resolve(post),
    },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    const history = driver.readHistory();
    const selection = driver.selectPost({
      id: 'second',
      expectedRevision: before.revision,
      expectedDataGeneration: 0,
    });
    const stale = driver.applyThemePatch({
      expectedRevision: before.revision,
      expectedDataGeneration: 0,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Stale</h1>' }],
    });
    const outcome = stale.catch((error) => error as unknown);
    const next = await selection;
    expect(next).toMatchObject({
      revision: before.revision,
      dataGeneration: 1,
      routes: { post: post.url },
      representativePost: post,
    });
    expect(next.renderKey).not.toBe(before.renderKey);
    expect(next.html.post).toContain(post.url);
    expect(await outcome).toMatchObject({ name: 'CanvasRejectedError' });
    expect(driver.readHistory()).toEqual(history);
    expect(driver.workspace.draft).toEqual(draft);
    const changed = await driver.applyThemePatch({
      expectedRevision: next.revision,
      expectedDataGeneration: 1,
      files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Current</h1>' }],
    });
    expect(changed).toMatchObject({ dataGeneration: 1, routes: { post: post.url } });
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('retains the accepted Post binding and render when the new required route fails', async () => {
  const draft = await loadDraft();
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({
      url,
      status: url.endsWith('/missing/') ? 404 : 200,
      html: '<h1>Accepted</h1>',
      diagnostics: [],
    }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', post: 'https://example.com/post/' },
    posts: {
      selected: { id: 'first', title: 'First post', url: 'https://example.com/post/' },
      list: () => Promise.resolve({ posts: [], nextPage: null }),
      read: () =>
        Promise.resolve({ id: 'missing', title: 'Missing', url: 'https://example.com/missing/' }),
    },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    await expect(
      driver.selectPost({
        id: 'missing',
        expectedRevision: before.revision,
        expectedDataGeneration: 0,
      }),
    ).rejects.toMatchObject({ name: 'CanvasRejectedError' });
    expect(await driver.render()).toEqual(before);
    expect(driver.readHistory().entries).toHaveLength(1);
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('cancels Post adoption during rendering and accepts a later retry on the same source', async () => {
  const draft = await loadDraft();
  let release!: () => void;
  let entered!: () => void;
  const rendering = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let delay = true;
  renderer.render.mockImplementation(async (url: string) => {
    if (url.endsWith('/second/') && delay) {
      entered();
      await held;
    }
    return { url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] };
  });
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    posts: {
      selected: null,
      list: () => Promise.resolve({ posts: [], nextPage: null }),
      read: () =>
        Promise.resolve({ id: 'second', title: 'Second', url: 'https://example.com/second/' }),
    },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    const caller = new AbortController();
    const pending = driver
      .selectPost(
        { id: 'second', expectedRevision: before.revision, expectedDataGeneration: 0 },
        caller.signal,
      )
      .catch((error) => error as unknown);
    await rendering;
    caller.abort();
    release();
    expect(await pending).toMatchObject({ name: 'CanvasRejectedError', code: 'cancelled' });
    expect(await driver.render()).toEqual(before);
    delay = false;
    expect(
      await driver.selectPost({
        id: 'second',
        expectedRevision: before.revision,
        expectedDataGeneration: 0,
      }),
    ).toMatchObject({ dataGeneration: 1, representativePost: { id: 'second' } });
    expect(driver.readHistory().entries).toHaveLength(1);
  } finally {
    release?.();
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('does not reuse a cancelled staged render for a different subsequent Post', async () => {
  const draft = await loadDraft();
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: `<h1>${url}</h1>`, diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    posts: {
      selected: null,
      list: () => Promise.resolve({ posts: [], nextPage: null }),
      read: (id) => Promise.resolve({ id, title: id, url: `https://example.com/${id}/` }),
    },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    const caller = new AbortController();
    const validate = driver.preview.renderCandidate.bind(driver.preview);
    vi.spyOn(driver.preview, 'renderCandidate').mockImplementationOnce(
      async (candidate, signal) => {
        const result = await validate(candidate, signal);
        caller.abort();
        return result;
      },
    );
    await expect(
      driver.selectPost(
        { id: 'cancelled', expectedRevision: before.revision, expectedDataGeneration: 0 },
        caller.signal,
      ),
    ).rejects.toMatchObject({ code: 'cancelled' });
    expect(await driver.render()).toEqual(before);
    const next = await driver.selectPost({
      id: 'different',
      expectedRevision: before.revision,
      expectedDataGeneration: 0,
    });
    expect(next.routes?.post).toBe('https://example.com/different/');
    expect(next.html.post).toContain('https://example.com/different/');
    expect(next.html.post).not.toContain('cancelled');
  } finally {
    driver.dispose();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  }
});

it('rejects changed template bindings and reloads an existing resource whose assignment changed', async () => {
  const draft = await loadDraft();
  draft.files['custom-wide.hbs'] = { ...draft.files['post.hbs'], content: '<h1>Wide</h1>' };
  const first = {
    id: 'about',
    title: 'About',
    url: 'https://example.com/about/',
    slug: 'about',
    customTemplate: null as string | null,
  };
  let current = first;
  renderer.render.mockImplementation((url: string) =>
    Promise.resolve({ url, status: 200, html: '<h1>Rendered</h1>', diagnostics: [] }),
  );
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/', page: first.url },
    content: {
      page: {
        selected: first,
        list: () => Promise.resolve({ posts: [current], nextPage: null }),
        read: () => Promise.resolve(current),
      },
    },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const before = await driver.render();
    const history = driver.readHistory();
    const input = {
      kind: 'page' as const,
      id: first.id,
      expectedRevision: before.revision,
      expectedDataGeneration: before.dataGeneration,
    };
    current = { ...first, customTemplate: 'custom-wide' };
    await expect(
      driver.selectContent({ ...input, expectedTemplate: 'post.hbs' }),
    ).rejects.toMatchObject({ code: 'template_binding_changed' });
    expect(await driver.render()).toEqual(before);
    const after = await driver.selectContent({ ...input, expectedTemplate: 'custom-wide.hbs' });
    expect(after.dataGeneration).toBe(before.dataGeneration + 1);
    expect(after.representativeContent?.page?.customTemplate).toBe('custom-wide');
    expect(after.revision).toBe(before.revision);
    expect(driver.readHistory()).toEqual(history);
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});

it('adds, restores and removes the authored 404 context without changing ordinary route rules', async () => {
  const draft = await loadDraft();
  let invalid: 'success' | 'plain' | 'ordinary' | null = null;
  renderer.render.mockImplementation((url: string) => {
    const error = url.includes('/__ghost_canvas__/not-found/');
    return Promise.resolve({
      url,
      status: error ? (invalid === 'success' ? 200 : 404) : invalid === 'ordinary' ? 404 : 200,
      contentType: error && invalid === 'plain' ? 'text/plain' : 'text/html; charset=utf-8',
      html: error ? '<h1>Missing page</h1>' : '<h1>Home</h1>',
      diagnostics: [],
    });
  });
  const driver = new SiteCanvasDriver({
    draft,
    routes: { home: 'https://example.com/' },
    publish: (candidate) => Promise.resolve({ ok: true, revision: candidate.revision }),
  });
  try {
    await driver.start();
    const initial = await driver.render();
    expect(initial.routes?.error).toBeUndefined();
    const added = await driver.applyThemePatch({
      expectedRevision: initial.revision,
      expectedDataGeneration: initial.dataGeneration,
      files: [{ operation: 'write', path: 'error-4xx.hbs', content: '<h1>Missing page</h1>' }],
    });
    expect(added.errorPreview).toMatchObject({ template: 'error-4xx.hbs', status: 404 });
    expect(added.html.error).toContain('Missing page');
    const specific = await driver.applyThemePatch({
      expectedRevision: added.revision,
      expectedDataGeneration: added.dataGeneration,
      files: [
        { operation: 'write', path: 'error-404.hbs', content: '<h1>Specific missing page</h1>' },
      ],
    });
    expect(specific.errorPreview?.template).toBe('error-404.hbs');
    const restored = await driver.restoreHistory({
      checkpointId: driver.readHistory().undoId!,
      expectedRevision: specific.revision,
      expectedDataGeneration: specific.dataGeneration,
    });
    expect(restored.errorPreview?.template).toBe('error-4xx.hbs');
    const history = driver.readHistory();
    for (const failure of ['success', 'plain', 'ordinary'] as const) {
      invalid = failure;
      await expect(
        driver.applyThemePatch({
          expectedRevision: restored.revision,
          expectedDataGeneration: restored.dataGeneration,
          files: [{ operation: 'write', path: 'index.hbs', content: `<h1>${failure}</h1>` }],
        }),
      ).rejects.toMatchObject({ code: 'render_invalid' });
      expect((await driver.render()).revision).toBe(restored.revision);
      expect(driver.readHistory()).toEqual(history);
    }
    invalid = null;
    const removed = await driver.applyThemePatch({
      expectedRevision: restored.revision,
      expectedDataGeneration: restored.dataGeneration,
      files: [{ operation: 'delete', path: 'error-4xx.hbs' }],
    });
    expect(removed.errorPreview).toBeNull();
    expect(removed.routes?.error).toBeUndefined();
    expect(removed.html.error).toBeUndefined();
  } finally {
    driver.dispose();
    vi.clearAllMocks();
  }
});
