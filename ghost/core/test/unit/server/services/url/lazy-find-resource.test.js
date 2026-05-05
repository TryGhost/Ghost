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
        // Locks the contract that exposed HKG-1738: tag/author NQL filters
        // (e.g. routes.yaml `filter: tag:news`) evaluate against
        // `tags.slug` / `authors.slug` on the loaded record. Without
        // withRelated the record has no `.tags` / `.authors`, every
        // tag-filtered route silently 404s.
        models.Post.findOne.resolves(record({id: 'p1'}));

        await findResource('posts', {slug: 'hello'});

        sinon.assert.calledWith(
            models.Post.findOne,
            sinon.match.any,
            sinon.match({withRelated: sinon.match.array.contains(['tags', 'authors'])})
        );
    });

    it('asks Post.findOne to load tags and authors on pages too', async function () {
        models.Post.findOne.resolves(record({id: 'pg1'}));

        await findResource('pages', {slug: 'about'});

        sinon.assert.calledWith(
            models.Post.findOne,
            sinon.match.any,
            sinon.match({withRelated: sinon.match.array.contains(['tags', 'authors'])})
        );
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
});
