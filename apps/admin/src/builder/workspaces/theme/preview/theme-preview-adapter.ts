import {ThemeRendererTransportError} from './preview-bridge';
import {withThemeRevision} from '@/builder/workspaces/theme/theme-state';

import type {WorkspaceDiagnostic} from '@/builder/core/tool-types';
import type {BuilderPreviewAdapter, BuilderSelectionContext, ValidationResult} from '@/builder/core/workspace';
import type {PreviewDocumentSurface} from './preview-document';
import type {ThemeRendererClient, ThemeRendererClientFactory, ThemeRenderResult} from './preview-bridge';
import type {ThemeDraft} from '@/builder/workspaces/theme/theme-state';

export type ThemePreviewState = {
    revision: string;
    url: string;
    status: number | null;
    diagnostics: WorkspaceDiagnostic[];
    selection: BuilderSelectionContext | null;
};

export type ThemeNavigationResult =
    | {kind: 'virtual'; url: string; status: number}
    | {kind: 'external'; url: string}
    | {kind: 'failed'; url: string; diagnostics: WorkspaceDiagnostic[]};

function textTheme(draft: ThemeDraft): Record<string, string> {
    return Object.fromEntries(Object.entries(draft.files).flatMap(([path, file]) => file.kind === 'text' && file.content !== null ? [[path, file.content]] : []));
}

function diagnostic(error: unknown): WorkspaceDiagnostic {
    return {
        code: 'theme_render_failed',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error'
    };
}

function isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === 'AbortError';
}

export class ThemePreviewAdapter implements BuilderPreviewAdapter {
    readonly kind = 'theme';

    private readonly rendererFactory: ThemeRendererClientFactory;
    private readonly surface: PreviewDocumentSurface;
    private readonly listeners = new Set<(state: ThemePreviewState) => void>();
    private readonly unsubscribeNavigate: () => void;
    private readonly unsubscribeSelection: () => void;
    private readonly unsubscribeDiagnostic: () => void;
    private renderer: ThemeRendererClient | null = null;
    private rendererRevision = '';
    private lastValidDraft: ThemeDraft | null = null;
    private lastValidResult: ThemeRenderResult | null = null;
    private currentState: ThemePreviewState = {revision: '', url: '', status: null, diagnostics: [], selection: null};
    private operationTail: Promise<void> = Promise.resolve();
    private currentOperation: AbortController | null = null;
    private selectionSequence = 0;
    private destroyed = false;

    constructor({rendererFactory, surface}: {rendererFactory: ThemeRendererClientFactory; surface: PreviewDocumentSurface}) {
        this.rendererFactory = rendererFactory;
        this.surface = surface;
        this.unsubscribeNavigate = surface.onNavigate((url) => {
            void this.navigate(url, new AbortController().signal).catch(() => {});
        });
        this.unsubscribeSelection = surface.onSelection((selection) => {
            if (this.destroyed) {
                return;
            }
            this.setState({...this.currentState, selection});
            void this.adoptSelection(selection);
        });
        this.unsubscribeDiagnostic = surface.onDiagnostic((runtimeDiagnostic) => {
            if (this.destroyed) {
                return;
            }
            this.setState({...this.currentState, diagnostics: [...this.currentState.diagnostics, runtimeDiagnostic]});
        });
    }

    get state(): ThemePreviewState {
        return structuredClone(this.currentState);
    }

    subscribe(listener: (state: ThemePreviewState) => void): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    async start(draft: ThemeDraft, signal: AbortSignal): Promise<ValidationResult> {
        return this.enqueue(signal, operationSignal => this.startNow(draft, operationSignal));
    }

    async renderCandidate(draft: ThemeDraft, signal: AbortSignal): Promise<ValidationResult> {
        return this.enqueue(signal, operationSignal => this.renderCandidateNow(draft, operationSignal));
    }

    async navigate(target: string, signal: AbortSignal): Promise<ThemeNavigationResult> {
        return this.enqueue(signal, operationSignal => this.navigateNow(target, operationSignal));
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.currentOperation?.abort();
        this.currentOperation = null;
        this.renderer?.destroy();
        this.renderer = null;
        this.rendererRevision = '';
        this.unsubscribeNavigate();
        this.unsubscribeSelection();
        this.unsubscribeDiagnostic();
        this.surface.destroy();
        this.listeners.clear();
    }

    private async startNow(draft: ThemeDraft, signal: AbortSignal): Promise<ValidationResult> {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            this.throwIfUnavailable(signal);
            let renderer: ThemeRendererClient | null = null;
            try {
                renderer = await this.rendererFactory();
                this.throwIfUnavailable(signal);
                this.renderer = renderer;
                await this.initializeRenderer(renderer, draft, signal);
                const result = await renderer.render(draft.virtualUrl, this.rendererRevision, signal);
                this.assertRenderable(result);
                await this.commit(draft, result, signal);
                return {valid: true, diagnostics: result.diagnostics, revision: this.currentState.revision};
            } catch (error) {
                renderer?.destroy();
                if (this.renderer === renderer) {
                    this.renderer = null;
                    this.rendererRevision = '';
                }
                if (!(error instanceof ThemeRendererTransportError) || attempt === 1 || signal.aborted || this.destroyed) {
                    throw this.destroyed ? new DOMException('Aborted', 'AbortError') : error;
                }
            }
        }
        throw new ThemeRendererTransportError('Theme renderer failed to start.');
    }

    private async renderCandidateNow(draft: ThemeDraft, signal: AbortSignal): Promise<ValidationResult> {
        const previous = this.requireDraft();
        let documentReplacementAttempted = false;
        try {
            const result = await this.withRestart(async (client) => {
                await client.setTheme(textTheme(draft), draft.revision, signal);
                this.throwIfUnavailable(signal);
                this.rendererRevision = draft.revision;
                return client.render(previous.virtualUrl, this.rendererRevision, signal);
            }, signal);
            this.assertRenderable(result);
            const renderedDraft = {...draft, virtualUrl: result.url, selection: this.currentState.selection};
            documentReplacementAttempted = true;
            await this.commit(renderedDraft, result, signal);
            return {valid: true, diagnostics: result.diagnostics, revision: this.currentState.revision};
        } catch (error) {
            if (this.destroyed) {
                throw new DOMException('Aborted', 'AbortError');
            }
            const aborted = isAbortError(error) || signal.aborted;
            await this.restoreRenderer(previous, new AbortController().signal, aborted);
            if (documentReplacementAttempted) {
                await this.restoreDocument();
            }
            if (aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            const diagnostics = [diagnostic(error)];
            this.setState({...this.currentState, diagnostics});
            return {valid: false, diagnostics, revision: this.currentState.revision};
        }
    }

    private async navigateNow(target: string, signal: AbortSignal): Promise<ThemeNavigationResult> {
        const draft = this.requireDraft();
        let resolved: URL;
        try {
            resolved = new URL(target, this.currentState.url || draft.virtualUrl);
        } catch {
            return this.blockNavigation(target, 'The preview link is not a valid URL.');
        }
        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(resolved.protocol)) {
            return this.blockNavigation(resolved.href, `The preview cannot open ${resolved.protocol} links.`);
        }
        const site = new URL(draft.renderer.siteUrl);
        const sitePath = site.pathname.endsWith('/') ? site.pathname : `${site.pathname}/`;
        const siteRoot = sitePath === '/' ? '/' : sitePath.slice(0, -1);
        const isSameSite = ['http:', 'https:'].includes(resolved.protocol)
            && resolved.origin === site.origin
            && (resolved.pathname === siteRoot || resolved.pathname.startsWith(sitePath));
        if (!isSameSite) {
            this.surface.openExternal(resolved.href);
            return {kind: 'external', url: resolved.href};
        }
        let documentReplacementAttempted = false;
        try {
            const result = await this.withRestart(client => client.render(resolved.href, this.rendererRevision, signal), signal);
            this.assertRenderable(result);
            const navigated = {...draft, virtualUrl: result.url, selection: this.currentState.selection};
            documentReplacementAttempted = true;
            await this.commit(navigated, result, signal);
            return {kind: 'virtual', url: result.url, status: result.status};
        } catch (error) {
            if (documentReplacementAttempted && !this.destroyed) {
                await this.restoreDocument();
            }
            if (isAbortError(error) || signal.aborted || this.destroyed) {
                throw new DOMException('Aborted', 'AbortError');
            }
            const diagnostics = [diagnostic(error)];
            this.setState({...this.currentState, diagnostics});
            return {kind: 'failed', url: resolved.href, diagnostics};
        }
    }

    private async withRestart<T>(operation: (client: ThemeRendererClient) => Promise<T>, signal: AbortSignal): Promise<T> {
        const renderer = this.requireRenderer();
        try {
            return await operation(renderer);
        } catch (error) {
            if (!(error instanceof ThemeRendererTransportError)) {
                throw error;
            }
            renderer.destroy();
            this.throwIfUnavailable(signal);
            const restarted = await this.rendererFactory();
            try {
                this.throwIfUnavailable(signal);
            } catch (restartError) {
                restarted.destroy();
                throw restartError;
            }
            this.renderer = restarted;
            await this.initializeRenderer(restarted, this.requireDraft(), signal);
            return operation(restarted);
        }
    }

    private async initializeRenderer(renderer: ThemeRendererClient, draft: ThemeDraft, signal: AbortSignal): Promise<void> {
        await renderer.initialize({
            siteUrl: draft.renderer.siteUrl,
            contentApiKey: draft.renderer.contentApiKey,
            config: draft.renderer.config,
            theme: textTheme(draft),
            revision: draft.revision
        }, signal);
        this.throwIfUnavailable(signal);
        this.rendererRevision = draft.revision;
    }

    private async restoreRenderer(draft: ThemeDraft, signal: AbortSignal, forceRestart = false): Promise<void> {
        if (this.destroyed) {
            return;
        }
        try {
            if (forceRestart) {
                throw new ThemeRendererTransportError('Restarting after an aborted renderer mutation.');
            }
            await this.requireRenderer().setTheme(textTheme(draft), draft.revision, signal);
            this.rendererRevision = draft.revision;
        } catch {
            this.renderer?.destroy();
            const restarted = await this.rendererFactory();
            if (this.destroyed) {
                restarted.destroy();
                return;
            }
            this.renderer = restarted;
            await this.initializeRenderer(restarted, draft, signal);
        }
    }

    private async commit(draft: ThemeDraft, result: ThemeRenderResult, signal: AbortSignal): Promise<void> {
        this.throwIfUnavailable(signal);
        const selection = await this.surface.replaceDocument({html: result.html, url: result.url, revision: draft.revision}, this.currentState.selection, signal);
        this.throwIfUnavailable(signal);
        const revised = await withThemeRevision({...draft, virtualUrl: result.url, selection});
        this.throwIfUnavailable(signal);
        this.selectionSequence += 1;
        this.lastValidDraft = revised;
        this.lastValidResult = structuredClone(result);
        this.setState({revision: revised.revision, url: result.url, status: result.status, diagnostics: result.diagnostics, selection});
    }

    private async restoreDocument(): Promise<void> {
        if (!this.lastValidDraft || !this.lastValidResult) {
            return;
        }
        try {
            const selection = await this.surface.replaceDocument({
                html: this.lastValidResult.html,
                url: this.lastValidResult.url,
                revision: this.lastValidDraft.revision
            }, this.currentState.selection, new AbortController().signal);
            const revised = await withThemeRevision({...this.lastValidDraft, selection});
            this.selectionSequence += 1;
            this.lastValidDraft = revised;
            this.setState({
                revision: revised.revision,
                url: this.lastValidResult.url,
                status: this.lastValidResult.status,
                diagnostics: this.lastValidResult.diagnostics,
                selection
            });
        } catch {
            // The surface reports its original adoption failure to the caller.
        }
    }

    private blockNavigation(url: string, message: string): ThemeNavigationResult {
        const diagnostics = [{code: 'preview_navigation_blocked', message, severity: 'error' as const}];
        this.setState({...this.currentState, diagnostics});
        return {kind: 'failed', url, diagnostics};
    }

    private requireRenderer(): ThemeRendererClient {
        if (!this.renderer) {
            throw new Error('Theme preview renderer has not started.');
        }
        return this.renderer;
    }

    private assertRenderable(result: ThemeRenderResult): void {
        if (result.status === 400 || result.status >= 500) {
            throw new Error(`Theme renderer returned HTTP ${result.status}.`);
        }
    }

    private async adoptSelection(selection: BuilderSelectionContext | null): Promise<void> {
        if (!this.lastValidDraft) {
            return;
        }
        this.selectionSequence += 1;
        const sequence = this.selectionSequence;
        const previousRevision = this.lastValidDraft.revision;
        const revised = await withThemeRevision({...this.lastValidDraft, selection});
        if (this.destroyed || sequence !== this.selectionSequence || this.lastValidDraft?.revision !== previousRevision) {
            return;
        }
        this.lastValidDraft = revised;
        this.setState({...this.currentState, revision: revised.revision, selection});
    }

    private throwIfUnavailable(signal: AbortSignal): void {
        if (this.destroyed || signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
    }

    private enqueue<T>(signal: AbortSignal, operation: (operationSignal: AbortSignal) => Promise<T>): Promise<T> {
        if (this.destroyed) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        this.currentOperation?.abort();
        const controller = new AbortController();
        this.currentOperation = controller;
        const handleAbort = () => controller.abort();
        if (signal.aborted) {
            controller.abort();
        } else {
            signal.addEventListener('abort', handleAbort, {once: true});
        }
        const queued = this.operationTail.then(async () => {
            try {
                this.throwIfUnavailable(controller.signal);
                return await operation(controller.signal);
            } finally {
                signal.removeEventListener('abort', handleAbort);
                if (this.currentOperation === controller) {
                    this.currentOperation = null;
                }
            }
        });
        this.operationTail = queued.then(() => {}, () => {});
        return queued;
    }

    private requireDraft(): ThemeDraft {
        if (!this.lastValidDraft) {
            throw new Error('Theme preview has not rendered a valid draft.');
        }
        return this.lastValidDraft;
    }

    private setState(state: ThemePreviewState): void {
        this.currentState = state;
        this.listeners.forEach(listener => listener(this.state));
    }
}
