import {describe, it} from 'vitest';
import {expect} from 'vitest';
import {mastodonHandleToUrl, mastodonUrlToHandle, sanitiseMastodonUrl, validateMastodonUrl} from '../../../src/utils/socialUrls/index';

describe('Mastodon URL validation', () => {
    it('should return empty string when input is empty', () => {
        expect(validateMastodonUrl('')).toBe('');
    });

    it('should format @username@instance format correctly', () => {
        expect(validateMastodonUrl('@example@indieweb.social')).toBe('https://indieweb.social/@example');
        expect(validateMastodonUrl('@johnsmith@mastodon.social')).toBe('https://mastodon.social/@johnsmith');
        expect(validateMastodonUrl('@user123@sub.mastodon.cloud')).toBe('https://sub.mastodon.cloud/@user123');
    });

    it('should format instance/@username format correctly', () => {
        expect(validateMastodonUrl('indieweb.social/@example')).toBe('https://indieweb.social/@example');
        expect(validateMastodonUrl('mastodon.social/@johnsmith')).toBe('https://mastodon.social/@johnsmith');
        expect(validateMastodonUrl('sub.mastodon.cloud/@user123')).toBe('https://sub.mastodon.cloud/@user123');
    });

    it('should format website/@username@instance format correctly', () => {
        expect(validateMastodonUrl('mastodon.xyz/@Flipboard@flipboard.social')).toBe('https://mastodon.xyz/@Flipboard@flipboard.social');
        expect(validateMastodonUrl('mastodon.social/@user@other.instance')).toBe('https://mastodon.social/@user@other.instance');
    });

    it('should reject invalid Mastodon URLs', () => {
        expect(() => validateMastodonUrl('example.com/johnsmith')).toThrow(/The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/);
        expect(() => validateMastodonUrl('invalid/@johnsmith')).toThrow(/The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/);
        expect(() => validateMastodonUrl('@johnsmith')).toThrow(/The URL must be in a format like @username@instance\.tld or https:\/\/instance\.tld\/@username or https:\/\/website\.com\/@username@instance\.tld/);
    });
});

describe('Mastodon handle to URL conversion', () => {
    it('should convert @username@instance handle to full URL', () => {
        expect(mastodonHandleToUrl('@example@indieweb.social')).toBe('https://indieweb.social/@example');
        expect(mastodonHandleToUrl('@johnsmith@mastodon.social')).toBe('https://mastodon.social/@johnsmith');
        expect(mastodonHandleToUrl('@user123@sub.mastodon.cloud')).toBe('https://sub.mastodon.cloud/@user123');
    });

    it('should convert instance/@username handle to full URL', () => {
        expect(mastodonHandleToUrl('indieweb.social/@example')).toBe('https://indieweb.social/@example');
        expect(mastodonHandleToUrl('mastodon.social/@example')).toBe('https://mastodon.social/@example');
        expect(mastodonHandleToUrl('sub.mastodon.cloud/@user123')).toBe('https://sub.mastodon.cloud/@user123');
    });

    it('should convert website/@username@instance handle to full URL', () => {
        expect(mastodonHandleToUrl('mastodon.xyz/@Flipboard@flipboard.social')).toBe('https://mastodon.xyz/@Flipboard@flipboard.social');
        expect(mastodonHandleToUrl('mastodon.social/@user@other.instance')).toBe('https://mastodon.social/@user@other.instance');
    });

    it('should reject invalid Mastodon handles', () => {
        expect(() => mastodonHandleToUrl('invalid/@johnsmith')).toThrow(/Your Username is not a valid Mastodon Username/);
        expect(() => mastodonHandleToUrl('example.com/johnsmith')).toThrow(/Your Username is not a valid Mastodon Username/);
        expect(() => mastodonHandleToUrl('@johnsmith')).toThrow(/Your Username is not a valid Mastodon Username/);
    });
});

describe('URL to Mastodon handle extraction', () => {
    it('should extract Mastodon handle from URL with different host and user instance', () => {
        expect(mastodonUrlToHandle('https://mastodon.xyz/@Flipboard@flipboard.social')).toBe('mastodon.xyz/@Flipboard@flipboard.social');
        expect(mastodonUrlToHandle('https://mastodon.social/@user@other.instance')).toBe('mastodon.social/@user@other.instance');
    });

    it('should extract Mastodon handle from URL with same host and user instance', () => {
        expect(mastodonUrlToHandle('https://indieweb.social/@example')).toBe('@example@indieweb.social');
        expect(mastodonUrlToHandle('https://mastodon.social/@example')).toBe('@example@mastodon.social');
        expect(mastodonUrlToHandle('https://sub.mastodon.cloud/@user123')).toBe('@user123@sub.mastodon.cloud');
    });

    it('should return null for invalid Mastodon URLs', () => {
        expect(mastodonUrlToHandle('invalid-url')).toBe(null);
        expect(mastodonUrlToHandle('mastodon.social/johnsmith')).toBe(null);
        expect(mastodonUrlToHandle('invalid/@johnsmith')).toBe(null);
        expect(mastodonUrlToHandle('@johnsmith')).toBe(null);
    });

    it('should sanitise Mastodon URLs', () => {
        expect(sanitiseMastodonUrl('https://mastodon.xyz/@Flipboard@flipboard.social')).toBe('mastodon.xyz/@Flipboard@flipboard.social');
        expect(sanitiseMastodonUrl('https://mastodon.social/@user@other.instance')).toBe('mastodon.social/@user@other.instance');
    });
});
