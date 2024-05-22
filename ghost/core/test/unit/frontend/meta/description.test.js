const should = require('should');
const sinon = require('sinon');
const getMetaDescription = require('../../../../core/frontend/meta/description');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('getMetaDescription', function () {
    let localSettingsCache = {};

    before(function () {
        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });
    });

    after(function () {
        sinon.restore();
    });

    beforeEach(function () {
        localSettingsCache.description = 'Site description';
        localSettingsCache.meta_description = 'Site meta description';
        localSettingsCache.og_description = 'Site og description';
        localSettingsCache.twitter_description = 'Site twitter description';
    });

    afterEach(function () {
        localSettingsCache = {};
    });

    it('should return meta_description if on data root', function () {
        const description = getMetaDescription({
            meta_description: 'My data meta description'
        }, {
            context: 'home'
        });

        description.should.equal('My data meta description');
    });

    // <meta name="description">
    describe('property: null', function () {
        it('has correct fallbacks for context: home', function () {
            getMetaDescription({}, {context: 'home'})
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            getMetaDescription({}, {context: 'home'})
                .should.equal('Site description');

            localSettingsCache.description = '';

            should(
                getMetaDescription({}, {context: 'home'})
            ).equal(null);
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                meta_description: 'Post meta description'
            };

            getMetaDescription({post}, {context: 'post'})
                .should.equal('Post meta description');

            post.meta_description = '';

            should(
                getMetaDescription({post}, {context: 'post'})
            ).equal(null);

            post.custom_excerpt = 'Custom excerpt';

            should(
                getMetaDescription({post}, {context: 'post'})
            ).equal('Custom excerpt');
        });

        it('has correct fallbacks for context: page', function () {
            const page = {
                meta_description: 'Page meta description'
            };

            getMetaDescription({page}, {context: 'page'})
                .should.equal('Page meta description');

            page.meta_description = '';

            should(
                getMetaDescription({page}, {context: 'page'})
            ).equal(null);

            page.custom_excerpt = 'Custom excerpt';

            should(
                getMetaDescription({page}, {context: 'page'})
            ).equal('Custom excerpt');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            const post = {
                meta_description: 'Page meta description'
            };

            getMetaDescription({post}, {context: 'page'})
                .should.equal('Page meta description');

            post.meta_description = '';

            should(
                getMetaDescription({post}, {context: 'page'})
            ).equal(null);
        });

        it('has correct fallbacks for context: author', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            getMetaDescription({author}, {context: 'author'})
                .should.equal('Author meta description');

            author.meta_description = '';

            getMetaDescription({author}, {context: 'author'})
                .should.equal('Author bio');

            author.bio = '';

            should(
                getMetaDescription({author}, {context: 'author'})
            ).equal(null);
        });

        it('has correct fallbacks for context: author_paged', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            should(
                getMetaDescription({author}, {context: ['author', 'paged']})
            ).equal(null);
        });

        it('has correct fallbacks for context: tag', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            getMetaDescription({tag}, {context: 'tag'})
                .should.equal('Tag meta description');

            tag.meta_description = '';

            getMetaDescription({tag}, {context: 'tag'})
                .should.equal('Tag description');

            tag.description = '';

            should(
                getMetaDescription({tag}, {context: 'tag'})
            ).equal(null);
        });

        it('has correct fallbacks for context: tag_paged', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            should(
                getMetaDescription({tag}, {context: ['tag', 'paged']})
            ).equal(null);
        });
    });

    describe('property: og', function () {
        let options;

        beforeEach(function () {
            options = {property: 'og'};
        });

        it('has correct fallbacks for context: home', function () {
            getMetaDescription({}, {context: 'home'}, options)
                .should.equal('Site og description');

            localSettingsCache.og_description = '';

            getMetaDescription({}, {context: 'home'}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            getMetaDescription({}, {context: 'home'}, options)
                .should.equal('Site description');

            localSettingsCache.description = '';

            should(
                getMetaDescription({}, {context: 'home'}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                excerpt: 'Post html',
                custom_excerpt: 'Post custom excerpt',
                meta_description: 'Post meta description',
                og_description: 'Post og description'
            };

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post og description');

            post.og_description = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post custom excerpt');

            post.custom_excerpt = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post meta description');

            post.meta_description = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post html');

            post.excerpt = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Site description');
        });

        it('has correct fallbacks for context: page', function () {
            const page = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                og_description: 'Page og description'
            };

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page og description');

            page.og_description = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page custom excerpt');

            page.custom_excerpt = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page meta description');

            page.meta_description = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page html');

            page.excerpt = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Site description');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            const post = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                og_description: 'Page og description'
            };

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page og description');

            post.og_description = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page custom excerpt');

            post.custom_excerpt = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page meta description');

            post.meta_description = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page html');

            post.excerpt = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Site description');
        });

        it('has correct fallbacks for context: author', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            getMetaDescription({author}, {context: 'author'}, options)
                .should.equal('Author meta description');

            author.meta_description = '';

            getMetaDescription({author}, {context: 'author'}, options)
                .should.equal('Author bio');

            author.bio = '';

            getMetaDescription({author}, {context: 'author'}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({author}, {context: 'author'}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: author_paged', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            getMetaDescription({author}, {context: ['author', 'paged']}, options)
                .should.equal('Author meta description');

            author.meta_description = '';

            getMetaDescription({author}, {context: ['author', 'paged']}, options)
                .should.equal('Author bio');

            author.bio = '';

            getMetaDescription({author}, {context: ['author', 'paged']}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({author}, {context: ['author', 'paged']}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: tag', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            getMetaDescription({tag}, {context: 'tag'}, options)
                .should.equal('Tag meta description');

            tag.meta_description = '';

            getMetaDescription({tag}, {context: 'tag'}, options)
                .should.equal('Tag description');

            tag.description = '';

            getMetaDescription({tag}, {context: 'tag'}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({tag}, {context: 'tag'}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: tag_paged', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
                .should.equal('Tag meta description');

            tag.meta_description = '';

            getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
                .should.equal('Tag description');

            tag.description = '';

            getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
            ).equal(null);
        });
    });

    describe('property: twitter', function () {
        let options;

        beforeEach(function () {
            options = {property: 'twitter'};
        });

        it('has correct fallbacks for context: home', function () {
            getMetaDescription({}, {context: 'home'}, options)
                .should.equal('Site twitter description');

            localSettingsCache.twitter_description = '';

            getMetaDescription({}, {context: 'home'}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            getMetaDescription({}, {context: 'home'}, options)
                .should.equal('Site description');

            localSettingsCache.description = '';

            should(
                getMetaDescription({}, {context: 'home'}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                excerpt: 'Post html',
                custom_excerpt: 'Post custom excerpt',
                meta_description: 'Post meta description',
                twitter_description: 'Post twitter description'
            };

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post twitter description');

            post.twitter_description = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post custom excerpt');

            post.custom_excerpt = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post meta description');

            post.meta_description = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Post html');

            post.excerpt = '';

            getMetaDescription({post}, {context: 'post'}, options)
                .should.equal('Site description');
        });

        it('has correct fallbacks for context: page', function () {
            const page = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                twitter_description: 'Page twitter description'
            };

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page twitter description');

            page.twitter_description = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page custom excerpt');

            page.custom_excerpt = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page meta description');

            page.meta_description = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Page html');

            page.excerpt = '';

            getMetaDescription({page}, {context: 'page'}, options)
                .should.equal('Site description');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            const post = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                twitter_description: 'Page twitter description'
            };

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page twitter description');

            post.twitter_description = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page custom excerpt');

            post.custom_excerpt = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page meta description');

            post.meta_description = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Page html');

            post.excerpt = '';

            getMetaDescription({post}, {context: 'page'}, options)
                .should.equal('Site description');
        });

        it('has correct fallbacks for context: author', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            getMetaDescription({author}, {context: 'author'}, options)
                .should.equal('Author meta description');

            author.meta_description = '';

            getMetaDescription({author}, {context: 'author'}, options)
                .should.equal('Author bio');

            author.bio = '';

            getMetaDescription({author}, {context: 'author'}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({author}, {context: 'author'}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: author_paged', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            getMetaDescription({author}, {context: ['author', 'paged']}, options)
                .should.equal('Author meta description');

            author.meta_description = '';

            getMetaDescription({author}, {context: ['author', 'paged']}, options)
                .should.equal('Author bio');

            author.bio = '';

            getMetaDescription({author}, {context: ['author', 'paged']}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({author}, {context: ['author', 'paged']}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: tag', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            getMetaDescription({tag}, {context: 'tag'}, options)
                .should.equal('Tag meta description');

            tag.meta_description = '';

            getMetaDescription({tag}, {context: 'tag'}, options)
                .should.equal('Tag description');

            tag.description = '';

            getMetaDescription({tag}, {context: 'tag'}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({tag}, {context: 'tag'}, options)
            ).equal(null);
        });

        it('has correct fallbacks for context: tag_paged', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
                .should.equal('Tag meta description');

            tag.meta_description = '';

            getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
                .should.equal('Tag description');

            tag.description = '';

            getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
                .should.equal('Site meta description');

            localSettingsCache.meta_description = '';

            should(
                getMetaDescription({tag}, {context: ['tag', 'paged']}, options)
            ).equal(null);
        });
    });

    it('should return data page meta description if on root context contains page', function () {
        const description = getMetaDescription({
            page: {
                meta_description: 'Best page ever!'
            }
        }, {
            context: ['page']
        });
        description.should.equal('Best page ever!');
    });
});
