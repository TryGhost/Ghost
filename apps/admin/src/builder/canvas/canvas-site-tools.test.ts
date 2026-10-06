import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { CanvasEditorTools } from './canvas-editor-tools';
import { CanvasProbe } from './canvas-probe';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';
import type { CanvasProbeSurface, ReadResult } from './canvas-probe';

async function fixture() {
  const draft = await loadThemeDraft({
    archive: await new JSZip()
      .file('demo/package.json', JSON.stringify({ name: 'demo', version: '1.0.0' }))
      .file('demo/index.hbs', '<h1>Home</h1>\n')
      .file('demo/assets/built/screen.css', 'a'.repeat(70000))
      .generateAsync({ type: 'arraybuffer' }),
    theme: { name: 'demo', builtIn: false },
    settings: [],
    customSettings: [],
    site: { url: 'https://example.com/', contentApiKey: 'private-key', liveHtml: '' },
  });
  let current = draft;
  let renderKey = `${draft.revision}:data-0`;
  let busy = false;
  const probe = new CanvasProbe(
    [
      { id: 'home-desktop', label: 'Home · Desktop', group: 'Home', width: 1440, height: 900 },
      { id: 'home-mobile', label: 'Home · Mobile', group: 'Home', width: 390, height: 844 },
    ],
    'https://example.com/',
    { fixture: false, workspaceId: 'workspace' },
  );
  const surface: CanvasProbeSurface = {
    measureLayout: vi.fn().mockResolvedValue({
      documentId: 'doc',
      documentInstanceId: 'instance',
      localEdits: { generation: 0, active: false, changed: false },
      viewport: { width: 390, height: 844, scrollX: 0, scrollY: 0 },
      document: { width: 390, height: 844 },
    }),
    inspectPage: vi
      .fn()
      .mockResolvedValue({ viewport: { width: 390, height: 844, scrollX: 0, scrollY: 0 } }),
    inspectElement: vi.fn().mockResolvedValue({ text: 'Home' }),
    screenshot: vi.fn(),
  };
  const attach = () =>
    probe.attach('home-mobile', surface, {
      html: '',
      url: 'https://example.com/',
      revision: current.revision,
      renderKey,
    });
  let connection = attach();
  await connection.ready();
  const apply = vi.fn().mockImplementation(() => {
    current = { ...draft, revision: 'accepted' };
    renderKey = 'accepted:data-0';
    busy = true;
    connection = attach();
    return Promise.resolve({ revision: current.revision, renderKey, dataGeneration: 0 });
  });
  const validate = vi.fn().mockResolvedValue({
    valid: true,
    candidateRevision: 'candidate',
    runtimeReadiness: 'not-checked',
  });
  const reveal = vi.fn();
  probe.setEditor(
    new CanvasEditorTools({
      workspaceId: 'workspace',
      readDraft: () => current,
      state: () => ({
        busy,
        render: { renderKey, dataGeneration: 0 },
        history: {
          entries: [{ id: 'current-checkpoint', revision: current.revision, current: true }],
          undoId: 'previous-checkpoint',
        },
      }),
      applyPatch: apply,
      validatePatch: validate,
      listPosts: vi.fn(),
      selectPost: vi.fn(),
      listContent: vi.fn().mockResolvedValue({ posts: [], nextPage: null }),
      selectContent: vi.fn(),
      contentKinds: ['post', 'page', 'tag', 'author'],
      restoreHistory: vi.fn(),
      revealFrame: reveal,
      openPublicationReview: vi.fn(),
    }),
  );
  const lifetime = new AbortController();
  const tools = probe.siteTools(lifetime.signal);
  const call = (name: string, input: Record<string, unknown>, signal?: AbortSignal) =>
    tools.find((tool) => tool.name === `ghost_canvas_${name}`)!.execute(input, { signal });
  const context = { workspaceId: 'workspace', revision: draft.revision, generation: 0 };
  const ready = async () => {
    busy = false;
    await connection.ready();
  };
  const fail = () => {
    busy = false;
    connection.fail(new Error('Image layout failed'));
  };
  const partial = async () => {
    const expanded = probe.attach(
      'home-mobile',
      surface,
      { html: '', url: 'https://example.com/', revision: current.revision, renderKey },
      'expanded',
    );
    expanded.fail(new Error('Expanded frame failed'));
    await ready();
  };
  const supersede = () => {
    current = { ...current, revision: 'newer' };
    renderKey = 'newer:data-1';
  };
  const close = () => {
    lifetime.abort();
    probe.dispose();
  };
  return {
    probe,
    call,
    context,
    tools,
    apply,
    validate,
    reveal,
    ready,
    fail,
    close,
    surface,
    lifetime,
    partial,
    supersede,
  };
}
function data(result: ReadResult) {
  expect(result.status).toBe('ok');
  if (result.status !== 'ok') {
    throw new Error(result.message);
  }
  return result.data;
}

it('exposes eight stable capabilities without capture, aliases or routine preflight', async () => {
  const f = await fixture();
  try {
    expect(f.tools.map((tool) => tool.name)).toEqual(
      ['state', 'inspect', 'read', 'edit', 'content', 'history', 'reveal', 'review'].map(
        (name) => `ghost_canvas_${name}`,
      ),
    );
    expect(f.probe.siteTools(f.lifetime.signal).map((tool) => tool.name)).toEqual(
      f.tools.map((tool) => tool.name),
    );
    const state = data(await f.call('state', {}));
    expect(state.context).toEqual(f.context);
    expect(state).not.toHaveProperty('diagnostics');
    expect(state.capabilities).toMatchObject({
      captureRepresentations: [],
      visualVerification: 'native-browser-screenshot',
    });
    expect(data(await f.call('state', { diagnostics: true }))).toHaveProperty('diagnostics');
    expect(f.surface.screenshot).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it('batches clean source and minified character ranges without leaking private data', async () => {
  const f = await fixture();
  try {
    const result = data(
      await f.call('read', {
        context: f.context,
        requests: [
          { operation: 'source', path: 'index.hbs' },
          { operation: 'source', path: 'assets/built/screen.css', offset: 65536, length: 100 },
          { operation: 'search', query: 'Home', path: 'index.hbs' },
        ],
      }),
    );
    expect(result.results).toMatchObject([
      { status: 'ok', data: { content: '<h1>Home</h1>\n', truncated: false } },
      { status: 'ok', data: { content: 'a'.repeat(100), nextOffset: 65636, truncated: true } },
      { status: 'ok', data: { matches: [{ path: 'index.hbs' }] } },
    ]);
    expect(JSON.stringify(result)).not.toContain('private-key');
    expect(f.apply).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it('keeps batch errors addressed and rejects stale contexts without reading newer source', async () => {
  const f = await fixture();
  try {
    const result = data(
      await f.call('read', {
        context: f.context,
        requests: [
          { operation: 'source', path: '../secret' },
          { operation: 'source', path: 'index.hbs' },
        ],
      }),
    );
    expect(result.results).toMatchObject([{ status: 'error' }, { status: 'ok' }]);
    const stale = await f.call('read', {
      context: { ...f.context, revision: 'stale' },
      requests: [{ operation: 'source', path: 'index.hbs' }],
    });
    expect(stale).toMatchObject({ status: 'error', code: 'stale_revision' });
  } finally {
    f.close();
  }
});
it('uses optional dry-run without applying or waiting', async () => {
  const f = await fixture();
  try {
    expect(
      data(
        await f.call('edit', {
          context: f.context,
          dryRun: true,
          settings: { 'global.accent_color': '#112233' },
        }),
      ),
    ).toMatchObject({ valid: true });
    expect(f.validate).toHaveBeenCalledOnce();
    expect(f.apply).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it('waits by default and returns accepted delivery plus browser screenshot targets', async () => {
  const f = await fixture();
  try {
    const pending = f.call('edit', {
      context: f.context,
      settings: { 'global.accent_color': '#112233' },
    });
    await vi.waitFor(() => expect(f.apply).toHaveBeenCalledOnce());
    await f.ready();
    expect(data(await pending)).toMatchObject({
      accepted: true,
      revision: 'accepted',
      validation: { source: 'valid', renderer: 'valid', appearance: 'not-checked' },
      history: { checkpoint: 'current-checkpoint', undoCheckpoint: 'previous-checkpoint' },
      delivery: {
        status: 'ready',
        ready: 1,
        total: 1,
        failedSurfaces: [],
        visualCheck: {
          method: 'native-browser-screenshot',
          frames: [{ title: 'Home · Mobile preview' }],
        },
      },
    });
    expect(f.validate).not.toHaveBeenCalled();
    expect(f.surface.screenshot).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
it('preserves acceptance on timeout and allows waiting again without reapplying', async () => {
  const f = await fixture();
  try {
    expect(data(await f.call('edit', { context: f.context, timeoutMs: 0 }))).toMatchObject({
      accepted: true,
      delivery: { status: 'pending', observation: 'timeout' },
    });
    await f.ready();
    expect(
      data(
        await f.call('state', { waitFor: { revision: 'accepted', renderKey: 'accepted:data-0' } }),
      ),
    ).toMatchObject({ delivery: { status: 'ready' } });
    expect(f.apply).toHaveBeenCalledOnce();
  } finally {
    f.close();
  }
});
it('reports failure causes rather than waiting indefinitely or rolling back acceptance', async () => {
  const f = await fixture();
  try {
    const pending = f.call('edit', { context: f.context });
    await vi.waitFor(() => expect(f.apply).toHaveBeenCalledOnce());
    f.fail();
    expect(data(await pending)).toMatchObject({
      accepted: true,
      delivery: {
        status: 'failed',
        failedSurfaces: [{ frameId: 'home-mobile', failure: { message: 'Image layout failed' } }],
      },
    });
  } finally {
    f.close();
  }
});
it('reports cancellation after acceptance and rejects retired registrations', async () => {
  const f = await fixture();
  try {
    const controller = new AbortController();
    const pending = f.call('edit', { context: f.context }, controller.signal);
    await vi.waitFor(() => expect(f.apply).toHaveBeenCalledOnce());
    controller.abort();
    expect(data(await pending)).toMatchObject({
      accepted: true,
      delivery: { status: 'pending', observation: 'cancelled' },
    });
    f.lifetime.abort();
    expect(await f.call('state', {})).toMatchObject({
      status: 'error',
      code: 'workspace_unavailable',
    });
  } finally {
    f.close();
  }
});
it('separates partially ready delivery from a newer accepted source', async () => {
  const f = await fixture();
  try {
    const pending = f.call('edit', { context: f.context });
    await vi.waitFor(() => expect(f.apply).toHaveBeenCalledOnce());
    await f.partial();
    expect(data(await pending)).toMatchObject({
      accepted: true,
      delivery: {
        status: 'partially_ready',
        ready: 1,
        total: 2,
        failedSurfaces: [{ representation: 'expanded' }],
      },
    });
    f.supersede();
    expect(
      data(
        await f.call('state', { waitFor: { revision: 'accepted', renderKey: 'accepted:data-0' } }),
      ),
    ).toMatchObject({ delivery: { status: 'superseded' } });
  } finally {
    f.close();
  }
});
it('keeps targets addressed and does not navigate or capture during inspection', async () => {
  const f = await fixture();
  try {
    const target = f.probe.target('home-mobile', 'device')!;
    expect(data(await f.call('inspect', { target, occurrence: 'clicked-use' }))).toMatchObject({
      element: { text: 'Home' },
    });
    expect(f.reveal).not.toHaveBeenCalled();
    expect(f.surface.screenshot).not.toHaveBeenCalled();
    expect(
      await f.call('inspect', { target: { ...target, expectedRevision: 'stale' } }),
    ).toMatchObject({ status: 'error', code: 'revision_conflict' });
  } finally {
    f.close();
  }
});
it('rejects operation-specific extras and malformed options before applying', async () => {
  const f = await fixture();
  try {
    expect(
      await f.call('content', { context: f.context, operation: 'list', kind: 'post', id: 'wrong' }),
    ).toMatchObject({ code: 'invalid_arguments', details: { invalidArguments: ['id'] } });
    expect(await f.call('edit', { context: f.context, wait: 'yes' })).toMatchObject({
      code: 'invalid_arguments',
      details: { argument: 'wait' },
    });
    expect(await f.call('edit', { context: f.context, timeoutMs: 60001 })).toMatchObject({
      code: 'invalid_arguments',
    });
    expect(await f.call('edit', { context: { ...f.context, generation: -1 } })).toMatchObject({
      code: 'invalid_arguments',
    });
    expect(f.apply).not.toHaveBeenCalled();
  } finally {
    f.close();
  }
});
