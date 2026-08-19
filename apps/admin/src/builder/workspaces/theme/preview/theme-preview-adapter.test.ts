import {describe, expect, it, vi} from 'vitest';

import {ThemeRendererTransportError, createThemeRendererClient} from './preview-bridge';
import {IframePreviewDocumentSurface, createPreviewDocument} from './preview-document';
import {ThemePreviewAdapter} from './theme-preview-adapter';
import {createThemeRendererWorkerHandler} from './theme-renderer.worker';
import {withThemeRevision} from '@/builder/workspaces/theme/theme-state';

import type {BuilderSelectionContext} from '@/builder/core/workspace';
import type {ThemeRendererClient, ThemeRendererClientFactory, ThemeRendererWorkerLike, ThemeRendererWorkerRequest, ThemeRendererWorkerResponse, ThemeRenderResult} from './preview-bridge';
import type {PreviewDocumentSurface} from './preview-document';
import type {ThemeDraft} from '@/builder/workspaces/theme/theme-state';

async function draft(content = '<main>Initial</main>', virtualUrl = 'https://example.com/'): Promise<ThemeDraft> {
    return withThemeRevision({
        revision: '',
        theme: {name: 'demo', version: '1.0.0', builtIn: false, rootPrefix: 'demo/'},
        files: {
            'package.json': {path: 'package.json', kind: 'text', content: '{"name":"demo"}', binary: null, unixPermissions: null, dosPermissions: 0},
            'index.hbs': {path: 'index.hbs', kind: 'text', content, binary: null, unixPermissions: null, dosPermissions: 0},
            'assets/logo.png': {path: 'assets/logo.png', kind: 'binary', content: null, binary: new Uint8Array([1, 2, 3]), unixPermissions: null, dosPermissions: 0}
        },
        globalSettings: {accent_color: '#15171A', heading_font: null, body_font: null, icon: null, logo: null, cover_image: null},
        customSettings: {},
        renderer: {siteUrl: 'https://example.com/', contentApiKey: 'content-key', config: {}, missing: []},
        virtualUrl,
        selection: null
    });
}

class FakeRenderer implements ThemeRendererClient {
    readonly initialize = vi.fn<ThemeRendererClient['initialize']>();
    readonly setTheme = vi.fn<ThemeRendererClient['setTheme']>();
    readonly render = vi.fn<ThemeRendererClient['render']>();
    readonly destroy = vi.fn();

    constructor() {
        this.initialize.mockResolvedValue();
        this.setTheme.mockResolvedValue();
    }
}

class FakeSurface implements PreviewDocumentSurface {
    readonly documents: Array<{html: string; url: string; revision: string}> = [];
    readonly externalUrls: string[] = [];
    readonly selections: Array<BuilderSelectionContext | null> = [];
    remappedSelection: BuilderSelectionContext | null = null;
    navigationHandler: ((url: string) => void) | null = null;
    selectionHandler: ((selection: BuilderSelectionContext | null) => void) | null = null;
    diagnosticHandler: ((diagnostic: ThemeRenderResult['diagnostics'][number]) => void) | null = null;
    replaceError: Error | null = null;

    replaceDocument(document: {html: string; url: string; revision: string}, selection: BuilderSelectionContext | null, signal: AbortSignal): Promise<BuilderSelectionContext | null> {
        this.documents.push(document);
        this.selections.push(selection);
        if (signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        if (this.replaceError) {
            const error = this.replaceError;
            this.replaceError = null;
            return Promise.reject(error);
        }
        return Promise.resolve(this.remappedSelection);
    }

    openExternal(url: string): void {
        this.externalUrls.push(url);
    }

    onNavigate(handler: (url: string) => void): () => void {
        this.navigationHandler = handler;
        return () => this.navigationHandler = null;
    }

    onSelection(handler: (selection: BuilderSelectionContext | null) => void): () => void {
        this.selectionHandler = handler;
        return () => this.selectionHandler = null;
    }

    onDiagnostic(handler: (diagnostic: ThemeRenderResult['diagnostics'][number]) => void): () => void {
        this.diagnosticHandler = handler;
        return () => this.diagnosticHandler = null;
    }

    destroy(): void {}
}

function rendered(html: string, url = 'https://example.com/', diagnostics: ThemeRenderResult['diagnostics'] = []): ThemeRenderResult {
    return {status: 200, html, url, diagnostics};
}

function setup(renderer = new FakeRenderer()) {
    const surface = new FakeSurface();
    const factory = vi.fn<ThemeRendererClientFactory>(() => Promise.resolve(renderer));
    const adapter = new ThemePreviewAdapter({rendererFactory: factory, surface});
    return {adapter, factory, renderer, surface};
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return {promise, resolve, reject};
}

describe('ThemePreviewAdapter', () => {
    it('boots the renderer and commits the initial marked document', async () => {
        const initial = await draft();
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValue(rendered('<html><main data-edit="index.hbs:1:1">Initial</main></html>'));

        const validation = await adapter.start(initial, new AbortController().signal);

        expect(validation).toEqual({valid: true, diagnostics: [], revision: initial.revision});
        expect(renderer.initialize).toHaveBeenCalledWith(expect.objectContaining({revision: initial.revision, theme: {'package.json': '{"name":"demo"}', 'index.hbs': '<main>Initial</main>'}}), expect.any(AbortSignal));
        expect(renderer.render).toHaveBeenCalledWith(initial.virtualUrl, initial.revision, expect.any(AbortSignal));
        expect(surface.documents).toHaveLength(1);
        expect(surface.documents[0]?.html).toContain('data-edit');
        expect(surface.documents[0]).toMatchObject({url: initial.virtualUrl, revision: initial.revision});
    });

    it('commits a valid candidate rerender', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValueOnce(rendered('<html>Initial</html>')).mockResolvedValueOnce(rendered('<html>Changed</html>'));
        await adapter.start(initial, new AbortController().signal);

        const validation = await adapter.renderCandidate(candidate, new AbortController().signal);

        expect(validation.valid).toBe(true);
        expect(renderer.setTheme).toHaveBeenCalledWith(expect.objectContaining({'index.hbs': '<main>Changed</main>'}), candidate.revision, expect.any(AbortSignal));
        expect(surface.documents.at(-1)).toMatchObject({html: '<html>Changed</html>', revision: candidate.revision});
    });

    it('retains the last valid document and renderer theme when a candidate render fails', async () => {
        const initial = await draft();
        const candidate = await draft('<main>{{broken</main>');
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValueOnce(rendered('<html>Initial</html>')).mockRejectedValueOnce(new Error('Handlebars parse error'));
        await adapter.start(initial, new AbortController().signal);

        const validation = await adapter.renderCandidate(candidate, new AbortController().signal);

        expect(validation).toMatchObject({valid: false, revision: initial.revision, diagnostics: [{code: 'theme_render_failed'}]});
        expect(surface.documents).toHaveLength(1);
        expect(renderer.setTheme).toHaveBeenLastCalledWith(expect.objectContaining({'index.hbs': '<main>Initial</main>'}), initial.revision, expect.any(AbortSignal));
    });

    it.each([400, 500])('rejects a resolved HTTP %s theme failure without replacing the last valid document', async (status) => {
        const initial = await draft();
        const candidate = await draft('<main>{{> missing}}</main>');
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValueOnce(rendered('<html>Initial</html>')).mockResolvedValueOnce({
            ...rendered('<html>Template error</html>'),
            status
        });
        await adapter.start(initial, new AbortController().signal);

        const validation = await adapter.renderCandidate(candidate, new AbortController().signal);

        expect(validation).toMatchObject({valid: false, revision: initial.revision});
        expect(surface.documents).toHaveLength(1);
        expect(adapter.state).toMatchObject({revision: initial.revision, status: 200});
    });

    it('restores the last valid document when candidate adoption fails', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValueOnce(rendered('<html>Initial</html>')).mockResolvedValueOnce(rendered('<html>Changed</html>'));
        await adapter.start(initial, new AbortController().signal);
        surface.replaceError = new Error('Iframe bridge failed');

        const validation = await adapter.renderCandidate(candidate, new AbortController().signal);

        expect(validation.valid).toBe(false);
        expect(surface.documents).toHaveLength(3);
        expect(surface.documents.at(-1)).toMatchObject({html: '<html>Initial</html>', revision: initial.revision});
        expect(adapter.state).toMatchObject({revision: initial.revision, url: initial.virtualUrl});
    });

    it('propagates aborts without committing the candidate document', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const renderer = new FakeRenderer();
        const restarted = new FakeRenderer();
        const surface = new FakeSurface();
        const factory = vi.fn<ThemeRendererClientFactory>().mockResolvedValueOnce(renderer).mockResolvedValueOnce(restarted);
        const adapter = new ThemePreviewAdapter({rendererFactory: factory, surface});
        renderer.render.mockResolvedValue(rendered('<html>Initial</html>'));
        await adapter.start(initial, new AbortController().signal);
        const controller = new AbortController();
        renderer.setTheme.mockImplementationOnce((_theme, _revision, signal) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
        }));

        const rendering = adapter.renderCandidate(candidate, controller.signal);
        await vi.waitFor(() => expect(renderer.setTheme).toHaveBeenCalledOnce());
        controller.abort();

        await expect(rendering).rejects.toMatchObject({name: 'AbortError'});
        expect(surface.documents).toHaveLength(1);
        expect(renderer.destroy).toHaveBeenCalledOnce();
        expect(restarted.initialize).toHaveBeenCalledWith(expect.objectContaining({revision: initial.revision}), expect.any(AbortSignal));
    });

    it('does not restart or commit after the adapter is destroyed', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const renderer = new FakeRenderer();
        let rejectCandidate: ((error: Error) => void) | null = null;
        renderer.render.mockResolvedValue(rendered('<html>Initial</html>'));
        renderer.setTheme.mockImplementationOnce(() => new Promise((_resolve, reject) => {
            rejectCandidate = reject;
        }));
        renderer.destroy.mockImplementation(() => rejectCandidate?.(new ThemeRendererTransportError('destroyed')));
        const surface = new FakeSurface();
        const factory = vi.fn<ThemeRendererClientFactory>().mockResolvedValue(renderer);
        const adapter = new ThemePreviewAdapter({rendererFactory: factory, surface});
        await adapter.start(initial, new AbortController().signal);

        const rendering = adapter.renderCandidate(candidate, new AbortController().signal);
        await vi.waitFor(() => expect(renderer.setTheme).toHaveBeenCalledTimes(1));
        adapter.destroy();

        await expect(rendering).rejects.toMatchObject({name: 'AbortError'});
        expect(factory).toHaveBeenCalledOnce();
        expect(surface.documents).toHaveLength(1);
    });

    it('aborts iframe adoption and restores the old document before a superseding navigation', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const {adapter, renderer, surface} = setup();
        let rejectAdoption: ((error: DOMException) => void) | null = null;
        renderer.render
            .mockResolvedValueOnce(rendered('<html>Initial</html>'))
            .mockResolvedValueOnce(rendered('<html>Changed</html>'))
            .mockResolvedValueOnce(rendered('<html>About</html>', 'https://example.com/about/'));
        await adapter.start(initial, new AbortController().signal);
        const originalReplace = surface.replaceDocument.bind(surface);
        vi.spyOn(surface, 'replaceDocument').mockImplementationOnce((document, selection, signal) => {
            surface.documents.push(document);
            surface.selections.push(selection);
            return new Promise((_resolve, reject) => {
                rejectAdoption = reject;
                signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
            });
        }).mockImplementation(originalReplace);

        const rendering = adapter.renderCandidate(candidate, new AbortController().signal);
        await vi.waitFor(() => expect(rejectAdoption).not.toBeNull());
        const navigation = adapter.navigate('/about/', new AbortController().signal);

        await expect(rendering).rejects.toMatchObject({name: 'AbortError'});
        await expect(navigation).resolves.toMatchObject({kind: 'virtual', url: 'https://example.com/about/'});
        expect(surface.documents.at(-1)).toMatchObject({html: '<html>About</html>'});
    });

    it('performs same-site navigation virtually without changing the host page', async () => {
        const initial = await draft();
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValueOnce(rendered('<html>Home</html>')).mockResolvedValueOnce(rendered('<html>About</html>', 'https://example.com/about/'));
        await adapter.start(initial, new AbortController().signal);

        const result = await adapter.navigate('/about/', new AbortController().signal);

        expect(result).toEqual({kind: 'virtual', url: 'https://example.com/about/', status: 200});
        expect(surface.documents.at(-1)).toMatchObject({html: '<html>About</html>', url: 'https://example.com/about/'});
        expect(surface.externalUrls).toEqual([]);
    });

    it('surfaces external navigation without asking the renderer to follow it', async () => {
        const initial = await draft();
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValue(rendered('<html>Home</html>'));
        await adapter.start(initial, new AbortController().signal);

        const result = await adapter.navigate('https://outside.example/path', new AbortController().signal);

        expect(result).toEqual({kind: 'external', url: 'https://outside.example/path'});
        expect(surface.externalUrls).toEqual(['https://outside.example/path']);
        expect(renderer.render).toHaveBeenCalledOnce();
    });

    it('blocks navigation protocols that could execute in the host context', async () => {
        const initial = await draft();
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValue(rendered('<html>Home</html>'));
        await adapter.start(initial, new AbortController().signal);

        const result = await adapter.navigate('javascript:alert(document.cookie)', new AbortController().signal);

        expect(result).toMatchObject({kind: 'failed', diagnostics: [{code: 'preview_navigation_blocked'}]});
        expect(surface.externalUrls).toEqual([]);
        expect(renderer.render).toHaveBeenCalledOnce();
    });

    it('retains runtime diagnostics from the committed page', async () => {
        const initial = await draft();
        const {adapter, renderer, surface} = setup();
        renderer.render.mockResolvedValue(rendered('<html>Home</html>', initial.virtualUrl, [{code: 'preview_runtime_error', message: 'Script failed', severity: 'error'}]));

        await adapter.start(initial, new AbortController().signal);
        const runtimeDiagnostic = {code: 'preview_runtime_error', message: 'Later script failed', severity: 'error' as const};
        surface.diagnosticHandler?.(runtimeDiagnostic);

        expect(adapter.state.diagnostics).toEqual([
            {code: 'preview_runtime_error', message: 'Script failed', severity: 'error'},
            runtimeDiagnostic
        ]);
    });

    it('restarts a crashed worker from the last valid draft and retries once', async () => {
        const initial = await draft();
        const first = new FakeRenderer();
        const restarted = new FakeRenderer();
        first.render.mockResolvedValueOnce(rendered('<html>Home</html>')).mockRejectedValueOnce(new ThemeRendererTransportError('worker crashed'));
        restarted.render.mockResolvedValue(rendered('<html>About</html>', 'https://example.com/about/'));
        const surface = new FakeSurface();
        const factory = vi.fn<ThemeRendererClientFactory>()
            .mockResolvedValueOnce(first)
            .mockResolvedValueOnce(restarted);
        const adapter = new ThemePreviewAdapter({rendererFactory: factory, surface});
        await adapter.start(initial, new AbortController().signal);

        const result = await adapter.navigate('/about/', new AbortController().signal);

        expect(result).toMatchObject({kind: 'virtual', url: 'https://example.com/about/'});
        expect(first.destroy).toHaveBeenCalledOnce();
        expect(restarted.initialize).toHaveBeenCalledWith(expect.objectContaining({revision: initial.revision}), expect.any(AbortSignal));
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it('remaps the selected source marker after document replacement and clears missing markers', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const {adapter, renderer, surface} = setup();
        const selected = {id: 'index.hbs:1:1', label: 'Main'};
        renderer.render.mockResolvedValueOnce(rendered('<html>Initial</html>')).mockResolvedValueOnce(rendered('<html>Changed</html>'));
        surface.remappedSelection = selected;
        await adapter.start(initial, new AbortController().signal);
        surface.selectionHandler?.(selected);

        await adapter.renderCandidate(candidate, new AbortController().signal);
        expect(adapter.state.selection).toEqual(selected);

        surface.remappedSelection = null;
        renderer.render.mockResolvedValueOnce(rendered('<html>No marker</html>'));
        await adapter.navigate('/about/', new AbortController().signal);
        expect(adapter.state.selection).toBeNull();
    });

    it('uses the active selection when restoring after failed adoption', async () => {
        const initial = await draft();
        const candidate = await draft('<main>Changed</main>');
        const {adapter, renderer, surface} = setup();
        const selected = {id: 'index.hbs:1:1', label: 'Main'};
        renderer.render.mockResolvedValueOnce(rendered('<html>Initial</html>')).mockResolvedValueOnce(rendered('<html>Changed</html>'));
        await adapter.start(initial, new AbortController().signal);
        surface.selectionHandler?.(selected);
        surface.remappedSelection = selected;
        surface.replaceError = new Error('Iframe bridge failed');

        await adapter.renderCandidate(candidate, new AbortController().signal);

        expect(surface.selections.at(-1)).toEqual(selected);
        expect(adapter.state.selection).toEqual(selected);
    });

    it('restarts once when the initial worker transport fails', async () => {
        const initial = await draft();
        const failed = new FakeRenderer();
        const restarted = new FakeRenderer();
        failed.initialize.mockRejectedValue(new ThemeRendererTransportError('boot failed'));
        restarted.render.mockResolvedValue(rendered('<html>Initial</html>'));
        const surface = new FakeSurface();
        const factory = vi.fn<ThemeRendererClientFactory>().mockResolvedValueOnce(failed).mockResolvedValueOnce(restarted);
        const adapter = new ThemePreviewAdapter({rendererFactory: factory, surface});

        await expect(adapter.start(initial, new AbortController().signal)).resolves.toMatchObject({valid: true});
        expect(failed.destroy).toHaveBeenCalledOnce();
        expect(factory).toHaveBeenCalledTimes(2);
    });
});

class FakeWorker implements ThemeRendererWorkerLike {
    readonly messages: ThemeRendererWorkerRequest[] = [];
    readonly terminate = vi.fn();
    onmessage: ((event: MessageEvent<ThemeRendererWorkerResponse>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: ((event: MessageEvent) => void) | null = null;

    postMessage(message: ThemeRendererWorkerRequest): void {
        this.messages.push(message);
    }

    respond(response: ThemeRendererWorkerResponse): void {
        this.onmessage?.(new MessageEvent('message', {data: response}));
    }
}

describe('createThemeRendererClient', () => {
    it('correlates request and revision IDs and rejects mismatched responses', async () => {
        const worker = new FakeWorker();
        const client = createThemeRendererClient({workerFactory: () => worker});
        const signal = new AbortController().signal;
        const initializing = client.initialize({siteUrl: 'https://example.com/', contentApiKey: 'key', config: {}, theme: {'index.hbs': 'Hi'}, revision: 'rev-1'}, signal);
        const request = worker.messages[0];
        expect(request).toMatchObject({id: 1, type: 'initialize', revision: 'rev-1'});
        worker.respond({id: 1, revision: 'rev-1', ok: true});
        await initializing;

        const rendering = client.render('https://example.com/', 'rev-1', signal);
        worker.respond({id: 2, revision: 'stale-revision', ok: true, result: rendered('<html></html>')});

        await expect(rendering).rejects.toBeInstanceOf(ThemeRendererTransportError);
    });

    it('cancels an aborted request and enforces the call timeout', async () => {
        const worker = new FakeWorker();
        const client = createThemeRendererClient({workerFactory: () => worker, timeoutMs: 10});
        const controller = new AbortController();
        const rendering = client.render('https://example.com/', 'rev-1', controller.signal);
        controller.abort();

        await expect(rendering).rejects.toMatchObject({name: 'AbortError'});
        expect(worker.messages.at(-1)).toMatchObject({type: 'cancel', payload: {requestId: 1}});

        vi.useFakeTimers();
        try {
            const timedOut = client.render('https://example.com/', 'rev-1', new AbortController().signal);
            const timeoutExpectation = expect(timedOut).rejects.toBeInstanceOf(ThemeRendererTransportError);
            await vi.advanceTimersByTimeAsync(11);
            await timeoutExpectation;
            expect(worker.messages.at(-1)).toMatchObject({type: 'cancel', payload: {requestId: 3}});
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('theme renderer worker', () => {
    it('does not let an older theme compilation overwrite a newer revision', async () => {
        const initialRenderer = {render: vi.fn()};
        const olderRenderer = {render: vi.fn()};
        const newerRenderer = {render: vi.fn().mockResolvedValue(new Response('<html>Newest</html>', {status: 200}))};
        const older = deferred<typeof olderRenderer>();
        const newer = deferred<typeof newerRenderer>();
        const rendererFactory = vi.fn()
            .mockResolvedValueOnce(initialRenderer)
            .mockReturnValueOnce(older.promise)
            .mockReturnValueOnce(newer.promise);
        const responses: ThemeRendererWorkerResponse[] = [];
        const handle = createThemeRendererWorkerHandler({
            rendererFactory: rendererFactory as never,
            postMessage: response => responses.push(response)
        });
        await handle({id: 1, type: 'initialize', revision: 'rev-1', payload: {siteUrl: 'https://example.com/', contentApiKey: 'key', config: {}, theme: {'index.hbs': 'Initial'}}});
        const olderRequest = handle({id: 2, type: 'set-theme', revision: 'rev-2', payload: {theme: {'index.hbs': 'Older'}}});
        const newerRequest = handle({id: 3, type: 'set-theme', revision: 'rev-3', payload: {theme: {'index.hbs': 'Newer'}}});

        newer.resolve(newerRenderer);
        await newerRequest;
        older.resolve(olderRenderer);
        await olderRequest;
        await handle({id: 4, type: 'render', revision: 'rev-3', payload: {url: 'https://example.com/', markers: true}});

        expect(newerRenderer.render).toHaveBeenCalledOnce();
        expect(olderRenderer.render).not.toHaveBeenCalled();
        expect(responses).toContainEqual(expect.objectContaining({id: 2, ok: false}));
        expect(responses).toContainEqual(expect.objectContaining({id: 4, revision: 'rev-3', ok: true}));
    });
});

describe('preview document bridge', () => {
    it('creates an isolated document with base URL, link interception, and deferred selection remapping', () => {
        const html = createPreviewDocument(
            {html: '<html><head><title>Demo</title></head><body><a href="/about/"><main data-edit="index.hbs:1:1">Hello</main></a></body></html>', url: 'https://example.com/posts/', revision: 'rev-1'},
            'channel-1',
            {id: 'index.hbs:1:1', label: 'Main'},
            'document-1'
        );
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const bridgeScript = parsed.querySelector('script[data-builder-preview]')?.textContent ?? '';

        expect(parsed.querySelector('base[data-builder-preview]')?.getAttribute('href')).toBe('https://example.com/posts/');
        expect(bridgeScript).toContain("closest('[data-edit]')");
        expect(bridgeScript).toContain("closest('a[href]')");
        expect(bridgeScript).toContain('DOMContentLoaded');
        expect(bridgeScript).toContain('document-1');
    });

    it('removes directives that can disable the bridge or navigate outside it', () => {
        const html = createPreviewDocument(
            {html: '<html><head><meta http-equiv="Content-Security-Policy" content="script-src none"><meta http-equiv="refresh" content="0;url=https://outside.example"></head></html>', url: 'https://example.com/', revision: 'rev-1'},
            'channel-1',
            null
        );
        const parsed = new DOMParser().parseFromString(html, 'text/html');

        expect(parsed.querySelector('meta[http-equiv]')).toBeNull();
        expect(parsed.querySelector('script[data-builder-preview]')).not.toBeNull();
    });

    it('sandboxes the iframe without same-origin privileges', () => {
        const iframe = document.createElement('iframe');
        const surface = new IframePreviewDocumentSurface(iframe);

        expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
        expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');

        surface.destroy();
    });

    it('ignores messages from a document that has already been replaced', async () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const surface = new IframePreviewDocumentSurface(iframe, {timeoutMs: 1_000});
        const navigations: string[] = [];
        surface.onNavigate(url => navigations.push(url));
        const first = surface.replaceDocument({html: '<html></html>', url: 'https://example.com/', revision: 'rev-1'}, null, new AbortController().signal);
        const firstScript = iframe.srcdoc;
        const firstDocumentId = firstScript.match(/const documentId = "([^"]+)"/)?.[1];
        const channel = firstScript.match(/const channel = "([^"]+)"/)?.[1];
        const firstRejection = expect(first).rejects.toThrow('replaced');
        const second = surface.replaceDocument({html: '<html></html>', url: 'https://example.com/', revision: 'rev-2'}, null, new AbortController().signal);
        const secondDocumentId = iframe.srcdoc.match(/const documentId = "([^"]+)"/)?.[1];

        window.dispatchEvent(new MessageEvent('message', {source: iframe.contentWindow, data: {channel, documentId: firstDocumentId, type: 'navigate', url: 'https://example.com/stale/'}}));
        window.dispatchEvent(new MessageEvent('message', {source: iframe.contentWindow, data: {channel, documentId: secondDocumentId, type: 'ready', selection: null}}));
        window.dispatchEvent(new MessageEvent('message', {source: iframe.contentWindow, data: {channel, documentId: secondDocumentId, type: 'loaded'}}));

        await firstRejection;
        await second;
        expect(navigations).toEqual([]);
        surface.destroy();
        iframe.remove();
    });

    it('reports and restores an iframe navigation that bypasses the bridge', async () => {
        vi.useFakeTimers();
        const iframe = document.createElement('iframe');
        const surface = new IframePreviewDocumentSurface(iframe, {timeoutMs: 1_000});
        const diagnostics: ThemeRenderResult['diagnostics'] = [];
        surface.onDiagnostic(diagnostic => diagnostics.push(diagnostic));
        const controller = new AbortController();
        const replacing = surface.replaceDocument({html: '<html><h1>Home</h1></html>', url: 'https://example.com/', revision: 'rev-1'}, null, controller.signal);
        const expectedSrcdoc = iframe.srcdoc;
        const documentId = expectedSrcdoc.match(/const documentId = "([^"]+)"/)?.[1];
        const channel = expectedSrcdoc.match(/const channel = "([^"]+)"/)?.[1];
        window.dispatchEvent(new MessageEvent('message', {source: iframe.contentWindow, data: {channel, documentId, type: 'ready', selection: null}}));
        window.dispatchEvent(new MessageEvent('message', {source: iframe.contentWindow, data: {channel, documentId, type: 'loaded'}}));

        iframe.dispatchEvent(new Event('load'));
        await vi.advanceTimersByTimeAsync(101);
        iframe.dispatchEvent(new Event('load'));
        await vi.advanceTimersByTimeAsync(101);

        expect(diagnostics).toEqual([expect.objectContaining({code: 'preview_navigation_bypassed'})]);
        expect(iframe.srcdoc).toBe(expectedSrcdoc);
        await replacing;
        surface.destroy();
        vi.useRealTimers();
    });
});
