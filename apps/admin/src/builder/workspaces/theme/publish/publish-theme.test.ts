import { extractThemeArchive } from '@tryghost/theme-renderer/editor/archive';
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import { ThemePublisher, ThemePublishRequestError, validateThemeCopyName } from './publish-theme';
import { withThemeRevision } from '@/builder/workspaces/theme/theme-state';

import type { ThemePublishTransport } from './publish-theme';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';

async function draft({
  builtIn = false,
  name = 'edition',
}: { builtIn?: boolean; name?: string } = {}): Promise<ThemeDraft> {
  return withThemeRevision({
    revision: '',
    theme: { name, version: '1.2.3', builtIn, rootPrefix: `${name}/` },
    files: {
      'package.json': {
        path: 'package.json',
        kind: 'text',
        content: JSON.stringify({ name, version: '1.2.3' }),
        binary: null,
        unixPermissions: null,
        dosPermissions: 0,
      },
      'index.hbs': {
        path: 'index.hbs',
        kind: 'text',
        content: '<main>Changed</main>',
        binary: null,
        unixPermissions: null,
        dosPermissions: 0,
      },
      'assets/logo.png': {
        path: 'assets/logo.png',
        kind: 'binary',
        content: null,
        binary: new Uint8Array([1, 2, 3]),
        unixPermissions: null,
        dosPermissions: 0,
      },
    },
    globalSettings: {
      accent_color: '#123456',
      heading_font: 'Inter',
      body_font: null,
      icon: null,
      logo: 'https://example.com/logo.png',
      cover_image: null,
    },
    customSettings: {
      layout: {
        id: 'layout',
        key: 'layout',
        type: 'select',
        value: 'Grid',
        default: 'List',
        options: ['List', 'Grid'],
      },
      featured: { id: 'featured', key: 'featured', type: 'boolean', value: true, default: false },
    },
    renderer: {
      siteUrl: 'https://example.com/',
      contentApiKey: 'content-key',
      config: {},
      missing: [],
    },
    virtualUrl: 'https://example.com/',
    selection: null,
  });
}

function transport(overrides: Partial<ThemePublishTransport> = {}): ThemePublishTransport {
  return {
    upload: vi.fn(() => Promise.resolve()),
    activate: vi.fn(() => Promise.resolve()),
    updateGlobalSettings: vi.fn(() => Promise.resolve()),
    updateCustomSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

async function archiveFor(
  current: ThemeDraft,
  overrides: Record<string, string> = {},
): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [path, file] of Object.entries(current.files)) {
    if (Object.hasOwn(overrides, path) || file.kind === 'text') {
      zip.file(
        `${current.theme.rootPrefix}${path}`,
        Object.hasOwn(overrides, path) ? overrides[path] : (file.content ?? ''),
        {
          dosPermissions: file.dosPermissions ?? undefined,
          unixPermissions: file.unixPermissions ?? undefined,
        },
      );
    } else {
      zip.file(`${current.theme.rootPrefix}${path}`, Array.from(file.binary ?? []), {
        binary: true,
        dosPermissions: file.dosPermissions ?? undefined,
        unixPermissions: file.unixPermissions ?? undefined,
      });
    }
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('ThemePublisher', () => {
  it('uploads an editable custom theme in place before applying only changed settings', async () => {
    const current = await draft();
    const baseline = structuredClone(current);
    baseline.globalSettings.accent_color = '#000000';
    baseline.customSettings.layout.value = 'List';
    const api = transport();
    const publisher = new ThemePublisher({ baseline, transport: api });

    const result = await publisher.publish(current, {}, new AbortController().signal);

    expect(result).toEqual({ ok: true, revision: current.revision, draft: current });
    expect(api.upload).toHaveBeenCalledOnce();
    expect(api.activate).not.toHaveBeenCalled();
    expect(api.updateGlobalSettings).toHaveBeenCalledWith(
      [{ key: 'accent_color', value: '#123456' }],
      expect.any(AbortSignal),
    );
    expect(api.updateCustomSettings).toHaveBeenCalledWith(
      [{ key: 'layout', value: 'Grid' }],
      expect.any(AbortSignal),
    );
    expect(vi.mocked(api.upload).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(api.updateGlobalSettings).mock.invocationCallOrder[0] ?? 0,
    );
    expect(vi.mocked(api.updateGlobalSettings).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(api.updateCustomSettings).mock.invocationCallOrder[0] ?? 0,
    );
    const upload = vi.mocked(api.upload).mock.calls[0]?.[0];
    if (!upload) {
      throw new Error('Expected a theme upload');
    }
    expect(upload).toMatchObject({ name: 'edition', copySettingsFrom: undefined });
    expect(upload.archive).toBeInstanceOf(Blob);
    const snapshot = await extractThemeArchive(await upload.archive.arrayBuffer());
    expect(snapshot.rootPrefix).toBe('edition/');
    expect(snapshot.files['index.hbs'].content).toBe('<main>Changed</main>');
    expect(snapshot.files['assets/logo.png'].binary).toEqual(new Uint8Array([1, 2, 3]));
    expect(publisher.state).toMatchObject({
      status: 'complete',
      stage: 'complete',
      targetName: 'edition',
    });
  });

  it('validates, uploads, and activates a built-in theme copy before applying settings', async () => {
    const current = await draft({ builtIn: true, name: 'source' });
    const api = transport();
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const result = await publisher.publish(
      current,
      { copyName: 'source-edited' },
      new AbortController().signal,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected publishing to succeed');
    }
    expect(result.draft).toMatchObject({
      theme: { name: 'source-edited', builtIn: false, rootPrefix: 'source-edited/' },
    });
    if (!result.draft) {
      throw new Error('Expected the published draft');
    }
    expect(result.revision).toBe(result.draft.revision);
    expect(api.upload).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'source-edited', copySettingsFrom: 'source' }),
      expect.any(AbortSignal),
    );
    expect(api.activate).toHaveBeenCalledWith('source-edited', expect.any(AbortSignal));
    expect(vi.mocked(api.upload).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(api.activate).mock.invocationCallOrder[0] ?? 0,
    );
    expect(api.updateGlobalSettings).not.toHaveBeenCalled();
    expect(api.updateCustomSettings).not.toHaveBeenCalled();
  });

  it.each(['', '-starts-with-dash', 'source', 'Casper', 'contains spaces', `${'a'.repeat(65)}`])(
    'rejects invalid built-in copy name %j before upload',
    async (copyName) => {
      const current = await draft({ builtIn: true, name: 'source' });
      const api = transport();
      const publisher = new ThemePublisher({ baseline: current, transport: api });

      const result = await publisher.publish(current, { copyName }, new AbortController().signal);

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: 'publish_validation_failed',
          retryable: false,
          details: { stage: 'validation' },
        },
      });
      expect(api.upload).not.toHaveBeenCalled();
    },
  );

  it('reports a local archive validation failure without attempting an upload', async () => {
    const current = await draft();
    delete current.files['package.json'];
    const api = transport();
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const result = await publisher.publish(current, {}, new AbortController().signal);

    expect(result).toMatchObject({
      ok: false,
      revision: current.revision,
      error: {
        code: 'publish_validation_failed',
        retryable: false,
        details: { stage: 'validation' },
      },
    });
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('rejects a built-in copy name that would replace an installed custom theme', async () => {
    const current = await draft({ builtIn: true, name: 'source' });
    const api = transport();
    const publisher = new ThemePublisher({
      baseline: current,
      installedThemeNames: ['Edition', 'source-edited'],
      transport: api,
    });

    const result = await publisher.publish(
      current,
      { copyName: 'SOURCE-EDITED' },
      new AbortController().signal,
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'publish_validation_failed', retryable: false },
    });
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('refuses to overwrite a custom theme changed on the server after Builder loaded', async () => {
    const current = await draft();
    const installedArchive = await archiveFor(current, {
      'index.hbs': '<main>Changed elsewhere</main>',
    });
    const download = vi.fn(() => Promise.resolve(installedArchive));
    const api = transport({ download });
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const result = await publisher.publish(current, {}, new AbortController().signal);

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'publish_conflict', retryable: false, details: { stage: 'validation' } },
    });
    expect(download).toHaveBeenCalledWith('edition', expect.any(AbortSignal));
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('uploads when the installed custom theme still matches the loaded baseline', async () => {
    const current = await draft();
    const installedArchive = await archiveFor(current);
    const api = transport({ download: () => Promise.resolve(installedArchive) });
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const result = await publisher.publish(current, {}, new AbortController().signal);

    expect(result.ok).toBe(true);
    expect(api.upload).toHaveBeenCalledOnce();
  });

  it('retries from upload without mutating the retained draft', async () => {
    const current = await draft();
    const original = structuredClone(current);
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Upload unavailable'))
      .mockResolvedValueOnce(undefined);
    const api = transport({ upload });
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const failed = await publisher.publish(current, {}, new AbortController().signal);
    const retried = await publisher.publish(current, {}, new AbortController().signal);

    expect(failed).toMatchObject({
      ok: false,
      error: { code: 'publish_upload_failed', retryable: true, details: { stage: 'upload' } },
    });
    expect(retried.ok).toBe(true);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(current).toEqual(original);
  });

  it('rechecks the installed custom theme before retrying a failed upload', async () => {
    const current = await draft();
    const baselineArchive = await archiveFor(current);
    const externalArchive = await archiveFor(current, {
      'index.hbs': '<main>Changed elsewhere</main>',
    });
    const download = vi
      .fn()
      .mockResolvedValueOnce(baselineArchive)
      .mockResolvedValueOnce(externalArchive);
    const upload = vi.fn().mockRejectedValueOnce(new Error('Upload unavailable'));
    const api = transport({ download, upload });
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const failed = await publisher.publish(current, {}, new AbortController().signal);
    const conflicted = await publisher.publish(current, {}, new AbortController().signal);

    expect(failed).toMatchObject({
      ok: false,
      error: { code: 'publish_upload_failed', retryable: true },
    });
    expect(conflicted).toMatchObject({
      ok: false,
      error: { code: 'publish_conflict', retryable: false },
    });
    expect(download).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledOnce();
  });

  it('resumes after an ambiguous upload error when the server already contains the attempted draft', async () => {
    const current = await draft();
    const baseline = structuredClone(current);
    baseline.files['index.hbs'].content = '<main>Initial</main>';
    const baselineArchive = await archiveFor(baseline);
    const attemptedArchive = await archiveFor(current);
    const download = vi
      .fn()
      .mockResolvedValueOnce(baselineArchive)
      .mockResolvedValueOnce(attemptedArchive);
    const upload = vi.fn().mockRejectedValueOnce(new Error('Connection lost after upload'));
    const api = transport({ download, upload });
    const publisher = new ThemePublisher({ baseline, transport: api });

    await publisher.publish(current, {}, new AbortController().signal);
    const retried = await publisher.publish(current, {}, new AbortController().signal);

    expect(retried.ok).toBe(true);
    expect(upload).toHaveBeenCalledOnce();
  });

  it('treats Ghost upload validation errors as non-retryable validation failures', async () => {
    const current = await draft({ builtIn: true, name: 'source' });
    const api = transport({
      upload: () => Promise.reject(new ThemePublishRequestError(422, 'Theme validation failed')),
    });
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const result = await publisher.publish(
      current,
      { copyName: 'source-edited' },
      new AbortController().signal,
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'publish_validation_failed',
        message: 'Theme validation failed',
        retryable: false,
      },
    });
    expect(publisher.state).toMatchObject({
      status: 'failed',
      stage: 'validation',
      retryable: false,
    });
  });

  it('treats Ghost settings validation errors as non-retryable settings failures', async () => {
    const current = await draft();
    const baseline = structuredClone(current);
    baseline.customSettings.layout.value = 'List';
    const api = transport({
      updateCustomSettings: () =>
        Promise.reject(new ThemePublishRequestError(422, 'Layout is not supported by this theme')),
    });
    const publisher = new ThemePublisher({ baseline, transport: api });

    const result = await publisher.publish(current, {}, new AbortController().signal);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'publish_settings_failed',
        message: 'Layout is not supported by this theme',
        retryable: false,
      },
    });
    expect(publisher.state).toMatchObject({
      status: 'failed',
      stage: 'settings',
      retryable: false,
    });
  });

  it('resumes a built-in retry at activation without uploading twice', async () => {
    const current = await draft({ builtIn: true, name: 'source' });
    const activate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Activation unavailable'))
      .mockResolvedValueOnce(undefined);
    const api = transport({ activate });
    const publisher = new ThemePublisher({ baseline: current, transport: api });

    const failed = await publisher.publish(
      current,
      { copyName: 'source-edited' },
      new AbortController().signal,
    );
    const retried = await publisher.publish(
      current,
      { copyName: 'source-edited' },
      new AbortController().signal,
    );

    expect(failed).toMatchObject({
      ok: false,
      error: {
        code: 'publish_activation_failed',
        retryable: true,
        details: { stage: 'activation' },
      },
    });
    expect(retried.ok).toBe(true);
    expect(api.upload).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it('resumes partial settings retries without repeating theme or completed setting stages', async () => {
    const current = await draft();
    const baseline = structuredClone(current);
    baseline.globalSettings.accent_color = '#000000';
    baseline.customSettings.layout.value = 'List';
    const updateCustomSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error('Settings unavailable'))
      .mockResolvedValueOnce(undefined);
    const api = transport({ updateCustomSettings });
    const onServerMutation = vi.fn();
    const publisher = new ThemePublisher({ baseline, onServerMutation, transport: api });

    const failed = await publisher.publish(current, {}, new AbortController().signal);
    const retried = await publisher.publish(current, {}, new AbortController().signal);

    expect(failed).toMatchObject({
      ok: false,
      error: { code: 'publish_settings_failed', retryable: true, details: { stage: 'settings' } },
    });
    expect(retried.ok).toBe(true);
    expect(api.upload).toHaveBeenCalledOnce();
    expect(api.updateGlobalSettings).toHaveBeenCalledOnce();
    expect(updateCustomSettings).toHaveBeenCalledTimes(2);
    expect(onServerMutation).toHaveBeenCalledTimes(4);
  });

  it('reasserts an ambiguously failed global setting update after the draft changes', async () => {
    const current = await draft();
    const baseline = structuredClone(current);
    baseline.globalSettings.accent_color = '#000000';
    const updateGlobalSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection lost after updating settings'))
      .mockResolvedValueOnce(undefined);
    const api = transport({ updateGlobalSettings });
    const publisher = new ThemePublisher({ baseline, transport: api });

    const failed = await publisher.publish(current, {}, new AbortController().signal);
    const changedDraft = await withThemeRevision({
      ...structuredClone(current),
      files: {
        ...structuredClone(current.files),
        'index.hbs': { ...current.files['index.hbs'], content: '<main>Changed again</main>' },
      },
    });
    const retried = await publisher.publish(changedDraft, {}, new AbortController().signal);

    expect(failed).toMatchObject({
      ok: false,
      error: { code: 'publish_settings_failed', retryable: true },
    });
    expect(retried.ok).toBe(true);
    expect(updateGlobalSettings).toHaveBeenCalledTimes(2);
    expect(updateGlobalSettings).toHaveBeenNthCalledWith(
      1,
      [{ key: 'accent_color', value: '#123456' }],
      expect.any(AbortSignal),
    );
    expect(updateGlobalSettings).toHaveBeenNthCalledWith(
      2,
      [{ key: 'accent_color', value: '#123456' }],
      expect.any(AbortSignal),
    );
  });

  it('reasserts an ambiguously failed custom setting update after the draft changes', async () => {
    const current = await draft();
    const baseline = structuredClone(current);
    baseline.customSettings.layout.value = 'List';
    const updateCustomSettings = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection lost after updating custom settings'))
      .mockResolvedValueOnce(undefined);
    const api = transport({ updateCustomSettings });
    const publisher = new ThemePublisher({ baseline, transport: api });

    const failed = await publisher.publish(current, {}, new AbortController().signal);
    const changedDraft = await withThemeRevision({
      ...structuredClone(current),
      files: {
        ...structuredClone(current.files),
        'index.hbs': { ...current.files['index.hbs'], content: '<main>Changed again</main>' },
      },
    });
    const retried = await publisher.publish(changedDraft, {}, new AbortController().signal);

    expect(failed).toMatchObject({
      ok: false,
      error: { code: 'publish_settings_failed', retryable: true },
    });
    expect(retried.ok).toBe(true);
    expect(updateCustomSettings).toHaveBeenCalledTimes(2);
    expect(updateCustomSettings).toHaveBeenNthCalledWith(
      1,
      [{ key: 'layout', value: 'Grid' }],
      expect.any(AbortSignal),
    );
    expect(updateCustomSettings).toHaveBeenNthCalledWith(
      2,
      [{ key: 'layout', value: 'Grid' }],
      expect.any(AbortSignal),
    );
  });
});

describe('validateThemeCopyName', () => {
  it('normalizes a valid name and supplies the built-in default', () => {
    expect(validateThemeCopyName('  My-Copy  ', 'source')).toEqual({ ok: true, name: 'my-copy' });
    expect(validateThemeCopyName(undefined, 'source')).toEqual({ ok: true, name: 'source-edited' });
    expect(validateThemeCopyName('Existing', 'source', ['existing'])).toEqual({
      ok: false,
      message:
        'A theme named “existing” is already installed. Choose a different name for this copy.',
    });
  });
});
