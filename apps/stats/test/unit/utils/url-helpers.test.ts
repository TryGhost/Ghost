import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    generateTitleFromPath,
    getClickHandler,
    getFrontendUrl,
    shouldMakeClickable
} from '@src/utils/url-helpers';

// Mock window.open for testing
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
    value: mockWindowOpen,
    writable: true
});

describe('url-helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getFrontendUrl', () => {
        it('constructs correct URL for root path', () => {
            const result = getFrontendUrl('/', 'https://example.com');
            expect(result).toBe('https://example.com/');
        });

        it('constructs correct URL for post path', () => {
            const result = getFrontendUrl('/my-post/', 'https://example.com');
            expect(result).toBe('https://example.com/my-post/');
        });

        it('handles site URL with subdirectory', () => {
            const result = getFrontendUrl('/my-post/', 'https://example.com/blog');
            expect(result).toBe('https://example.com/blog/my-post/');
        });

        it('handles site URL with subdirectory ending with slash', () => {
            const result = getFrontendUrl('/my-post/', 'https://example.com/blog/');
            expect(result).toBe('https://example.com/blog/my-post/');
        });

        it('removes leading slash from attribution URL to avoid double slashes', () => {
            const result = getFrontendUrl('/tag/javascript/', 'https://example.com/');
            expect(result).toBe('https://example.com/tag/javascript/');
        });

        it('handles attribution URL without leading slash', () => {
            const result = getFrontendUrl('tag/javascript/', 'https://example.com/');
            expect(result).toBe('https://example.com/tag/javascript/');
        });

        it('handles complex paths', () => {
            const result = getFrontendUrl('/author/john-doe/', 'https://blog.example.com');
            expect(result).toBe('https://blog.example.com/author/john-doe/');
        });

        it('handles different protocols', () => {
            const result = getFrontendUrl('/my-post/', 'http://localhost:3000');
            expect(result).toBe('http://localhost:3000/my-post/');
        });

        it('handles ports in site URL', () => {
            const result = getFrontendUrl('/my-post/', 'https://example.com:8080');
            expect(result).toBe('https://example.com:8080/my-post/');
        });

        it('returns empty string for empty attribution URL', () => {
            const result = getFrontendUrl('', 'https://example.com');
            expect(result).toBe('');
        });

        it('returns empty string for null attribution URL', () => {
            const result = getFrontendUrl(null as unknown as string, 'https://example.com');
            expect(result).toBe('');
        });

        it('returns empty string for undefined attribution URL', () => {
            const result = getFrontendUrl(undefined as unknown as string, 'https://example.com');
            expect(result).toBe('');
        });

        it('returns empty string for empty site URL', () => {
            const result = getFrontendUrl('/my-post/', '');
            expect(result).toBe('');
        });

        it('returns empty string for null site URL', () => {
            const result = getFrontendUrl('/my-post/', null as unknown as string);
            expect(result).toBe('');
        });

        it('returns empty string for undefined site URL', () => {
            const result = getFrontendUrl('/my-post/', undefined as unknown as string);
            expect(result).toBe('');
        });

        it('handles invalid site URL gracefully', () => {
            const result = getFrontendUrl('/my-post/', 'not-a-valid-url');
            expect(result).toBe('');
        });

        it('handles malformed site URL gracefully', () => {
            const result = getFrontendUrl('/my-post/', 'https://');
            expect(result).toBe('');
        });

        it('handles special characters in paths', () => {
            const result = getFrontendUrl('/post-with-special-chars-@$%/', 'https://example.com');
            expect(result).toBe('https://example.com/post-with-special-chars-@$%/');
        });
    });

    describe('generateTitleFromPath', () => {
        it('returns "Homepage" for root path', () => {
            expect(generateTitleFromPath('/')).toBe('Homepage');
        });

        it('generates title for tag paths', () => {
            expect(generateTitleFromPath('/tag/javascript/')).toBe('tag/javascript');
            expect(generateTitleFromPath('/tag/web-development/')).toBe('tag/web-development');
            expect(generateTitleFromPath('/tag/react')).toBe('tag/react');
        });

        it('generates title for tags paths (plural)', () => {
            expect(generateTitleFromPath('/tags/javascript/')).toBe('tag/javascript');
            expect(generateTitleFromPath('/tags/web-development/')).toBe('tag/web-development');
        });

        it('handles incomplete tag paths', () => {
            expect(generateTitleFromPath('/tag/')).toBe('tag/unknown');
            expect(generateTitleFromPath('/tag')).toBe('/tag');
        });

        it('generates title for author paths', () => {
            expect(generateTitleFromPath('/author/john-doe/')).toBe('author/john-doe');
            expect(generateTitleFromPath('/author/jane-smith')).toBe('author/jane-smith');
        });

        it('generates title for authors paths (plural)', () => {
            expect(generateTitleFromPath('/authors/john-doe/')).toBe('author/john-doe');
            expect(generateTitleFromPath('/authors/jane-smith')).toBe('author/jane-smith');
        });

        it('handles incomplete author paths', () => {
            expect(generateTitleFromPath('/author/')).toBe('author/unknown');
            expect(generateTitleFromPath('/author')).toBe('/author');
        });

        it('returns path itself for unknown paths', () => {
            expect(generateTitleFromPath('/my-blog-post/')).toBe('/my-blog-post/');
            expect(generateTitleFromPath('/some/complex/path')).toBe('/some/complex/path');
        });

        it('handles empty path', () => {
            expect(generateTitleFromPath('')).toBe('Unknown');
        });

        it('handles null path', () => {
            expect(generateTitleFromPath(null as unknown as string)).toBe('Unknown');
        });

        it('handles undefined path', () => {
            expect(generateTitleFromPath(undefined as unknown as string)).toBe('Unknown');
        });

        it('handles paths with special characters', () => {
            expect(generateTitleFromPath('/tag/c++/')).toBe('tag/c++');
            expect(generateTitleFromPath('/author/user@domain.com/')).toBe('author/user@domain.com');
        });

        it('handles paths with trailing and non-trailing slashes consistently', () => {
            expect(generateTitleFromPath('/tag/javascript/')).toBe('tag/javascript');
            expect(generateTitleFromPath('/tag/javascript')).toBe('tag/javascript');
        });

        it('handles edge case tag paths', () => {
            expect(generateTitleFromPath('/tags/')).toBe('tag/unknown');
            expect(generateTitleFromPath('/tags')).toBe('/tags');
            expect(generateTitleFromPath('/authors/')).toBe('author/unknown');
            expect(generateTitleFromPath('/authors')).toBe('/authors');
        });
    });

    describe('shouldMakeClickable', () => {
        it('returns false for empty attribution URL', () => {
            expect(shouldMakeClickable('')).toBe(false);
        });

        it('returns false for null attribution URL', () => {
            expect(shouldMakeClickable(null as unknown as string)).toBe(false);
        });

        it('returns false for undefined attribution URL', () => {
            expect(shouldMakeClickable(undefined as unknown as string)).toBe(false);
        });

        it('uses urlExists when provided as true', () => {
            expect(shouldMakeClickable('/my-post/', true)).toBe(true);
        });

        it('uses urlExists when provided as false', () => {
            expect(shouldMakeClickable('/my-post/', false)).toBe(false);
        });

        it('returns true for valid attribution URL when urlExists is undefined (backward compatibility)', () => {
            expect(shouldMakeClickable('/my-post/')).toBe(true);
        });

        it('returns true for valid attribution URL when urlExists is not boolean', () => {
            expect(shouldMakeClickable('/my-post/', 'not-boolean' as unknown as boolean)).toBe(true);
        });

        it('handles various valid attribution URLs', () => {
            expect(shouldMakeClickable('/')).toBe(true);
            expect(shouldMakeClickable('/tag/javascript/')).toBe(true);
            expect(shouldMakeClickable('/author/john/')).toBe(true);
        });
    });

    describe('getClickHandler', () => {
        let mockNavigate: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            mockNavigate = vi.fn();
            mockWindowOpen.mockClear();
        });

        it('navigates to analytics page for posts with postId and analytics type', () => {
            const handler = getClickHandler('/my-post/', 'post-123', 'https://example.com', mockNavigate, 'post');
            handler();

            expect(mockNavigate).toHaveBeenCalledWith('/posts/analytics/post-123', {crossApp: true});
            expect(mockWindowOpen).not.toHaveBeenCalled();
        });

        it('opens frontend URL in new tab for non-post attribution types', () => {
            const handler = getClickHandler('/tag/javascript/', null, 'https://example.com', mockNavigate, 'tag');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/tag/javascript/', '_blank', 'noopener,noreferrer');
        });

        it('opens frontend URL in new tab for posts without postId', () => {
            const handler = getClickHandler('/my-post/', null, 'https://example.com', mockNavigate, 'post');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/my-post/', '_blank', 'noopener,noreferrer');
        });

        it('opens frontend URL in new tab for posts without attribution type', () => {
            const handler = getClickHandler('/my-post/', 'post-123', 'https://example.com', mockNavigate);
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/my-post/', '_blank', 'noopener,noreferrer');
        });

        it('opens frontend URL for pages', () => {
            const handler = getClickHandler('/about/', 'page-456', 'https://example.com', mockNavigate, 'page');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/about/', '_blank', 'noopener,noreferrer');
        });

        it('handles empty postId correctly', () => {
            const handler = getClickHandler('/my-post/', '', 'https://example.com', mockNavigate, 'post');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/my-post/', '_blank', 'noopener,noreferrer');
        });

        it('handles undefined postId correctly', () => {
            const handler = getClickHandler('/my-post/', undefined, 'https://example.com', mockNavigate, 'post');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/my-post/', '_blank', 'noopener,noreferrer');
        });

        it('does nothing when attribution URL is empty', () => {
            const handler = getClickHandler('', 'post-123', 'https://example.com', mockNavigate, 'post');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).not.toHaveBeenCalled();
        });

        it('does nothing when site URL is empty', () => {
            const handler = getClickHandler('/my-post/', null, '', mockNavigate);
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).not.toHaveBeenCalled();
        });

        it('does nothing when getFrontendUrl returns empty string', () => {
            // This would happen if site URL is malformed
            const handler = getClickHandler('/my-post/', null, 'invalid-url', mockNavigate);
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).not.toHaveBeenCalled();
        });

        it('handles complex scenarios correctly', () => {
            const handler = getClickHandler('/tag/javascript/', null, 'https://blog.example.com/subdir', mockNavigate, 'tag');
            handler();

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockWindowOpen).toHaveBeenCalledWith('https://blog.example.com/subdir/tag/javascript/', '_blank', 'noopener,noreferrer');
        });

        it('returns a function', () => {
            const handler = getClickHandler('/my-post/', 'post-123', 'https://example.com', mockNavigate, 'post');
            expect(typeof handler).toBe('function');
        });
    });

    describe('integration tests', () => {
        it('getClickHandler integrates with getFrontendUrl correctly', () => {
            const mockNavigate = vi.fn();
            const handler = getClickHandler('/my-post/', null, 'https://example.com/blog', mockNavigate);
            handler();

            expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/blog/my-post/', '_blank', 'noopener,noreferrer');
        });

        it('generateTitleFromPath works with various real-world paths', () => {
            expect(generateTitleFromPath('/tag/web-development/')).toBe('tag/web-development');
            expect(generateTitleFromPath('/author/john-smith/')).toBe('author/john-smith');
            expect(generateTitleFromPath('/my-awesome-blog-post/')).toBe('/my-awesome-blog-post/');
            expect(generateTitleFromPath('/')).toBe('Homepage');
        });

        it('shouldMakeClickable handles edge cases properly', () => {
            expect(shouldMakeClickable('/valid-url/', true)).toBe(true);
            expect(shouldMakeClickable('/valid-url/', false)).toBe(false);
            expect(shouldMakeClickable('', true)).toBe(false); // Empty URL trumps urlExists
            expect(shouldMakeClickable('/valid-url/')).toBe(true); // Fallback behavior
        });
    });
});