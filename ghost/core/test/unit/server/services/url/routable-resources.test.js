const sinon = require('sinon');
const assert = require('node:assert/strict');
const DatabaseInfo = require('@tryghost/database-info');

const models = require('../../../../../core/server/models');
const {createFetchRoutableResources} = require('../../../../../core/server/services/url/routable-resources');

describe('Unit: services/url/routable-resources', function () {
    let sandbox;
    let fetchAll;
    let lazyUrlService;
    let fetchRoutableResources;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        fetchAll = sandbox.stub(models.Base.Model.raw_knex, 'fetchAll').resolves([]);
        sandbox.stub(DatabaseInfo, 'isSQLite').returns(false);
        lazyUrlService = {
            getRequiredFields: sandbox.stub().returns([]),
            getRequiredRelations: sandbox.stub().returns([])
        };
        fetchRoutableResources = createFetchRoutableResources({lazyUrlService});
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('requires a lazy URL service backend', function () {
        assert.throws(() => createFetchRoutableResources({}), /lazy/i);
    });

    it('rejects an unknown resource type', async function () {
        await assert.rejects(fetchRoutableResources('collections'), /collections/);
    });

    it('selects only id, the requested columns and what the routers require', async function () {
        lazyUrlService.getRequiredFields.withArgs('posts').returns(['slug', 'featured']);

        await fetchRoutableResources('posts', {columns: ['feature_image', 'canonical_url']});

        const {exclude} = fetchAll.firstCall.args[0];
        for (const kept of ['id', 'slug', 'featured', 'feature_image', 'canonical_url']) {
            assert.ok(!exclude.includes(kept), `${kept} must not be excluded`);
        }
        for (const dropped of ['mobiledoc', 'lexical', 'html', 'plaintext', 'title']) {
            assert.ok(exclude.includes(dropped), `${dropped} must be excluded`);
        }
    });

    it('applies the routing gates for each type', async function () {
        await fetchRoutableResources('posts');
        await fetchRoutableResources('pages');
        await fetchRoutableResources('tags');
        await fetchRoutableResources('authors');

        sinon.assert.calledWith(fetchAll, sinon.match({modelName: 'Post', filter: 'status:published+type:post'}));
        sinon.assert.calledWith(fetchAll, sinon.match({modelName: 'Post', filter: 'status:published+type:page'}));
        // visibility:public alone is not enough for tags and authors: without
        // the has-posts join, empty tags and staff user accounts would be
        // routable/listable.
        sinon.assert.calledWith(fetchAll, sinon.match({
            modelName: 'Tag',
            filter: 'visibility:public',
            shouldHavePosts: {joinTo: 'tag_id', joinTable: 'posts_tags'}
        }));
        sinon.assert.calledWith(fetchAll, sinon.match({
            modelName: 'User',
            filter: 'visibility:public',
            shouldHavePosts: {joinTo: 'author_id', joinTable: 'posts_authors'}
        }));
    });

    it('loads post relations only when the active routing config reads them', async function () {
        await fetchRoutableResources('posts');
        assert.equal(fetchAll.firstCall.args[0].withRelated, undefined);

        lazyUrlService.getRequiredRelations.returns(['tags', 'authors']);
        await fetchRoutableResources('posts');
        assert.deepEqual(fetchAll.secondCall.args[0].withRelated, ['tags', 'authors']);
        assert.deepEqual(fetchAll.secondCall.args[0].withRelatedFields, {
            tags: ['tags.id', 'tags.slug'],
            authors: ['users.id', 'users.slug']
        });

        // Pages never carry relations, mirroring the eager resource config.
        await fetchRoutableResources('pages');
        assert.equal(fetchAll.thirdCall.args[0].withRelated, undefined);
    });

    it('batches on SQLite to avoid the bound-variable limit, in a deterministic order', async function () {
        DatabaseInfo.isSQLite.returns(true);
        fetchAll.onFirstCall().resolves([{id: 'p1'}]);
        fetchAll.onSecondCall().resolves([]);

        const rows = await fetchRoutableResources('posts');

        assert.deepEqual(rows, [{id: 'p1'}]);
        assert.equal(fetchAll.firstCall.args[0].offset, 0);
        assert.equal(fetchAll.firstCall.args[0].orderBy, 'id');
        assert.equal(fetchAll.secondCall.args[0].offset, 999);
        assert.equal(fetchAll.secondCall.args[0].limit, 999);
    });

});
