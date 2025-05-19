import {cleanTrackedUrl} from '@src/utils/link-helpers';
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
});
