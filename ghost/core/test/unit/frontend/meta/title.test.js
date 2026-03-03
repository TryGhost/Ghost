const assert = require('node:assert/strict');
const sinon = require('sinon');
const getTitle = require('../../../../core/frontend/meta/title');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('getTitle', function () {
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

    it('should return meta_title if on data root', function () {
        const title = getTitle({
            meta_title: 'My test title'
        });

        assert.equal(title, 'My test title');
    });

    describe('property: null', function () {
        it('has correct fallbacks for context: home', function () {
            localSettingsCache.title = 'My site title';
            localSettingsCache.meta_title = 'My site meta title';

            assert.equal(getTitle({}, {context: 'home'}), 'My site meta title');

            localSettingsCache.meta_title = '';

            assert.equal(getTitle({}, {context: 'home'}), 'My site title');
        });

        it('has correct fallbacks for context: post', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Post title',
                meta_title: 'Post meta title'
            };

            assert.equal(getTitle({post}, {context: 'post'}), 'Post meta title');

            post.meta_title = '';

            assert.equal(getTitle({post}, {context: 'post'}), 'Post title');

            post.title = '';

            assert.equal(getTitle({post}, {context: 'post'}), '');
        });

        it('has correct fallbacks for context: page', function () {
            localSettingsCache.title = 'My site title';
            const page = {
                title: 'Page title',
                meta_title: 'Page meta title'
            };

            assert.equal(getTitle({page}, {context: 'page'}), 'Page meta title');

            page.meta_title = '';

            assert.equal(getTitle({page}, {context: 'page'}), 'Page title');

            page.title = '';

            assert.equal(getTitle({page}, {context: 'page'}), '');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Page title',
                meta_title: 'Page meta title'
            };

            assert.equal(getTitle({post}, {context: 'page'}), 'Page meta title');

            post.meta_title = '';

            assert.equal(getTitle({post}, {context: 'page'}), 'Page title');

            post.title = '';

            assert.equal(getTitle({post}, {context: 'page'}), '');
        });

        it('has correct fallbacks for context: author', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            assert.equal(getTitle({author}, {context: 'author'}), 'Author name - Site title');
        });

        it('has correct fallbacks for context: author_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            assert.equal(getTitle({author}, {context: ['author', 'paged'], pagination: {total: 40, page: 3}}), 'Author name - Site title (Page 3)');
        });

        it('has correct fallbacks for context: tag', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            assert.equal(getTitle({tag}, {context: 'tag'}), 'Tag meta title');

            tag.meta_title = '';

            assert.equal(getTitle({tag}, {context: 'tag'}), 'Tag name - Site title');
        });

        it('has correct fallbacks for context: tag_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            assert.equal(getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}), 'Tag meta title');

            tag.meta_title = '';

            assert.equal(getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}), 'Tag name - Site title (Page 3)');
        });
    });

    describe('property: og', function () {
        it('has correct fallbacks for context: home', function () {
            localSettingsCache.title = 'My site title';
            localSettingsCache.meta_title = 'My site meta title';
            localSettingsCache.og_title = 'My site og title';

            assert.equal(getTitle({}, {context: 'home'}, {property: 'og'}), 'My site og title');

            localSettingsCache.og_title = '';

            assert.equal(getTitle({}, {context: 'home'}, {property: 'og'}), 'My site title');
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                title: 'Post title',
                meta_title: 'Post meta title',
                og_title: 'Post og title'
            };

            assert.equal(getTitle({post}, {context: 'post'}, {property: 'og'}), 'Post og title');

            post.og_title = '';

            assert.equal(getTitle({post}, {context: 'post'}, {property: 'og'}), 'Post meta title');

            post.meta_title = '';

            assert.equal(getTitle({post}, {context: 'post'}, {property: 'og'}), 'Post title');
        });

        it('has correct fallbacks for context: page', function () {
            localSettingsCache.title = 'My site title';
            const page = {
                title: 'Page title',
                meta_title: 'Page meta title',
                og_title: 'Page og title'
            };

            assert.equal(getTitle({page}, {context: 'page'}, {property: 'og'}), 'Page og title');

            page.og_title = '';

            assert.equal(getTitle({page}, {context: 'page'}, {property: 'og'}), 'Page meta title');

            page.meta_title = '';

            assert.equal(getTitle({page}, {context: 'page'}, {property: 'og'}), 'Page title');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Page title',
                meta_title: 'Page meta title',
                og_title: 'Page og title'
            };

            assert.equal(getTitle({post}, {context: 'page'}, {property: 'og'}), 'Page og title');

            post.og_title = '';

            assert.equal(getTitle({post}, {context: 'page'}, {property: 'og'}), 'Page meta title');

            post.meta_title = '';

            assert.equal(getTitle({post}, {context: 'page'}, {property: 'og'}), 'Page title');
        });

        it('has correct fallbacks for context: author', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            assert.equal(getTitle({author}, {context: 'author'}, {property: 'og'}), 'Author name - Site title');
        });

        it('has correct fallbacks for context: author_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            assert.equal(getTitle({author}, {context: ['author', 'paged'], pagination: {total: 40, page: 3}}, {property: 'og'}), 'Author name - Site title (Page 3)');
        });

        it('has correct fallbacks for context: tag', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            assert.equal(getTitle({tag}, {context: 'tag'}, {property: 'og'}), 'Tag meta title');

            tag.meta_title = '';

            assert.equal(getTitle({tag}, {context: 'tag'}, {property: 'og'}), 'Tag name - Site title');
        });

        it('has correct fallbacks for context: tag_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            assert.equal(getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'og'}), 'Tag meta title');

            tag.meta_title = '';

            assert.equal(getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'og'}), 'Tag name - Site title (Page 3)');
        });
    });

    describe('property: twitter', function () {
        it('has correct fallbacks for context: home', function () {
            localSettingsCache.title = 'My site title';
            localSettingsCache.meta_title = 'My site meta title';
            localSettingsCache.twitter_title = 'My site twitter title';

            assert.equal(getTitle({}, {context: 'home'}, {property: 'twitter'}), 'My site twitter title');

            localSettingsCache.twitter_title = '';

            assert.equal(getTitle({}, {context: 'home'}, {property: 'twitter'}), 'My site title');
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                title: 'Post title',
                meta_title: 'Post meta title',
                twitter_title: 'Post twitter title'
            };

            assert.equal(getTitle({post}, {context: 'post'}, {property: 'twitter'}), 'Post twitter title');

            post.twitter_title = '';

            assert.equal(getTitle({post}, {context: 'post'}, {property: 'twitter'}), 'Post meta title');

            post.meta_title = '';

            assert.equal(getTitle({post}, {context: 'post'}, {property: 'twitter'}), 'Post title');
        });

        it('has correct fallbacks for context: page', function () {
            localSettingsCache.title = 'My site title';
            const page = {
                title: 'Page title',
                meta_title: 'Page meta title',
                twitter_title: 'Page twitter title'
            };

            assert.equal(getTitle({page}, {context: 'page'}, {property: 'twitter'}), 'Page twitter title');

            page.twitter_title = '';

            assert.equal(getTitle({page}, {context: 'page'}, {property: 'twitter'}), 'Page meta title');

            page.meta_title = '';

            assert.equal(getTitle({page}, {context: 'page'}, {property: 'twitter'}), 'Page title');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Page title',
                meta_title: 'Page meta title',
                twitter_title: 'Page twitter title'
            };

            assert.equal(getTitle({post}, {context: 'page'}, {property: 'twitter'}), 'Page twitter title');

            post.twitter_title = '';

            assert.equal(getTitle({post}, {context: 'page'}, {property: 'twitter'}), 'Page meta title');

            post.meta_title = '';

            assert.equal(getTitle({post}, {context: 'page'}, {property: 'twitter'}), 'Page title');
        });

        it('has correct fallbacks for context: author', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            assert.equal(getTitle({author}, {context: 'author'}, {property: 'twitter'}), 'Author name - Site title');
        });

        it('has correct fallbacks for context: author_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            assert.equal(getTitle({author}, {context: ['author', 'paged'], pagination: {total: 40, page: 3}}, {property: 'twitter'}), 'Author name - Site title (Page 3)');
        });

        it('has correct fallbacks for context: tag', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            assert.equal(getTitle({tag}, {context: 'tag'}, {property: 'twitter'}), 'Tag meta title');

            tag.meta_title = '';

            assert.equal(getTitle({tag}, {context: 'tag'}, {property: 'twitter'}), 'Tag name - Site title');
        });

        it('has correct fallbacks for context: tag_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            assert.equal(getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'twitter'}), 'Tag meta title');

            tag.meta_title = '';

            assert.equal(getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'twitter'}), 'Tag name - Site title (Page 3)');
        });
    });

    it('should return site title with page if unknown type', function () {
        localSettingsCache.title = 'My site title 4';

        var title = getTitle({}, {
            context: ['paged'],
            pagination: {
                total: 40,
                page: 35
            }
        });

        assert.equal(title, 'My site title 4 (Page 35)');
    });

    it('should not display "null" for an undefined site title', function () {
        localSettingsCache.title = null;

        var title = getTitle({
            tag: {
                name: 'My tag'
            }
        }, {
            context: ['tag']
        });

        assert.equal(title, 'My tag');

        title = getTitle({
            tag: {
                name: 'My tag'
            }
        }, {
            context: ['tag', 'paged'],
            pagination: {
                total: 40,
                page: 35
            }
        });

        assert.equal(title, 'My tag - (Page 35)');

        title = getTitle({
            author: {
                name: 'My name'
            }
        }, {
            context: ['author']
        });

        assert.equal(title, 'My name');

        title = getTitle({
            author: {
                name: 'My name'
            }
        }, {
            context: ['author', 'paged'],
            pagination: {
                total: 40,
                page: 35
            }
        });

        assert.equal(title, 'My name - (Page 35)');
    });
});
