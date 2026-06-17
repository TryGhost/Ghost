import {type ArchiveDirHandle, type ArchiveItem} from './media-archive';

// Persists just enough to resume a folder download after the tab is closed: the
// picked directory handle plus the inventory snapshot. No file bytes are stored —
// the bytes live on disk in the chosen folder, and skip-existing finds them on
// resume. A FileSystemDirectoryHandle is structured-cloneable, so IndexedDB is the
// only store that can hold it (localStorage can't serialise it).

const DB_NAME = 'ghost-media-archive';
const STORE_NAME = 'sessions';
const SESSION_KEY = 'last';
const DB_VERSION = 1;

export type ArchiveSession = {
    handle: ArchiveDirHandle;
    items: ArchiveItem[];
    savedAt: number;
};

const idbAvailable = (): boolean => typeof indexedDB !== 'undefined';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    const db = await openDb();
    try {
        const tx = db.transaction(STORE_NAME, mode);
        return await fn(tx.objectStore(STORE_NAME));
    } finally {
        db.close();
    }
}

export async function saveArchiveSession(handle: ArchiveDirHandle, items: ArchiveItem[]): Promise<void> {
    if (!idbAvailable()) {
        return;
    }
    try {
        await withStore('readwrite', store => runRequest(store.put({handle, items, savedAt: Date.now()}, SESSION_KEY)));
    } catch {
        // Resume is a convenience; never let a storage hiccup break the download.
    }
}

export async function loadArchiveSession(): Promise<ArchiveSession | null> {
    if (!idbAvailable()) {
        return null;
    }
    try {
        const session = await withStore('readonly', store => runRequest<ArchiveSession | undefined>(store.get(SESSION_KEY)));
        return session ?? null;
    } catch {
        return null;
    }
}

export async function clearArchiveSession(): Promise<void> {
    if (!idbAvailable()) {
        return;
    }
    try {
        await withStore('readwrite', store => runRequest(store.delete(SESSION_KEY)));
    } catch {
        // ignore
    }
}

/**
 * Re-check (and if needed re-request) write permission on a stored handle. The
 * browser drops the grant between sessions and requires a user gesture to restore
 * it, so this must be called from a click handler (the Resume button).
 */
export async function ensureHandlePermission(handle: ArchiveDirHandle): Promise<boolean> {
    const options = {mode: 'readwrite'} as const;
    if (!handle.queryPermission || !handle.requestPermission) {
        return true; // older implementations grant implicitly
    }
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    return (await handle.requestPermission(options)) === 'granted';
}
