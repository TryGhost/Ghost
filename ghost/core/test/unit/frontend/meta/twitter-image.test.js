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

        getTwitterImage({context: ['home'], home: {}})
            .should.endWith('/content/images/settings-twitter.jpg');

        localSettingsCache.twitter_image = '';

        getTwitterImage({context: ['home'], home: {}})
            .should.endWith('/content/images/settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getTwitterImage({context: ['home'], home: {}})
        ).equal(null);
    });

    it('has correct fallbacks for context: post', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            twitter_image: '/content/images/post-twitter.jpg',
            feature_image: '/content/images/post-feature.jpg'
        };

        getTwitterImage({context: ['post'], post})
            .should.endWith('post-twitter.jpg');

        post.twitter_image = '';

        getTwitterImage({context: ['post'], post})
            .should.endWith('post-feature.jpg');

        post.feature_image = '';

        should(
            getTwitterImage({context: ['post'], post})
        ).endWith('settings-twitter.jpg');

        localSettingsCache.twitter_image = '';

        should(
            getTwitterImage({context: ['post'], post})
        ).endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getTwitterImage({context: ['post'], post})
        ).equal(null);
    });

    it('has correct fallbacks for context: page', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const page = {
            twitter_image: '/content/images/page-twitter.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        getTwitterImage({context: ['page'], page})
            .should.endWith('page-twitter.jpg');

        page.twitter_image = '';

        getTwitterImage({context: ['page'], page})
            .should.endWith('page-feature.jpg');

        page.feature_image = '';

        should(
            getTwitterImage({context: ['page'], page})
        ).endWith('settings-twitter.jpg');

        localSettingsCache.twitter_image = '';

        should(
            getTwitterImage({context: ['page'], page})
        ).endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getTwitterImage({context: ['page'], page})
        ).equal(null);
    });

    it('has correct fallbacks for context: page (legacy format)', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            twitter_image: '/content/images/page-twitter.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        getTwitterImage({context: ['page'], post})
            .should.endWith('page-twitter.jpg');

        post.twitter_image = '';

        getTwitterImage({context: ['page'], post})
            .should.endWith('page-feature.jpg');

        post.feature_image = '';

        should(
            getTwitterImage({context: ['page'], post})
        ).endWith('settings-twitter.jpg');

        localSettingsCache.twitter_image = '';

        should(
            getTwitterImage({context: ['page'], post})
        ).endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getTwitterImage({context: ['page'], post})
        ).equal(null);
    });

    it('has correct fallbacks for context: author', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        getTwitterImage({context: ['author'], author})
            .should.endWith('author-cover.jpg');

        author.cover_image = '';

        should(
            getTwitterImage({context: ['author'], author})
        ).equal(null);
    });

    it('has correct fallbacks for context: author_paged', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        getTwitterImage({context: ['author', 'paged'], author})
            .should.endWith('author-cover.jpg');

        author.cover_image = '';

        should(
            getTwitterImage({context: ['author', 'paged'], author})
        ).equal(null);
    });

    it('has correct fallbacks for context: tag', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        getTwitterImage({context: ['tag'], tag})
            .should.endWith('tag-feature.jpg');

        tag.feature_image = '';

        getTwitterImage({context: ['tag'], tag})
            .should.endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getTwitterImage({context: ['tag'], tag})
        ).equal(null);
    });

    it('has correct fallbacks for context: tag_paged', function () {
        localSettingsCache.twitter_image = '/content/images/settings-twitter.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        getTwitterImage({context: ['tag', 'paged'], tag})
            .should.endWith('tag-feature.jpg');

        tag.feature_image = '';

        getTwitterImage({context: ['tag', 'paged'], tag})
            .should.endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getTwitterImage({context: ['tag', 'paged'], tag})
        ).equal(null);
    });
});
