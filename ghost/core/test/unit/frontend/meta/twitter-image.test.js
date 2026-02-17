const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');
const getTwitterImage = require('../../../../core/frontend/meta/twitter-image');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('getTwitterImage', function () {
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
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        assert(getTwitterImage({context: ['home'], home: {}}).endsWith('/content/images/settings-twitter.jpg'));

        localSettingsCache.twitter_image = '';

        assert(getTwitterImage({context: ['home'], home: {}}).endsWith('/content/images/settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getTwitterImage({context: ['home'], home: {}}), null);
    });

    it('has correct fallbacks for context: post', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            twitter_image: '/content/images/post-twitter.jpg',
            feature_image: '/content/images/post-feature.jpg'
        };

        assert(getTwitterImage({context: ['post'], post}).endsWith('post-twitter.jpg'));

        post.twitter_image = '';

        assert(getTwitterImage({context: ['post'], post}).endsWith('post-feature.jpg'));

        post.feature_image = '';

        assert(getTwitterImage({context: ['post'], post}).endsWith('settings-twitter.jpg'));

        localSettingsCache.twitter_image = '';

        assert(getTwitterImage({context: ['post'], post}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getTwitterImage({context: ['post'], post}), null);
    });

    it('has correct fallbacks for context: page', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const page = {
            twitter_image: '/content/images/page-twitter.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        assert(getTwitterImage({context: ['page'], page}).endsWith('page-twitter.jpg'));

        page.twitter_image = '';

        assert(getTwitterImage({context: ['page'], page}).endsWith('page-feature.jpg'));

        page.feature_image = '';

        assert(getTwitterImage({context: ['page'], page}).endsWith('settings-twitter.jpg'));

        localSettingsCache.twitter_image = '';

        assert(getTwitterImage({context: ['page'], page}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getTwitterImage({context: ['page'], page}), null);
    });

    it('has correct fallbacks for context: page (legacy format)', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            twitter_image: '/content/images/page-twitter.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        assert(getTwitterImage({context: ['page'], post}).endsWith('page-twitter.jpg'));

        post.twitter_image = '';

        assert(getTwitterImage({context: ['page'], post}).endsWith('page-feature.jpg'));

        post.feature_image = '';

        assert(getTwitterImage({context: ['page'], post}).endsWith('settings-twitter.jpg'));

        localSettingsCache.twitter_image = '';

        assert(getTwitterImage({context: ['page'], post}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getTwitterImage({context: ['page'], post}), null);
    });

    it('has correct fallbacks for context: author', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        assert(getTwitterImage({context: ['author'], author}).endsWith('author-cover.jpg'));

        author.cover_image = '';

        assert.equal(getTwitterImage({context: ['author'], author}), null);
    });

    it('has correct fallbacks for context: author_paged', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        assert(getTwitterImage({context: ['author', 'paged'], author}).endsWith('author-cover.jpg'));

        author.cover_image = '';

        assert.equal(getTwitterImage({context: ['author', 'paged'], author}), null);
    });

    it('has correct fallbacks for context: tag', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        assert(getTwitterImage({context: ['tag'], tag}).endsWith('tag-feature.jpg'));

        tag.feature_image = '';

        assert(getTwitterImage({context: ['tag'], tag}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getTwitterImage({context: ['tag'], tag}), null);
    });

    it('has correct fallbacks for context: tag_paged', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        assert(getTwitterImage({context: ['tag', 'paged'], tag}).endsWith('tag-feature.jpg'));

        tag.feature_image = '';

        assert(getTwitterImage({context: ['tag', 'paged'], tag}).endsWith('settings-cover.jpg'));

        localSettingsCache.cover_image = '';

        assert.equal(getTwitterImage({context: ['tag', 'paged'], tag}), null);
    });
});
