import {vi, type MockInstance} from 'vitest';
import {getGhostPaths, downloadFile, downloadFromEndpoint, blobDownload, blobDownloadFromEndpoint} from '../../../src/utils/helpers';

describe('helpers utils', () => {
    // Store original values
    let originalLocation: Location;

    beforeEach(() => {
        // Store original values
        originalLocation = window.location;

        // Mock window.location
        delete (window as any).location;
        (window as any).location = {
            pathname: '/ghost/settings/'
        } as Location;
    });

    afterEach(() => {
        // Restore original values
        (window as any).location = originalLocation;
    });

    describe('getGhostPaths', () => {
        it('returns correct paths for root installation', () => {
            window.location.pathname = '/ghost/settings/';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '',
                adminRoot: '/ghost/',
                assetRoot: '/ghost/assets/',
                apiRoot: '/ghost/api/admin',
                activityPubRoot: '/.ghost/activitypub'
            });
        });

        it('returns correct paths for subdirectory installation', () => {
            window.location.pathname = '/blog/ghost/settings/';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '/blog',
                adminRoot: '/blog/ghost/',
                assetRoot: '/blog/ghost/assets/',
                apiRoot: '/blog/ghost/api/admin',
                activityPubRoot: '/blog/.ghost/activitypub'
            });
        });

        it('returns correct paths for nested subdirectory', () => {
            window.location.pathname = '/site/blog/ghost/settings/';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '/site/blog',
                adminRoot: '/site/blog/ghost/',
                assetRoot: '/site/blog/ghost/assets/',
                apiRoot: '/site/blog/ghost/api/admin',
                activityPubRoot: '/site/blog/.ghost/activitypub'
            });
        });

        it('handles trailing slashes correctly', () => {
            window.location.pathname = '/blog/ghost/';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '/blog',
                adminRoot: '/blog/ghost/',
                assetRoot: '/blog/ghost/assets/',
                apiRoot: '/blog/ghost/api/admin',
                activityPubRoot: '/blog/.ghost/activitypub'
            });
        });

        it('handles paths without trailing slash', () => {
            window.location.pathname = '/ghost/settings';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '',
                adminRoot: '/ghost/',
                assetRoot: '/ghost/assets/',
                apiRoot: '/ghost/api/admin',
                activityPubRoot: '/.ghost/activitypub'
            });
        });

        it('handles deep nested paths within ghost admin', () => {
            window.location.pathname = '/blog/ghost/settings/general/users/';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '/blog',
                adminRoot: '/blog/ghost/',
                assetRoot: '/blog/ghost/assets/',
                apiRoot: '/blog/ghost/api/admin',
                activityPubRoot: '/blog/.ghost/activitypub'
            });
        });

        it('handles edge case with multiple ghost segments', () => {
            window.location.pathname = '/ghost-blog/ghost/settings/';
            const paths = getGhostPaths();
            expect(paths).toEqual({
                subdir: '/ghost-blog',
                adminRoot: '/ghost-blog/ghost/',
                assetRoot: '/ghost-blog/ghost/assets/',
                apiRoot: '/ghost-blog/ghost/api/admin',
                activityPubRoot: '/ghost-blog/.ghost/activitypub'
            });
        });
    });

    describe('downloadFile', () => {
        it('is a function that accepts a URL parameter', () => {
            expect(typeof downloadFile).toBe('function');
            expect(downloadFile.length).toBe(1);
        });

        it('does not throw when called with valid URL', () => {
            expect(() => downloadFile('https://example.com/file.csv')).not.toThrow();
        });

        it('does not throw when called with empty string', () => {
            expect(() => downloadFile('')).not.toThrow();
        });
    });

    describe('downloadFromEndpoint', () => {
        it('is a function that accepts a path parameter', () => {
            expect(typeof downloadFromEndpoint).toBe('function');
            expect(downloadFromEndpoint.length).toBe(1);
        });

        it('does not throw when called with valid path', () => {
            expect(() => downloadFromEndpoint('/members/export')).not.toThrow();
        });

        it('does not throw when called with empty string', () => {
            expect(() => downloadFromEndpoint('')).not.toThrow();
        });
    });

    describe('blobDownload', () => {
        let originalFetch: typeof global.fetch;
        let originalCreateObjectURL: typeof URL.createObjectURL;
        let originalRevokeObjectURL: typeof URL.revokeObjectURL;
        let appendChildSpy: MockInstance<[node: Node], Node>;
        let removeElementSpy: ReturnType<typeof vi.fn>;
        let clickSpy: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            originalFetch = global.fetch;
            originalCreateObjectURL = URL.createObjectURL;
            originalRevokeObjectURL = URL.revokeObjectURL;

            clickSpy = vi.fn();
            removeElementSpy = vi.fn();
            appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(node => node);

            vi.spyOn(document, 'createElement').mockImplementation(() => {
                return {
                    href: '',
                    download: '',
                    click: clickSpy,
                    remove: removeElementSpy
                } as unknown as HTMLElement;
            });

            URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-blob-url');
            URL.revokeObjectURL = vi.fn();
        });

        afterEach(() => {
            global.fetch = originalFetch;
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            appendChildSpy.mockRestore();
            vi.restoreAllMocks();
        });

        it('fetches the URL and triggers a download', async () => {
            const mockBlob = new Blob(['test,data'], {type: 'text/csv'});
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });

            await blobDownload('https://example.com/export.csv', 'members.csv');

            expect(global.fetch).toHaveBeenCalledWith('https://example.com/export.csv', {method: 'GET'});
            expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
            expect(clickSpy).toHaveBeenCalled();
            expect(removeElementSpy).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-blob-url');
        });

        it('sets the correct filename on the download link', async () => {
            const mockBlob = new Blob(['test'], {type: 'text/csv'});
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });

            let capturedElement: any;
            vi.spyOn(document, 'createElement').mockImplementation(() => {
                capturedElement = {
                    href: '',
                    download: '',
                    click: vi.fn(),
                    remove: vi.fn()
                };
                return capturedElement as unknown as HTMLElement;
            });

            await blobDownload('https://example.com/export.csv', 'members.2026-02-17.csv');

            expect(capturedElement.download).toBe('members.2026-02-17.csv');
        });

        it('throws on non-ok response', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await expect(blobDownload('https://example.com/fail', 'test.csv'))
                .rejects.toThrow('Download failed: 500 Internal Server Error');
        });

        it('propagates fetch network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await expect(blobDownload('https://example.com/fail', 'test.csv'))
                .rejects.toThrow('Network error');
        });
    });

    describe('blobDownloadFromEndpoint', () => {
        let originalFetch: typeof global.fetch;
        let originalCreateObjectURL: typeof URL.createObjectURL;
        let originalRevokeObjectURL: typeof URL.revokeObjectURL;

        beforeEach(() => {
            originalFetch = global.fetch;
            originalCreateObjectURL = URL.createObjectURL;
            originalRevokeObjectURL = URL.revokeObjectURL;
            window.location.pathname = '/ghost/settings/';

            URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
            URL.revokeObjectURL = vi.fn();
            vi.spyOn(document.body, 'appendChild').mockImplementation(node => node);
            vi.spyOn(document, 'createElement').mockImplementation(() => {
                return {
                    href: '',
                    download: '',
                    click: vi.fn(),
                    remove: vi.fn()
                } as unknown as HTMLElement;
            });
        });

        afterEach(() => {
            global.fetch = originalFetch;
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            vi.restoreAllMocks();
        });

        it('constructs the full URL from apiRoot and path', async () => {
            const mockBlob = new Blob(['data'], {type: 'text/csv'});
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });

            await blobDownloadFromEndpoint('/members/upload/?limit=all', 'members.csv');

            expect(global.fetch).toHaveBeenCalledWith(
                '/ghost/api/admin/members/upload/?limit=all',
                {method: 'GET'}
            );
        });

        it('includes subdirectory in the URL', async () => {
            window.location.pathname = '/blog/ghost/settings/';
            const mockBlob = new Blob(['data'], {type: 'text/csv'});
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(mockBlob)
            });

            await blobDownloadFromEndpoint('/members/upload/?limit=all', 'members.csv');

            expect(global.fetch).toHaveBeenCalledWith(
                '/blog/ghost/api/admin/members/upload/?limit=all',
                {method: 'GET'}
            );
        });
    });
});
