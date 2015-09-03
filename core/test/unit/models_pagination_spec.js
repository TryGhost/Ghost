/*globals describe, it, before, beforeEach, afterEach */
/*jshint expr:true*/
var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),

// Thing we're testing
    pagination = rewire('../../server/models/base/pagination');

// To stop jshint complaining
should.equal(true, true);

describe('pagination', function () {
    var sandbox,
        paginationUtils;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('paginationUtils', function () {
        before(function () {
            paginationUtils = pagination.__get__('paginationUtils');
        });

        describe('formatResponse', function () {
            var formatResponse;

            before(function () {
                formatResponse = paginationUtils.formatResponse;
            });

            it('returns correct pagination object for single page', function () {
                formatResponse(5, {limit: 10, page: 1}).should.eql({
                    limit: 10,
                    next: null,
                    page: 1,
                    pages: 1,
                    prev: null,
                    total: 5
                });
            });

            it('returns correct pagination object for first page of many', function () {
                formatResponse(44, {limit: 5, page: 1}).should.eql({
                    limit: 5,
                    next: 2,
                    page: 1,
                    pages: 9,
                    prev: null,
                    total: 44
                });
            });

            it('returns correct pagination object for middle page of many', function () {
                formatResponse(44, {limit: 5, page: 9}).should.eql({
                    limit: 5,
                    next: null,
                    page: 9,
                    pages: 9,
                    prev: 8,
                    total: 44
                });
            });

            it('returns correct pagination object for last page of many', function () {
                formatResponse(44, {limit: 5, page: 3}).should.eql({
                    limit: 5,
                    next: 4,
                    page: 3,
                    pages: 9,
                    prev: 2,
                    total: 44
                });
            });

            it('returns correct pagination object when page not set', function () {
                formatResponse(5, {limit: 10}).should.eql({
                    limit: 10,
                    next: null,
                    page: 1,
                    pages: 1,
                    prev: null,
                    total: 5
                });
            });

            it('returns correct pagination object for limit all', function () {
                formatResponse(5, {limit: 'all'}).should.eql({
                    limit: 'all',
                    next: null,
                    page: 1,
                    pages: 1,
                    prev: null,
                    total: 5
                });
            });
        });

        describe('parseOptions', function () {
            var parseOptions;

            before(function () {
                parseOptions = paginationUtils.parseOptions;
            });

            it('should use defaults if no options are passed', function () {
                parseOptions().should.eql({
                    limit: 15,
                    page: 1
                });
            });

            it('should accept numbers for limit and page', function () {
                parseOptions({
                    limit: 10,
                    page: 2
                }).should.eql({
                        limit: 10,
                        page: 2
                    });
            });

            it('should use defaults if bad options are passed', function () {
                parseOptions({
                    limit: 'thelma',
                    page: 'louise'
                }).should.eql({
                        limit: 15,
                        page: 1
                    });
            });

            it('should permit all for limit', function () {
                parseOptions({
                    limit: 'all'
                }).should.eql({
                        limit: 'all',
                        page: 1
                    });
            });
        });

        describe('query', function () {
            var query,
                collection = {};

            before(function () {
                query = paginationUtils.query;
            });

            beforeEach(function () {
                collection.query = sandbox.stub().returns(collection);
            });

            it('should add query options if limit is set', function () {
                query(collection, {limit: 5, page: 1});

                collection.query.calledTwice.should.be.true;
                collection.query.firstCall.calledWith('limit', 5).should.be.true;
                collection.query.secondCall.calledWith('offset', 0).should.be.true;
            });

            it('should not add query options if limit is not set', function () {
                query(collection, {page: 1});

                collection.query.called.should.be.false;
            });
        });
    });

    describe('fetchPage', function () {
        var model, bookshelf, on, mockQuery, fetch, colQuery;

        before(function () {
            paginationUtils = pagination.__get__('paginationUtils');
        });

        beforeEach(function () {
            // Stub paginationUtils
            paginationUtils.parseOptions = sandbox.stub();
            paginationUtils.query = sandbox.stub();
            paginationUtils.formatResponse = sandbox.stub().returns({});

            // Mock out bookshelf model
            mockQuery = {
                clone: sandbox.stub(),
                count: sandbox.stub()
            };
            mockQuery.clone.returns(mockQuery);
            mockQuery.count.returns([{aggregate: 1}]);

            fetch = sandbox.stub().returns(Promise.resolve({}));
            colQuery = sandbox.stub();
            on = function () { return this; };
            on = sandbox.spy(on);

            model = function () {};
            model.prototype.constructor = {
                collection: sandbox.stub().returns({
                    on: on,
                    fetch: fetch,
                    query: colQuery
                })
            };
            model.prototype.query = sandbox.stub();
            model.prototype.resetQuery = sandbox.stub();
            model.prototype.query.returns(mockQuery);

            bookshelf = {Model: model};

            pagination(bookshelf);
        });

        it('extends Model with fetchPage', function () {
            bookshelf.Model.prototype.should.have.ownProperty('fetchPage');
            bookshelf.Model.prototype.fetchPage.should.be.a.Function;
        });

        it('fetchPage calls all paginationUtils and methods', function (done) {
            paginationUtils.parseOptions.returns({});

            bookshelf.Model.prototype.fetchPage().then(function () {
                sinon.assert.callOrder(
                    paginationUtils.parseOptions,
                    model.prototype.constructor.collection,
                    model.prototype.query,
                    mockQuery.clone,
                    mockQuery.count,
                    model.prototype.query,
                    mockQuery.clone,
                    paginationUtils.query,
                    on,
                    on,
                    fetch,
                    paginationUtils.formatResponse
                );

                paginationUtils.parseOptions.calledOnce.should.be.true;
                paginationUtils.parseOptions.calledWith(undefined).should.be.true;

                paginationUtils.query.calledOnce.should.be.true;
                paginationUtils.formatResponse.calledOnce.should.be.true;

                model.prototype.constructor.collection.calledOnce.should.be.true;
                model.prototype.constructor.collection.calledWith().should.be.true;

                model.prototype.query.calledTwice.should.be.true;
                model.prototype.query.firstCall.calledWith().should.be.true;
                model.prototype.query.secondCall.calledWith().should.be.true;

                mockQuery.clone.calledTwice.should.be.true;
                mockQuery.clone.firstCall.calledWith().should.be.true;
                mockQuery.clone.secondCall.calledWith().should.be.true;

                mockQuery.count.calledOnce.should.be.true;
                mockQuery.count.calledWith().should.be.true;

                on.calledTwice.should.be.true;
                on.firstCall.calledWith('fetching').should.be.true;
                on.secondCall.calledWith('fetched').should.be.true;

                fetch.calledOnce.should.be.true;
                fetch.calledWith({}).should.be.true;

                done();
            }).catch(done);
        });

        it('fetchPage calls all paginationUtils and methods when order set', function (done) {
            var orderOptions = {order: {id: 'DESC'}};

            paginationUtils.parseOptions.returns(orderOptions);
            bookshelf.Model.prototype.fetchPage(orderOptions).then(function () {
                sinon.assert.callOrder(
                    paginationUtils.parseOptions,
                    model.prototype.constructor.collection,
                    model.prototype.query,
                    mockQuery.clone,
                    mockQuery.count,
                    model.prototype.query,
                    mockQuery.clone,
                    paginationUtils.query,
                    colQuery,
                    on,
                    on,
                    fetch,
                    paginationUtils.formatResponse
                );

                paginationUtils.parseOptions.calledOnce.should.be.true;
                paginationUtils.parseOptions.calledWith(orderOptions).should.be.true;

                paginationUtils.query.calledOnce.should.be.true;
                paginationUtils.formatResponse.calledOnce.should.be.true;

                model.prototype.constructor.collection.calledOnce.should.be.true;
                model.prototype.constructor.collection.calledWith().should.be.true;

                model.prototype.query.calledTwice.should.be.true;
                model.prototype.query.firstCall.calledWith().should.be.true;
                model.prototype.query.secondCall.calledWith().should.be.true;

                mockQuery.clone.calledTwice.should.be.true;
                mockQuery.clone.firstCall.calledWith().should.be.true;
                mockQuery.clone.secondCall.calledWith().should.be.true;

                mockQuery.count.calledOnce.should.be.true;
                mockQuery.count.calledWith().should.be.true;

                colQuery.calledOnce.should.be.true;
                colQuery.calledWith('orderBy', 'undefined.id', 'DESC').should.be.true;

                on.calledTwice.should.be.true;
                on.firstCall.calledWith('fetching').should.be.true;
                on.secondCall.calledWith('fetched').should.be.true;

                fetch.calledOnce.should.be.true;
                fetch.calledWith(orderOptions).should.be.true;

                done();
            }).catch(done);
        });

        it('fetchPage returns expected response', function (done) {
            paginationUtils.parseOptions.returns({});
            bookshelf.Model.prototype.fetchPage().then(function (result) {
                result.should.have.ownProperty('collection');
                result.should.have.ownProperty('pagination');
                result.collection.should.be.an.Object;
                result.pagination.should.be.an.Object;

                done();
            });
        });
    });
});
