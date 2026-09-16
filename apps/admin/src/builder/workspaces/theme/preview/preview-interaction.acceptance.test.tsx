import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { IframePreviewDocumentSurface } from './preview-document';
import { ThemePreviewAdapter } from './theme-preview-adapter';
import { withThemeRevision } from '@/builder/workspaces/theme/theme-state';
import { ThemeWorkspace } from '@/builder/workspaces/theme/theme-workspace';

import type { ThemeRendererClient, ThemeRenderResult } from './preview-bridge';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';

const adapters: ThemePreviewAdapter[] = [];
const iframes: HTMLIFrameElement[] = [];

class BrowserRenderer implements ThemeRendererClient {
  readonly initialize = vi.fn<ThemeRendererClient['initialize']>().mockResolvedValue();
  readonly setTheme = vi.fn<ThemeRendererClient['setTheme']>().mockResolvedValue();
  readonly render = vi.fn<ThemeRendererClient['render']>();
  readonly destroy = vi.fn();
}

async function draft(content: string, assets: Record<string, string> = {}): Promise<ThemeDraft> {
  return withThemeRevision({
    revision: '',
    theme: { name: 'demo', version: '1.0.0', builtIn: false, rootPrefix: 'demo/' },
    files: {
      'index.hbs': {
        path: 'index.hbs',
        kind: 'text',
        content,
        binary: null,
        unixPermissions: null,
        dosPermissions: null,
      },
      ...Object.fromEntries(
        Object.entries(assets).map(([path, assetContent]) => [
          path,
          {
            path,
            kind: 'text' as const,
            content: assetContent,
            binary: null,
            unixPermissions: null,
            dosPermissions: null,
          },
        ]),
      ),
    },
    globalSettings: {
      accent_color: null,
      heading_font: null,
      body_font: null,
      icon: null,
      logo: null,
      cover_image: null,
    },
    customSettings: {},
    renderer: { siteUrl: 'https://example.com/', contentApiKey: 'key', config: {}, missing: [] },
    virtualUrl: 'https://example.com/',
    selection: null,
  });
}

function rendered(html: string): ThemeRenderResult {
  return { status: 200, html, url: 'https://example.com/', diagnostics: [] };
}

afterEach(() => {
  adapters.splice(0).forEach((adapter) => adapter.destroy());
  iframes.splice(0).forEach((iframe) => iframe.remove());
});

describe('production preview interaction', () => {
  it('edits source-mapped text in place and rerenders the workspace candidate', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const renderer = new BrowserRenderer();
    let renderedTheme: Record<string, string> = {};
    renderer.initialize.mockImplementation((request) => {
      renderedTheme = request.theme;
      return Promise.resolve();
    });
    renderer.setTheme.mockImplementation((theme) => {
      renderedTheme = theme;
      return Promise.resolve();
    });
    renderer.render.mockImplementation(() =>
      Promise.resolve(
        rendered(
          renderedTheme['index.hbs']?.includes('Edited inline')
            ? '<html><body><h1 data-edit="index.hbs:1:1">Edited inline</h1></body></html>'
            : '<html><body><h1 data-edit="index.hbs:1:1">Initial heading</h1></body></html>',
        ),
      ),
    );
    const workspaceRef: { current: ThemeWorkspace | null } = { current: null };
    const adapter = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(renderer),
      surface: new IframePreviewDocumentSurface(iframe),
      onInlineEdit: async (edit, signal) => {
        if (!workspaceRef.current) {
          return { ok: false, message: 'Workspace unavailable.' };
        }
        const result =
          edit.kind === 'text'
            ? await workspaceRef.current.applyInlineTextEdit(edit, signal)
            : await workspaceRef.current.applyInlineImageEdit(edit, signal);
        return result.ok ? { ok: true } : { ok: false, message: result.error.message };
      },
    });
    adapters.push(adapter);
    const initial = await draft('<h1>Initial heading</h1>');
    const workspace = new ThemeWorkspace({
      id: 'theme:demo',
      title: 'Demo',
      load: async (signal) => {
        await adapter.start(initial, signal);
        return adapter.draft;
      },
      preview: adapter,
    });
    workspaceRef.current = workspace;
    await adapter.setInlineEditMode(true, new AbortController().signal);
    await workspace.load(new AbortController().signal);
    const frame = page.frameLocator(page.elementLocator(iframe));
    await frame.getByRole('heading', { name: 'Initial heading' }).click();
    const editor = frame.getByRole('textbox', { name: 'Edit Initial heading' });
    await editor.fill('Edited inline');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => workspace?.draft.files['index.hbs'].content).toContain('Edited inline');
    await expect(
      adapter.inspectElement({ marker: 'index.hbs:1:1' }, new AbortController().signal),
    ).resolves.toMatchObject({ text: 'Edited inline' });
  });

  it('replaces a source-mapped image and serves the new candidate asset', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const renderer = new BrowserRenderer();
    let renderedTheme: Record<string, string> = {};
    renderer.initialize.mockImplementation((request) => {
      renderedTheme = request.theme;
      return Promise.resolve();
    });
    renderer.setTheme.mockImplementation((theme) => {
      renderedTheme = theme;
      return Promise.resolve();
    });
    renderer.render.mockImplementation(() =>
      Promise.resolve(
        rendered(
          renderedTheme['index.hbs']?.includes('{{asset "images/builder/replacement.png"}}')
            ? '<html><body><img data-edit="index.hbs:1:1" alt="Hero" src="/assets/images/builder/replacement.png"><script>const image = document.querySelector("img"); const update = () => image.alt = `Hero loaded ${image.naturalWidth}`; image.complete ? update() : image.addEventListener("load", update, {once:true});</script></body></html>'
            : '<html><body><img data-edit="index.hbs:1:1" alt="Hero" src="/old.png"></body></html>',
        ),
      ),
    );
    const workspaceRef: { current: ThemeWorkspace | null } = { current: null };
    const adapter = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(renderer),
      surface: new IframePreviewDocumentSurface(iframe),
      onInlineEdit: async (edit, signal) => {
        if (!workspaceRef.current) {
          return { ok: false, message: 'Workspace unavailable.' };
        }
        const result =
          edit.kind === 'text'
            ? await workspaceRef.current.applyInlineTextEdit(edit, signal)
            : await workspaceRef.current.applyInlineImageEdit(edit, signal);
        return result.ok ? { ok: true } : { ok: false, message: result.error.message };
      },
    });
    adapters.push(adapter);
    const initial = await draft('<img alt="Hero" src="/old.png">');
    const workspace = new ThemeWorkspace({
      id: 'theme:demo',
      title: 'Demo',
      load: async (signal) => {
        await adapter.start(initial, signal);
        return adapter.draft;
      },
      preview: adapter,
    });
    workspaceRef.current = workspace;
    await adapter.setInlineEditMode(true, new AbortController().signal);
    await workspace.load(new AbortController().signal);
    const frame = page.frameLocator(page.elementLocator(iframe));
    await frame.getByRole('img', { name: 'Hero' }).click();
    const bytes = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      ),
      (character) => character.charCodeAt(0),
    );
    await frame
      .getByTestId('builder-inline-image-input')
      .upload(new File([bytes], 'replacement.png', { type: 'image/png' }));

    await expect
      .poll(() => workspace?.draft.files['index.hbs'].content)
      .toContain('{{asset "images/builder/replacement.png"}}');
    expect(
      Array.from(workspace.draft.files['assets/images/builder/replacement.png'].binary ?? []).slice(
        0,
        8,
      ),
    ).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect
      .poll(
        async () =>
          (await adapter.inspectElement({ marker: 'index.hbs:1:1' }, new AbortController().signal))
            .accessibleName,
      )
      .toBe('Hero loaded 1');
  });

  it('loads candidate theme assets and refreshes them after an agent mutation', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const renderer = new BrowserRenderer();
    const html =
      '<html><head><link rel="stylesheet" href="/assets/built/screen.css?v=live"></head><body><main id="asset-target" data-edit="index.hbs:1:1">Fallback</main><script type="module" src="/assets/built/candidate.js?v=live"></script></body></html>';
    renderer.render.mockResolvedValue(rendered(html));
    const adapter = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(renderer),
      surface: new IframePreviewDocumentSurface(iframe),
    });
    adapters.push(adapter);

    await adapter.start(
      await draft('<main>Initial</main>', {
        'assets/built/screen.css':
          '#asset-target { color: rgb(255, 0, 0); background-image: url("/content/images/fallback.png"); }',
        'assets/built/candidate.js':
          'import {label} from "./chunk.js"; export const prefix = "Initial"; const target = document.querySelector("#asset-target"); target.textContent = `${label()}|${getComputedStyle(target).backgroundImage}`; window.addEventListener("load", () => target.click(), {once: true});',
        'assets/built/chunk.js':
          'import {prefix} from "./candidate.js"; export const label = () => `${prefix} candidate`;',
      }),
      new AbortController().signal,
    );

    expect(adapter.state.selection).toBeNull();
    await expect(
      adapter.inspectElement({ selector: '#asset-target' }, new AbortController().signal),
    ).resolves.toMatchObject({
      text: 'Initial candidate|url("https://example.com/content/images/fallback.png")',
      styles: { color: 'rgb(255, 0, 0)' },
    });

    const validation = await adapter.renderCandidate(
      await draft('<main>Updated</main>', {
        'assets/built/screen.css':
          '#asset-target { color: rgb(0, 0, 255); background-image: url("/content/images/fallback.png"); }',
        'assets/built/candidate.js':
          'import {label} from "./chunk.js"; export const prefix = "Updated"; const target = document.querySelector("#asset-target"); target.textContent = `${label()}|${getComputedStyle(target).backgroundImage}`;',
        'assets/built/chunk.js':
          'import {prefix} from "./candidate.js"; export const label = () => `${prefix} candidate`;',
      }),
      new AbortController().signal,
    );

    expect(validation.valid).toBe(true);
    await expect(
      adapter.inspectElement({ selector: '#asset-target' }, new AbortController().signal),
    ).resolves.toMatchObject({
      text: 'Updated candidate|url("https://example.com/content/images/fallback.png")',
      styles: { color: 'rgb(0, 0, 255)' },
    });
  });

  it('maps click selection to source, remaps it after render, and explains when the source disappears', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const renderer = new BrowserRenderer();
    renderer.render
      .mockResolvedValueOnce(
        rendered(
          '<html><body><main data-edit="index.hbs:1:1"><span>Select me</span></main><script>document.querySelector("base").href = "https://theme-controlled.invalid/"; window.addEventListener("message", () => document.querySelector("span").textContent = "Command stolen", {capture:true}); window.addEventListener("click", event => event.stopImmediatePropagation(), true); MessagePort.prototype.postMessage = () => document.querySelector("span").textContent = "Port poisoned"; Promise.resolve = () => ({then: callback => callback({text: "Promise poisoned"})});</script></body></html>',
        ),
      )
      .mockResolvedValueOnce(
        rendered(
          '<html><body><main data-edit="index.hbs:1:1"><span>Still here</span></main></body></html>',
        ),
      )
      .mockResolvedValueOnce(
        rendered('<html><body><section>No source marker</section></body></html>'),
      );
    const adapter = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(renderer),
      surface: new IframePreviewDocumentSurface(iframe),
    });
    adapters.push(adapter);
    const initial = await draft('<main><span>Select me</span></main>');
    await adapter.start(initial, new AbortController().signal);
    const initialPage = await adapter.inspectPage(new AbortController().signal);
    expect(initialPage).toMatchObject({ url: 'https://example.com/', text: 'Select me' });

    await adapter.setSelectionMode(true, new AbortController().signal);
    const frame = page.frameLocator(page.elementLocator(iframe));
    await frame.getByText('Select me').click();

    await expect
      .poll(() => adapter.state.selection)
      .toMatchObject({
        id: 'index.hbs:1:1',
        label: 'Select me',
        data: {
          tagName: 'main',
          marker: 'index.hbs:1:1',
          source: { path: 'index.hbs', line: 1, column: 1 },
        },
      });
    const inspectedPage = await adapter.inspectPage(new AbortController().signal);
    const element = await adapter.inspectElement(
      { marker: 'index.hbs:1:1' },
      new AbortController().signal,
    );
    expect(inspectedPage).toMatchObject({ url: 'https://example.com/', text: 'Select me' });
    expect(element).toMatchObject({
      tag: 'main',
      source: { path: 'index.hbs', line: 1, column: 1 },
    });

    const retained = await adapter.renderCandidate(
      await draft('<main><span>Still here</span></main>'),
      new AbortController().signal,
    );
    expect(retained.valid).toBe(true);
    expect(adapter.state.selection?.id).toBe('index.hbs:1:1');

    const cleared = await adapter.renderCandidate(
      await draft('<section>No source marker</section>'),
      new AbortController().signal,
    );
    expect(cleared).toMatchObject({
      valid: true,
      diagnostics: [{ code: 'preview_selection_cleared' }],
    });
    expect(adapter.state.selection).toBeNull();
  });

  it('turns GET form submissions into same-site virtual navigation', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    document.body.appendChild(iframe);
    iframes.push(iframe);
    const renderer = new BrowserRenderer();
    renderer.render
      .mockResolvedValueOnce(
        rendered(
          '<html><body><form method="get" action="/search/"><input name="q" value="ghost"><button type="submit">Search</button></form><script>window.addEventListener("click", event => event.stopImmediatePropagation(), true); window.addEventListener("load", () => setTimeout(() => document.querySelector("button").click(), 50), {once:true})</script></body></html>',
        ),
      )
      .mockResolvedValueOnce({
        status: 200,
        html: '<html><body><main>Search results</main></body></html>',
        url: 'https://example.com/search/?q=ghost',
        diagnostics: [],
      });
    const adapter = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(renderer),
      surface: new IframePreviewDocumentSurface(iframe),
    });
    adapters.push(adapter);

    await adapter.start(
      await draft('<form method="get" action="/search/"></form>'),
      new AbortController().signal,
    );

    await expect
      .poll(() => ({
        url: adapter.state.url,
        diagnostics: adapter.state.diagnostics,
        renders: renderer.render.mock.calls.map((call) => call[0]),
      }))
      .toEqual({
        url: 'https://example.com/search/?q=ghost',
        diagnostics: [],
        renders: ['https://example.com/', 'https://example.com/search/?q=ghost'],
      });
    expect(renderer.render).toHaveBeenLastCalledWith(
      'https://example.com/search/?q=ghost',
      expect.any(String),
      expect.any(AbortSignal),
    );
  });
});
