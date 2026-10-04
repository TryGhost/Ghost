import JSZip from 'jszip';
import { expect, it, vi } from 'vitest';
import { CanvasEditorTools } from './canvas-editor-tools';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';

async function fixture() {
  const draft = await loadThemeDraft({
    archive: await new JSZip()
      .file('demo/package.json', JSON.stringify({ name: 'demo', version: '1.0.0' }))
      .file('demo/index.hbs', '<h1>Selected Home</h1>')
      .generateAsync({ type: 'arraybuffer' }),
    theme: { name: 'demo', builtIn: false },
    settings: [{ key: 'accent_color', value: '#123456' }],
    customSettings: [],
    site: { url: 'https://example.com/', contentApiKey: 'never-return-this-key', liveHtml: '' },
  });
  const apply = vi.fn().mockResolvedValue({
    revision: 'next-revision',
    renderKey: 'next-revision:data-0',
    dataGeneration: 0,
  });
  const tools = new CanvasEditorTools({
    workspaceId: 'workspace',
    readDraft: () => draft,
    state: () => ({ selection: { frameId: 'home-mobile', marker: 'index.hbs:1:1' } }),
    applyPatch: apply,
  });
  const read = tools.tools().find((tool) => tool.name.endsWith('read_theme'))!;
  const patch = tools.tools().find((tool) => tool.name.endsWith('apply_theme_patch'))!;
  const args = { workspaceId: 'workspace', expectedRevision: draft.revision };
  return { draft, apply, tools, read, patch, args };
}

it('exposes read-only preflight and exact replacements with useful operation argument errors', async () => {
  const { draft, apply, args } = await fixture();
  const validate = vi.fn().mockResolvedValue({
    valid: true,
    validationScope: 'source-and-required-renderer-pages',
    runtimeReadiness: 'not-checked',
    revision: draft.revision,
    candidateRevision: 'candidate',
    dataGeneration: 0,
    unchanged: false,
    paths: ['index.hbs'],
    settings: [],
  });
  const tools = new CanvasEditorTools({
    workspaceId: 'workspace',
    readDraft: () => draft,
    state: () => ({}),
    applyPatch: apply,
    validatePatch: validate,
  });
  const action = tools.tools().find((tool) => tool.name === 'ghost_canvas_validate_theme_patch')!;
  expect(action.annotations.readOnlyHint).toBe(true);
  expect(tools.state().patchPreflight).toMatchObject({
    available: true,
    reservesRevision: false,
    validationScope: 'source-and-required-renderer-pages',
    runtimeReadiness: 'not-checked',
  });
  const patch = {
    ...args,
    expectedDataGeneration: 0,
    files: [
      {
        operation: 'replace',
        path: 'index.hbs',
        oldText: 'Selected Home',
        newText: 'Editorial Home',
      },
    ],
  };
  expect(await action.execute(patch)).toMatchObject({
    status: 'ok',
    data: {
      valid: true,
      candidateRevision: 'candidate',
      validationScope: 'source-and-required-renderer-pages',
      runtimeReadiness: 'not-checked',
    },
  });
  expect(validate).toHaveBeenCalledWith(
    expect.objectContaining({ files: patch.files }),
    expect.any(AbortSignal),
  );
  expect(apply).not.toHaveBeenCalled();
  const read = tools.tools().find((tool) => tool.name === 'ghost_canvas_read_theme')!;
  expect(
    await read.execute({ ...args, operation: 'search_files', query: 'Home', path: 'index.hbs' }),
  ).toMatchObject({ status: 'ok', data: { matches: [{ path: 'index.hbs' }] } });
  expect(
    await read.execute({ ...args, operation: 'read_file', path: 'index.hbs', query: 'Home' }),
  ).toMatchObject({
    status: 'error',
    code: 'invalid_arguments',
    details: {
      invalidArguments: ['query'],
      validArguments: [
        'workspaceId',
        'expectedRevision',
        'operation',
        'path',
        'startLine',
        'startColumn',
        'endLine',
      ],
    },
  });
});

it('reveals only a requested frame in the current workspace and never accepts arbitrary camera arguments', async () => {
  const { draft, apply, args } = await fixture();
  const reveal = vi.fn();
  const tools = new CanvasEditorTools({
    workspaceId: 'workspace',
    readDraft: () => draft,
    state: () => ({}),
    applyPatch: apply,
    revealFrame: reveal,
  });
  const action = tools.tools().find((tool) => tool.name === 'ghost_canvas_reveal_frame');
  expect(action).toBeDefined();
  const input = { ...args, frameId: 'home-mobile' };
  expect(await action!.execute({ ...input, expectedRevision: 'old' })).toMatchObject({
    code: 'stale_revision',
  });
  expect(await action!.execute({ ...input, workspaceId: 'other' })).toMatchObject({
    code: 'workspace_unavailable',
  });
  expect(await action!.execute({ ...input, camera: { scale: 10 } })).toMatchObject({
    code: 'invalid_arguments',
  });
  expect(await action!.execute({ ...input, frameId: '' })).toMatchObject({
    code: 'invalid_arguments',
  });
  const cancelled = AbortSignal.abort();
  expect(await action!.execute(input, { signal: cancelled })).toMatchObject({ code: 'cancelled' });
  expect(reveal).not.toHaveBeenCalled();
  expect(await action!.execute(input)).toMatchObject({
    status: 'ok',
    data: { requested: true, frameId: 'home-mobile' },
  });
  expect(reveal).toHaveBeenCalledExactlyOnceWith('home-mobile');
  expect(apply).not.toHaveBeenCalled();
  tools.dispose();
  expect(await action!.execute(input)).toMatchObject({ code: 'workspace_unavailable' });
  expect(reveal).toHaveBeenCalledTimes(1);
});

it('opens human publication review only at the accepted revision and rejects confirmation arguments', async () => {
  const { draft, apply } = await fixture();
  const open = vi.fn(() => ({
    revision: draft.revision,
    theme: { name: 'demo', builtIn: false },
    files: [],
    settings: [],
    totalFiles: 0,
    totalSettings: 0,
    pending: { text: true, settings: false },
  }));
  const tools = new CanvasEditorTools({
    workspaceId: 'workspace',
    readDraft: () => draft,
    state: () => ({}),
    applyPatch: apply,
    openPublicationReview: open,
  });
  const review = tools
    .tools()
    .find((tool) => tool.name === 'ghost_canvas_open_publication_review')!;
  const args = { workspaceId: 'workspace', expectedRevision: draft.revision };
  expect(tools.state().publicationTool).toMatchObject({
    available: true,
    humanConfirmationRequired: true,
  });
  expect(await review.execute({ ...args, confirm: true })).toMatchObject({
    code: 'invalid_arguments',
  });
  expect(await review.execute({ ...args, expectedRevision: 'old' })).toMatchObject({
    code: 'stale_revision',
  });
  expect(open).not.toHaveBeenCalled();
  expect(await review.execute(args)).toMatchObject({
    status: 'ok',
    data: { opened: true, review: { pending: { text: true } } },
  });
  expect(open).toHaveBeenCalledWith(draft.revision);
  expect(apply).not.toHaveBeenCalled();
  tools.dispose();
});

it('reads only the addressed revision of loaded source and supported settings without renderer credentials', async () => {
  const { tools, read, args } = await fixture();
  expect(tools.state()).toMatchObject({ selection: { frameId: 'home-mobile' } });
  const file = await read.execute({ ...args, operation: 'read_file', path: 'index.hbs' });
  expect(file).toMatchObject({ status: 'ok', data: { revision: args.expectedRevision } });
  expect(JSON.stringify(file)).toContain('Selected Home');
  expect(JSON.stringify(file)).not.toContain('never-return-this-key');
  expect(
    await read.execute({ ...args, expectedRevision: 'stale', operation: 'list_files' }),
  ).toMatchObject({ code: 'stale_revision' });
  expect(
    await read.execute({ ...args, workspaceId: 'another', operation: 'settings' }),
  ).toMatchObject({ code: 'workspace_unavailable' });
  expect(JSON.stringify(await read.execute({ ...args, operation: 'settings' }))).toContain(
    'global.accent_color',
  );
  tools.dispose();
});

it('fences source writes and delivers exactly one revision-checked atomic patch', async () => {
  const { tools, patch, apply, args } = await fixture();
  const input = {
    ...args,
    expectedDataGeneration: 0,
    files: [{ operation: 'write', path: 'index.hbs', content: '<h1>Agent Home</h1>' }],
  };
  expect(patch.annotations.readOnlyHint).toBe(false);
  expect(await patch.execute({ ...input, expectedRevision: 'stale' })).toMatchObject({
    code: 'stale_revision',
  });
  expect(apply).not.toHaveBeenCalled();
  expect(await patch.execute(input)).toMatchObject({
    status: 'ok',
    data: { revision: 'next-revision', accepted: true },
  });
  expect(apply).toHaveBeenCalledOnce();
  expect(apply.mock.calls[0][0]).toEqual({
    expectedRevision: args.expectedRevision,
    expectedDataGeneration: 0,
    files: input.files,
    settings: undefined,
  });
  tools.dispose();
  expect(await patch.execute(input)).toMatchObject({ code: 'workspace_unavailable' });
  expect(apply).toHaveBeenCalledOnce();
});

it('bounds native setting writes and pages loaded settings with explicit truncation', async () => {
  const { draft, patch, apply, read, args, tools } = await fixture();
  expect(
    await patch.execute({
      ...args,
      expectedDataGeneration: 0,
      settings: { 'global.heading_font': 'x'.repeat(8193) },
    }),
  ).toMatchObject({ code: 'invalid_arguments' });
  expect(apply).not.toHaveBeenCalled();
  draft.globalSettings.heading_font = 'x'.repeat(100_000);
  const result = await read.execute({ ...args, operation: 'settings', offset: 0, limit: 2 });
  expect(result).toMatchObject({
    status: 'ok',
    data: {
      total: 6,
      nextOffset: 2,
      settings: [
        { identifier: 'global.accent_color' },
        { identifier: 'global.heading_font', truncatedFields: ['currentValue', 'stagedValue'] },
      ],
    },
  });
  expect(JSON.stringify(result).length).toBeLessThan(10_000);
  expect(await read.execute({ ...args, operation: 'settings', offset: 2, limit: 2 })).toMatchObject(
    {
      status: 'ok',
      data: {
        nextOffset: 4,
        settings: [{ identifier: 'global.body_font' }, { identifier: 'global.icon' }],
      },
    },
  );
  tools.dispose();
});

it('does not start cancelled work or expose a generic evaluation interface', async () => {
  const { tools, patch, apply, args } = await fixture();
  const controller = new AbortController();
  controller.abort();
  expect(
    await patch.execute(
      { ...args, expectedDataGeneration: 0, settings: { 'global.accent_color': '#654321' } },
      { signal: controller.signal },
    ),
  ).toMatchObject({ code: 'cancelled' });
  expect(
    await patch.execute({ ...args, expectedDataGeneration: 0, evaluate: 'document.cookie' }),
  ).toMatchObject({ code: 'invalid_arguments' });
  expect(apply).not.toHaveBeenCalled();
  tools.dispose();
});

it('lists checkpoint metadata and restores only an explicit current addressed checkpoint through the shared action', async () => {
  const { draft, apply, args, tools: original } = await fixture();
  original.dispose();
  const restore = vi
    .fn()
    .mockResolvedValue({ revision: 'restored', renderKey: 'restored:data-0', dataGeneration: 0 });
  const history = {
    available: true,
    entries: [{ id: 'initial', revision: draft.revision, label: 'Editor opened', current: false }],
    undoId: 'initial',
    redoId: null,
  };
  const tools = new CanvasEditorTools({
    workspaceId: 'workspace',
    readDraft: () => draft,
    state: () => ({ history }),
    applyPatch: apply,
    restoreHistory: restore,
  });
  const tool = tools.tools().find((entry) => entry.name === 'ghost_canvas_history')!;
  expect(await tool.execute({ ...args, operation: 'list' })).toMatchObject({
    status: 'ok',
    data: { history },
  });
  expect(await tool.execute({ ...args, operation: 'list', checkpointId: 'initial' })).toMatchObject(
    { code: 'invalid_arguments' },
  );
  expect(
    await tool.execute({
      ...args,
      expectedRevision: 'stale',
      operation: 'restore',
      checkpointId: 'initial',
      expectedDataGeneration: 0,
    }),
  ).toMatchObject({ code: 'stale_revision' });
  expect(restore).not.toHaveBeenCalled();
  expect(
    await tool.execute({
      ...args,
      operation: 'restore',
      checkpointId: 'initial',
      expectedDataGeneration: 0,
    }),
  ).toMatchObject({ status: 'ok', data: { accepted: true, revision: 'restored' } });
  expect(restore.mock.calls[0][0]).toEqual({
    checkpointId: 'initial',
    expectedRevision: draft.revision,
    expectedDataGeneration: 0,
  });
  expect(apply).not.toHaveBeenCalled();
  tools.dispose();
  expect(await tool.execute({ ...args, operation: 'list' })).toMatchObject({
    code: 'workspace_unavailable',
  });
});
