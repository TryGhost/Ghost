var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),

    models = require('../../server/models'),
    baseUtils = require('../../server/models/base/utils'),
    fixtureUtils = rewire('../../server/data/schema/fixtures/utils'),
    fixtures = require('../../server/data/schema/fixtures/fixtures'),

    sandbox = sinon.sandbox.create();

describe('Migration Fixture Utils', function () {
    var loggerStub;

    beforeEach(function () {
        loggerStub = {
            info: sandbox.stub(),
            warn: sandbox.stub()
        };

        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Match Func', function () {
        var matchFunc = fixtureUtils.__get__('matchFunc'),
            getStub;

        beforeEach(function () {
            getStub = sandbox.stub();
            getStub.withArgs('foo').returns('bar');
            getStub.withArgs('fun').returns('baz');
        });

        it('should match undefined with no args', function () {
            matchFunc()({get: getStub}).should.be.true();
            getStub.calledOnce.should.be.true();
            getStub.calledWith(undefined).should.be.true();
        });

        it('should match key with match string', function () {
            matchFunc('foo', 'bar')({get: getStub}).should.be.true();
            getStub.calledOnce.should.be.true();
            getStub.calledWith('foo').should.be.true();

            matchFunc('foo', 'buz')({get: getStub}).should.be.false();
            getStub.calledTwice.should.be.true();
            getStub.secondCall.calledWith('foo').should.be.true();
        });

        it('should match value when key is 0', function () {
            matchFunc('foo', 0, 'bar')({get: getStub}).should.be.true();
            getStub.calledOnce.should.be.true();
            getStub.calledWith('foo').should.be.true();

            matchFunc('foo', 0, 'buz')({get: getStub}).should.be.false();
            getStub.calledTwice.should.be.true();
            getStub.secondCall.calledWith('foo').should.be.true();
        });

        it('should match key & value when match is array', function () {
            matchFunc(['foo', 'fun'], 'bar', 'baz')({get: getStub}).should.be.true();
            getStub.calledTwice.should.be.true();
            getStub.getCall(0).calledWith('fun').should.be.true();
            getStub.getCall(1).calledWith('foo').should.be.true();

            matchFunc(['foo', 'fun'], 'baz', 'bar')({get: getStub}).should.be.false();
            getStub.callCount.should.eql(4);
            getStub.getCall(2).calledWith('fun').should.be.true();
            getStub.getCall(3).calledWith('foo').should.be.true();
        });

        it('should match key only when match is array, but value is all', function () {
            matchFunc(['foo', 'fun'], 'bar', 'all')({get: getStub}).should.be.true();
            getStub.calledOnce.should.be.true();
            getStub.calledWith('foo').should.be.true();

            matchFunc(['foo', 'fun'], 'all', 'bar')({get: getStub}).should.be.false();
            getStub.callCount.should.eql(3);
            getStub.getCall(1).calledWith('fun').should.be.true();
            getStub.getCall(2).calledWith('foo').should.be.true();
        });

        it('should match key & value when match and value are arrays', function () {
            matchFunc(['foo', 'fun'], 'bar', ['baz', 'buz'])({get: getStub}).should.be.true();
            getStub.calledTwice.should.be.true();
            getStub.getCall(0).calledWith('fun').should.be.true();
            getStub.getCall(1).calledWith('foo').should.be.true();

            matchFunc(['foo', 'fun'], 'bar', ['biz', 'buz'])({get: getStub}).should.be.false();
            getStub.callCount.should.eql(4);
            getStub.getCall(2).calledWith('fun').should.be.true();
            getStub.getCall(3).calledWith('foo').should.be.true();
        });
    });

    describe('Add Fixtures For Model', function () {
        it('should call add for main post fixture', function (done) {
            var postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve()),
                postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve({}));

            fixtureUtils.addFixturesForModel(fixtures.models[0]).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 7);
                result.should.have.property('done', 7);

                postOneStub.callCount.should.eql(7);
                postAddStub.callCount.should.eql(7);

                done();
            }).catch(done);
        });

        it('should not call add for main post fixture if it is already found', function (done) {
            var postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve({})),
                postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve({}));
            fixtureUtils.addFixturesForModel(fixtures.models[0]).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 7);
                result.should.have.property('done', 0);

                postOneStub.callCount.should.eql(7);
                postAddStub.callCount.should.eql(0);

                done();
            }).catch(done);
        });
    });

    describe('Add Fixtures For Relation', function () {
        it('should call attach for permissions-roles', function (done) {
            var fromItem = {
                    related: sandbox.stub().returnsThis(),
                    findWhere: sandbox.stub().returns()
                },
                toItem = [{get: sandbox.stub()}],
                dataMethodStub = {
                    filter: sandbox.stub().returns(toItem),
                    find: sandbox.stub().returns(fromItem)
                },
                baseUtilAttachStub = sandbox.stub(baseUtils, 'attach').returns(Promise.resolve([{}])),
                permsAllStub = sandbox.stub(models.Permission, 'findAll').returns(Promise.resolve(dataMethodStub)),
                rolesAllStub = sandbox.stub(models.Role, 'findAll').returns(Promise.resolve(dataMethodStub));

            fixtureUtils.addFixturesForRelation(fixtures.relations[0]).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 34);
                result.should.have.property('done', 34);

                // Permissions & Roles
                permsAllStub.calledOnce.should.be.true();
                rolesAllStub.calledOnce.should.be.true();
                dataMethodStub.filter.callCount.should.eql(34);
                dataMethodStub.find.callCount.should.eql(3);
                baseUtilAttachStub.callCount.should.eql(34);

                fromItem.related.callCount.should.eql(34);
                fromItem.findWhere.callCount.should.eql(34);
                toItem[0].get.callCount.should.eql(68);

                done();
            }).catch(done);
        });

        it('should call attach for posts-tags', function (done) {
            var fromItem = {
                    related: sandbox.stub().returnsThis(),
                    findWhere: sandbox.stub().returns()
                },
                toItem = [{get: sandbox.stub()}],
                dataMethodStub = {
                    filter: sandbox.stub().returns(toItem),
                    find: sandbox.stub().returns(fromItem)
                },
                baseUtilAttachStub = sandbox.stub(baseUtils, 'attach').returns(Promise.resolve([{}])),
                postsAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(dataMethodStub)),
                tagsAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(dataMethodStub));

            fixtureUtils.addFixturesForRelation(fixtures.relations[1]).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 7);
                result.should.have.property('done', 7);

                // Posts & Tags
                postsAllStub.calledOnce.should.be.true();
                tagsAllStub.calledOnce.should.be.true();
                dataMethodStub.filter.callCount.should.eql(7);
                dataMethodStub.find.callCount.should.eql(7);
                fromItem.related.callCount.should.eql(7);
                fromItem.findWhere.callCount.should.eql(7);
                toItem[0].get.callCount.should.eql(7);
                baseUtilAttachStub.callCount.should.eql(7);

                done();
            }).catch(done);
        });

        it('will not call attach for posts-tags if already present', function (done) {
            var fromItem = {
                    related: sandbox.stub().returnsThis(),
                    findWhere: sandbox.stub().returns({}),
                    tags: sandbox.stub().returnsThis(),
                    attach: sandbox.stub().returns(Promise.resolve({}))
                },
                toItem = [{get: sandbox.stub()}],
                dataMethodStub = {
                    filter: sandbox.stub().returns(toItem),
                    find: sandbox.stub().returns(fromItem)
                },

                postsAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(dataMethodStub)),
                tagsAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(dataMethodStub));

            fixtureUtils.addFixturesForRelation(fixtures.relations[1]).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 7);
                result.should.have.property('done', 0);

                // Posts & Tags
                postsAllStub.calledOnce.should.be.true();
                tagsAllStub.calledOnce.should.be.true();
                dataMethodStub.filter.callCount.should.eql(7);
                dataMethodStub.find.callCount.should.eql(7);

                fromItem.related.callCount.should.eql(7);
                fromItem.findWhere.callCount.should.eql(7);
                toItem[0].get.callCount.should.eql(7);

                fromItem.tags.called.should.be.false();
                fromItem.attach.called.should.be.false();

                done();
            }).catch(done);
        });
    });

    describe('findModelFixtureEntry', function () {
        it('should fetch a single fixture entry', function () {
            var foundFixture = fixtureUtils.findModelFixtureEntry('Client', {slug: 'ghost-admin'});
            foundFixture.should.be.an.Object();
            foundFixture.should.eql({
                name: 'Ghost Admin',
                slug: 'ghost-admin',
                status: 'enabled'
            });
        });
    });

    describe('findModelFixtures', function () {
        it('should fetch a fixture with multiple entries', function () {
            var foundFixture = fixtureUtils.findModelFixtures('Permission', {object_type: 'db'});
            foundFixture.should.be.an.Object();
            foundFixture.entries.should.be.an.Array().with.lengthOf(3);
            foundFixture.entries[0].should.eql({
                name: 'Export database',
                action_type: 'exportContent',
                object_type: 'db'
            });
        });
    });

    describe('findPermissionRelationsForObject', function () {
        it('should fetch a fixture with multiple entries', function () {
            var foundFixture = fixtureUtils.findPermissionRelationsForObject('db');
            foundFixture.should.be.an.Object();
            foundFixture.entries.should.be.an.Object();
            foundFixture.entries.should.have.property('Administrator', {db: 'all'});
        });
    });
});
