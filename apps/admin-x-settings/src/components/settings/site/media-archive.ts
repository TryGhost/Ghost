import JSZip from 'jszip';

// POC: client-side "Download all media".
//
// The media-library inventory hands the browser absolute CDN URLs, and the Pro
// asset CDN answers cross-origin reads with `access-control-allow-origin: *`, so
// the whole archive can be pulled CDN -> browser -> disk without the Ghost server
// ever touching the bytes. Two shapes:
//
//   - Folder (File System Access API, Chromium): streams each asset straight to a
//     folder the user picks, recreating content/images/YYYY/MM/... subpaths. Memory
//     stays flat regardless of library size, and it resumes by skipping files that
//     are already on disk.
//   - Zip (fallback, Firefox/Safari): fetches each asset and packs one .zip. JSZip
//     buffers the whole archive in memory, so this is the lesser path for large
//     sites — it is the universal fallback, not the default.

export type ArchiveItem = {
    url: string;
    filename: string;
};

export type ArchiveProgress = {
    total: number;
    completed: number; // freshly written / added this run
    skipped: number; // already on disk (resume)
    failed: number;
    currentFile: string | null;
};

export type ArchiveFailure = {
    item: ArchiveItem;
    reason: string;
};

export type ArchiveResult = {
    completed: number;
    skipped: number;
    failures: ArchiveFailure[];
    cancelled: boolean;
    diskFull: boolean;
};

// Minimal File System Access API surface. lib.dom types it inconsistently across
// TS versions (and omits showDirectoryPicker), so we declare just what we touch.
export interface ArchiveFileHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<WritableStream<unknown> & {abort?: () => Promise<void>}>;
}
export interface ArchiveDirHandle {
    getDirectoryHandle(name: string, options?: {create?: boolean}): Promise<ArchiveDirHandle>;
    getFileHandle(name: string, options?: {create?: boolean}): Promise<ArchiveFileHandle>;
    queryPermission?(options?: {mode?: 'read' | 'readwrite'}): Promise<PermissionState>;
    requestPermission?(options?: {mode?: 'read' | 'readwrite'}): Promise<PermissionState>;
}

// ~5 keeps the download moving without hammering the CDN into rate-limiting a
// single browser making thousands of requests.
const CONCURRENCY = 5;
// Each file gets a few tries to ride out a transient blip or a brief 429.
const ATTEMPTS = 3;

const sleep = (ms: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
});

export const supportsFolderArchive = (): boolean => typeof window !== 'undefined' &&
    typeof (window as unknown as {showDirectoryPicker?: unknown}).showDirectoryPicker === 'function';

/**
 * Rebuild the storage-relative path Ghost uses, so the download mirrors the real
 * content/ tree:
 *   https://storage.ghost.io/c/<hash>/content/images/2024/06/foo.png
 *     -> content/images/2024/06/foo.png
 * Falls back to the bare filename when there is no /content/ segment (e.g. a
 * custom CDN that rewrites the path).
 */
export function archivePathForUrl(url: string): string {
    try {
        const {pathname} = new URL(url);
        const marker = '/content/';
        const idx = pathname.indexOf(marker);
        const path = idx === -1 ? (pathname.split('/').pop() || 'download') : pathname.slice(idx + 1);
        return decodeURIComponent(path);
    } catch {
        return url.split('/').pop() || 'download';
    }
}

const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === 'AbortError';

const isQuotaError = (err: unknown): boolean => {
    const name = (err as {name?: string})?.name;
    return name === 'QuotaExceededError' || name === 'NotAllowedError';
};

const failureReason = (err: unknown): string => {
    const message = (err as Error)?.message;
    return message || 'Unknown error';
};

/**
 * Run `worker` over `items` with a fixed number of lanes. Each lane pulls the
 * next item until the list is exhausted or the run is aborted.
 */
async function runPool<T>(items: T[], signal: AbortSignal, worker: (item: T) => Promise<void>): Promise<void> {
    let cursor = 0;
    const lane = async (): Promise<void> => {
        while (cursor < items.length && !signal.aborted) {
            const item = items[cursor];
            cursor += 1;
            await worker(item);
        }
    };
    await Promise.all(Array.from({length: Math.min(CONCURRENCY, items.length)}, lane));
}

async function fetchWithRetry(url: string, signal: AbortSignal): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
        if (signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        try {
            // credentials omitted on purpose: the assets are public and the CDN's
            // wildcard CORS only applies to anonymous requests. Sending admin
            // cookies cross-origin would both leak them and break the read.
            const response = await fetch(url, {signal, credentials: 'omit', mode: 'cors'});
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response;
        } catch (err) {
            if (isAbort(err)) {
                throw err;
            }
            lastError = err;
            await sleep(400 * (attempt + 1));
        }
    }
    throw lastError ?? new Error('Failed to fetch');
}

/**
 * Open the native folder picker. Returns null if the user dismisses it.
 */
export async function pickArchiveFolder(): Promise<ArchiveDirHandle | null> {
    const picker = (window as unknown as {
        showDirectoryPicker: (options?: {mode?: 'read' | 'readwrite'}) => Promise<ArchiveDirHandle>;
    }).showDirectoryPicker;
    try {
        return await picker({mode: 'readwrite'});
    } catch (err) {
        if (isAbort(err)) {
            return null;
        }
        throw err;
    }
}

async function existingFileSize(dir: ArchiveDirHandle, fileName: string): Promise<number> {
    try {
        const handle = await dir.getFileHandle(fileName);
        const file = await handle.getFile();
        return file.size;
    } catch {
        return 0; // not present yet
    }
}

/**
 * Stream every asset into the picked folder, recreating its content/ subpath.
 * Memory stays flat: at most CONCURRENCY response bodies are piped to disk at a
 * time, never the whole library. Files already on disk are skipped, which is what
 * makes an interrupted run resumable.
 */
export async function runFolderArchive(options: {
    items: ArchiveItem[];
    root: ArchiveDirHandle;
    signal: AbortSignal;
    skipExisting: boolean;
    onProgress: (progress: ArchiveProgress) => void;
}): Promise<ArchiveResult> {
    const {items, root, signal, skipExisting, onProgress} = options;
    const failures: ArchiveFailure[] = [];
    let completed = 0;
    let skipped = 0;
    let diskFull = false;

    // Resolve content/images/2024/06 once, not per file in that month.
    const dirCache = new Map<string, ArchiveDirHandle>();
    const ensureDir = async (segments: string[]): Promise<ArchiveDirHandle> => {
        let handle = root;
        let key = '';
        for (const segment of segments) {
            key += `${segment}/`;
            const cached = dirCache.get(key);
            if (cached) {
                handle = cached;
            } else {
                handle = await handle.getDirectoryHandle(segment, {create: true});
                dirCache.set(key, handle);
            }
        }
        return handle;
    };

    const emit = (currentFile: string | null) => onProgress({
        total: items.length, completed, skipped, failed: failures.length, currentFile
    });

    await runPool(items, signal, async (item) => {
        // Once the disk is full every further write fails; stop touching it
        // rather than churn the remaining files into failures.
        if (diskFull) {
            return;
        }
        const segments = archivePathForUrl(item.url).split('/');
        const fileName = segments.pop() as string;
        emit(fileName);
        try {
            const dir = await ensureDir(segments);
            if (skipExisting && (await existingFileSize(dir, fileName)) > 0) {
                skipped += 1;
                emit(fileName);
                return;
            }
            const response = await fetchWithRetry(item.url, signal);
            const fileHandle = await dir.getFileHandle(fileName, {create: true});
            const writable = await fileHandle.createWritable();
            try {
                if (response.body) {
                    await response.body.pipeTo(writable as unknown as WritableStream<Uint8Array>);
                } else {
                    const stream = writable as unknown as {write: (data: Blob) => Promise<void>; close: () => Promise<void>};
                    await stream.write(await response.blob());
                    await stream.close();
                }
            } catch (writeErr) {
                await writable.abort?.();
                if (isQuotaError(writeErr)) {
                    diskFull = true;
                }
                throw writeErr;
            }
            completed += 1;
            emit(fileName);
        } catch (err) {
            if (isAbort(err) || signal.aborted) {
                return;
            }
            failures.push({item, reason: failureReason(err)});
            emit(fileName);
        }
    });

    return {completed, skipped, failures, cancelled: signal.aborted, diskFull};
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/**
 * Fallback for browsers without the File System Access API: fetch every asset and
 * pack one .zip. STORE (no compression) because media is already compressed, so
 * DEFLATE would burn CPU for nothing. JSZip buffers the whole archive in memory,
 * which is this path's hard ceiling on very large sites.
 */
export async function runZipArchive(options: {
    items: ArchiveItem[];
    signal: AbortSignal;
    fileName: string;
    onProgress: (progress: ArchiveProgress) => void;
}): Promise<ArchiveResult> {
    const {items, signal, fileName, onProgress} = options;
    const zip = new JSZip();
    const failures: ArchiveFailure[] = [];
    let completed = 0;

    const emit = (currentFile: string | null) => onProgress({
        total: items.length, completed, skipped: 0, failed: failures.length, currentFile
    });

    await runPool(items, signal, async (item) => {
        const path = archivePathForUrl(item.url);
        const fileLabel = path.split('/').pop() || path;
        emit(fileLabel);
        try {
            const response = await fetchWithRetry(item.url, signal);
            zip.file(path, await response.blob(), {createFolders: true});
            completed += 1;
            emit(fileLabel);
        } catch (err) {
            if (isAbort(err) || signal.aborted) {
                return;
            }
            failures.push({item, reason: failureReason(err)});
            emit(fileLabel);
        }
    });

    if (signal.aborted) {
        return {completed, skipped: 0, failures, cancelled: true, diskFull: false};
    }

    const blob = await zip.generateAsync({type: 'blob', compression: 'STORE'});
    triggerBlobDownload(blob, fileName);
    return {completed, skipped: 0, failures, cancelled: false, diskFull: false};
}
