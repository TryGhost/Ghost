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
