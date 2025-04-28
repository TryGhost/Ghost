import * as assert from 'assert/strict';
import {validateYouTubeUrl, youtubeHandleToUrl, youtubeUrlToHandle} from '../../../src/utils/socialUrls/index';

describe('YouTube URL validation', () => {
    it('should return empty string when input is empty', () => {
        assert.equal(validateYouTubeUrl(''), '');
    });

    it('should format various YouTube URL formats correctly', () => {
        assert.equal(validateYouTubeUrl('youtube.com/@johnsmith'), 'https://www.youtube.com/@johnsmith');
        assert.equal(validateYouTubeUrl('https://www.youtube.com/@john.smith'), 'https://www.youtube.com/@john.smith');
        assert.equal(validateYouTubeUrl('www.youtube.com/user/johnsmith'), 'https://www.youtube.com/user/johnsmith');
        assert.equal(validateYouTubeUrl('youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A'), 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A');
        assert.equal(validateYouTubeUrl('@johnsmith'), 'https://www.youtube.com/@johnsmith');
        assert.equal(validateYouTubeUrl('user/johnsmith'), 'https://www.youtube.com/user/johnsmith');
        assert.equal(validateYouTubeUrl('channel/UC4QobU6STFB0P71PMvOGN5A'), 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A');
    });

    it('should reject URLs from other domains', () => {
        assert.throws(() => validateYouTubeUrl('https://twitter.com/@johnsmith'), /The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/);
        assert.throws(() => validateYouTubeUrl('http://example.com'), /The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/);
    });

    it('should reject invalid YouTube handles', () => {
        assert.throws(() => validateYouTubeUrl('youtube.com/@john..smith'), /Your Username is not a valid YouTube Username/); // Consecutive periods
        assert.throws(() => validateYouTubeUrl('youtube.com/@jo'), /Your Username is not a valid YouTube Username/); // Too short
        assert.throws(() => validateYouTubeUrl('youtube.com/@' + 'a'.repeat(31)), /Your Username is not a valid YouTube Username/); // Too long
        assert.throws(() => validateYouTubeUrl('youtube.com/user/john@smith'), /Your Username is not a valid YouTube Username/); // Invalid character
        assert.throws(() => validateYouTubeUrl('youtube.com/user/' + 'a'.repeat(51)), /Your Username is not a valid YouTube Username/); // Too long
        assert.throws(() => validateYouTubeUrl('youtube.com/channel/UC123'), /Your Username is not a valid YouTube Username/); // Invalid channel ID
        assert.throws(() => validateYouTubeUrl('youtube.com/c/johnsmith'), /The URL must be in a format like https:\/\/www\.youtube\.com\/@yourUsername, https:\/\/www\.youtube\.com\/user\/yourUsername, or https:\/\/www\.youtube\.com\/channel\/yourChannelId/); // Deprecated format
    });
});

describe('YouTube handle to URL conversion', () => {
    it('should convert YouTube handle to full URL', () => {
        assert.equal(youtubeHandleToUrl('@johnsmith'), 'https://www.youtube.com/@johnsmith');
        assert.equal(youtubeHandleToUrl('user/johnsmith'), 'https://www.youtube.com/user/johnsmith');
        assert.equal(youtubeHandleToUrl('channel/UC4QobU6STFB0P71PMvOGN5A'), 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A');
        assert.equal(youtubeHandleToUrl('@john.smith'), 'https://www.youtube.com/@john.smith');
    });

    it('should reject invalid YouTube handles', () => {
        assert.throws(() => youtubeHandleToUrl('@john..smith'), /Your Username is not a valid YouTube Username/);
        assert.throws(() => youtubeHandleToUrl('@jo'), /Your Username is not a valid YouTube Username/);
        assert.throws(() => youtubeHandleToUrl('@' + 'a'.repeat(31)), /Your Username is not a valid YouTube Username/);
        assert.throws(() => youtubeHandleToUrl('user/john@smith'), /Your Username is not a valid YouTube Username/);
        assert.throws(() => youtubeHandleToUrl('user/' + 'a'.repeat(51)), /Your Username is not a valid YouTube Username/);
        assert.throws(() => youtubeHandleToUrl('channel/UC123'), /Your Username is not a valid YouTube Username/);
        assert.throws(() => youtubeHandleToUrl('johnsmith'), /The handle must be in a format like @yourUsername, user\/yourUsername, or channel\/yourChannelId/); // Missing prefix
    });
});

describe('URL to YouTube handle extraction', () => {
    it('should extract YouTube handle from URL', () => {
        assert.equal(youtubeUrlToHandle('https://www.youtube.com/@johnsmith'), '@johnsmith');
        assert.equal(youtubeUrlToHandle('https://www.youtube.com/@john.smith'), '@john.smith');
        assert.equal(youtubeUrlToHandle('youtube.com/user/johnsmith'), 'user/johnsmith');
        assert.equal(youtubeUrlToHandle('www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A'), 'channel/UC4QobU6STFB0P71PMvOGN5A');
    });

    it('should return null for invalid YouTube URLs', () => {
        assert.equal(youtubeUrlToHandle('https://example.com/@johnsmith'), null);
        assert.equal(youtubeUrlToHandle('invalid-url'), null);
        assert.equal(youtubeUrlToHandle('youtube.com/c/johnsmith'), null); // Deprecated format
    });
});