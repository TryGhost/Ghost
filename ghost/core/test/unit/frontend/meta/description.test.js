const assert = require('node:assert/strict');
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

        assert.equal(description, 'My data meta description');
    });

    // <meta name="description">
    describe('property: null', function () {
        it('has correct fallbacks for context: home', function () {
            assert.equal(getMetaDescription({}, {context: 'home'}), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}), 'Site description');

            localSettingsCache.description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}), null);
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                meta_description: 'Post meta description'
            };

            assert.equal(getMetaDescription({post}, {context: 'post'}), 'Post meta description');

            post.meta_description = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}), null);

            post.custom_excerpt = 'Custom excerpt';

            assert.equal(getMetaDescription({post}, {context: 'post'}), 'Custom excerpt');
        });

        it('has correct fallbacks for context: page', function () {
            const page = {
                meta_description: 'Page meta description'
            };

            assert.equal(getMetaDescription({page}, {context: 'page'}), 'Page meta description');

            page.meta_description = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}), null);

            page.custom_excerpt = 'Custom excerpt';

            assert.equal(getMetaDescription({page}, {context: 'page'}), 'Custom excerpt');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            const post = {
                meta_description: 'Page meta description'
            };

            assert.equal(getMetaDescription({post}, {context: 'page'}), 'Page meta description');

            post.meta_description = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}), null);
        });

        it('has correct fallbacks for context: author', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            assert.equal(getMetaDescription({author}, {context: 'author'}), 'Author meta description');

            author.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}), 'Author bio');

            author.bio = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}), null);
        });

        it('has correct fallbacks for context: author_paged', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}), null);
        });

        it('has correct fallbacks for context: tag', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            assert.equal(getMetaDescription({tag}, {context: 'tag'}), 'Tag meta description');

            tag.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}), 'Tag description');

            tag.description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}), null);
        });

        it('has correct fallbacks for context: tag_paged', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}), null);
        });
    });

    describe('property: og', function () {
        let options;

        beforeEach(function () {
            options = {property: 'og'};
        });

        it('has correct fallbacks for context: home', function () {
            assert.equal(getMetaDescription({}, {context: 'home'}, options), 'Site og description');

            localSettingsCache.og_description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}, options), 'Site description');

            localSettingsCache.description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}, options), null);
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                excerpt: 'Post html',
                custom_excerpt: 'Post custom excerpt',
                meta_description: 'Post meta description',
                og_description: 'Post og description'
            };

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post og description');

            post.og_description = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post custom excerpt');

            post.custom_excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post meta description');

            post.meta_description = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post html');

            post.excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Site description');
        });

        it('has correct fallbacks for context: page', function () {
            const page = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                og_description: 'Page og description'
            };

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page og description');

            page.og_description = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page custom excerpt');

            page.custom_excerpt = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page meta description');

            page.meta_description = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page html');

            page.excerpt = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Site description');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            const post = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                og_description: 'Page og description'
            };

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page og description');

            post.og_description = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page custom excerpt');

            post.custom_excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page meta description');

            post.meta_description = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page html');

            post.excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Site description');
        });

        it('has correct fallbacks for context: author', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), 'Author meta description');

            author.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), 'Author bio');

            author.bio = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), null);
        });

        it('has correct fallbacks for context: author_paged', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), 'Author meta description');

            author.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), 'Author bio');

            author.bio = '';

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), null);
        });

        it('has correct fallbacks for context: tag', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), 'Tag meta description');

            tag.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), 'Tag description');

            tag.description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), null);
        });

        it('has correct fallbacks for context: tag_paged', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), 'Tag meta description');

            tag.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), 'Tag description');

            tag.description = '';

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), null);
        });
    });

    describe('property: twitter', function () {
        let options;

        beforeEach(function () {
            options = {property: 'twitter'};
        });

        it('has correct fallbacks for context: home', function () {
            assert.equal(getMetaDescription({}, {context: 'home'}, options), 'Site twitter description');

            localSettingsCache.twitter_description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}, options), 'Site description');

            localSettingsCache.description = '';

            assert.equal(getMetaDescription({}, {context: 'home'}, options), null);
        });

        it('has correct fallbacks for context: post', function () {
            const post = {
                excerpt: 'Post html',
                custom_excerpt: 'Post custom excerpt',
                meta_description: 'Post meta description',
                twitter_description: 'Post twitter description'
            };

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post twitter description');

            post.twitter_description = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post custom excerpt');

            post.custom_excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post meta description');

            post.meta_description = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Post html');

            post.excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'post'}, options), 'Site description');
        });

        it('has correct fallbacks for context: page', function () {
            const page = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                twitter_description: 'Page twitter description'
            };

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page twitter description');

            page.twitter_description = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page custom excerpt');

            page.custom_excerpt = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page meta description');

            page.meta_description = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Page html');

            page.excerpt = '';

            assert.equal(getMetaDescription({page}, {context: 'page'}, options), 'Site description');
        });

        // NOTE: this is a legacy format and should be resolved with https://github.com/TryGhost/Ghost/issues/10042
        it('has correct fallbacks for context: page (legacy format)', function () {
            const post = {
                excerpt: 'Page html',
                custom_excerpt: 'Page custom excerpt',
                meta_description: 'Page meta description',
                twitter_description: 'Page twitter description'
            };

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page twitter description');

            post.twitter_description = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page custom excerpt');

            post.custom_excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page meta description');

            post.meta_description = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Page html');

            post.excerpt = '';

            assert.equal(getMetaDescription({post}, {context: 'page'}, options), 'Site description');
        });

        it('has correct fallbacks for context: author', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), 'Author meta description');

            author.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), 'Author bio');

            author.bio = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: 'author'}, options), null);
        });

        it('has correct fallbacks for context: author_paged', function () {
            const author = {
                meta_description: 'Author meta description',
                bio: 'Author bio'
            };

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), 'Author meta description');

            author.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), 'Author bio');

            author.bio = '';

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({author}, {context: ['author', 'paged']}, options), null);
        });

        it('has correct fallbacks for context: tag', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), 'Tag meta description');

            tag.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), 'Tag description');

            tag.description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: 'tag'}, options), null);
        });

        it('has correct fallbacks for context: tag_paged', function () {
            const tag = {
                meta_description: 'Tag meta description',
                description: 'Tag description'
            };

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), 'Tag meta description');

            tag.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), 'Tag description');

            tag.description = '';

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), 'Site meta description');

            localSettingsCache.meta_description = '';

            assert.equal(getMetaDescription({tag}, {context: ['tag', 'paged']}, options), null);
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
        assert.equal(description, 'Best page ever!');
    });
});
