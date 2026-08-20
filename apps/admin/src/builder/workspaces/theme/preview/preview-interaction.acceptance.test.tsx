import {afterEach, describe, expect, it, vi} from 'vitest';

import {IframePreviewDocumentSurface} from './preview-document';
import {ThemePreviewAdapter} from './theme-preview-adapter';
import {withThemeRevision} from '@/builder/workspaces/theme/theme-state';

import type {ThemeRendererClient, ThemeRenderResult} from './preview-bridge';
import type {ThemeDraft} from '@/builder/workspaces/theme/theme-state';

const adapters: ThemePreviewAdapter[] = [];
const iframes: HTMLIFrameElement[] = [];

class BrowserRenderer implements ThemeRendererClient {
    readonly initialize = vi.fn<ThemeRendererClient['initialize']>().mockResolvedValue();
    readonly setTheme = vi.fn<ThemeRendererClient['setTheme']>().mockResolvedValue();
    readonly render = vi.fn<ThemeRendererClient['render']>();
    readonly destroy = vi.fn();
}

async function draft(content: string): Promise<ThemeDraft> {
    return withThemeRevision({
        revision: '',
        theme: {name: 'demo', version: '1.0.0', builtIn: false, rootPrefix: 'demo/'},
        files: {
            'index.hbs': {path: 'index.hbs', kind: 'text', content, binary: null, unixPermissions: null, dosPermissions: null}
        },
        globalSettings: {accent_color: null, heading_font: null, body_font: null, icon: null, logo: null, cover_image: null},
        customSettings: {},
        renderer: {siteUrl: 'https://example.com/', contentApiKey: 'key', config: {}, missing: []},
        virtualUrl: 'https://example.com/',
        selection: null
    });
}

function rendered(html: string): ThemeRenderResult {
    return {status: 200, html, url: 'https://example.com/', diagnostics: []};
}

afterEach(() => {
    adapters.splice(0).forEach(adapter => adapter.destroy());
    iframes.splice(0).forEach(iframe => iframe.remove());
});

describe('production preview interaction', () => {
    it('maps click selection to source, remaps it after render, and explains when the source disappears', async () => {
        const iframe = document.createElement('iframe');
        iframe.style.width = '640px';
        iframe.style.height = '480px';
        document.body.appendChild(iframe);
        iframes.push(iframe);
        const renderer = new BrowserRenderer();
        renderer.render
            .mockResolvedValueOnce(rendered('<html><body><main data-edit="index.hbs:1:1"><span>Select me</span></main><script>document.querySelector("base").href = "https://theme-controlled.invalid/"; window.addEventListener("message", () => document.querySelector("span").textContent = "Command stolen", {capture:true}); window.addEventListener("click", event => event.stopImmediatePropagation(), true); MessagePort.prototype.postMessage = () => document.querySelector("span").textContent = "Port poisoned"; Promise.resolve = () => ({then: callback => callback({text: "Promise poisoned"})}); window.addEventListener("load", () => setTimeout(() => document.querySelector("span").click(), 50), {once:true})</script></body></html>'))
            .mockResolvedValueOnce(rendered('<html><body><main data-edit="index.hbs:1:1"><span>Still here</span></main></body></html>'))
            .mockResolvedValueOnce(rendered('<html><body><section>No source marker</section></body></html>'));
        const adapter = new ThemePreviewAdapter({
            rendererFactory: () => Promise.resolve(renderer),
            surface: new IframePreviewDocumentSurface(iframe)
        });
        adapters.push(adapter);
        const initial = await draft('<main><span>Select me</span></main>');
        await adapter.start(initial, new AbortController().signal);
        const initialPage = await adapter.inspectPage(new AbortController().signal);
        expect(initialPage).toMatchObject({url: 'https://example.com/', text: 'Select me'});

        await expect.poll(() => adapter.state.selection).toMatchObject({
            id: 'index.hbs:1:1',
            label: 'Select me',
            data: {
                tagName: 'main',
                marker: 'index.hbs:1:1',
                source: {path: 'index.hbs', line: 1, column: 1}
            }
        });
        const page = await adapter.inspectPage(new AbortController().signal);
        const element = await adapter.inspectElement({marker: 'index.hbs:1:1'}, new AbortController().signal);
        expect(page).toMatchObject({url: 'https://example.com/', text: 'Select me'});
        expect(element).toMatchObject({tag: 'main', source: {path: 'index.hbs', line: 1, column: 1}});

        const retained = await adapter.renderCandidate(await draft('<main><span>Still here</span></main>'), new AbortController().signal);
        expect(retained.valid).toBe(true);
        expect(adapter.state.selection?.id).toBe('index.hbs:1:1');

        const cleared = await adapter.renderCandidate(await draft('<section>No source marker</section>'), new AbortController().signal);
        expect(cleared).toMatchObject({valid: true, diagnostics: [{code: 'preview_selection_cleared'}]});
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
            .mockResolvedValueOnce(rendered('<html><body><form method="get" action="/search/"><input name="q" value="ghost"><button type="submit">Search</button></form><script>window.addEventListener("click", event => event.stopImmediatePropagation(), true); window.addEventListener("load", () => setTimeout(() => document.querySelector("button").click(), 50), {once:true})</script></body></html>'))
            .mockResolvedValueOnce({status: 200, html: '<html><body><main>Search results</main></body></html>', url: 'https://example.com/search/?q=ghost', diagnostics: []});
        const adapter = new ThemePreviewAdapter({
            rendererFactory: () => Promise.resolve(renderer),
            surface: new IframePreviewDocumentSurface(iframe)
        });
        adapters.push(adapter);

        await adapter.start(await draft('<form method="get" action="/search/"></form>'), new AbortController().signal);

        await expect.poll(() => ({url: adapter.state.url, diagnostics: adapter.state.diagnostics, renders: renderer.render.mock.calls.map(call => call[0])})).toEqual({url: 'https://example.com/search/?q=ghost', diagnostics: [], renders: ['https://example.com/', 'https://example.com/search/?q=ghost']});
        expect(renderer.render).toHaveBeenLastCalledWith('https://example.com/search/?q=ghost', expect.any(String), expect.any(AbortSignal));
    });
});
