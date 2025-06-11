import {cleanTrackedUrl, getLinkById} from '@src/utils/link-helpers';
import {describe, expect, it} from 'vitest';

describe('link-helpers', () => {
    it('should clean tracked url', () => {
        const url = 'https://example.com/to?ref=test&attribution_id=test&attribution_type=test';
        const cleanedUrl = cleanTrackedUrl(url, false);
        expect(cleanedUrl).toBe('https://example.com/to');
    });

    it('should clean tracked url and return display url', () => {
        const url = 'https://example.com/to?ref=test&attribution_id=test&attribution_type=test';
        const cleanedUrl = cleanTrackedUrl(url, true);
        expect(cleanedUrl).toBe('example.com/to');
    });

    it('should clean tracked url and return display url without www', () => {
        const url = 'https://www.example.com/to?ref=test&attribution_id=test&attribution_type=test';
        const cleanedUrl = cleanTrackedUrl(url, true);
        expect(cleanedUrl).toBe('example.com/to');
    });

    it('should not remove extraneous params', () => {
        const url = 'https://example.com/to?ref=test&attribution_id=test&attribution_type=test&utm_source=test';
        const cleanedUrl = cleanTrackedUrl(url, true);
        expect(cleanedUrl).toBe('example.com/to?utm_source=test');
    });

    describe('cleanTrackedUrl', () => {
        it('removes tracking parameters', () => {
            const url = 'https://example.com?ref=123&attribution_id=456&attribution_type=789&keep=true';
            expect(cleanTrackedUrl(url)).toBe('https://example.com/?keep=true');
        });

        it('returns display URL without protocol and www', () => {
            const url = 'https://www.example.com/path?param=value#hash';
            expect(cleanTrackedUrl(url, true)).toBe('example.com/path?param=value#hash');
        });

        it('handles URLs with only domain', () => {
            const url = 'https://example.com';
            expect(cleanTrackedUrl(url, true)).toBe('example.com');
        });

        it('returns original URL for invalid URLs', () => {
            const invalidUrls = [
                'not-a-url',
                'http://', // Invalid URL that will throw
                'https://' // Another invalid URL that will throw
            ];
            
            invalidUrls.forEach((url) => {
                expect(cleanTrackedUrl(url)).toBe(url);
                expect(cleanTrackedUrl(url, true)).toBe(url);
            });
        });
    });

    describe('getLinkById', () => {
        const links = [
            {
                count: 1,
                link: {
                    link_id: '1',
                    to: 'https://example.com',
                    title: 'Example',
                    originalTo: 'https://example.com',
                    from: 'https://source.com',
                    edited: false
                }
            }
        ];

        it('finds link by id', () => {
            expect(getLinkById(links, '1')).toBe(links[0]);
        });

        it('returns undefined for non-existent id', () => {
            expect(getLinkById(links, '2')).toBeUndefined();
        });
    });

    describe('cleanTrackedUrl error handling', () => {
        it('should return the original url if an error occurs', () => {
            const invalidUrl = 'htp://invalid-url';
            const result = cleanTrackedUrl(invalidUrl);
            expect(result).toBe(invalidUrl);
        });
    });
});
