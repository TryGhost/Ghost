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

    it('queries Post with type:post and status:published for posts', async function () {
        models.Post.findOne.resolves(record({id: 'p1', slug: 'hello'}));

        await findResource('posts', {slug: 'hello'});

        sinon.assert.calledWith(
            models.Post.findOne,
            sinon.match({slug: 'hello', type: 'post', status: 'published'}),
            sinon.match.has('require', false)
        );
    });

    it('queries Post with type:page and status:published for pages', async function () {
        models.Post.findOne.resolves(record({id: 'pg1', slug: 'about'}));

        await findResource('pages', {slug: 'about'});

        sinon.assert.calledWith(
            models.Post.findOne,
            sinon.match({slug: 'about', type: 'page', status: 'published'}),
            sinon.match.has('require', false)
        );
    });

    it('asks Post.findOne to load the tags and authors relations on posts', async function () {
        // Without these relations every tag-/author-filtered route 404s (HKG-1738).
        models.Post.findOne.resolves(record({id: 'p1'}));

        await findResource('posts', {slug: 'hello'});

        sinon.assert.calledWith(
            models.Post.findOne,
            sinon.match.any,
            sinon.match({withRelated: sinon.match.array.contains(['tags', 'authors'])})
        );
    });

    it('requests only routing-relevant post columns, omitting heavy body fields', async function () {
        models.Post.findOne.resolves(record({id: 'p1', slug: 'hello'}));

        await findResource('posts', {slug: 'hello'});

        const options = models.Post.findOne.firstCall.args[1];
        assert.ok(Array.isArray(options.columns), 'a columns projection should be set');
        for (const heavy of ['mobiledoc', 'lexical', 'html', 'plaintext']) {
            assert.ok(!options.columns.includes(heavy), `${heavy} must not be selected`);
        }
        assert.ok(options.columns.includes('slug'));
        assert.ok(options.columns.includes('published_at'));
    });

    it('derives primary_tag from the first public tag (toJSON skips it under a columns projection)', async function () {
        models.Post.findOne.resolves(record({
            id: 'p1',
            slug: 'hello',
            tags: [{slug: 'news', visibility: 'public'}, {slug: 'misc', visibility: 'public'}]
        }));

        const result = await findResource('posts', {slug: 'hello'});

        assert.deepEqual(result.primary_tag, {slug: 'news', visibility: 'public'});
    });

    it('sets primary_tag to null when the first tag is not public', async function () {
        models.Post.findOne.resolves(record({
            id: 'p1',
            slug: 'hello',
            tags: [{slug: 'secret', visibility: 'internal'}]
        }));

        const result = await findResource('posts', {slug: 'hello'});

        assert.equal(result.primary_tag, null);
    });

    it('derives primary_author from the first author', async function () {
        models.Post.findOne.resolves(record({
            id: 'p1',
            slug: 'hello',
            authors: [{slug: 'jane'}, {slug: 'john'}]
        }));

        const result = await findResource('posts', {slug: 'hello'});

        assert.deepEqual(result.primary_author, {slug: 'jane'});
    });

    it('does not load tags/authors for pages (the StaticPagesRouter is filterless)', async function () {
        models.Post.findOne.resolves(record({id: 'pg1'}));

        await findResource('pages', {slug: 'about'});

        const options = models.Post.findOne.firstCall.args[1];
        assert.equal(options.withRelated, undefined);
    });

    it('queries TagPublic with visibility:public for tags', async function () {
        models.TagPublic.findOne.resolves(record({id: 't1', slug: 'news'}));

        await findResource('tags', {slug: 'news'});

        sinon.assert.calledWith(
            models.TagPublic.findOne,
            sinon.match({slug: 'news', visibility: 'public'}),
            sinon.match.any
        );
    });

    it('queries Author with visibility:public for authors', async function () {
        models.Author.findOne.resolves(record({id: 'a1', slug: 'jane'}));

        await findResource('authors', {slug: 'jane'});

        sinon.assert.calledWith(
            models.Author.findOne,
            sinon.match({slug: 'jane', visibility: 'public'}),
            sinon.match.any
        );
    });

    it('returns the toJSON result on hit, null on miss', async function () {
        models.Post.findOne.onFirstCall().resolves(record({id: 'p1', slug: 'hello'}));
        models.Post.findOne.onSecondCall().resolves(null);

        assert.deepEqual(await findResource('posts', {slug: 'hello'}), {id: 'p1', slug: 'hello'});
        assert.equal(await findResource('posts', {slug: 'missing'}), null);
    });

    it('returns null for unknown router types without touching any model', async function () {
        const result = await findResource('unknown', {slug: 'anything'});

        assert.equal(result, null);
        sinon.assert.notCalled(models.Post.findOne);
        sinon.assert.notCalled(models.TagPublic.findOne);
        sinon.assert.notCalled(models.Author.findOne);
    });

    it('forwards multi-field query params (e.g. primary_tag + slug) to the model', async function () {
        models.Post.findOne.resolves(record({id: 'p1', slug: 'hello'}));

        await findResource('posts', {primary_tag: 'news', slug: 'hello'});

        sinon.assert.calledWith(
            models.Post.findOne,
            sinon.match({primary_tag: 'news', slug: 'hello', type: 'post', status: 'published'}),
            sinon.match.any
        );
    });

    it('does not over-fetch tags/authors relations for tags lookups', async function () {
        models.TagPublic.findOne.resolves(record({id: 't1', slug: 'news'}));

        await findResource('tags', {slug: 'news'});

        const options = models.TagPublic.findOne.firstCall.args[1];
        assert.equal(options.withRelated, undefined);
    });

    it('always queries with require:false so a miss resolves to null rather than throwing', async function () {
        models.Author.findOne.resolves(null);

        const result = await findResource('authors', {slug: 'ghost'});

        assert.equal(result, null);
        sinon.assert.calledWith(
            models.Author.findOne,
            sinon.match.any,
            sinon.match.has('require', false)
        );
    });
});
