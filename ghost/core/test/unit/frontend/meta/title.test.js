const should = require('should');
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

        title.should.equal('My test title');
    });

    describe('property: null', function () {
        it('has correct fallbacks for context: home', function () {
            localSettingsCache.title = 'My site title';
            localSettingsCache.meta_title = 'My site meta title';

            getTitle({}, {context: 'home'})
                .should.equal('My site meta title');

            localSettingsCache.meta_title = '';

            getTitle({}, {context: 'home'})
                .should.equal('My site title');
        });

        it('has correct fallbacks for context: post', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Post title',
                meta_title: 'Post meta title'
            };

            getTitle({post}, {context: 'post'})
                .should.equal('Post meta title');

            post.meta_title = '';

            getTitle({post}, {context: 'post'})
                .should.equal('Post title');

            post.title = '';

            getTitle({post}, {context: 'post'})
                .should.equal('');
        });

        it('has correct fallbacks for context: page', function () {
            localSettingsCache.title = 'My site title';
            const page = {
                title: 'Page title',
                meta_title: 'Page meta title'
            };

            getTitle({page}, {context: 'page'})
                .should.equal('Page meta title');

            page.meta_title = '';

            getTitle({page}, {context: 'page'})
                .should.equal('Page title');

            page.title = '';

            getTitle({page}, {context: 'page'})
                .should.equal('');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Page title',
                meta_title: 'Page meta title'
            };

            getTitle({post}, {context: 'page'})
                .should.equal('Page meta title');

            post.meta_title = '';

            getTitle({post}, {context: 'page'})
                .should.equal('Page title');

            post.title = '';

            getTitle({post}, {context: 'page'})
                .should.equal('');
        });

        it('has correct fallbacks for context: author', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            getTitle({author}, {context: 'author'})
                .should.equal('Author name - Site title');
        });

        it('has correct fallbacks for context: author_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            getTitle({author}, {context: ['author', 'paged'], pagination: {total: 40, page: 3}})
                .should.equal('Author name - Site title (Page 3)');
        });

        it('has correct fallbacks for context: tag', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            getTitle({tag}, {context: 'tag'})
                .should.equal('Tag meta title');

            tag.meta_title = '';

            getTitle({tag}, {context: 'tag'})
                .should.equal('Tag name - Site title');
        });

        it('has correct fallbacks for context: tag_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}})
                .should.equal('Tag meta title');

            tag.meta_title = '';

            getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}})
                .should.equal('Tag name - Site title (Page 3)');
        });
    });

    describe('property: og', function () {
        it('has correct fallbacks for context: home', function () {
            localSettingsCache.title = 'My site title';
            localSettingsCache.meta_title = 'My site meta title';
            localSettingsCache.og_title = 'My site og title';

            getTitle({}, {context: 'home'}, {property: 'og'})
                .should.equal('My site og title');

            localSettingsCache.og_title = '';

            getTitle({}, {context: 'home'}, {property: 'og'})
                .should.equal('My site title');
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                title: 'Post title',
                meta_title: 'Post meta title',
                og_title: 'Post og title'
            };

            getTitle({post}, {context: 'post'}, {property: 'og'})
                .should.equal('Post og title');

            post.og_title = '';

            getTitle({post}, {context: 'post'}, {property: 'og'})
                .should.equal('Post meta title');

            post.meta_title = '';

            getTitle({post}, {context: 'post'}, {property: 'og'})
                .should.equal('Post title');
        });

        it('has correct fallbacks for context: page', function () {
            localSettingsCache.title = 'My site title';
            const page = {
                title: 'Page title',
                meta_title: 'Page meta title',
                og_title: 'Page og title'
            };

            getTitle({page}, {context: 'page'}, {property: 'og'})
                .should.equal('Page og title');

            page.og_title = '';

            getTitle({page}, {context: 'page'}, {property: 'og'})
                .should.equal('Page meta title');

            page.meta_title = '';

            getTitle({page}, {context: 'page'}, {property: 'og'})
                .should.equal('Page title');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Page title',
                meta_title: 'Page meta title',
                og_title: 'Page og title'
            };

            getTitle({post}, {context: 'page'}, {property: 'og'})
                .should.equal('Page og title');

            post.og_title = '';

            getTitle({post}, {context: 'page'}, {property: 'og'})
                .should.equal('Page meta title');

            post.meta_title = '';

            getTitle({post}, {context: 'page'}, {property: 'og'})
                .should.equal('Page title');
        });

        it('has correct fallbacks for context: author', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            getTitle({author}, {context: 'author'}, {property: 'og'})
                .should.equal('Author name - Site title');
        });

        it('has correct fallbacks for context: author_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            getTitle({author}, {context: ['author', 'paged'], pagination: {total: 40, page: 3}}, {property: 'og'})
                .should.equal('Author name - Site title (Page 3)');
        });

        it('has correct fallbacks for context: tag', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            getTitle({tag}, {context: 'tag'}, {property: 'og'})
                .should.equal('Tag meta title');

            tag.meta_title = '';

            getTitle({tag}, {context: 'tag'}, {property: 'og'})
                .should.equal('Tag name - Site title');
        });

        it('has correct fallbacks for context: tag_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'og'})
                .should.equal('Tag meta title');

            tag.meta_title = '';

            getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'og'})
                .should.equal('Tag name - Site title (Page 3)');
        });
    });

    describe('property: twitter', function () {
        it('has correct fallbacks for context: home', function () {
            localSettingsCache.title = 'My site title';
            localSettingsCache.meta_title = 'My site meta title';
            localSettingsCache.twitter_title = 'My site twitter title';

            getTitle({}, {context: 'home'}, {property: 'twitter'})
                .should.equal('My site twitter title');

            localSettingsCache.twitter_title = '';

            getTitle({}, {context: 'home'}, {property: 'twitter'})
                .should.equal('My site title');
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                title: 'Post title',
                meta_title: 'Post meta title',
                twitter_title: 'Post twitter title'
            };

            getTitle({post}, {context: 'post'}, {property: 'twitter'})
                .should.equal('Post twitter title');

            post.twitter_title = '';

            getTitle({post}, {context: 'post'}, {property: 'twitter'})
                .should.equal('Post meta title');

            post.meta_title = '';

            getTitle({post}, {context: 'post'}, {property: 'twitter'})
                .should.equal('Post title');
        });

        it('has correct fallbacks for context: page', function () {
            localSettingsCache.title = 'My site title';
            const page = {
                title: 'Page title',
                meta_title: 'Page meta title',
                twitter_title: 'Page twitter title'
            };

            getTitle({page}, {context: 'page'}, {property: 'twitter'})
                .should.equal('Page twitter title');

            page.twitter_title = '';

            getTitle({page}, {context: 'page'}, {property: 'twitter'})
                .should.equal('Page meta title');

            page.meta_title = '';

            getTitle({page}, {context: 'page'}, {property: 'twitter'})
                .should.equal('Page title');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            localSettingsCache.title = 'My site title';
            const post = {
                title: 'Page title',
                meta_title: 'Page meta title',
                twitter_title: 'Page twitter title'
            };

            getTitle({post}, {context: 'page'}, {property: 'twitter'})
                .should.equal('Page twitter title');

            post.twitter_title = '';

            getTitle({post}, {context: 'page'}, {property: 'twitter'})
                .should.equal('Page meta title');

            post.meta_title = '';

            getTitle({post}, {context: 'page'}, {property: 'twitter'})
                .should.equal('Page title');
        });

        it('has correct fallbacks for context: author', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            getTitle({author}, {context: 'author'}, {property: 'twitter'})
                .should.equal('Author name - Site title');
        });

        it('has correct fallbacks for context: author_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const author = {
                name: 'Author name'
            };

            getTitle({author}, {context: ['author', 'paged'], pagination: {total: 40, page: 3}}, {property: 'twitter'})
                .should.equal('Author name - Site title (Page 3)');
        });

        it('has correct fallbacks for context: tag', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            getTitle({tag}, {context: 'tag'}, {property: 'twitter'})
                .should.equal('Tag meta title');

            tag.meta_title = '';

            getTitle({tag}, {context: 'tag'}, {property: 'twitter'})
                .should.equal('Tag name - Site title');
        });

        it('has correct fallbacks for context: tag_paged', function () {
            localSettingsCache.title = 'Site title';
            localSettingsCache.meta_title = 'Site meta title';
            const tag = {
                name: 'Tag name',
                meta_title: 'Tag meta title'
            };

            getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'twitter'})
                .should.equal('Tag meta title');

            tag.meta_title = '';

            getTitle({tag}, {context: ['tag', 'paged'], pagination: {total: 40, page: 3}}, {property: 'twitter'})
                .should.equal('Tag name - Site title (Page 3)');
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

        title.should.equal('My site title 4 (Page 35)');
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

        title.should.equal('My tag');

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

        title.should.equal('My tag - (Page 35)');

        title = getTitle({
            author: {
                name: 'My name'
            }
        }, {
            context: ['author']
        });

        title.should.equal('My name');

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

        title.should.equal('My name - (Page 35)');
    });
});
