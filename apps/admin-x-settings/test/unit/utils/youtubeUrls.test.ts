import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {validateYouTubeUrl, youtubeHandleToUrl, youtubeUrlToHandle} from '../../../src/utils/socialUrls/index';

describe('YouTube URL validation', () => {
    it('should return empty string when input is empty', () => {
        expect(validateYouTubeUrl('')).toBe('');
    });

    it('should format various YouTube URL formats correctly', () => {
        expect(validateYouTubeUrl('youtube.com/@johnsmith')).toBe('https://www.youtube.com/@johnsmith');
        expect(validateYouTubeUrl('https://www.youtube.com/@john.smith')).toBe('https://www.youtube.com/@john.smith');
        expect(validateYouTubeUrl('www.youtube.com/user/johnsmith')).toBe('https://www.youtube.com/user/johnsmith');
        expect(validateYouTubeUrl('youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A')).toBe('https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A');
        expect(validateYouTubeUrl('@johnsmith')).toBe('https://www.youtube.com/@johnsmith');
        expect(validateYouTubeUrl('user/johnsmith')).toBe('https://www.youtube.com/user/johnsmith');
        expect(validateYouTubeUrl('channel/UC4QobU6STFB0P71PMvOGN5A')).toBe('https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A');
    });

    it('should reject URLs from other domains', () => {
        expect(() => validateYouTubeUrl('https://twitter.com/@johnsmith')).toThrow(/The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/);
        expect(() => validateYouTubeUrl('http://example.com')).toThrow(/The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/);
    });

    it('should reject invalid YouTube handles', () => {
        expect(() => validateYouTubeUrl('youtube.com/@john..smith')).toThrow(/Your Username is not a valid YouTube Username/); // Consecutive periods
        expect(() => validateYouTubeUrl('youtube.com/@jo')).toThrow(/Your Username is not a valid YouTube Username/); // Too short
        expect(() => validateYouTubeUrl('youtube.com/@' + 'a'.repeat(31))).toThrow(/Your Username is not a valid YouTube Username/); // Too long
        expect(() => validateYouTubeUrl('youtube.com/user/john@smith')).toThrow(/Your Username is not a valid YouTube Username/); // Invalid character
        expect(() => validateYouTubeUrl('youtube.com/user/' + 'a'.repeat(51))).toThrow(/Your Username is not a valid YouTube Username/); // Too long
        expect(() => validateYouTubeUrl('youtube.com/channel/UC123')).toThrow(/Your Username is not a valid YouTube Username/); // Invalid channel ID
        expect(() => validateYouTubeUrl('youtube.com/c/johnsmith')).toThrow(/The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/); // Deprecated format
    });
});

describe('YouTube handle to URL conversion', () => {
    it('should convert YouTube handle to full URL', () => {
        expect(youtubeHandleToUrl('@johnsmith')).toBe('https://www.youtube.com/@johnsmith');
        expect(youtubeHandleToUrl('user/johnsmith')).toBe('https://www.youtube.com/user/johnsmith');
        expect(youtubeHandleToUrl('channel/UC4QobU6STFB0P71PMvOGN5A')).toBe('https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A');
        expect(youtubeHandleToUrl('@john.smith')).toBe('https://www.youtube.com/@john.smith');
    });

    it('should reject invalid YouTube handles', () => {
        expect(() => youtubeHandleToUrl('@john..smith')).toThrow(/Your Username is not a valid YouTube Username/);
        expect(() => youtubeHandleToUrl('@jo')).toThrow(/Your Username is not a valid YouTube Username/);
        expect(() => youtubeHandleToUrl('@' + 'a'.repeat(31))).toThrow(/Your Username is not a valid YouTube Username/);
        expect(() => youtubeHandleToUrl('user/john@smith')).toThrow(/Your Username is not a valid YouTube Username/);
        expect(() => youtubeHandleToUrl('user/' + 'a'.repeat(51))).toThrow(/Your Username is not a valid YouTube Username/);
        expect(() => youtubeHandleToUrl('channel/UC123')).toThrow(/Your Username is not a valid YouTube Username/);
        expect(() => youtubeHandleToUrl('johnsmith')).toThrow(/The handle must be in a format like @yourUsername, user\/yourUsername, or channel\/yourChannelId/); // Missing prefix
    });
});

describe('URL to YouTube handle extraction', () => {
    it('should extract YouTube handle from URL', () => {
        expect(youtubeUrlToHandle('https://www.youtube.com/@johnsmith')).toBe('@johnsmith');
        expect(youtubeUrlToHandle('https://www.youtube.com/@john.smith')).toBe('@john.smith');
        expect(youtubeUrlToHandle('youtube.com/user/johnsmith')).toBe('user/johnsmith');
        expect(youtubeUrlToHandle('www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A')).toBe('channel/UC4QobU6STFB0P71PMvOGN5A');
    });

    it('should return null for invalid YouTube URLs', () => {
        expect(youtubeUrlToHandle('https://example.com/@johnsmith')).toBe(null);
        expect(youtubeUrlToHandle('invalid-url')).toBe(null);
        expect(youtubeUrlToHandle('youtube.com/c/johnsmith')).toBe(null); // Deprecated format
    });
});