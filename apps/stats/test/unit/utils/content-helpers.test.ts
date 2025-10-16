import {
    CONTENT_TYPES,
    ContentType,
    getContentDescription,
    getContentTitle,
    getGrowthContentDescription
} from '@src/utils/content-helpers';
import {beforeEach, describe, expect, it, vi} from 'vitest';

describe('content-helpers', () => {
    describe('CONTENT_TYPES constants', () => {
        it('exports correct content type constants', () => {
            expect(CONTENT_TYPES.POSTS).toBe('posts');
            expect(CONTENT_TYPES.PAGES).toBe('pages');
            expect(CONTENT_TYPES.POSTS_AND_PAGES).toBe('posts_and_pages');
            expect(CONTENT_TYPES.SOURCES).toBe('sources');
        });

        it('exports all expected content types', () => {
            const keys = Object.keys(CONTENT_TYPES);
            expect(keys).toContain('POSTS');
            expect(keys).toContain('PAGES');
            expect(keys).toContain('POSTS_AND_PAGES');
            expect(keys).toContain('SOURCES');
            expect(keys).toHaveLength(4);
        });
    });

    describe('getContentTitle', () => {
        it('returns correct title for posts', () => {
            expect(getContentTitle(CONTENT_TYPES.POSTS)).toBe('Top posts');
        });

        it('returns correct title for pages', () => {
            expect(getContentTitle(CONTENT_TYPES.PAGES)).toBe('Top pages');
        });

        it('returns correct title for sources', () => {
            expect(getContentTitle(CONTENT_TYPES.SOURCES)).toBe('Top sources');
        });

        it('returns default title for posts and pages', () => {
            expect(getContentTitle(CONTENT_TYPES.POSTS_AND_PAGES)).toBe('Top content');
        });

        it('returns default title for unknown content type', () => {
            expect(getContentTitle('unknown' as ContentType)).toBe('Top content');
        });

        it('returns default title for undefined', () => {
            expect(getContentTitle(undefined as unknown as ContentType)).toBe('Top content');
        });
    });

    describe('getContentDescription', () => {
        let mockGetPeriodText: ReturnType<typeof vi.fn<[number], string>>;

        beforeEach(function () {
            mockGetPeriodText = vi.fn<[number], string>();
        });

        it('returns correct description for posts', () => {
            mockGetPeriodText.mockReturnValue('in the last 30 days');
            const result = getContentDescription(CONTENT_TYPES.POSTS, 30, mockGetPeriodText);
            
            expect(result).toBe('Your highest viewed posts in the last 30 days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(30);
        });

        it('returns correct description for pages', () => {
            mockGetPeriodText.mockReturnValue('in the last 7 days');
            const result = getContentDescription(CONTENT_TYPES.PAGES, 7, mockGetPeriodText);
            
            expect(result).toBe('Your highest viewed pages in the last 7 days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(7);
        });

        it('returns correct description for posts and pages', () => {
            mockGetPeriodText.mockReturnValue('today');
            const result = getContentDescription(CONTENT_TYPES.POSTS_AND_PAGES, 1, mockGetPeriodText);
            
            expect(result).toBe('Your highest viewed posts or pages today');
            expect(mockGetPeriodText).toHaveBeenCalledWith(1);
        });

        it('returns correct description for sources', () => {
            mockGetPeriodText.mockReturnValue('in the last 90 days');
            const result = getContentDescription(CONTENT_TYPES.SOURCES, 90, mockGetPeriodText);
            
            expect(result).toBe('How readers found your site in the last 90 days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(90);
        });

        it('returns default description for unknown content type', () => {
            mockGetPeriodText.mockReturnValue('(all time)');
            const result = getContentDescription('unknown' as ContentType, 1000, mockGetPeriodText);
            
            expect(result).toBe('Your highest viewed posts or pages (all time)');
            expect(mockGetPeriodText).toHaveBeenCalledWith(1000);
        });

        it('handles different range values correctly', () => {
            mockGetPeriodText.mockReturnValue('this year');
            const result = getContentDescription(CONTENT_TYPES.POSTS, -1, mockGetPeriodText);
            
            expect(result).toBe('Your highest viewed posts this year');
            expect(mockGetPeriodText).toHaveBeenCalledWith(-1);
        });
    });

    describe('getGrowthContentDescription', () => {
        let mockGetPeriodText: ReturnType<typeof vi.fn<[number], string>>;

        beforeEach(function () {
            mockGetPeriodText = vi.fn<[number], string>();
        });

        it('returns correct growth description for posts', () => {
            mockGetPeriodText.mockReturnValue('in the last 30 days');
            const result = getGrowthContentDescription(CONTENT_TYPES.POSTS, 30, mockGetPeriodText);
            
            expect(result).toBe('Which posts drove the most growth in the last 30 days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(30);
        });

        it('returns correct growth description for pages', () => {
            mockGetPeriodText.mockReturnValue('in the last 7 days');
            const result = getGrowthContentDescription(CONTENT_TYPES.PAGES, 7, mockGetPeriodText);
            
            expect(result).toBe('Which pages drove the most growth in the last 7 days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(7);
        });

        it('returns correct growth description for posts and pages', () => {
            mockGetPeriodText.mockReturnValue('today');
            const result = getGrowthContentDescription(CONTENT_TYPES.POSTS_AND_PAGES, 1, mockGetPeriodText);
            
            expect(result).toBe('Which posts or pages drove the most growth today');
            expect(mockGetPeriodText).toHaveBeenCalledWith(1);
        });

        it('returns correct growth description for sources', () => {
            mockGetPeriodText.mockReturnValue('in the last 90 days');
            const result = getGrowthContentDescription(CONTENT_TYPES.SOURCES, 90, mockGetPeriodText);
            
            expect(result).toBe('How readers found your site in the last 90 days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(90);
        });

        it('returns default growth description for unknown content type', () => {
            mockGetPeriodText.mockReturnValue('(all time)');
            const result = getGrowthContentDescription('unknown' as ContentType, 1000, mockGetPeriodText);
            
            expect(result).toBe('Which posts drove the most growth (all time)');
            expect(mockGetPeriodText).toHaveBeenCalledWith(1000);
        });

        it('calls getPeriodText with correct range value', () => {
            mockGetPeriodText.mockReturnValue('test period');
            getGrowthContentDescription(CONTENT_TYPES.POSTS, 123, mockGetPeriodText);
            
            expect(mockGetPeriodText).toHaveBeenCalledWith(123);
            expect(mockGetPeriodText).toHaveBeenCalledTimes(1);
        });
    });

    describe('edge cases', () => {
        it('handles null/undefined getPeriodText function gracefully', () => {
            expect(() => {
                getContentDescription(CONTENT_TYPES.POSTS, 30, null as unknown as () => string);
            }).toThrow();
        });

        it('handles empty string content type', () => {
            const mockGetPeriodText = vi.fn().mockReturnValue('test');
            const result = getContentDescription('' as ContentType, 30, mockGetPeriodText);
            expect(result).toBe('Your highest viewed posts or pages test');
        });

        it('handles zero range value', () => {
            const mockGetPeriodText = vi.fn().mockReturnValue('zero days');
            const result = getContentDescription(CONTENT_TYPES.POSTS, 0, mockGetPeriodText);
            expect(result).toBe('Your highest viewed posts zero days');
            expect(mockGetPeriodText).toHaveBeenCalledWith(0);
        });

        it('handles negative range value', () => {
            const mockGetPeriodText = vi.fn().mockReturnValue('negative range');
            const result = getGrowthContentDescription(CONTENT_TYPES.PAGES, -10, mockGetPeriodText);
            expect(result).toBe('Which pages drove the most growth negative range');
            expect(mockGetPeriodText).toHaveBeenCalledWith(-10);
        });
    });
});