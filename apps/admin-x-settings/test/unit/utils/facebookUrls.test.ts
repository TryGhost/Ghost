import * as assert from 'assert/strict';
import {FB_ERRORS, facebookHandleToUrl, facebookUrlToHandle, validateFacebookUrl} from '../../../src/utils/socialUrls/index';

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
        });

        it('should format pages URLs correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/pages/company/643146772483269'), 'https://www.facebook.com/pages/company/643146772483269');
            assert.equal(validateFacebookUrl('https://www.facebook.com/pages/company/643146772483269'), 'https://www.facebook.com/pages/company/643146772483269');
            assert.equal(validateFacebookUrl('fb.me/pages/company/643146772483269'), 'https://www.facebook.com/pages/company/643146772483269');
            assert.equal(validateFacebookUrl('https://fb.me/pages/company/643146772483269'), 'https://www.facebook.com/pages/company/643146772483269');
            assert.equal(validateFacebookUrl('pages/company/643146772483269'), 'https://www.facebook.com/pages/company/643146772483269');
        });

        it('should format groups URLs correctly', () => {
            assert.equal(validateFacebookUrl('facebook.com/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('https://www.facebook.com/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('fb.me/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('https://fb.me/groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
            assert.equal(validateFacebookUrl('groups/myGroup'), 'https://www.facebook.com/groups/myGroup');
        });

        it('should reject URLs from other domains', () => {
            assert.throws(() => validateFacebookUrl('https://twitter.com/myPage'), new RegExp(FB_ERRORS.INVALID_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('http://example.com'), new RegExp(FB_ERRORS.INVALID_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        });

        it('should reject invalid usernames', () => {
            assert.throws(() => validateFacebookUrl('facebook.com/abc'), new RegExp(FB_ERRORS.INVALID_USERNAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('facebook.com/my\nPage'), new RegExp(FB_ERRORS.INVALID_USERNAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('facebook.com/my-page'), new RegExp(FB_ERRORS.INVALID_USERNAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        });

        it('should reject invalid pages URLs', () => {
            assert.throws(() => validateFacebookUrl('facebook.com/pages/company'), new RegExp(FB_ERRORS.INVALID_PAGE_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('facebook.com/pages/company/abc'), new RegExp(FB_ERRORS.INVALID_PAGE_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('facebook.com/pages/company/123/extra'), new RegExp(FB_ERRORS.INVALID_PAGE_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('pages/company/1234'), new RegExp(FB_ERRORS.INVALID_PAGE_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        });

        it('should reject invalid groups URLs', () => {
            assert.throws(() => validateFacebookUrl('facebook.com/groups'), new RegExp(FB_ERRORS.INVALID_GROUP_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('facebook.com/groups/abc'), new RegExp(FB_ERRORS.INVALID_GROUP_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('facebook.com/groups/my-group'), new RegExp(FB_ERRORS.INVALID_GROUP_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            assert.throws(() => validateFacebookUrl('groups/my\ngroup'), new RegExp(FB_ERRORS.INVALID_GROUP_FORMAT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        });
    });

    describe('Handle to URL conversion', () => {
        it('should convert regular Facebook handle to full URL', () => {
            assert.equal(facebookHandleToUrl('myPage'), 'https://www.facebook.com/myPage');
        });

        it('should convert pages handle to full URL', () => {
            assert.equal(facebookHandleToUrl('pages/company/643146772483269'), 'https://www.facebook.com/pages/company/643146772483269');
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
            assert.equal(facebookUrlToHandle('https://www.facebook.com/pages/company/643146772483269'), 'pages/company/643146772483269');
            assert.equal(facebookUrlToHandle('https://fb.me/pages/company/643146772483269'), 'pages/company/643146772483269');
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