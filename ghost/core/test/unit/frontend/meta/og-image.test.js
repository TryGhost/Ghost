const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');
const getOgImage = require('../../../../core/frontend/meta/og-image');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('getOgImage', function () {
    let localSettingsCache = {};

    beforeEach(function () {
        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });
    });

    afterEach(function () {
        sinon.restore();
        localSettingsCache = {};
    });

    it('has correct fallbacks for context: home', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        assert(getOgImage({context: ['home'], home: {}}).endsWith('/content/images/settings-og.jpg'));

        localSettingsCache.og_image = '';

        assert(getOgImage({context: ['home'], home: {}}).endsWith('/content/images/settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getOgImage({context: ['home'], home: {}}), null);
    });

    it('has correct fallbacks for context: post', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            og_image: '/content/images/post-og.jpg',
            feature_image: '/content/images/post-feature.jpg'
        };

        assert(getOgImage({context: ['post'], post}).endsWith('post-og.jpg'));

        post.og_image = '';

        assert(getOgImage({context: ['post'], post}).endsWith('post-feature.jpg'));

        post.feature_image = '';

        assert(getOgImage({context: ['post'], post}).endsWith('settings-og.jpg'));

        localSettingsCache.og_image = '';

        assert(getOgImage({context: ['post'], post}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getOgImage({context: ['post'], post}), null);
    });

    it('has correct fallbacks for context: page', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const page = {
            og_image: '/content/images/page-og.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        assert(getOgImage({context: ['page'], page}).endsWith('page-og.jpg'));

        page.og_image = '';

        assert(getOgImage({context: ['page'], page}).endsWith('page-feature.jpg'));

        page.feature_image = '';

        assert(getOgImage({context: ['page'], page}).endsWith('settings-og.jpg'));

        localSettingsCache.og_image = '';

        assert(getOgImage({context: ['page'], page}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getOgImage({context: ['page'], page}), null);
    });

    it('has correct fallbacks for context: page (legacy format)', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            og_image: '/content/images/page-og.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        assert(getOgImage({context: ['page'], post}).endsWith('page-og.jpg'));

        post.og_image = '';

        assert(getOgImage({context: ['page'], post}).endsWith('page-feature.jpg'));

        post.feature_image = '';

        assert(getOgImage({context: ['page'], post}).endsWith('settings-og.jpg'));

        localSettingsCache.og_image = '';

        assert(getOgImage({context: ['page'], post}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getOgImage({context: ['page'], post}), null);
    });

    it('has correct fallbacks for context: author', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        assert(getOgImage({context: ['author'], author}).endsWith('author-cover.jpg'));

        author.cover_image = '';

        assert.equal(getOgImage({context: ['author'], author}), null);
    });

    it('has correct fallbacks for context: author_paged', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        assert(getOgImage({context: ['author', 'paged'], author}).endsWith('author-cover.jpg'));

        author.cover_image = '';

        assert.equal(getOgImage({context: ['author', 'paged'], author}), null);
    });

    it('has correct fallbacks for context: tag', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        assert(getOgImage({context: ['tag'], tag}).endsWith('tag-feature.jpg'));

        tag.feature_image = '';

        assert(getOgImage({context: ['tag'], tag}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getOgImage({context: ['tag'], tag}), null);
    });

    it('has correct fallbacks for context: tag_paged', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        assert(getOgImage({context: ['tag', 'paged'], tag}).endsWith('tag-feature.jpg'));

        tag.feature_image = '';

        assert(getOgImage({context: ['tag', 'paged'], tag}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getOgImage({context: ['tag', 'paged'], tag}), null);
    });
});
