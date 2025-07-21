import {describe, expect, it, vi} from 'vitest';
import {getClickHandler} from '../../../src/utils/url-helpers';

describe('url-helpers', () => {
    describe('getClickHandler', () => {
        const mockNavigate = vi.fn();
        const siteUrl = 'https://example.com';

        beforeEach(() => {
            mockNavigate.mockClear();
        });

        it('should navigate to post analytics when postId and attributionType is post', () => {
            const handler = getClickHandler(
                '/test-post/',
                'post-123',
                siteUrl,
                mockNavigate,
                'post'
            );

            handler();

            expect(mockNavigate).toHaveBeenCalledWith('/posts/analytics/post-123', {crossApp: true});
        });


        it('should open external URL when no postId', () => {
            // Mock window.open
            const mockOpen = vi.fn();
            global.window = {open: mockOpen} as any;

            const handler = getClickHandler(
                '/test-page/',
                null,
                siteUrl,
                mockNavigate,
                'page'
            );

            handler();

            expect(mockOpen).toHaveBeenCalledWith('https://example.com/test-page/', '_blank', 'noopener,noreferrer');
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('should open external URL when attributionType is not post', () => {
            const mockOpen = vi.fn();
            global.window = {open: mockOpen} as any;

            const handler = getClickHandler(
                '/author/john/',
                'post-123',
                siteUrl,
                mockNavigate,
                'author'
            );

            handler();

            expect(mockOpen).toHaveBeenCalledWith('https://example.com/author/john/', '_blank', 'noopener,noreferrer');
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('should handle missing attributionUrl', () => {
            const handler = getClickHandler(
                '',
                'post-123',
                siteUrl,
                mockNavigate,
                'post'
            );

            handler();

            // Should not navigate or open window
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});