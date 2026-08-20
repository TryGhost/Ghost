import type {WorkspaceDiagnostic} from '@/builder/core/tool-types';

export type ThemeRendererInitialization = {
    siteUrl: string;
    contentApiKey: string;
    config: Record<string, unknown>;
    theme: Record<string, string>;
    revision: string;
    settingsPayload?: Record<string, unknown>;
    customThemeSettings?: Record<string, string | boolean | null>;
};

export type ThemeRendererCandidateSettings = Pick<ThemeRendererInitialization, 'settingsPayload' | 'customThemeSettings'>;

export type ThemeRenderResult = {
    status: number;
    html: string;
    url: string;
    diagnostics: WorkspaceDiagnostic[];
};

export interface ThemeRendererClient {
    initialize(input: ThemeRendererInitialization, signal: AbortSignal): Promise<void>;
    setTheme(theme: Record<string, string>, revision: string, signal: AbortSignal, settings?: ThemeRendererCandidateSettings): Promise<void>;
    render(url: string, revision: string, signal: AbortSignal): Promise<ThemeRenderResult>;
    destroy(): void;
}

export type ThemeRendererClientFactory = () => Promise<ThemeRendererClient>;

export type ThemeRendererWorkerRequest =
    | {id: number; type: 'initialize'; revision: string; payload: Omit<ThemeRendererInitialization, 'revision'>}
    | {id: number; type: 'set-theme'; revision: string; payload: {theme: Record<string, string>} & ThemeRendererCandidateSettings}
    | {id: number; type: 'render'; revision: string; payload: {url: string; markers: true}}
    | {id: number; type: 'cancel'; revision: string; payload: {requestId: number}};

export type ThemeRendererWorkerResponse =
    | {id: number; revision: string; ok: true; result?: ThemeRenderResult}
    | {id: number; revision: string; ok: false; error: {code: string; message: string}};

export type ThemeRendererWorkerLike = Pick<Worker, 'postMessage' | 'terminate'> & {
    onmessage: ((event: MessageEvent<ThemeRendererWorkerResponse>) => void) | null;
    onerror: ((event: ErrorEvent) => void) | null;
    onmessageerror: ((event: MessageEvent) => void) | null;
};

type PendingRequest = {
    revision: string;
    resolve: (value: ThemeRenderResult | undefined) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
    removeAbortListener: () => void;
};

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

export class ThemeRendererTransportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ThemeRendererTransportError';
    }
}

export class ThemeRendererResponseError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'ThemeRendererResponseError';
        this.code = code;
    }
}

function defaultWorkerFactory(): ThemeRendererWorkerLike {
    return new Worker(new URL('./theme-renderer.worker.ts', import.meta.url), {type: 'module'});
}

export function createThemeRendererClient({
    workerFactory = defaultWorkerFactory,
    timeoutMs = 10_000
}: {
    workerFactory?: () => ThemeRendererWorkerLike;
    timeoutMs?: number;
} = {}): ThemeRendererClient {
    const worker = workerFactory();
    const pending = new Map<number, PendingRequest>();
    let nextId = 0;
    let destroyed = false;

    const rejectAll = (error: Error) => {
        for (const request of pending.values()) {
            clearTimeout(request.timeout);
            request.removeAbortListener();
            request.reject(error);
        }
        pending.clear();
    };

    worker.onmessage = (event) => {
        const response = event.data;
        const request = pending.get(response.id);
        if (!request) {
            return;
        }
        pending.delete(response.id);
        clearTimeout(request.timeout);
        request.removeAbortListener();
        if (response.revision !== request.revision) {
            request.reject(new ThemeRendererTransportError('The renderer returned a response for the wrong revision.'));
        } else if (response.ok) {
            request.resolve(response.result);
        } else {
            request.reject(new ThemeRendererResponseError(response.error.code, response.error.message));
        }
    };
    worker.onerror = event => rejectAll(new ThemeRendererTransportError(`Theme renderer worker crashed: ${event.message || 'unknown error'}`));
    worker.onmessageerror = () => rejectAll(new ThemeRendererTransportError('Theme renderer worker returned an unreadable response.'));

    const call = (request: WithoutId<ThemeRendererWorkerRequest>, signal: AbortSignal): Promise<ThemeRenderResult | undefined> => {
        if (destroyed) {
            return Promise.reject(new ThemeRendererTransportError('Theme renderer worker has been destroyed.'));
        }
        if (signal.aborted) {
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        nextId += 1;
        const id = nextId;
        return new Promise((resolve, reject) => {
            const handleAbort = () => {
                const active = pending.get(id);
                if (!active) {
                    return;
                }
                pending.delete(id);
                clearTimeout(active.timeout);
                signal.removeEventListener('abort', handleAbort);
                nextId += 1;
                worker.postMessage({id: nextId, type: 'cancel', revision: request.revision, payload: {requestId: id}} satisfies ThemeRendererWorkerRequest);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            const timeout = setTimeout(() => {
                pending.delete(id);
                signal.removeEventListener('abort', handleAbort);
                nextId += 1;
                worker.postMessage({id: nextId, type: 'cancel', revision: request.revision, payload: {requestId: id}} satisfies ThemeRendererWorkerRequest);
                reject(new ThemeRendererTransportError(`Theme renderer worker timed out during ${request.type}.`));
            }, timeoutMs);
            signal.addEventListener('abort', handleAbort, {once: true});
            pending.set(id, {
                revision: request.revision,
                resolve,
                reject,
                timeout,
                removeAbortListener: () => signal.removeEventListener('abort', handleAbort)
            });
            worker.postMessage({...request, id});
        });
    };

    return {
        async initialize({revision, ...payload}, signal) {
            await call({type: 'initialize', revision, payload}, signal);
        },
        async setTheme(theme, revision, signal, settings = {}) {
            await call({type: 'set-theme', revision, payload: {theme, ...settings}}, signal);
        },
        async render(url, revision, signal) {
            const result = await call({type: 'render', revision, payload: {url, markers: true}}, signal);
            if (!result) {
                throw new ThemeRendererTransportError('Theme renderer worker returned no document.');
            }
            return result;
        },
        destroy() {
            if (!destroyed) {
                destroyed = true;
                rejectAll(new ThemeRendererTransportError('Theme renderer worker was destroyed.'));
                worker.terminate();
            }
        }
    };
}
