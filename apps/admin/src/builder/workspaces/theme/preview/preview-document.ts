import type {BuilderSelectionContext} from '@/builder/core/workspace';
import type {WorkspaceDiagnostic} from '@/builder/core/tool-types';

export type PreviewDocument = {
    html: string;
    url: string;
    revision: string;
};

export interface PreviewDocumentSurface {
    replaceDocument(document: PreviewDocument, selection: BuilderSelectionContext | null, signal: AbortSignal): Promise<BuilderSelectionContext | null>;
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
    | {channel: string; documentId: string; type: 'runtime-error'; message: string};

function serialized(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function isSelection(value: unknown): value is BuilderSelectionContext {
    return Boolean(value)
        && typeof value === 'object'
        && typeof (value as BuilderSelectionContext).id === 'string'
        && (value as BuilderSelectionContext).id.length <= 512
        && typeof (value as BuilderSelectionContext).label === 'string'
        && (value as BuilderSelectionContext).label.length <= 120;
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
    return message.type === 'runtime-error' && typeof message.message === 'string' && message.message.length <= 2_000;
}

export function createPreviewDocument(document: PreviewDocument, channel: string, selection: BuilderSelectionContext | null, documentId = document.revision): string {
    const parsed = new DOMParser().parseFromString(document.html, 'text/html');
    parsed.querySelectorAll('meta[http-equiv]').forEach((meta) => {
        const directive = meta.getAttribute('http-equiv')?.toLowerCase();
        if (directive === 'content-security-policy' || directive === 'refresh') {
            meta.remove();
        }
    });
    parsed.querySelector('base[data-builder-preview]')?.remove();
    const base = parsed.createElement('base');
    base.dataset.builderPreview = 'true';
    base.href = document.url;
    parsed.head.prepend(base);
    const script = parsed.createElement('script');
    script.dataset.builderPreview = 'true';
    script.textContent = `(() => {
        const channel = ${serialized(channel)};
        const documentId = ${serialized(documentId)};
        const selectedId = ${serialized(selection?.id ?? null)};
        const send = message => parent.postMessage({channel, documentId, ...message}, '*');
        const context = element => ({
            id: element.getAttribute('data-edit')?.slice(0, 512),
            label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 120) || element.tagName.toLowerCase(),
            data: {tagName: element.tagName.toLowerCase()}
        });
        document.addEventListener('click', event => {
            const target = event.target instanceof Element ? event.target : null;
            const editable = target?.closest('[data-edit]');
            if (editable) {
                event.preventDefault();
                event.stopPropagation();
                send({type: 'select', selection: context(editable)});
                return;
            }
            const anchor = target?.closest('a[href]');
            if (anchor) {
                event.preventDefault();
                send({type: 'navigate', url: anchor.href});
            }
        }, true);
        addEventListener('error', event => send({type: 'runtime-error', message: String(event.message || 'Preview script failed').slice(0, 2000)}));
        addEventListener('unhandledrejection', event => send({type: 'runtime-error', message: String(event.reason?.message || event.reason || 'Unhandled preview rejection').slice(0, 2000)}));
        addEventListener('load', () => send({type: 'loaded'}), {once: true});
        const ready = () => {
            const selected = selectedId ? [...document.querySelectorAll('[data-edit]')].find(element => element.getAttribute('data-edit') === selectedId) : null;
            send({type: 'ready', selection: selected ? context(selected) : null});
        };
        document.currentScript?.remove();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ready, {once: true});
        } else {
            ready();
        }
    })();`;
    parsed.head.prepend(script);
    return `<!doctype html>${parsed.documentElement.outerHTML}`;
}

export class IframePreviewDocumentSurface implements PreviewDocumentSurface {
    private readonly iframe: HTMLIFrameElement;
    private readonly channel = globalThis.crypto.randomUUID();
    private readonly openWindow: (url: string) => void;
    private readonly timeoutMs: number;
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

    constructor(iframe: HTMLIFrameElement, {openWindow = url => window.open(url, '_blank', 'noopener'), timeoutMs = 5_000}: {openWindow?: (url: string) => void; timeoutMs?: number} = {}) {
        this.iframe = iframe;
        this.openWindow = openWindow;
        this.timeoutMs = timeoutMs;
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.addEventListener('load', this.handleLoad);
        window.addEventListener('message', this.handleMessage);
    }

    replaceDocument(document: PreviewDocument, selection: BuilderSelectionContext | null, signal: AbortSignal): Promise<BuilderSelectionContext | null> {
        if (signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        this.rejectPending(new Error('Preview document was replaced before it became ready.'), false);
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
        if (message.type === 'ready' && this.pendingReady?.documentId === message.documentId) {
            this.pendingReady.ready = true;
            this.pendingReady.selection = message.selection;
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
        if (!pending?.ready || !pending.loaded || !this.pendingSrcdoc) {
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
        if (this.committedSrcdoc && this.committedDocumentId) {
            this.activeDocumentId = this.committedDocumentId;
            this.iframe.srcdoc = this.committedSrcdoc;
        } else {
            this.activeDocumentId = null;
            this.iframe.srcdoc = '';
        }
    }
}
