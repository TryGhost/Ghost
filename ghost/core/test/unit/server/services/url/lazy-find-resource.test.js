const assert = require('node:assert/strict');
const sinon = require('sinon');
const {createFindResource} = require('../../../../../core/server/services/url/lazy-find-resource');

function fakeModel() {
    return {findOne: sinon.stub()};
}

function record(attrs) {
    return {toJSON: () => attrs};
}

describe('createFindResource', function () {
    let models;
    let findResource;

    beforeEach(function () {
        models = {Post: fakeModel(), TagPublic: fakeModel(), Author: fakeModel()};
        findResource = createFindResource(models);
    });

    describe('posts', function () {
        it('queries Post scoped to type:post and status:published', async function () {
            models.Post.findOne.resolves(record({id: 'p1', slug: 'hello'}));

            await findResource('posts', {slug: 'hello'});

            sinon.assert.calledWith(
                models.Post.findOne,
                sinon.match({slug: 'hello', type: 'post', status: 'published'}),
                sinon.match.has('require', false)
            );
        });

        it('loads the tags and authors relations', async function () {
            models.Post.findOne.resolves(record({id: 'p1'}));

            await findResource('posts', {slug: 'hello'});

            sinon.assert.calledWith(
                models.Post.findOne,
                sinon.match.any,
                sinon.match({withRelated: ['tags', 'authors']})
            );
        });

        it('derives primary_author from the first author', async function () {
            models.Post.findOne.resolves(record({
                id: 'p1',
                slug: 'hello',
                authors: [{slug: 'jane'}, {slug: 'bob'}]
            }));

            const result = await findResource('posts', {slug: 'hello'});

            assert.deepEqual(result.primary_author, {slug: 'jane'});
        });

        it('strips fields the eager service excludes (body, status, posts_meta)', async function () {
            models.Post.findOne.resolves(record({
                id: 'p1',
                slug: 'hello',
                title: 'Hello',
                html: '<p>x</p>',
                mobiledoc: '{}',
                lexical: '{}',
                plaintext: 'x',
                status: 'published',
                comment_id: 'c1',
                posts_meta: {meta_title: 'm'},
                featured: false,
                visibility: 'public'
            }));

            const result = await findResource('posts', {slug: 'hello'});

            for (const key of ['title', 'html', 'mobiledoc', 'lexical', 'plaintext', 'status', 'comment_id', 'posts_meta']) {
                assert.equal(key in result, false, `${key} should be stripped`);
            }
            assert.equal(result.featured, false);
            assert.equal(result.visibility, 'public');
        });

        it('trims tags and authors relations to {id, slug}', async function () {
            models.Post.findOne.resolves(record({
                id: 'p1',
                slug: 'hello',
                tags: [{id: 't1', slug: 'news', name: 'News', description: 'd'}],
                authors: [{id: 'a1', slug: 'jane', name: 'Jane', email: 'jane@x.com'}]
            }));

            const result = await findResource('posts', {slug: 'hello'});

            assert.deepEqual(result.tags, [{id: 't1', slug: 'news'}]);
            assert.deepEqual(result.authors, [{id: 'a1', slug: 'jane'}]);
        });

        it('trims the derived primary_author and primary_tag to {id, slug}', async function () {
            models.Post.findOne.resolves(record({
                id: 'p1',
                slug: 'hello',
                authors: [{id: 'a1', slug: 'jane', name: 'Jane', email: 'jane@x.com'}, {id: 'a2', slug: 'bob'}],
                primary_tag: {id: 't1', slug: 'news', name: 'News', description: 'd'}
            }));

            const result = await findResource('posts', {slug: 'hello'});

            assert.deepEqual(result.primary_author, {id: 'a1', slug: 'jane'});
            assert.deepEqual(result.primary_tag, {id: 't1', slug: 'news'});
        });

        it('sets primary_author to null when the authors relation is empty', async function () {
            models.Post.findOne.resolves(record({id: 'p1', slug: 'hello', authors: []}));

            const result = await findResource('posts', {slug: 'hello'});

            assert.equal(result.primary_author, null);
        });

        it('leaves primary_author untouched when authors are not loaded', async function () {
            models.Post.findOne.resolves(record({id: 'p1', slug: 'hello'}));

            const result = await findResource('posts', {slug: 'hello'});

            assert.equal('primary_author' in result, false);
        });
    });

    describe('pages', function () {
        it('queries Post scoped to type:page and status:published', async function () {
            models.Post.findOne.resolves(record({id: 'pg1', slug: 'about'}));

            await findResource('pages', {slug: 'about'});

            sinon.assert.calledWith(
                models.Post.findOne,
                sinon.match({slug: 'about', type: 'page', status: 'published'}),
                sinon.match.has('require', false)
            );
        });

        it('does not load relations for pages', async function () {
            models.Post.findOne.resolves(record({id: 'pg1'}));

            await findResource('pages', {slug: 'about'});

            const options = models.Post.findOne.firstCall.args[1];
            assert.equal(options.withRelated, undefined);
        });

        it('exposes primary_tag/primary_author as null and strips relations and body', async function () {
            models.Post.findOne.resolves(record({
                id: 'pg1',
                slug: 'about',
                title: 'About',
                html: '<p>x</p>',
                tags: [{id: 't1', slug: 'news'}],
                authors: [{id: 'a1', slug: 'jane'}]
            }));

            const result = await findResource('pages', {slug: 'about'});

            assert.equal(result.primary_tag, null);
            assert.equal(result.primary_author, null);
            assert.equal('tags' in result, false);
            assert.equal('authors' in result, false);
            assert.equal('title' in result, false);
            assert.equal('html' in result, false);
        });
    });

    describe('tags and authors', function () {
        it('queries TagPublic with visibility:public for tags', async function () {
            models.TagPublic.findOne.resolves(record({id: 't1', slug: 'news'}));

            await findResource('tags', {slug: 'news'});

            sinon.assert.calledWith(
                models.TagPublic.findOne,
                sinon.match({slug: 'news', visibility: 'public'}),
                sinon.match.has('require', false)
            );
        });

        it('strips description and meta fields from a tag', async function () {
            models.TagPublic.findOne.resolves(record({
                id: 't1',
                slug: 'news',
                name: 'News',
                description: 'd',
                meta_title: 'm',
                meta_description: 'md'
            }));

            const result = await findResource('tags', {slug: 'news'});

            assert.equal('description' in result, false);
            assert.equal('meta_title' in result, false);
            assert.equal('meta_description' in result, false);
            assert.equal(result.name, 'News');
            assert.equal(result.slug, 'news');
        });

        it('queries Author with visibility:public for authors', async function () {
            models.Author.findOne.resolves(record({id: 'a1', slug: 'jane'}));

            await findResource('authors', {slug: 'jane'});

            sinon.assert.calledWith(
                models.Author.findOne,
                sinon.match({slug: 'jane', visibility: 'public'}),
                sinon.match.has('require', false)
            );
        });

        it('strips bio and contact fields from an author', async function () {
            models.Author.findOne.resolves(record({
                id: 'a1',
                slug: 'jane',
                name: 'Jane',
                bio: 'b',
                website: 'w',
                twitter: 't',
                last_seen: 'x'
            }));

            const result = await findResource('authors', {slug: 'jane'});

            assert.equal('bio' in result, false);
            assert.equal('website' in result, false);
            assert.equal('twitter' in result, false);
            assert.equal('last_seen' in result, false);
            assert.equal(result.name, 'Jane');
        });
    });

    describe('misses and unknown types', function () {
        it('returns the pruned record on a hit and null on a miss', async function () {
            models.Post.findOne.onFirstCall().resolves(record({id: 'p1', slug: 'hello'}));
            models.Post.findOne.onSecondCall().resolves(null);

            assert.deepEqual(await findResource('posts', {slug: 'hello'}), {id: 'p1', slug: 'hello'});
            assert.equal(await findResource('posts', {slug: 'missing'}), null);
        });

        it('returns null for an unknown router type without touching any model', async function () {
            const result = await findResource('widgets', {slug: 'anything'});

            assert.equal(result, null);
            sinon.assert.notCalled(models.Post.findOne);
            sinon.assert.notCalled(models.TagPublic.findOne);
            sinon.assert.notCalled(models.Author.findOne);
        });
    });
});
