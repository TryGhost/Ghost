import * as assert from 'assert/strict';
import {mastodonHandleToUrl, mastodonUrlToHandle, validateMastodonUrl} from '../../../src/utils/socialUrls/index';

describe('Mastodon URL validation', () => {
    it('should return empty string when input is empty', () => {
        assert.equal(validateMastodonUrl(''), '');
    });

    it('should format various Mastodon URL formats correctly', () => {
        assert.equal(validateMastodonUrl('mastodon.social/@johnsmith'), 'https://mastodon.social/@johnsmith');
        assert.equal(validateMastodonUrl('https://mastodon.social/@johnsmith@decentra.io'), 'https://mastodon.social/@johnsmith@decentra.io');
        assert.equal(validateMastodonUrl('sub.mastodon.cloud/@user123'), 'https://sub.mastodon.cloud/@user123');
    });

    it('should reject invalid Mastodon URLs', () => {
        assert.throws(() => validateMastodonUrl('example.com/johnsmith'), /The URL must be in a format like instance\/@yourUsername or instance\/@yourUsername@instance/); // No @
        assert.throws(() => validateMastodonUrl('invalid/@johnsmith'), /The URL must be in a format like instance\/@yourUsername or instance\/@yourUsername@instance/); // Invalid domain
    });
});

describe('Mastodon handle to URL conversion', () => {
    it('should convert Mastodon handle to full URL', () => {
        assert.equal(mastodonHandleToUrl('mastodon.social/@johnsmith'), 'https://mastodon.social/@johnsmith');
        assert.equal(mastodonHandleToUrl('infosec.exchange/@jane_doe'), 'https://infosec.exchange/@jane_doe');
        assert.equal(mastodonHandleToUrl('sub.mastodon.cloud/@user123'), 'https://sub.mastodon.cloud/@user123');
    });

    it('should reject invalid Mastodon handles', () => {
        assert.throws(() => mastodonHandleToUrl('invalid/@johnsmith'), /Your Username is not a valid Mastodon Username/); // Invalid domain
        assert.throws(() => mastodonHandleToUrl('example.com/johnsmith'), /Your Username is not a valid Mastodon Username/); // No @
    });
});

describe('URL to Mastodon handle extraction', () => {
    it('should extract Mastodon handle from URL', () => {
        assert.equal(mastodonUrlToHandle('https://mastodon.social/@johnsmith'), 'mastodon.social/@johnsmith');
        assert.equal(mastodonUrlToHandle('mastodon.social/@johnsmith'), 'mastodon.social/@johnsmith');
        assert.equal(mastodonUrlToHandle('sub.mastodon.cloud/@user123'), 'sub.mastodon.cloud/@user123');
        assert.equal(mastodonUrlToHandle('www.social.network/@grok@x.ai'), 'www.social.network/@grok@x.ai');
    });

    it('should return null for invalid Mastodon URLs', () => {
        assert.equal(mastodonUrlToHandle('invalid-url'), null);
        assert.equal(mastodonUrlToHandle('mastodon.social/johnsmith'), null); // No @
        assert.equal(mastodonUrlToHandle('invalid/@johnsmith'), null); // Invalid domain
    });
});
