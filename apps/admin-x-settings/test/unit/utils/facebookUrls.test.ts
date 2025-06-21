import * as assert from 'assert/strict';
import {facebookHandleToUrl, facebookUrlToHandle, validateFacebookUrl} from '../../../src/utils/socialUrls/index';

describe('Facebook URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            assert.equal(validateFacebookUrl(''), '');
        });

        it('should format various Facebook URL formats correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('https://www.facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('www.facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('/myPage'), 'https://www.facebook.com/myPage');
        });

        it('should reject URLs from other domains', () => {
            assert.throws(() => validateFacebookUrl('https://twitter.com/myPage'), /The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/);
            assert.throws(() => validateFacebookUrl('http://example.com'), /The URL must be in a format like https:\/\/www\.facebook\.com\/yourPage/);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert Facebook handle to full URL', () => {
            assert.equal(facebookHandleToUrl('myPage'), 'https://www.facebook.com/myPage');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract Facebook handle from URL', () => {
            assert.equal(facebookUrlToHandle('https://www.facebook.com/myPage'), 'myPage');
            assert.equal(facebookUrlToHandle('https://www.facebook.com/myPage/'), 'myPage/');
            assert.equal(facebookUrlToHandle('invalid-url'), null);
        });
    });
}); 