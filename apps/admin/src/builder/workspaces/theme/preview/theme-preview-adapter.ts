import {ThemeRendererTransportError} from './preview-bridge';
import {cloneThemeDraft, withThemeRevision} from '@/builder/workspaces/theme/theme-state';
import {visibleThemeCustomSettings} from '@/builder/workspaces/theme/theme-loader';

import type {WorkspaceDiagnostic} from '@/builder/core/tool-types';
import type {BuilderPreviewAdapter, BuilderSelectionContext, ValidationResult} from '@/builder/core/workspace';
import type {PreviewAsset, PreviewDocumentSurface, PreviewInlineEditRequest, PreviewInlineEditResult} from './preview-document';
import type {PreviewElementInspection, PreviewElementTarget, PreviewPageInspection} from './preview-inspection';
import type {ThemeRendererCandidateSettings, ThemeRendererClient, ThemeRendererClientFactory, ThemeRenderResult} from './preview-bridge';
import type {ScreenshotRequest, ScreenshotResult} from './screenshot';
import type {ThemeDraft} from '@/builder/workspaces/theme/theme-state';

export type ThemePreviewState = {
    revision: string;
    url: string;
    status: number | null;
    diagnostics: WorkspaceDiagnostic[];
    selection: BuilderSelectionContext | null;
};

const MAX_PREVIEW_DIAGNOSTICS = 50;

export type ThemeNavigationResult =
    | {kind: 'virtual'; url: string; status: number}
    | {kind: 'external'; url: string}
    | {kind: 'failed'; url: string; diagnostics: WorkspaceDiagnostic[]};

function textTheme(draft: ThemeDraft): Record<string, string> {
    return Object.fromEntries(Object.entries(draft.files).flatMap(([path, file]) => file.kind === 'text' && file.content !== null ? [[path, file.content]] : []));
}

function rendererSettings(draft: ThemeDraft): ThemeRendererCandidateSettings {
    const visible = visibleThemeCustomSettings(draft.customSettings);
    return {
        settingsPayload: {
            ...draft.renderer.settingsPayload,
            accent_color: draft.globalSettings.accent_color,
            heading_font: draft.globalSettings.heading_font,
            body_font: draft.globalSettings.body_font,
            icon: draft.globalSettings.icon,
            logo: draft.globalSettings.logo,
            cover_image: draft.globalSettings.cover_image
        },
        customThemeSettings: Object.fromEntries(Object.entries(draft.customSettings).map(([key, setting]) => [key, visible[key] ? setting.value : null]))
    };
}

function previewAssets(draft: ThemeDraft): Record<string, PreviewAsset> {
    return Object.fromEntries(Object.entries(draft.files).flatMap(([path, file]) => path.startsWith('assets/') ? [[path, {
        content: file.content,
        binary: file.binary
    }]] : []));
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

function isSameSiteDestination(draft: ThemeDraft, destination: URL): boolean {
    const site = new URL(draft.renderer.siteUrl);
    const sitePath = site.pathname.endsWith('/') ? site.pathname : `${site.pathname}/`;
    const siteRoot = sitePath === '/' ? '/' : sitePath.slice(0, -1);
    return ['http:', 'https:'].includes(destination.protocol)
        && destination.origin === site.origin
        && (destination.pathname === siteRoot || destination.pathname.startsWith(sitePath));
}

export class ThemePreviewAdapter implements BuilderPreviewAdapter {
    readonly kind = 'theme';

    private readonly rendererFactory: ThemeRendererClientFactory;
    private readonly surface: PreviewDocumentSurface;
    private readonly listeners = new Set<(state: ThemePreviewState) => void>();
    private readonly unsubscribeNavigate: () => void;
    private readonly unsubscribeSelection: () => void;
    private readonly unsubscribeDiagnostic: () => void;
    private readonly unsubscribeInlineEdit: () => void;
    private renderer: ThemeRendererClient | null = null;
    private rendererRevision = '';
    private lastValidDraft: ThemeDraft | null = null;
    private lastValidResult: ThemeRenderResult | null = null;
    private currentState: ThemePreviewState = {revision: '', url: '', status: null, diagnostics: [], selection: null};
    private operationTail: Promise<void> = Promise.resolve();
    private currentOperation: AbortController | null = null;
    private selectionSequence = 0;
    private diagnosticsTruncated = false;
    private lastValidDiagnosticsTruncated = false;
    private destroyed = false;

    constructor({rendererFactory, surface, onInlineEdit}: {rendererFactory: ThemeRendererClientFactory; surface: PreviewDocumentSurface; onInlineEdit?: (edit: PreviewInlineEditRequest, signal: AbortSignal) => Promise<PreviewInlineEditResult>}) {
        this.rendererFactory = rendererFactory;
        this.surface = surface;
        this.unsubscribeNavigate = surface.onNavigate((url) => {
            const signal = new AbortController().signal;
            void this.enqueue(signal, operationSignal => this.navigateNow(url, operationSignal, true)).catch(() => {});
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
            const diagnostics = [...this.currentState.diagnostics, runtimeDiagnostic];
            this.diagnosticsTruncated ||= diagnostics.length > MAX_PREVIEW_DIAGNOSTICS;
            this.setState({...this.currentState, diagnostics: diagnostics.slice(-MAX_PREVIEW_DIAGNOSTICS)});
        });
        this.unsubscribeInlineEdit = onInlineEdit && surface.onInlineEdit
            ? surface.onInlineEdit(onInlineEdit)
            : () => {};
    }

    get state(): ThemePreviewState {
        return structuredClone(this.currentState);
    }

    get draft(): ThemeDraft {
        return cloneThemeDraft(this.requireDraft());
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

    async restoreDraft(draft: ThemeDraft, signal: AbortSignal): Promise<ValidationResult> {
        return this.enqueue(signal, operationSignal => this.renderCandidateNow(
            draft,
            operationSignal,
            draft.virtualUrl,
            draft.selection,
            draft.revision
        ));
    }

    rebaseDraft(draft: ThemeDraft): void {
        const previous = this.requireDraft();
        if (previous.virtualUrl !== draft.virtualUrl || previous.selection?.id !== draft.selection?.id) {
            throw new Error('A preview rebase cannot change navigation or selection state.');
        }
        this.lastValidDraft = cloneThemeDraft(draft);
        this.setState({...this.currentState, revision: draft.revision});
    }

    async navigate(target: string, signal: AbortSignal): Promise<ThemeNavigationResult> {
        return this.enqueue(signal, operationSignal => this.navigateNow(target, operationSignal));
    }

    async inspectPage(signal: AbortSignal): Promise<PreviewPageInspection & {diagnostics: WorkspaceDiagnostic[]; diagnosticsTruncated: boolean}> {
        return this.enqueue(signal, (operationSignal) => {
            this.throwIfUnavailable(operationSignal);
            return this.surface.inspectPage(this.currentState.url, operationSignal).then(result => ({...result, diagnostics: structuredClone(this.currentState.diagnostics), diagnosticsTruncated: this.diagnosticsTruncated}));
        });
    }

    async inspectElement(target: PreviewElementTarget, signal: AbortSignal): Promise<PreviewElementInspection> {
        return this.enqueue(signal, (operationSignal) => {
            this.throwIfUnavailable(operationSignal);
            return this.surface.inspectElement(target, operationSignal);
        });
    }

    async screenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<ScreenshotResult> {
        return this.enqueue(signal, async (operationSignal) => {
            this.throwIfUnavailable(operationSignal);
            const result = await this.surface.screenshot(request, operationSignal);
            this.throwIfUnavailable(operationSignal);
            return result;
        });
    }

    async setInlineEditMode(enabled: boolean, signal: AbortSignal): Promise<void> {
        if (!this.surface.setInlineEditMode) {
            throw new Error('The preview does not support inline editing.');
        }
        const queued = this.operationTail.then(() => {
            this.throwIfUnavailable(signal);
            return this.surface.setInlineEditMode?.(enabled, signal);
        });
        this.operationTail = queued.then(() => {}, () => {});
        await queued;
    }

    async setInteractionMode(mode: 'browse' | 'select' | 'edit', signal: AbortSignal): Promise<void> {
        if (!this.surface.setInteractionMode) {
            throw new Error('The preview does not support interaction modes.');
        }
        const queued = this.operationTail.then(() => {
            this.throwIfUnavailable(signal);
            return this.surface.setInteractionMode?.(mode, signal);
        });
        this.operationTail = queued.then(() => {}, () => {});
        await queued;
    }

    async setSelectionMode(enabled: boolean, signal: AbortSignal): Promise<void> {
        if (!this.surface.setSelectionMode) {
            throw new Error('The preview does not support source selection mode.');
        }
        const queued = this.operationTail.then(() => {
            this.throwIfUnavailable(signal);
            return this.surface.setSelectionMode?.(enabled, signal);
        });
        this.operationTail = queued.then(() => {}, () => {});
        await queued;
    }

    async clearSelection(): Promise<void> {
        if (this.destroyed || !this.currentState.selection) {
            return;
        }
        this.setState({...this.currentState, selection: null});
        await this.adoptSelection(null);
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
        this.unsubscribeInlineEdit();
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
                return {valid: true, diagnostics: this.currentState.diagnostics, revision: this.currentState.revision};
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

    private async renderCandidateNow(
        draft: ThemeDraft,
        signal: AbortSignal,
        targetUrl?: string,
        targetSelection = this.currentState.selection,
        expectedRevision?: string
    ): Promise<ValidationResult> {
        const previous = this.requireDraft();
        let documentReplacementAttempted = false;
        try {
            const result = await this.withRestart(async (client) => {
                await client.setTheme(textTheme(draft), draft.revision, signal, rendererSettings(draft));
                this.throwIfUnavailable(signal);
                this.rendererRevision = draft.revision;
                return client.render(targetUrl ?? previous.virtualUrl, this.rendererRevision, signal);
            }, signal);
            this.assertRenderable(result);
            const renderedDraft = {...draft, virtualUrl: result.url, selection: targetSelection};
            documentReplacementAttempted = true;
            await this.commit(renderedDraft, result, signal, {preserveSelection: expectedRevision !== undefined, expectedRevision});
            return {valid: true, diagnostics: this.currentState.diagnostics, revision: this.currentState.revision};
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

    private async navigateNow(target: string, signal: AbortSignal, openExternal = false): Promise<ThemeNavigationResult> {
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
        if (!isSameSiteDestination(draft, resolved)) {
            if (openExternal) {
                this.surface.openExternal(resolved.href);
                return {kind: 'external', url: resolved.href};
            }
            return this.blockNavigation(resolved.href, 'Agent navigation must stay on this site.');
        }
        let documentReplacementAttempted = false;
        try {
            const result = await this.withRestart(client => client.render(resolved.href, this.rendererRevision, signal), signal);
            this.assertRenderable(result);
            let resultUrl: URL;
            try {
                resultUrl = new URL(result.url);
            } catch {
                return this.blockNavigation(result.url, 'The renderer returned an invalid preview URL.');
            }
            if (!isSameSiteDestination(draft, resultUrl)) {
                return this.blockNavigation(result.url, 'The rendered preview redirected outside this site.');
            }
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
            revision: draft.revision,
            ...rendererSettings(draft)
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
            await this.requireRenderer().setTheme(textTheme(draft), draft.revision, signal, rendererSettings(draft));
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

    private async commit(
        draft: ThemeDraft,
        result: ThemeRenderResult,
        signal: AbortSignal,
        {preserveSelection = false, expectedRevision}: {preserveSelection?: boolean; expectedRevision?: string} = {}
    ): Promise<void> {
        this.throwIfUnavailable(signal);
        const remappedSelection = await this.surface.replaceDocument({html: result.html, url: result.url, revision: draft.revision, assets: previewAssets(draft)}, draft.selection, signal);
        this.throwIfUnavailable(signal);
        const selection = preserveSelection && remappedSelection?.id === draft.selection?.id ? draft.selection : remappedSelection;
        const selectionDiagnostic: WorkspaceDiagnostic[] = draft.selection && !selection ? [{
            code: 'preview_selection_cleared',
            message: 'The selected source element no longer exists in the rendered page, so the selection was cleared.',
            severity: 'info'
        }] : [];
        const allDiagnostics = [...result.diagnostics, ...selectionDiagnostic];
        this.diagnosticsTruncated = allDiagnostics.length > MAX_PREVIEW_DIAGNOSTICS;
        this.lastValidDiagnosticsTruncated = this.diagnosticsTruncated;
        const diagnostics = allDiagnostics.slice(-MAX_PREVIEW_DIAGNOSTICS);
        const revised = await withThemeRevision({...draft, virtualUrl: result.url, selection});
        this.throwIfUnavailable(signal);
        if (expectedRevision && revised.revision !== expectedRevision) {
            throw new Error('The preview could not restore the checkpoint selection and URL exactly.');
        }
        this.selectionSequence += 1;
        this.lastValidDraft = revised;
        this.lastValidResult = structuredClone({...result, diagnostics});
        this.setState({revision: revised.revision, url: result.url, status: result.status, diagnostics, selection});
    }

    private async restoreDocument(): Promise<void> {
        if (!this.lastValidDraft || !this.lastValidResult) {
            return;
        }
        try {
            const selection = await this.surface.replaceDocument({
                html: this.lastValidResult.html,
                url: this.lastValidResult.url,
                revision: this.lastValidDraft.revision,
                assets: previewAssets(this.lastValidDraft)
            }, this.currentState.selection, new AbortController().signal);
            const revised = await withThemeRevision({...this.lastValidDraft, selection});
            this.selectionSequence += 1;
            this.lastValidDraft = revised;
            this.diagnosticsTruncated = this.lastValidDiagnosticsTruncated;
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
        this.diagnosticsTruncated = false;
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
