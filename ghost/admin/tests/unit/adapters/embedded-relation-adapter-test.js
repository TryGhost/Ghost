import EmbeddedRelationAdapter from 'ghost-admin/adapters/embedded-relation-adapter';
import sinon from 'sinon';
import {beforeEach, describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit | Adapter | embedded-relation-adapter', function () {
    setupTest();

    let adapter, store, type, sandbox;

    beforeEach(function () {
        adapter = this.owner.lookup('adapter:application');
        store = this.owner.lookup('service:store');
        type = {modelName: 'post'};
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    // Constants for common test values
    const PAGE_SIZE = 100;
    const MODEL_TYPE = 'post';
    const DATA_KEY = 'posts';

    // Helper functions
    function expectSuperCalled(query, buildQueryResult) {
        const superQueryStub = sandbox.stub(EmbeddedRelationAdapter.prototype.__proto__, 'query');
        sandbox.stub(adapter, 'buildQuery').returns(buildQueryResult);

        adapter.query(store, type, query);
        expect(superQueryStub).to.have.been.calledOnceWith(store, type, buildQueryResult);
    }

    function createMockStubs() {
        return {
            superQueryStub: sandbox.stub(EmbeddedRelationAdapter.prototype.__proto__, 'query'),
            buildQueryStub: sandbox.stub(adapter, 'buildQuery')
        };
    }

    function createMockPosts(count, startId = 1) {
        return new Array(count).fill(null).map((_, i) => ({
            id: startId + i,
            title: `Post ${startId + i}`
        }));
    }

    function createPaginationMeta(page, pages, total) {
        return {pagination: {page, pages, total}};
    }

    function createExpectedFinalMeta(total) {
        return {
            pagination: {
                page: 1,
                limit: total,
                pages: 1,
                total: total,
                next: null,
                prev: null
            }
        };
    }

    function setupPageMock(stubs, pageNum, query, posts, meta) {
        const paginatedQuery = {...query, limit: PAGE_SIZE, page: pageNum};
        const buildQueryResult = {...paginatedQuery, include: 'tags'};

        stubs.buildQueryStub.withArgs(store, MODEL_TYPE, paginatedQuery)
            .returns(buildQueryResult);
        stubs.superQueryStub.withArgs(store, type, buildQueryResult)
            .resolves({[DATA_KEY]: posts, meta});
    }

    describe('#query', function () {
        describe('without limit=all', function () {
            it('calls super.query when query.limit is not "all"', function () {
                expectSuperCalled(
                    {limit: 10, filter: 'status:published'},
                    {limit: 10, filter: 'status:published', include: 'tags'}
                );
            });

            it('calls super.query when query.limit is 0', function () {
                expectSuperCalled(
                    {limit: 0},
                    {limit: 0, include: 'tags'}
                );
            });

            it('calls super.query when query.limit is undefined', function () {
                expectSuperCalled(
                    {filter: 'featured:true'},
                    {filter: 'featured:true', include: 'tags'}
                );
            });

            it('calls super.query with empty query object', function () {
                expectSuperCalled(
                    {},
                    {include: 'tags'}
                );
            });

            it('passes through buildQuery result correctly to super.query', function () {
                // Arrange
                const query = {limit: 5, page: 2};
                const buildQueryResult = {
                    limit: 5,
                    page: 2,
                    include: 'authors,tags,count.posts'
                };
                const superQueryResult = Promise.resolve({
                    posts: [{id: 1, title: 'Test Post'}],
                    meta: {pagination: {total: 100}}
                });

                const superQueryStub = sandbox.stub(EmbeddedRelationAdapter.prototype.__proto__, 'query')
                    .returns(superQueryResult);
                const buildQueryStub = sandbox.stub(adapter, 'buildQuery')
                    .returns(buildQueryResult);

                // Act
                adapter.query(store, type, query);

                // Assert
                expect(buildQueryStub).to.have.been.calledOnceWith(store, 'post', query);
                expect(superQueryStub).to.have.been.calledOnceWith(store, type, buildQueryResult);
            });
        });

        describe('with limit=all', function () {
            it('fetches all pages when query.limit is "all"', async function () {
                const stubs = createMockStubs();
                const query = {filter: 'status:published'};

                // Set up three pages of mock responses
                setupPageMock(stubs, 1, query, createMockPosts(100, 1), createPaginationMeta(1, 3, 250));
                setupPageMock(stubs, 2, query, createMockPosts(100, 101), createPaginationMeta(2, 3, 250));
                setupPageMock(stubs, 3, query, createMockPosts(50, 201), createPaginationMeta(3, 3, 250));

                const result = await adapter.query(store, type, {limit: 'all', ...query});

                // Verify pagination calls
                expect(stubs.superQueryStub).to.have.been.calledThrice;
                expect(stubs.buildQueryStub).to.have.been.calledThrice;

                // Verify combined results
                expect(result[DATA_KEY]).to.have.lengthOf(250);
                expect(result[DATA_KEY][0]).to.deep.equal({id: 1, title: 'Post 1'});
                expect(result[DATA_KEY][99]).to.deep.equal({id: 100, title: 'Post 100'});
                expect(result[DATA_KEY][100]).to.deep.equal({id: 101, title: 'Post 101'});
                expect(result[DATA_KEY][249]).to.deep.equal({id: 250, title: 'Post 250'});

                // Verify final metadata
                expect(result.meta).to.deep.equal(createExpectedFinalMeta(250));
            });

            it('handles single page result when query.limit is "all"', async function () {
                const stubs = createMockStubs();
                const query = {filter: 'featured:true'};
                const posts = [{id: 1, title: 'Featured Post 1'}, {id: 2, title: 'Featured Post 2'}];

                setupPageMock(stubs, 1, query, posts, createPaginationMeta(1, 1, 2));

                const result = await adapter.query(store, type, {limit: 'all', ...query});

                expect(stubs.superQueryStub).to.have.been.calledOnce;
                expect(result[DATA_KEY]).to.have.lengthOf(2);
                expect(result[DATA_KEY][0]).to.deep.equal({id: 1, title: 'Featured Post 1'});
                expect(result[DATA_KEY][1]).to.deep.equal({id: 2, title: 'Featured Post 2'});
                expect(result.meta).to.deep.equal(createExpectedFinalMeta(2));
            });

            it('handles empty result when query.limit is "all"', async function () {
                const stubs = createMockStubs();
                const query = {filter: 'status:nonexistent'};

                setupPageMock(stubs, 1, query, [], createPaginationMeta(1, 0, 0));

                const result = await adapter.query(store, type, {limit: 'all', ...query});

                expect(stubs.superQueryStub).to.have.been.calledOnce;
                expect(result[DATA_KEY]).to.have.lengthOf(0);
                expect(result.meta).to.deep.equal(createExpectedFinalMeta(0));
            });

            it('preserves other query parameters when paginating', async function () {
                const superQueryStub = sandbox.stub(EmbeddedRelationAdapter.prototype.__proto__, 'query');
                const buildQueryStub = sandbox.stub(adapter, 'buildQuery');

                // Set up buildQuery to return the query with includes added
                buildQueryStub.callsFake((_store, modelName, query) => {
                    return {...query, include: 'tags'};
                });

                // Mock super.query responses based on the processed query
                superQueryStub.callsFake((_store, _type, processedQuery) => {
                    const pageNum = processedQuery.page;
                    const dataSize = pageNum === 1 ? 100 : 50;
                    return Promise.resolve({
                        posts: new Array(dataSize).fill(null).map((_, i) => ({id: i + (pageNum - 1) * 100 + 1})),
                        meta: {pagination: {page: pageNum, pages: 2, total: 150}}
                    });
                });

                const result = await adapter.query(store, type, {
                    limit: 'all',
                    filter: 'status:published',
                    order: 'published_at desc'
                });

                expect(result.posts).to.have.lengthOf(150);
                expect(superQueryStub).to.have.been.calledTwice;

                // Verify metadata shows this as a single page with all results
                expect(result.meta).to.deep.equal({
                    pagination: {
                        page: 1,
                        limit: 150,
                        pages: 1,
                        total: 150,
                        next: null,
                        prev: null
                    }
                });

                // Verify that both calls preserved the original query parameters
                expect(buildQueryStub).to.have.been.calledTwice;

                const allCalls = buildQueryStub.getCalls();
                const callQueries = allCalls.map(call => call.args[2]);

                // Check that we made calls for page 1 and page 2
                const page1Query = callQueries.find(q => q && q.page === 1);
                const page2Query = callQueries.find(q => q && q.page === 2);

                // Ensure both queries were found
                expect(page1Query, 'Should find page 1 query').to.exist;
                expect(page2Query, 'Should find page 2 query').to.exist;

                expect(page1Query).to.include({
                    limit: 100,
                    filter: 'status:published',
                    order: 'published_at desc'
                });

                expect(page2Query).to.include({
                    limit: 100,
                    filter: 'status:published',
                    order: 'published_at desc'
                });
            });
        });
    });
});
