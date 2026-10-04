import { describe, expect, it } from 'vitest';
import { stageThemePatch } from './theme-patch';
import { withThemeRevision } from './theme-state';
import { THEME_TEXT_LIMITS } from './theme-tools';
import type { ThemeDraft } from './theme-state';

async function patchDraft(): Promise<ThemeDraft> {
  const theme = {
    'package.json': '{"name":"demo","version":"1.0.0"}',
    'index.hbs': '<main>{{> old}}</main>',
    'post.hbs': '<article>{{> old}}</article>',
    'partials/old.hbs': '<h1>Original</h1>',
  };
  return withThemeRevision({
    revision: '',
    theme: { name: 'demo', version: '1.0.0', builtIn: false, rootPrefix: '' },
    files: Object.fromEntries(
      Object.entries(theme).map(([path, content]) => [
        path,
        { path, content, kind: 'text', binary: null, unixPermissions: null, dosPermissions: null },
      ]),
    ),
    globalSettings: {
      accent_color: '#000000',
      heading_font: null,
      body_font: null,
      icon: null,
      logo: null,
      cover_image: null,
    },
    customSettings: {},
    renderer: { siteUrl: 'https://example.com/', contentApiKey: 'test', config: {}, missing: [] },
    virtualUrl: 'https://example.com/',
    selection: null,
  });
}

describe('atomic theme patches', () => {
  it('rejects overlapping exact replacement matches without changing other files', async () => {
    const initial = await patchDraft();
    initial.files['partials/old.hbs'].content = 'aaa';
    const draft = await withThemeRevision(initial);
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [
        { operation: 'write', path: 'index.hbs', content: '<main>Other change</main>' },
        { operation: 'replace', path: 'partials/old.hbs', oldText: 'aa', newText: 'b' },
      ],
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'replacement_ambiguous' } });
    expect(draft.files['index.hbs'].content).toBe('<main>{{> old}}</main>');
  });

  it('checks replacement aggregate bytes against the final patch including a deletion', async () => {
    const initial = await patchDraft();
    const initialBytes = Object.values(initial.files).reduce(
      (total, file) => total + new TextEncoder().encode(file.content ?? '').byteLength,
      0,
    );
    let remaining = THEME_TEXT_LIMITS.maxTotalBytes - initialBytes - 1;
    for (let index = 0; remaining > 0; index++) {
      const path = `assets/filler-${index}.txt`;
      const size = Math.min(remaining, THEME_TEXT_LIMITS.maxFileBytes);
      initial.files[path] = { ...initial.files['index.hbs'], path, content: 'x'.repeat(size) };
      remaining -= size;
    }
    const draft = await withThemeRevision(initial);
    const replace = {
      operation: 'replace',
      path: 'partials/old.hbs',
      oldText: 'Original',
      newText: 'Larger editorial title',
    };
    expect(
      await stageThemePatch(draft, { revision: draft.revision, files: [replace] }),
    ).toMatchObject({ ok: false, error: { code: 'theme_text_too_large' } });
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [replace, { operation: 'delete', path: 'assets/filler-0.txt' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.files['partials/old.hbs'].content).toBe(
        '<h1>Larger editorial title</h1>',
      );
      expect(result.candidate.files['assets/filler-0.txt']).toBeUndefined();
    }
    expect(draft.files['partials/old.hbs'].content).toBe('<h1>Original</h1>');
  });

  it('removes obsolete generated CSS map directives without altering CSS string content', async () => {
    const initial = await patchDraft();
    initial.files['assets/built/screen.css'] = {
      ...initial.files['index.hbs'],
      path: 'assets/built/screen.css',
      content: 'h1{color:red}\n/*# sourceMappingURL=screen.css.map */',
    };
    const draft = await withThemeRevision(initial);
    const content =
      'h1{color:blue}a::after{content:"/*# sourceMappingURL=keep-this-string */"}\n/*# sourceMappingURL=screen.css.map */';
    const unchanged = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [
        {
          operation: 'write',
          path: 'assets/built/screen.css',
          content: draft.files['assets/built/screen.css'].content,
        },
      ],
    });
    expect(unchanged).toMatchObject({ ok: true, data: { unchanged: true } });
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [{ operation: 'write', path: 'assets/built/screen.css', content }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.files['assets/built/screen.css'].content).toBe(
        'h1{color:blue}a::after{content:"/*# sourceMappingURL=keep-this-string */"}\n',
      );
    }
  });

  it('replaces one exact source occurrence alongside other file changes atomically', async () => {
    const draft = await patchDraft();
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [
        {
          operation: 'replace',
          path: 'partials/old.hbs',
          oldText: 'Original',
          newText: 'Editorial',
        },
        {
          operation: 'write',
          path: 'assets/css/canvas.css',
          content: 'h1 {letter-spacing:-.04em}',
        },
      ],
    });
    expect(result).toMatchObject({ ok: true, data: { unchanged: false } });
    if (result.ok) {
      expect(result.candidate.files['partials/old.hbs'].content).toBe('<h1>Editorial</h1>');
      expect(result.candidate.files['assets/css/canvas.css'].content).toContain('letter-spacing');
    }
    expect(draft.files['partials/old.hbs'].content).toBe('<h1>Original</h1>');
  });

  it.each(['missing', '<'])(
    'rejects every change for a missing or ambiguous exact replacement (%s)',
    async (oldText) => {
      const draft = await patchDraft();
      const result = await stageThemePatch(draft, {
        revision: draft.revision,
        files: [
          { operation: 'write', path: 'index.hbs', content: '<main>Other change</main>' },
          { operation: 'replace', path: 'partials/old.hbs', oldText, newText: 'Replacement' },
        ],
      });
      expect(result).toMatchObject({
        ok: false,
        revision: draft.revision,
        error: {
          code: oldText === 'missing' ? 'replacement_not_found' : 'replacement_ambiguous',
          details: { path: 'partials/old.hbs' },
        },
      });
      expect(draft.files['index.hbs'].content).toBe('<main>{{> old}}</main>');
    },
  );

  it('validates dependent settings against the final combined values', async () => {
    const initial = await patchDraft();
    const draft = await withThemeRevision({
      ...initial,
      customSettings: {
        header_style: {
          id: 'header_style',
          key: 'header_style',
          type: 'select',
          default: 'Landing',
          value: 'Landing',
          options: ['Landing', 'Highlight'],
        },
        show_featured_posts: {
          id: 'show_featured_posts',
          key: 'show_featured_posts',
          type: 'boolean',
          default: false,
          value: false,
          visibility: 'header_style:[Highlight]',
        },
      },
    });
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      settings: { 'theme.show_featured_posts': true, 'theme.header_style': 'Highlight' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.candidate.customSettings.show_featured_posts.value).toBe(true);
    expect(draft.customSettings.header_style.value).toBe('Landing');
    const invalid = await stageThemePatch(draft, {
      revision: draft.revision,
      settings: { 'theme.header_style': 'Highlight', 'theme.show_featured_posts': 'invalid' },
    });
    expect(invalid).toMatchObject({ ok: false, error: { code: 'invalid_setting_value' } });
    expect(draft.customSettings.show_featured_posts.value).toBe(false);
  });
  it('stages combined replacement, creation, deletion and settings without changing the source', async () => {
    const draft = await patchDraft();
    const original = structuredClone(draft);
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [
        { operation: 'write', path: 'index.hbs', content: '<main>{{> new}}</main>' },
        { operation: 'write', path: 'post.hbs', content: '<article>{{> new}}</article>' },
        { operation: 'delete', path: 'partials/old.hbs' },
        { operation: 'write', path: 'partials/new.hbs', content: '<h1>Replacement</h1>' },
      ],
      settings: { 'global.accent_color': '#123456' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    expect(result.candidate.files['partials/old.hbs']).toBeUndefined();
    expect(result.candidate.files['partials/new.hbs'].content).toBe('<h1>Replacement</h1>');
    expect(result.candidate.globalSettings.accent_color).toBe('#123456');
    expect(result.revision).not.toBe(draft.revision);
    expect(result.data.unchanged).toBe(false);
    expect(draft).toEqual(original);
  });

  it('checks authored stylesheet loading against the complete final patch', async () => {
    const draft = await patchDraft();
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [
        { operation: 'write', path: 'assets/css/screen.css', content: 'main {color:red}' },
        {
          operation: 'write',
          path: 'index.hbs',
          content: '<link rel="stylesheet" href="{{asset "css/screen.css"}}"><main>New</main>',
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.files['assets/css/screen.css'].content).toContain('color:red');
    }
  });

  it.each([
    [{ operation: 'write', path: '../outside.hbs', content: 'unsafe' }, 'unsafe_path'],
    [{ operation: 'delete', path: 'missing.hbs' }, 'file_not_found'],
    [{ operation: 'write', path: 'logo.png', content: 'binary' }, 'binary_file'],
  ])('rejects the entire patch when a later file operation is invalid', async (file, code) => {
    const draft = await patchDraft();
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [{ operation: 'write', path: 'index.hbs', content: '<main>First</main>' }, file],
    });
    expect(result).toMatchObject({ ok: false, revision: draft.revision, error: { code } });
    expect(draft.files['index.hbs'].content).toContain('{{> old}}');
  });

  it('rejects a settings error without retaining preceding file writes', async () => {
    const draft = await patchDraft();
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [{ operation: 'write', path: 'index.hbs', content: '<main>First</main>' }],
      settings: { 'global.accent_color': 'invalid' },
    });
    expect(result).toMatchObject({
      ok: false,
      revision: draft.revision,
      error: { code: 'invalid_color' },
    });
    expect(draft.globalSettings.accent_color).toBe('#000000');
  });

  it('reports identical content without a new revision', async () => {
    const draft = await patchDraft();
    const result = await stageThemePatch(draft, {
      revision: draft.revision,
      files: [{ operation: 'write', path: 'index.hbs', content: draft.files['index.hbs'].content }],
      settings: { 'global.accent_color': '#000000' },
    });
    expect(result).toMatchObject({ ok: true, revision: draft.revision, data: { unchanged: true } });
  });

  it.each([
    { files: null },
    {
      files: [
        { operation: 'write', path: 'index.hbs', content: 'A' },
        { operation: 'delete', path: 'index.hbs' },
      ],
    },
    {
      files: Array.from({ length: 33 }, (_, index) => ({
        operation: 'write',
        path: `${index}.hbs`,
        content: 'A',
      })),
    },
    { files: [{ operation: 'run', path: 'index.hbs', command: 'anything' }] },
    { files: [], ignored: true },
  ])('refuses ambiguous, oversized or unknown patch contracts', async (input) => {
    const draft = await patchDraft();
    expect(await stageThemePatch(draft, { revision: draft.revision, ...input })).toMatchObject({
      ok: false,
      error: { code: 'invalid_theme_patch' },
    });
  });

  it('rejects obsolete revisions before staging files', async () => {
    const draft = await patchDraft();
    expect(await stageThemePatch(draft, { revision: 'old', files: [] })).toMatchObject({
      ok: false,
      revision: draft.revision,
      error: { code: 'stale_revision' },
    });
  });
});
