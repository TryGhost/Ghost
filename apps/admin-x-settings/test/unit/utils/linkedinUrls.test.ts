import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {linkedinHandleToUrl, linkedinUrlToHandle, validateLinkedInUrl} from '../../../src/utils/socialUrls/index';

describe('LinkedIn URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            expect(validateLinkedInUrl('')).toBe('');
        });

        it('should format various LinkedIn URL formats correctly', () => {
            expect(validateLinkedInUrl('linkedin.com/in/johnsmith')).toBe('https://www.linkedin.com/in/johnsmith');
            expect(validateLinkedInUrl('https://www.linkedin.com/in/johnsmith')).toBe('https://www.linkedin.com/in/johnsmith');
            expect(validateLinkedInUrl('www.linkedin.com/in/john.smith')).toBe('https://www.linkedin.com/in/john.smith');
            expect(validateLinkedInUrl('ca.linkedin.com/in/john-smith')).toBe('https://ca.linkedin.com/in/john-smith');
            expect(validateLinkedInUrl('linkedin.com/pub/john-smith-abc123')).toBe('https://www.linkedin.com/in/john-smith-abc123');
            expect(validateLinkedInUrl('@johnsmith')).toBe('https://www.linkedin.com/in/johnsmith');
            expect(validateLinkedInUrl('johnsmith')).toBe('https://www.linkedin.com/in/johnsmith');
        });

        it('should reject URLs from other domains', () => {
            expect(() => validateLinkedInUrl('https://twitter.com/johnsmith')).toThrow(/The URL must be in a format like https:\/\/www\.linkedin\.com\/in\/yourUsername/);
            expect(() => validateLinkedInUrl('http://example.com')).toThrow(/The URL must be in a format like https:\/\/www\.linkedin\.com\/in\/yourUsername/);
        });

        it('should reject invalid LinkedIn usernames', () => {
            expect(() => validateLinkedInUrl('linkedin.com/in/john@smith')).toThrow(/Your Username is not a valid LinkedIn Username/);
            expect(() => validateLinkedInUrl('linkedin.com/in/john#smith')).toThrow(/Your Username is not a valid LinkedIn Username/);
            expect(() => validateLinkedInUrl('linkedin.com/in/' + 'a'.repeat(101))).toThrow(/Your Username is not a valid LinkedIn Username/); // Too long
        });

        it('should allow valid non-custom LinkedIn usernames', () => {
            expect(validateLinkedInUrl('linkedin.com/pub/john-smith-abc123')).toBe('https://www.linkedin.com/in/john-smith-abc123');
            expect(validateLinkedInUrl('linkedin.com/pub/john.smith-456789')).toBe('https://www.linkedin.com/in/john.smith-456789');
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert LinkedIn handle to full URL', () => {
            expect(linkedinHandleToUrl('johnsmith')).toBe('https://www.linkedin.com/in/johnsmith');
            expect(linkedinHandleToUrl('@johnsmith')).toBe('https://www.linkedin.com/in/johnsmith');
            expect(linkedinHandleToUrl('john.smith')).toBe('https://www.linkedin.com/in/john.smith');
            expect(linkedinHandleToUrl('john-smith')).toBe('https://www.linkedin.com/in/john-smith');
        });

        it('should reject invalid LinkedIn handles', () => {
            expect(() => linkedinHandleToUrl('john@smith')).toThrow(/Your Username is not a valid LinkedIn Username/);
            expect(() => linkedinHandleToUrl('john#smith')).toThrow(/Your Username is not a valid LinkedIn Username/);
            expect(() => linkedinHandleToUrl('jo')).toThrow(/Your Username is not a valid LinkedIn Username/); // Too short
            expect(() => linkedinHandleToUrl('a'.repeat(101))).toThrow(/Your Username is not a valid LinkedIn Username/); // Too long
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract LinkedIn handle from URL', () => {
            expect(linkedinUrlToHandle('https://www.linkedin.com/in/johnsmith')).toBe('johnsmith');
            expect(linkedinUrlToHandle('https://www.linkedin.com/in/@johnsmith')).toBe('johnsmith');
            expect(linkedinUrlToHandle('linkedin.com/in/john.smith')).toBe('john.smith');
            expect(linkedinUrlToHandle('ca.linkedin.com/in/john-smith')).toBe('john-smith');
            expect(linkedinUrlToHandle('linkedin.com/pub/john-smith-abc123')).toBe('john-smith-abc123');
        });

        it('should return null for invalid LinkedIn URLs', () => {
            expect(linkedinUrlToHandle('https://example.com/johnsmith')).toBe(null);
            expect(linkedinUrlToHandle('invalid-url')).toBe(null);
        });
    });
}); 