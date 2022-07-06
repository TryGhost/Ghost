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

        getOgImage({context: ['home'], home: {}})
            .should.endWith('/content/images/settings-og.jpg');

        localSettingsCache.og_image = '';

        getOgImage({context: ['home'], home: {}})
            .should.endWith('/content/images/settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getOgImage({context: ['home'], home: {}})
        ).equal(null);
    });

    it('has correct fallbacks for context: post', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            og_image: '/content/images/post-og.jpg',
            feature_image: '/content/images/post-feature.jpg'
        };

        getOgImage({context: ['post'], post})
            .should.endWith('post-og.jpg');

        post.og_image = '';

        getOgImage({context: ['post'], post})
            .should.endWith('post-feature.jpg');

        post.feature_image = '';

        should(
            getOgImage({context: ['post'], post})
        ).endWith('settings-og.jpg');

        localSettingsCache.og_image = '';

        should(
            getOgImage({context: ['post'], post})
        ).endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getOgImage({context: ['post'], post})
        ).equal(null);
    });

    it('has correct fallbacks for context: page', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const page = {
            og_image: '/content/images/page-og.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        getOgImage({context: ['page'], page})
            .should.endWith('page-og.jpg');

        page.og_image = '';

        getOgImage({context: ['page'], page})
            .should.endWith('page-feature.jpg');

        page.feature_image = '';

        should(
            getOgImage({context: ['page'], page})
        ).endWith('settings-og.jpg');

        localSettingsCache.og_image = '';

        should(
            getOgImage({context: ['page'], page})
        ).endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getOgImage({context: ['page'], page})
        ).equal(null);
    });

    it('has correct fallbacks for context: page (legacy format)', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const post = {
            og_image: '/content/images/page-og.jpg',
            feature_image: '/content/images/page-feature.jpg'
        };

        getOgImage({context: ['page'], post})
            .should.endWith('page-og.jpg');

        post.og_image = '';

        getOgImage({context: ['page'], post})
            .should.endWith('page-feature.jpg');

        post.feature_image = '';

        should(
            getOgImage({context: ['page'], post})
        ).endWith('settings-og.jpg');

        localSettingsCache.og_image = '';

        should(
            getOgImage({context: ['page'], post})
        ).endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getOgImage({context: ['page'], post})
        ).equal(null);
    });

    it('has correct fallbacks for context: author', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        getOgImage({context: ['author'], author})
            .should.endWith('author-cover.jpg');

        author.cover_image = '';

        should(
            getOgImage({context: ['author'], author})
        ).equal(null);
    });

    it('has correct fallbacks for context: author_paged', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const author = {
            cover_image: '/content/images/author-cover.jpg'
        };

        getOgImage({context: ['author', 'paged'], author})
            .should.endWith('author-cover.jpg');

        author.cover_image = '';

        should(
            getOgImage({context: ['author', 'paged'], author})
        ).equal(null);
    });

    it('has correct fallbacks for context: tag', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        getOgImage({context: ['tag'], tag})
            .should.endWith('tag-feature.jpg');

        tag.feature_image = '';

        getOgImage({context: ['tag'], tag})
            .should.endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getOgImage({context: ['tag'], tag})
        ).equal(null);
    });

    it('has correct fallbacks for context: tag_paged', function () {
        localSettingsCache.og_image = '/content/images/settings-og.jpg';
        localSettingsCache.cover_image = '/content/images/settings-cover.jpg';

        const tag = {
            feature_image: '/content/images/tag-feature.jpg'
        };

        getOgImage({context: ['tag', 'paged'], tag})
            .should.endWith('tag-feature.jpg');

        tag.feature_image = '';

        getOgImage({context: ['tag', 'paged'], tag})
            .should.endWith('settings-cover.jpg');

        localSettingsCache.cover_image = '';

        should(
            getOgImage({context: ['tag', 'paged'], tag})
        ).equal(null);
    });
});
