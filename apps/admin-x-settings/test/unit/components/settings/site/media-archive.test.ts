import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it, vi} from 'vitest';

// JSZip is mocked so the zip-path test can assert what gets packed without
// generating a real archive. Only runZipArchive touches it.
const {jszipFileSpy, jszipGenerateSpy} = vi.hoisted(() => ({
    jszipFileSpy: vi.fn(),
    jszipGenerateSpy: vi.fn()
}));
vi.mock('jszip', () => ({
    default: vi.fn(function FakeJSZip() {
        return {file: jszipFileSpy, generateAsync: jszipGenerateSpy};
    })
}));

import {
    type ArchiveDirHandle,
    archivePathForUrl,
    runFolderArchive,
    runZipArchive,
    supportsFolderArchive
} from '@src/components/settings/site/media-archive';

// ---------------------------------------------------------------------------
// archivePathForUrl: the correctness core. It decides where each asset lands
// on disk / inside the zip, so its edge cases are worth pinning down.
// ---------------------------------------------------------------------------
describe('archivePathForUrl', function () {
    it('strips a Pro CDN prefix down to the content path', function () {
        assert.equal(
            archivePathForUrl('https://storage.ghost.io/c/abc123/content/images/2024/06/photo.jpg'),
            'content/images/2024/06/photo.jpg'
        );
    });

    it('keeps a plain local content path', function () {
        assert.equal(
            archivePathForUrl('http://localhost:2368/content/images/2023/11/view-of-mountain.jpg'),
            'content/images/2023/11/view-of-mountain.jpg'
        );
    });

    it('handles media and files, not just images', function () {
        assert.equal(archivePathForUrl('https://x.io/content/media/2025/02/welcome.mp3'), 'content/media/2025/02/welcome.mp3');
        assert.equal(archivePathForUrl('https://x.io/content/files/2024/01/report.pdf'), 'content/files/2024/01/report.pdf');
    });

    it('preserves a size-variant segment', function () {
        assert.equal(
            archivePathForUrl('https://storage.ghost.io/c/h/content/images/size/w600/2024/06/photo.jpg'),
            'content/images/size/w600/2024/06/photo.jpg'
        );
    });

    it('ignores a query string', function () {
        assert.equal(
            archivePathForUrl('https://x.io/content/images/2024/06/photo.jpg?v=2'),
            'content/images/2024/06/photo.jpg'
        );
    });

    it('decodes percent-encoded characters', function () {
        assert.equal(
            archivePathForUrl('https://x.io/content/images/2024/06/my%20photo.jpg'),
            'content/images/2024/06/my photo.jpg'
        );
    });

    it('falls back to the bare filename when there is no /content/ segment', function () {
        assert.equal(archivePathForUrl('https://cdn.example.com/assets/hashed-name.jpg'), 'hashed-name.jpg');
    });

    it('does not throw on an unparseable input', function () {
        assert.equal(archivePathForUrl('not a url'), 'not a url');
    });
});

// ---------------------------------------------------------------------------
// supportsFolderArchive: capability detection for the File System Access API.
// ---------------------------------------------------------------------------
describe('supportsFolderArchive', function () {
    afterEach(function () {
        delete (window as unknown as {showDirectoryPicker?: unknown}).showDirectoryPicker;
    });

    it('is true when showDirectoryPicker exists', function () {
        (window as unknown as {showDirectoryPicker?: unknown}).showDirectoryPicker = () => {};
        assert.equal(supportsFolderArchive(), true);
    });

    it('is false when it does not', function () {
        delete (window as unknown as {showDirectoryPicker?: unknown}).showDirectoryPicker;
        assert.equal(supportsFolderArchive(), false);
    });
});

// ---------------------------------------------------------------------------
// In-memory File System Access fakes, enough to exercise runFolderArchive:
// nested directory creation, existence checks, and writes.
// ---------------------------------------------------------------------------
type FakeDir = ArchiveDirHandle & {
    _dirs: Map<string, FakeDir>;
    _files: Map<string, number>;
};

function makeDir(): FakeDir {
    const dirs = new Map<string, FakeDir>();
    const files = new Map<string, number>(); // name -> byte size

    const dir = {
        _dirs: dirs,
        _files: files,
        async getDirectoryHandle(name: string) {
            if (!dirs.has(name)) {
                dirs.set(name, makeDir());
            }
            return dirs.get(name)!;
        },
        async getFileHandle(name: string, options?: {create?: boolean}) {
            if (!files.has(name)) {
                if (!options?.create) {
                    throw new Error('NotFoundError');
                }
                files.set(name, 0);
            }
            return {
                async getFile() {
                    return {size: files.get(name) ?? 0} as File;
                },
                async createWritable() {
                    return {
                        async write(blob: {size?: number}) {
                            files.set(name, blob?.size ?? 1);
                        },
                        async close() {},
                        async abort() {}
                    } as unknown as WritableStream & {abort?: () => Promise<void>};
                }
            };
        }
    } as FakeDir;

    return dir;
}

// Walk content/images/2024/06 -> photo.jpg and return its recorded size, or null.
function sizeAt(root: FakeDir, path: string): number | null {
    const parts = path.split('/');
    const fileName = parts.pop() as string;
    let dir: FakeDir | undefined = root;
    for (const part of parts) {
        dir = dir?._dirs.get(part);
        if (!dir) {
            return null;
        }
    }
    return dir._files.has(fileName) ? dir._files.get(fileName)! : null;
}

const okResponse = (size = 100) => ({ok: true, body: null, blob: async () => ({size})});

describe('runFolderArchive', function () {
    afterEach(function () {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('writes every asset, recreating its content subpath', async function () {
        vi.stubGlobal('fetch', vi.fn(async () => okResponse(123)));
        const root = makeDir();
        const items = [
            {url: 'https://x.io/content/images/2024/06/a.jpg', filename: 'a.jpg'},
            {url: 'https://x.io/content/media/2025/02/b.mp3', filename: 'b.mp3'}
        ];

        const result = await runFolderArchive({items, root, signal: new AbortController().signal, skipExisting: false, onProgress: () => {}});

        assert.equal(result.completed, 2);
        assert.equal(result.failures.length, 0);
        assert.equal(result.skipped, 0);
        assert.equal(sizeAt(root, 'content/images/2024/06/a.jpg'), 123);
        assert.equal(sizeAt(root, 'content/media/2025/02/b.mp3'), 123);
    });

    it('skips files already on disk when resuming', async function () {
        const fetchMock = vi.fn(async () => okResponse(50));
        vi.stubGlobal('fetch', fetchMock);
        const root = makeDir();
        const items = [{url: 'https://x.io/content/images/2024/06/a.jpg', filename: 'a.jpg'}];

        // First run writes the file.
        await runFolderArchive({items, root, signal: new AbortController().signal, skipExisting: true, onProgress: () => {}});
        assert.equal(fetchMock.mock.calls.length, 1);

        // Second run finds it on disk and skips, fetching nothing.
        const second = await runFolderArchive({items, root, signal: new AbortController().signal, skipExisting: true, onProgress: () => {}});
        assert.equal(second.skipped, 1);
        assert.equal(second.completed, 0);
        assert.equal(fetchMock.mock.calls.length, 1, 'no new fetch on resume');
    });

    it('retries a transient failure before giving up', async function () {
        vi.useFakeTimers();
        let calls = 0;
        vi.stubGlobal('fetch', vi.fn(async () => {
            calls += 1;
            if (calls === 1) {
                throw new Error('network blip');
            }
            return okResponse(10);
        }));
        const root = makeDir();
        const items = [{url: 'https://x.io/content/images/2024/06/a.jpg', filename: 'a.jpg'}];

        const promise = runFolderArchive({items, root, signal: new AbortController().signal, skipExisting: false, onProgress: () => {}});
        await vi.runAllTimersAsync(); // flush the retry backoff
        const result = await promise;

        assert.equal(calls, 2);
        assert.equal(result.completed, 1);
        assert.equal(result.failures.length, 0);
    });

    it('records a failure after exhausting retries, without throwing', async function () {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('HTTP 500');
        }));
        const root = makeDir();
        const items = [{url: 'https://x.io/content/images/2024/06/a.jpg', filename: 'a.jpg'}];

        const promise = runFolderArchive({items, root, signal: new AbortController().signal, skipExisting: false, onProgress: () => {}});
        await vi.runAllTimersAsync();
        const result = await promise;

        assert.equal(result.completed, 0);
        assert.equal(result.failures.length, 1);
        assert.equal(result.failures[0].item.filename, 'a.jpg');
    });

    it('does no work when the signal is already aborted', async function () {
        const fetchMock = vi.fn(async () => okResponse());
        vi.stubGlobal('fetch', fetchMock);
        const controller = new AbortController();
        controller.abort();
        const items = [{url: 'https://x.io/content/images/2024/06/a.jpg', filename: 'a.jpg'}];

        const result = await runFolderArchive({items, root: makeDir(), signal: controller.signal, skipExisting: false, onProgress: () => {}});

        assert.equal(result.cancelled, true);
        assert.equal(result.completed, 0);
        assert.equal(fetchMock.mock.calls.length, 0);
    });
});

// ---------------------------------------------------------------------------
// Zip fallback: pack each asset under its content path and trigger one download.
// ---------------------------------------------------------------------------
describe('runZipArchive', function () {
    beforeEach(function () {
        jszipFileSpy.mockClear();
        jszipGenerateSpy.mockReset();
        jszipGenerateSpy.mockResolvedValue(new Blob(['zip']));
        (globalThis.URL as unknown as {createObjectURL: unknown}).createObjectURL = vi.fn(() => 'blob:test');
        (globalThis.URL as unknown as {revokeObjectURL: unknown}).revokeObjectURL = vi.fn();
    });

    afterEach(function () {
        vi.unstubAllGlobals();
        delete (globalThis.URL as unknown as {createObjectURL?: unknown}).createObjectURL;
        delete (globalThis.URL as unknown as {revokeObjectURL?: unknown}).revokeObjectURL;
    });

    it('packs each asset under its content path and triggers a download', async function () {
        vi.stubGlobal('fetch', vi.fn(async () => okResponse(20)));
        const items = [
            {url: 'https://x.io/content/images/2024/06/a.jpg', filename: 'a.jpg'},
            {url: 'https://x.io/content/files/2024/01/b.pdf', filename: 'b.pdf'}
        ];

        const result = await runZipArchive({items, signal: new AbortController().signal, fileName: 'media.zip', onProgress: () => {}});

        assert.equal(result.completed, 2);
        assert.equal(result.failures.length, 0);
        assert.equal(jszipFileSpy.mock.calls.length, 2);
        const packedPaths = jszipFileSpy.mock.calls.map(call => call[0]).sort();
        assert.deepEqual(packedPaths, ['content/files/2024/01/b.pdf', 'content/images/2024/06/a.jpg']);
        assert.equal((globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls.length, 1);
    });
});
