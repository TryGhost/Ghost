const assert = require('node:assert/strict');
const BaseUrlGenerator = require('../../../../../core/server/services/url/base-url-generator');

describe('Unit: services/url/BaseUrlGenerator', function () {
    it('assigns identifier, resourceType, permalink, uid from constructor', function () {
        const gen = new BaseUrlGenerator({
            identifier: 'router-1',
            resourceType: 'posts',
            permalink: '/:slug/',
            position: 3
        });

        assert.equal(gen.identifier, 'router-1');
        assert.equal(gen.resourceType, 'posts');
        assert.equal(gen.permalink, '/:slug/');
        assert.equal(gen.uid, 3);
    });

    it('leaves filter and nql undefined when no filter is provided', function () {
        const gen = new BaseUrlGenerator({
            identifier: 'router-1',
            resourceType: 'posts',
            permalink: '/:slug/'
        });

        assert.equal(gen.filter, undefined);
        assert.equal(gen.nql, undefined);
    });

    it('compiles a filter string into an nql query when filter is provided', function () {
        const gen = new BaseUrlGenerator({
            identifier: 'router-1',
            filter: 'featured:true',
            resourceType: 'posts',
            permalink: '/:slug/'
        });

        assert.equal(gen.filter, 'featured:true');
        assert.ok(gen.nql, 'expected nql to be compiled');
        assert.equal(typeof gen.nql.queryJSON, 'function');
    });

    it('expands tag/author/primary_tag/primary_author keys via EXPANSIONS', function () {
        const gen = new BaseUrlGenerator({
            identifier: 'router-1',
            filter: 'tag:news',
            resourceType: 'posts',
            permalink: '/:slug/'
        });

        // tag:news should match a post with tags.slug === 'news'
        assert.equal(gen.nql.queryJSON({tags: [{slug: 'news'}]}), true);
        assert.equal(gen.nql.queryJSON({tags: [{slug: 'sports'}]}), false);
    });

    it('maps page:false → type:post and page:true → type:page', function () {
        const postsGen = new BaseUrlGenerator({
            identifier: 'r',
            filter: 'page:false',
            resourceType: 'posts',
            permalink: '/:slug/'
        });

        assert.equal(postsGen.nql.queryJSON({type: 'post'}), true);
        assert.equal(postsGen.nql.queryJSON({type: 'page'}), false);

        const pagesGen = new BaseUrlGenerator({
            identifier: 'r',
            filter: 'page:true',
            resourceType: 'pages',
            permalink: '/:slug/'
        });

        assert.equal(pagesGen.nql.queryJSON({type: 'page'}), true);
        assert.equal(pagesGen.nql.queryJSON({type: 'post'}), false);
    });

    describe('matches()', function () {
        it('returns true when no filter is set', function () {
            const gen = new BaseUrlGenerator({
                identifier: 'r',
                resourceType: 'posts',
                permalink: '/:slug/'
            });

            assert.equal(gen.matches({slug: 'anything'}), true);
        });

        it('returns true when filter matches the resource', function () {
            const gen = new BaseUrlGenerator({
                identifier: 'r',
                filter: 'featured:true',
                resourceType: 'posts',
                permalink: '/:slug/'
            });

            assert.equal(gen.matches({featured: true}), true);
        });

        it('returns false when filter does not match the resource', function () {
            const gen = new BaseUrlGenerator({
                identifier: 'r',
                filter: 'featured:true',
                resourceType: 'posts',
                permalink: '/:slug/'
            });

            assert.equal(gen.matches({featured: false}), false);
        });

        it('returns false (does not throw) when nql evaluation fails', function () {
            const gen = new BaseUrlGenerator({
                identifier: 'r',
                filter: 'featured:true',
                resourceType: 'posts',
                permalink: '/:slug/'
            });
            // Force a queryJSON that throws
            gen.nql = {queryJSON: () => {
                throw new Error('boom');
            }};

            assert.equal(gen.matches({}), false);
        });
    });
});
