import * as assert from 'assert/strict';
import {FB_ERRORS, facebookHandleToUrl, facebookUrlToHandle, validateFacebookUrl} from '../../../src/utils/socialUrls/index';

// Convert FB_ERRORS to regex patterns for testing
const FB_ERROR_PATTERNS = {
    INVALID_URL: new RegExp(FB_ERRORS.INVALID_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    INVALID_USERNAME: new RegExp(FB_ERRORS.INVALID_USERNAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    INVALID_PAGE_FORMAT: new RegExp(FB_ERRORS.INVALID_PAGE_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    INVALID_GROUP_FORMAT: new RegExp(FB_ERRORS.INVALID_GROUP_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
};

describe('Facebook URLs', () => {
    describe('URL validation', () => {
        it('should return empty string when input is empty', () => {
            assert.equal(validateFacebookUrl(''), '');
        });

        it('should format various regular username URL formats correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('https://www.facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('www.facebook.com/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('fb.me/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('https://fb.me/myPage'), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('  myPage  '), 'https://www.facebook.com/myPage');
            assert.equal(validateFacebookUrl('@myPage'), 'https://www.facebook.com/myPage');
        });

        it('should format pages URLs correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/pages/myCompany/643146772483269'), 'https://www.facebook.com/pages/myCompany/643146772483269');
            assert.equal(validateFacebookUrl('https://www.facebook.com/pages/myCompany/643146772483269'), 'https://www.facebook.com/pages/myCompany/643146772483269');
            assert.equal(validateFacebookUrl('fb.me/pages/myCompany/643146772483269'), 'https://www.facebook.com/pages/myCompany/643146772483269');
            assert.equal(validateFacebookUrl('https://fb.me/pages/myCompany/643146772483269'), 'https://www.facebook.com/pages/myCompany/643146772483269');
            assert.equal(validateFacebookUrl('pages/myCompany/643146772483269'), 'https://www.facebook.com/pages/myCompany/643146772483269');
        });

        it('should format groups URLs correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('https://www.facebook.com/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('fb.me/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('https://fb.me/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
        });

        it('should reject URLs from other domains', () => {
            assert.throws(() => validateFacebookUrl('https://twitter.com/myPage'), FB_ERROR_PATTERNS.INVALID_URL);
            assert.throws(() => validateFacebookUrl('http://example.com'), FB_ERROR_PATTERNS.INVALID_URL);
        });

        it('should reject invalid usernames', () => {
            assert.throws(() => validateFacebookUrl('facebook.com/abc'), FB_ERROR_PATTERNS.INVALID_USERNAME);
            assert.throws(() => validateFacebookUrl('facebook.com/my\nPage'), FB_ERROR_PATTERNS.INVALID_USERNAME);
            assert.throws(() => validateFacebookUrl('facebook.com/my-page'), FB_ERROR_PATTERNS.INVALID_USERNAME);
        });

        it('should reject invalid pages URLs', () => {
            assert.throws(() => validateFacebookUrl('facebook.com/pages/myCompany'), FB_ERROR_PATTERNS.INVALID_PAGE_FORMAT);
            assert.throws(() => validateFacebookUrl('facebook.com/pages/myCompany/abc'), FB_ERROR_PATTERNS.INVALID_PAGE_FORMAT);
            assert.throws(() => validateFacebookUrl('facebook.com/pages/myCompany/123/extra'), FB_ERROR_PATTERNS.INVALID_PAGE_FORMAT);
            assert.throws(() => validateFacebookUrl('pages/myCompany/1234'), FB_ERROR_PATTERNS.INVALID_PAGE_FORMAT);
        });

        it('should reject invalid groups URLs', () => {
            assert.throws(() => validateFacebookUrl('facebook.com/groups'), FB_ERROR_PATTERNS.INVALID_GROUP_FORMAT);
            assert.throws(() => validateFacebookUrl('facebook.com/groups/abc'), FB_ERROR_PATTERNS.INVALID_GROUP_FORMAT);
            assert.throws(() => validateFacebookUrl('facebook.com/groups/my-group'), FB_ERROR_PATTERNS.INVALID_GROUP_FORMAT);
            assert.throws(() => validateFacebookUrl('groups/my\ngroup'), FB_ERROR_PATTERNS.INVALID_GROUP_FORMAT);
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert regular Facebook handle to full URL', () => {
            assert.equal(facebookHandleToUrl('myPage'), 'https://www.facebook.com/myPage');
        });

        it('should convert pages handle to full URL', () => {
            assert.equal(facebookHandleToUrl('pages/myCompany/643146772483269'), 'https://www.facebook.com/pages/myCompany/643146772483269');
        });

        it('should convert groups handle to full URL', () => {
            assert.equal(facebookHandleToUrl('groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
        });
    });

    describe('URL to handle extraction', () => {
        it('should extract regular Facebook handle from URL', () => {
            assert.equal(facebookUrlToHandle('https://www.facebook.com/myPage'), 'myPage');
            assert.equal(facebookUrlToHandle('https://www.facebook.com/myPage/'), 'myPage');
            assert.equal(facebookUrlToHandle('https://fb.me/myPage'), 'myPage');
            assert.equal(facebookUrlToHandle('https://fb.me/myPage/'), 'myPage');
        });

        it('should extract pages handle from URL', () => {
            assert.equal(facebookUrlToHandle('https://www.facebook.com/pages/myCompany/643146772483269'), 'pages/myCompany/643146772483269');
            assert.equal(facebookUrlToHandle('https://fb.me/pages/myCompany/643146772483269'), 'pages/myCompany/643146772483269');
        });

        it('should extract groups handle from URL', () => {
            assert.equal(facebookUrlToHandle('https://www.facebook.com/groups/myGroup'), 'groups/myGroup');
            assert.equal(facebookUrlToHandle('https://fb.me/groups/myGroup'), 'groups/myGroup');
        });

        it('should return null for invalid URLs', () => {
            assert.equal(facebookUrlToHandle('invalid-url'), null);
            assert.equal(facebookUrlToHandle('facebook.com/my\nPage'), null);
            assert.equal(facebookUrlToHandle('https://twitter.com/user'), null);
        });
    });
}); 