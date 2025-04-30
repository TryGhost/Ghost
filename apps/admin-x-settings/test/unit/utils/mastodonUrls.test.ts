import * as assert from 'assert/strict';
import {mastodonHandleToUrl, mastodonUrlToHandle, sanitiseMastodonUrl, validateMastodonUrl} from '../../../src/utils/socialUrls/index';

describe('Mastodon URL validation', () => {
    it('should return empty string when input is empty', () => {
        assert.equal(validateMastodonUrl(''), '');
    });

    it('should format @username@instance format correctly', () => {
        assert.equal(validateMastodonUrl('@example@indieweb.social'), 'https://indieweb.social/@example');
        assert.equal(validateMastodonUrl('@johnsmith@mastodon.social'), 'https://mastodon.social/@johnsmith');
        assert.equal(validateMastodonUrl('@user123@sub.mastodon.cloud'), 'https://sub.mastodon.cloud/@user123');
    });

    it('should format instance/@username format correctly', () => {
        assert.equal(validateMastodonUrl('indieweb.social/@example'), 'https://indieweb.social/@example');
        assert.equal(validateMastodonUrl('mastodon.social/@johnsmith'), 'https://mastodon.social/@johnsmith');
        assert.equal(validateMastodonUrl('sub.mastodon.cloud/@user123'), 'https://sub.mastodon.cloud/@user123');
    });

    it('should format website/@username@instance format correctly', () => {
        assert.equal(validateMastodonUrl('mastodon.xyz/@Flipboard@flipboard.social'), 'https://mastodon.xyz/@Flipboard@flipboard.social');
        assert.equal(validateMastodonUrl('mastodon.social/@user@other.instance'), 'https://mastodon.social/@user@other.instance');
    });

    it('should reject invalid Mastodon URLs', () => {
        assert.throws(() => validateMastodonUrl('example.com/johnsmith'), /The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/);
        assert.throws(() => validateMastodonUrl('invalid/@johnsmith'), /The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/);
        assert.throws(() => validateMastodonUrl('@johnsmith'), /The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/);
    });
});

describe('Mastodon handle to URL conversion', () => {
    it('should convert @username@instance handle to full URL', () => {
        assert.equal(mastodonHandleToUrl('@example@indieweb.social'), 'https://indieweb.social/@example');
        assert.equal(mastodonHandleToUrl('@johnsmith@mastodon.social'), 'https://mastodon.social/@johnsmith');
        assert.equal(mastodonHandleToUrl('@user123@sub.mastodon.cloud'), 'https://sub.mastodon.cloud/@user123');
    });

    it('should convert instance/@username handle to full URL', () => {
        assert.equal(mastodonHandleToUrl('indieweb.social/@example'), 'https://indieweb.social/@example');
        assert.equal(mastodonHandleToUrl('mastodon.social/@example'), 'https://mastodon.social/@example');
        assert.equal(mastodonHandleToUrl('sub.mastodon.cloud/@user123'), 'https://sub.mastodon.cloud/@user123');
    });

    it('should convert website/@username@instance handle to full URL', () => {
        assert.equal(mastodonHandleToUrl('mastodon.xyz/@Flipboard@flipboard.social'), 'https://mastodon.xyz/@Flipboard@flipboard.social');
        assert.equal(mastodonHandleToUrl('mastodon.social/@user@other.instance'), 'https://mastodon.social/@user@other.instance');
    });

    it('should reject invalid Mastodon handles', () => {
        assert.throws(() => mastodonHandleToUrl('invalid/@johnsmith'), /Your Username is not a valid Mastodon Username/);
        assert.throws(() => mastodonHandleToUrl('example.com/johnsmith'), /Your Username is not a valid Mastodon Username/);
        assert.throws(() => mastodonHandleToUrl('@johnsmith'), /Your Username is not a valid Mastodon Username/);
    });
});

describe('URL to Mastodon handle extraction', () => {
    it('should extract Mastodon handle from URL with different host and user instance', () => {
        assert.equal(mastodonUrlToHandle('https://mastodon.xyz/@Flipboard@flipboard.social'), 'mastodon.xyz/@Flipboard@flipboard.social');
        assert.equal(mastodonUrlToHandle('https://mastodon.social/@user@other.instance'), 'mastodon.social/@user@other.instance');
    });

    it('should extract Mastodon handle from URL with same host and user instance', () => {
        assert.equal(mastodonUrlToHandle('https://indieweb.social/@example'), '@example@indieweb.social');
        assert.equal(mastodonUrlToHandle('https://mastodon.social/@example'), '@example@mastodon.social');
        assert.equal(mastodonUrlToHandle('https://sub.mastodon.cloud/@user123'), '@user123@sub.mastodon.cloud');
    });

    it('should return null for invalid Mastodon URLs', () => {
        assert.equal(mastodonUrlToHandle('invalid-url'), null);
        assert.equal(mastodonUrlToHandle('mastodon.social/johnsmith'), null);
        assert.equal(mastodonUrlToHandle('invalid/@johnsmith'), null);
        assert.equal(mastodonUrlToHandle('@johnsmith'), null);
    });

    it('should sanitise Mastodon URLs', () => {
        assert.equal(sanitiseMastodonUrl('https://mastodon.xyz/@Flipboard@flipboard.social'), 'mastodon.xyz/@Flipboard@flipboard.social');
        assert.equal(sanitiseMastodonUrl('https://mastodon.social/@user@other.instance'), 'mastodon.social/@user@other.instance');
    });
});
