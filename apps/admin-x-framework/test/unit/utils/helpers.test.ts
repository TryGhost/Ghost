import {getGhostPaths, downloadFile, downloadFromEndpoint} from '../../../src/utils/helpers';

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
});