import type {BuilderSelectionContext} from '@/builder/core/workspace';
import type {WorkspaceDiagnostic} from '@/builder/core/tool-types';
import {PREVIEW_INSPECTION_LIMITS, PreviewInspectionError} from './preview-inspection';
import {previewRuntimeBootstrap} from './preview-runtime';
import {captureDocumentScreenshot} from './screenshot';

import type {PreviewElementInspection, PreviewElementTarget, PreviewPageInspection} from './preview-inspection';
import type {ScreenshotRequest, ScreenshotResult} from './screenshot';

export type PreviewDocument = {
    html: string;
    url: string;
    revision: string;
};

export interface PreviewDocumentSurface {
    replaceDocument(document: PreviewDocument, selection: BuilderSelectionContext | null, signal: AbortSignal): Promise<BuilderSelectionContext | null>;
    inspectPage(url: string, signal: AbortSignal): Promise<PreviewPageInspection>;
    inspectElement(target: PreviewElementTarget, signal: AbortSignal): Promise<PreviewElementInspection>;
    screenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<ScreenshotResult>;
    openExternal(url: string): void;
    onNavigate(handler: (url: string) => void): () => void;
    onSelection(handler: (selection: BuilderSelectionContext | null) => void): () => void;
    onDiagnostic(handler: (diagnostic: WorkspaceDiagnostic) => void): () => void;
    destroy(): void;
}

type PreviewMessage =
    | {channel: string; documentId: string; type: 'ready'; selection: BuilderSelectionContext | null}
    | {channel: string; documentId: string; type: 'loaded'}
    | {channel: string; documentId: string; type: 'navigate'; url: string}
    | {channel: string; documentId: string; type: 'select'; selection: BuilderSelectionContext}
    | {channel: string; documentId: string; type: 'command-port'}
    | {channel: string; documentId: string; type: 'runtime-error'; message: string};

type CommandResultMessage =
    | {channel: string; documentId: string; type: 'command-result'; requestId: number; ok: true; result: unknown}
    | {channel: string; documentId: string; type: 'command-result'; requestId: number; ok: false; error: {code: string; message: string}};

type PreviewCommand = 'inspect-page' | 'inspect-element' | 'screenshot';

type PreviewScreenshotSnapshot = {
    html: string;
    viewport: {
        width: number;
        height: number;
        scrollX: number;
        scrollY: number;
    };
    warnings: string[];
};

function isPreviewScreenshotSnapshot(value: unknown): value is PreviewScreenshotSnapshot {
    const snapshot = value as Partial<PreviewScreenshotSnapshot>;
    const viewport = snapshot?.viewport as Partial<PreviewScreenshotSnapshot['viewport']> | undefined;
    return typeof snapshot?.html === 'string'
        && snapshot.html.length <= 4 * 1024 * 1024
        && Boolean(viewport)
        && typeof viewport?.width === 'number'
        && Number.isFinite(viewport.width)
        && viewport.width > 0
        && viewport.width <= 8_192
        && typeof viewport.height === 'number'
        && Number.isFinite(viewport.height)
        && viewport.height > 0
        && viewport.height <= 8_192
        && typeof viewport.scrollX === 'number'
        && Number.isFinite(viewport.scrollX)
        && typeof viewport.scrollY === 'number'
        && Number.isFinite(viewport.scrollY)
        && Array.isArray(snapshot.warnings)
        && snapshot.warnings.length <= 10
        && snapshot.warnings.every(warning => isBoundedString(warning, 500));
}

function isBoundedString(value: unknown, limit: number): value is string {
    return typeof value === 'string' && value.length <= limit;
}

function isFiniteBox(value: unknown): value is {x: number; y: number; width: number; height: number} {
    const box = value as {x?: unknown; y?: unknown; width?: unknown; height?: unknown};
    return Boolean(value) && typeof value === 'object' && [box.x, box.y, box.width, box.height].every(number => typeof number === 'number' && Number.isFinite(number));
}

function isSource(value: unknown): boolean {
    if (value === null) {
        return true;
    }
    const source = value as {path?: unknown; line?: unknown; column?: unknown};
    return Boolean(value)
        && typeof value === 'object'
        && isBoundedString(source.path, PREVIEW_INSPECTION_LIMITS.maxTargetCharacters)
        && source.path.length > 0
        && Number.isSafeInteger(source.line)
        && Number(source.line) > 0
        && Number.isSafeInteger(source.column)
        && Number(source.column) > 0;
}

function isPageInspection(value: unknown): value is PreviewPageInspection {
    const page = value as Partial<PreviewPageInspection>;
    const viewport = page?.viewport as Partial<PreviewPageInspection['viewport']> | undefined;
    const truncated = page?.truncated as Partial<PreviewPageInspection['truncated']> | undefined;
    return Boolean(value)
        && typeof value === 'object'
        && isBoundedString(page.title, 512)
        && isBoundedString(page.text, PREVIEW_INSPECTION_LIMITS.maxTextCharacters)
        && Boolean(viewport)
        && [viewport?.width, viewport?.height, viewport?.scrollX, viewport?.scrollY].every(number => typeof number === 'number' && Number.isFinite(number))
        && Array.isArray(page.outline)
        && page.outline.length <= PREVIEW_INSPECTION_LIMITS.maxOutlineItems
        && page.outline.every(item => isBoundedString(item?.tag, 64) && isBoundedString(item?.role, 64) && isBoundedString(item?.name, 256) && isSource(item?.source) && typeof item?.sourceTruncated === 'boolean')
        && typeof truncated?.outline === 'boolean'
        && typeof truncated.text === 'boolean'
        && typeof truncated.source === 'boolean';
}

function isBoundedRecord(value: unknown, allowed: readonly string[], limit: number): value is Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const entries = Object.entries(value);
    return entries.length <= allowed.length && entries.every(([key, item]) => allowed.includes(key) && isBoundedString(item, limit));
}

function isElementInspection(value: unknown): value is PreviewElementInspection {
    const element = value as Partial<PreviewElementInspection>;
    const truncated = element?.truncated as Partial<PreviewElementInspection['truncated']> | undefined;
    const attributes = ['id', 'class', 'role', 'aria-label', 'aria-labelledby', 'href', 'src', 'alt', 'title', 'type', 'name', 'data-edit'];
    const styles = ['display', 'position', 'visibility', 'opacity', 'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'width', 'height', 'margin', 'padding', 'gap', 'gridTemplateColumns', 'flexDirection', 'justifyContent', 'alignItems', 'borderRadius'];
    return Boolean(value)
        && typeof value === 'object'
        && isBoundedString(element.tag, 64)
        && isBoundedString(element.role, 64)
        && isBoundedString(element.accessibleName, 256)
        && isBoundedRecord(element.attributes, attributes, PREVIEW_INSPECTION_LIMITS.maxAttributeCharacters)
        && isBoundedRecord(element.styles, styles, PREVIEW_INSPECTION_LIMITS.maxStyleCharacters)
        && isFiniteBox(element.box)
        && isBoundedString(element.text, PREVIEW_INSPECTION_LIMITS.maxElementTextCharacters)
        && isSource(element.source)
        && typeof truncated?.text === 'boolean'
        && typeof truncated.source === 'boolean';
}

type PendingCommand = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
    removeAbortListener: () => void;
};

function isSelection(value: unknown): value is BuilderSelectionContext {
    const selection = value as BuilderSelectionContext;
    const data = selection?.data as {tagName?: unknown; marker?: unknown; source?: {path?: unknown; line?: unknown; column?: unknown}} | undefined;
    const validData = data === undefined || (
        data !== null
        && typeof data === 'object'
        && typeof data.tagName === 'string'
        && data.tagName.length <= 64
        && typeof data.marker === 'string'
        && data.marker === selection.id
        && data.source !== null
        && typeof data.source === 'object'
        && typeof data.source.path === 'string'
        && data.source.path.length > 0
        && data.source.path.length <= 512
        && Number.isSafeInteger(data.source.line)
        && Number(data.source.line) > 0
        && Number.isSafeInteger(data.source.column)
        && Number(data.source.column) > 0
    );
    return Boolean(value)
        && typeof value === 'object'
        && typeof selection.id === 'string'
        && selection.id.length <= 512
        && typeof selection.label === 'string'
        && selection.label.length <= 120
        && validData;
}

function isPreviewMessage(value: unknown): value is PreviewMessage {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const message = value as Partial<PreviewMessage>;
    if (typeof message.channel !== 'string' || typeof message.documentId !== 'string' || typeof message.type !== 'string') {
        return false;
    }
    if (message.type === 'ready') {
        return message.selection === null || isSelection(message.selection);
    }
    if (message.type === 'loaded') {
        return true;
    }
    if (message.type === 'navigate') {
        return typeof message.url === 'string' && message.url.length <= 8_192;
    }
    if (message.type === 'select') {
        return isSelection(message.selection);
    }
    if (message.type === 'command-port') {
        return true;
    }
    return message.type === 'runtime-error' && typeof message.message === 'string' && message.message.length <= 2_000;
}

function isCommandResultMessage(value: unknown): value is CommandResultMessage {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const message = value as Partial<CommandResultMessage>;
    return message.type === 'command-result'
        && typeof message.channel === 'string'
        && typeof message.documentId === 'string'
        && Number.isInteger(message.requestId)
        && (message.ok === true || (
            message.ok === false
            && Boolean(message.error)
            && typeof message.error?.code === 'string'
            && message.error.code.length <= 128
            && typeof message.error?.message === 'string'
            && message.error.message.length <= 2_000
        ));
}

export function createPreviewDocument(document: PreviewDocument, channel: string, selection: BuilderSelectionContext | null, documentId = document.revision): string {
    const parsed = new DOMParser().parseFromString(document.html, 'text/html');
    parsed.querySelectorAll('meta[http-equiv]').forEach((meta) => {
        const directive = meta.getAttribute('http-equiv')?.toLowerCase();
        if (directive === 'content-security-policy' || directive === 'refresh') {
            meta.remove();
        }
    });
    parsed.querySelectorAll('base').forEach(element => element.remove());
    const base = parsed.createElement('base');
    base.dataset.builderPreview = 'true';
    base.href = document.url;
    parsed.head.prepend(base);
    const script = parsed.createElement('script');
    script.dataset.builderPreview = 'true';
    script.dataset.builderChannel = channel;
    script.dataset.builderDocument = documentId;
    script.dataset.builderSelection = selection?.id ?? '';
    script.textContent = `;(${previewRuntimeBootstrap.toString()})();`.replace(/<\/script/gi, '<\\/script');
    parsed.head.prepend(script);
    return `<!doctype html>${parsed.documentElement.outerHTML}`;
}

export class IframePreviewDocumentSurface implements PreviewDocumentSurface {
    private readonly iframe: HTMLIFrameElement;
    private readonly channel = globalThis.crypto.randomUUID();
    private readonly openWindow: (url: string) => void;
    private readonly timeoutMs: number;
    private readonly commandTimeoutMs: number;
    private readonly navigateListeners = new Set<(url: string) => void>();
    private readonly selectionListeners = new Set<(selection: BuilderSelectionContext | null) => void>();
    private readonly diagnosticListeners = new Set<(diagnostic: WorkspaceDiagnostic) => void>();
    private documentSequence = 0;
    private activeDocumentId: string | null = null;
    private committedDocumentId: string | null = null;
    private committedSrcdoc: string | null = null;
    private pendingSrcdoc: string | null = null;
    private loadedDocumentId: string | null = null;
    private loadCheck: ReturnType<typeof setTimeout> | null = null;
    private pendingReady: {documentId: string; ready: boolean; loaded: boolean; selection: BuilderSelectionContext | null; resolve: (selection: BuilderSelectionContext | null) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout>; removeAbortListener: () => void} | null = null;
    private nextCommandId = 0;
    private readonly pendingCommands = new Map<number, PendingCommand>();
    private commandPort: MessagePort | null = null;
    private commandPortDocumentId: string | null = null;

    constructor(iframe: HTMLIFrameElement, {openWindow = url => window.open(url, '_blank', 'noopener'), timeoutMs = 5_000, commandTimeoutMs = 15_000}: {openWindow?: (url: string) => void; timeoutMs?: number; commandTimeoutMs?: number} = {}) {
        this.iframe = iframe;
        this.openWindow = openWindow;
        this.timeoutMs = timeoutMs;
        this.commandTimeoutMs = commandTimeoutMs;
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.addEventListener('load', this.handleLoad);
        window.addEventListener('message', this.handleMessage);
    }

    replaceDocument(document: PreviewDocument, selection: BuilderSelectionContext | null, signal: AbortSignal): Promise<BuilderSelectionContext | null> {
        if (signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        this.rejectPending(new Error('Preview document was replaced before it became ready.'), false);
        this.rejectCommands(new Error('Preview document was replaced before the command completed.'));
        this.closeCommandPort();
        return new Promise((resolve, reject) => {
            this.documentSequence += 1;
            const documentId = `${document.revision}:${this.documentSequence}`;
            this.activeDocumentId = documentId;
            const handleAbort = () => {
                if (this.pendingReady?.documentId !== documentId) {
                    return;
                }
                this.rejectPending(new DOMException('Aborted', 'AbortError'), true);
            };
            const timeout = setTimeout(() => {
                if (this.pendingReady?.documentId === documentId) {
                    this.rejectPending(new Error('Preview document timed out while loading.'), true);
                }
            }, this.timeoutMs);
            signal.addEventListener('abort', handleAbort, {once: true});
            this.pendingReady = {documentId, ready: false, loaded: false, selection: null, resolve, reject, timeout, removeAbortListener: () => signal.removeEventListener('abort', handleAbort)};
            this.pendingSrcdoc = createPreviewDocument(document, this.channel, selection, documentId);
            this.loadedDocumentId = null;
            this.iframe.srcdoc = this.pendingSrcdoc;
        });
    }

    async inspectPage(url: string, signal: AbortSignal): Promise<PreviewPageInspection> {
        const inspection = await this.command<unknown>('inspect-page', undefined, signal);
        if (!isPageInspection(inspection)) {
            throw new PreviewInspectionError('preview_inspection_failed', 'The preview returned an invalid page inspection.');
        }
        return {...inspection, url};
    }

    async inspectElement(target: PreviewElementTarget, signal: AbortSignal): Promise<PreviewElementInspection> {
        const inspection = await this.command<unknown>('inspect-element', target, signal);
        if (!isElementInspection(inspection)) {
            throw new PreviewInspectionError('preview_inspection_failed', 'The preview returned an invalid element inspection.');
        }
        return inspection;
    }

    async screenshot(request: ScreenshotRequest, signal: AbortSignal): Promise<ScreenshotResult> {
        const snapshot = await this.command<unknown>('screenshot', undefined, signal);
        if (!isPreviewScreenshotSnapshot(snapshot)) {
            throw new PreviewInspectionError('preview_screenshot_failed', 'The preview returned an invalid screenshot snapshot.');
        }
        const captureFrame = document.createElement('iframe');
        captureFrame.setAttribute('sandbox', 'allow-same-origin');
        captureFrame.setAttribute('aria-hidden', 'true');
        captureFrame.style.cssText = `position:fixed;left:-10000px;top:0;width:${snapshot.viewport.width}px;height:${snapshot.viewport.height}px;visibility:hidden;pointer-events:none`;
        document.body.appendChild(captureFrame);
        try {
            await this.loadCaptureFrame(captureFrame, snapshot.html, signal);
            const captureDocument = captureFrame.contentDocument;
            if (!captureDocument) {
                throw new PreviewInspectionError('preview_screenshot_failed', 'The screenshot document is unavailable.');
            }
            const result = await captureDocumentScreenshot(captureDocument, snapshot.viewport, request, signal);
            return {...result, warnings: [...snapshot.warnings, ...result.warnings]};
        } finally {
            captureFrame.remove();
        }
    }

    openExternal(url: string): void {
        this.openWindow(url);
    }

    onNavigate(handler: (url: string) => void): () => void {
        this.navigateListeners.add(handler);
        return () => this.navigateListeners.delete(handler);
    }

    onSelection(handler: (selection: BuilderSelectionContext | null) => void): () => void {
        this.selectionListeners.add(handler);
        return () => this.selectionListeners.delete(handler);
    }

    onDiagnostic(handler: (diagnostic: WorkspaceDiagnostic) => void): () => void {
        this.diagnosticListeners.add(handler);
        return () => this.diagnosticListeners.delete(handler);
    }

    destroy(): void {
        this.iframe.removeEventListener('load', this.handleLoad);
        window.removeEventListener('message', this.handleMessage);
        this.rejectPending(new Error('Preview surface was destroyed.'), false);
        this.rejectCommands(new Error('Preview surface was destroyed.'));
        this.closeCommandPort();
        this.navigateListeners.clear();
        this.selectionListeners.clear();
        this.diagnosticListeners.clear();
        this.activeDocumentId = null;
        this.committedDocumentId = null;
        this.committedSrcdoc = null;
        this.pendingSrcdoc = null;
        if (this.loadCheck) {
            clearTimeout(this.loadCheck);
            this.loadCheck = null;
        }
        this.iframe.removeAttribute('srcdoc');
    }

    private readonly handleMessage = (event: MessageEvent<unknown>) => {
        const message = event.data;
        if (event.source !== this.iframe.contentWindow || !isPreviewMessage(message) || message.channel !== this.channel || message.documentId !== this.activeDocumentId) {
            return;
        }
        if (message.type === 'ready') {
            if (this.pendingReady?.documentId === message.documentId) {
                this.pendingReady.ready = true;
                this.pendingReady.selection = message.selection;
                this.resolvePendingDocument();
            }
        } else if (message.type === 'command-port') {
            if (event.ports.length !== 1) {
                return;
            }
            this.adoptCommandPort(message.documentId, event.ports[0]);
            this.resolvePendingDocument();
        } else if (message.type === 'loaded') {
            this.loadedDocumentId = message.documentId;
            if (this.pendingReady?.documentId === message.documentId) {
                this.pendingReady.loaded = true;
                this.resolvePendingDocument();
            }
        } else if (message.type === 'navigate') {
            this.navigateListeners.forEach(listener => listener(message.url));
        } else if (message.type === 'select') {
            this.selectionListeners.forEach(listener => listener(message.selection));
        } else if (message.type === 'runtime-error') {
            const diagnostic = {code: 'preview_runtime_error', message: message.message, severity: 'error' as const};
            this.diagnosticListeners.forEach(listener => listener(diagnostic));
        }
    };

    private readonly handleCommandMessage = (event: MessageEvent<unknown>) => {
        const message = event.data;
        if (!isCommandResultMessage(message) || message.channel !== this.channel || message.documentId !== this.commandPortDocumentId) {
            return;
        }
        const pending = this.pendingCommands.get(message.requestId);
        if (!pending) {
            return;
        }
        this.pendingCommands.delete(message.requestId);
        clearTimeout(pending.timeout);
        pending.removeAbortListener();
        if (message.ok) {
            pending.resolve(message.result);
        } else {
            pending.reject(new PreviewInspectionError(message.error.code, message.error.message));
        }
    };

    private readonly handleLoad = () => {
        const documentId = this.activeDocumentId;
        if (!documentId) {
            return;
        }
        if (this.loadCheck) {
            clearTimeout(this.loadCheck);
        }
        this.loadCheck = setTimeout(() => {
            this.loadCheck = null;
            if (this.activeDocumentId !== documentId) {
                return;
            }
            if (this.loadedDocumentId === documentId) {
                this.loadedDocumentId = null;
                return;
            }
            const error = new Error('The preview attempted to navigate outside the virtual navigation bridge.');
            const diagnostic = {
                code: 'preview_navigation_bypassed',
                message: `${error.message} The last valid page was restored.`,
                severity: 'error' as const
            };
            this.diagnosticListeners.forEach(listener => listener(diagnostic));
            if (this.pendingReady?.documentId === documentId) {
                this.rejectPending(error, true);
            } else {
                this.restoreCommittedDocument();
            }
        }, 100);
    };

    private rejectPending(error: Error, restore: boolean): void {
        if (this.pendingReady) {
            clearTimeout(this.pendingReady.timeout);
            this.pendingReady.removeAbortListener();
            this.pendingReady.reject(error);
            this.pendingReady = null;
        }
        this.pendingSrcdoc = null;
        if (restore) {
            this.restoreCommittedDocument();
        }
    }

    private resolvePendingDocument(): void {
        const pending = this.pendingReady;
        if (!pending?.ready || !pending.loaded || !this.pendingSrcdoc || this.commandPortDocumentId !== pending.documentId) {
            return;
        }
        this.pendingReady = null;
        clearTimeout(pending.timeout);
        pending.removeAbortListener();
        this.committedDocumentId = pending.documentId;
        this.committedSrcdoc = this.pendingSrcdoc;
        this.pendingSrcdoc = null;
        pending.resolve(pending.selection);
    }

    private restoreCommittedDocument(): void {
        this.loadedDocumentId = null;
        this.rejectCommands(new Error('Preview document was restored before the command completed.'));
        this.closeCommandPort();
        if (this.committedSrcdoc && this.committedDocumentId) {
            this.activeDocumentId = this.committedDocumentId;
            this.iframe.srcdoc = this.committedSrcdoc;
        } else {
            this.activeDocumentId = null;
            this.iframe.srcdoc = '';
        }
    }

    private command<T>(command: PreviewCommand, payload: unknown, signal: AbortSignal): Promise<T> {
        if (!this.committedDocumentId || !this.commandPort || this.commandPortDocumentId !== this.committedDocumentId) {
            return Promise.reject(new Error('The preview document is not ready.'));
        }
        if (signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        this.nextCommandId += 1;
        const requestId = this.nextCommandId;
        return new Promise<T>((resolve, reject) => {
            const handleAbort = () => {
                const pending = this.pendingCommands.get(requestId);
                if (!pending) {
                    return;
                }
                this.pendingCommands.delete(requestId);
                clearTimeout(pending.timeout);
                signal.removeEventListener('abort', handleAbort);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            const timeout = setTimeout(() => {
                this.pendingCommands.delete(requestId);
                signal.removeEventListener('abort', handleAbort);
                reject(new Error(`The preview timed out during ${command}.`));
            }, this.commandTimeoutMs);
            signal.addEventListener('abort', handleAbort, {once: true});
            this.pendingCommands.set(requestId, {
                resolve: value => resolve(value as T),
                reject,
                timeout,
                removeAbortListener: () => signal.removeEventListener('abort', handleAbort)
            });
            this.commandPort?.postMessage({channel: this.channel, documentId: this.committedDocumentId, type: 'command', requestId, command, payload});
        });
    }

    private adoptCommandPort(documentId: string, port: MessagePort): void {
        this.closeCommandPort();
        this.commandPort = port;
        this.commandPortDocumentId = documentId;
        port.addEventListener('message', this.handleCommandMessage);
        port.start();
    }

    private closeCommandPort(): void {
        if (this.commandPort) {
            this.commandPort.removeEventListener('message', this.handleCommandMessage);
            this.commandPort.close();
            this.commandPort = null;
        }
        this.commandPortDocumentId = null;
    }

    private loadCaptureFrame(iframe: HTMLIFrameElement, html: string, signal: AbortSignal): Promise<void> {
        if (signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timeout);
                signal.removeEventListener('abort', handleAbort);
                iframe.removeEventListener('load', handleLoad);
            };
            const handleLoad = () => {
                cleanup();
                resolve();
            };
            const handleAbort = () => {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            };
            const timeout = setTimeout(() => {
                cleanup();
                reject(new PreviewInspectionError('preview_screenshot_failed', 'The screenshot document timed out while loading.'));
            }, this.commandTimeoutMs);
            signal.addEventListener('abort', handleAbort, {once: true});
            iframe.addEventListener('load', handleLoad, {once: true});
            iframe.srcdoc = html;
        });
    }

    private rejectCommands(error: Error): void {
        this.pendingCommands.forEach((pending) => {
            clearTimeout(pending.timeout);
            pending.removeAbortListener();
            pending.reject(error);
        });
        this.pendingCommands.clear();
    }
}
