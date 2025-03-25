const should = require('should');
const sinon = require('sinon');

const models = require('../../../../../../core/server/models');
const baseUtils = require('../../../../../../core/server/models/base/utils');
const {FixtureManager} = require('../../../../../../core/server/data/schema/fixtures');
const fixtures = require('../../../../../utils/fixtures/fixtures.json');

const fixtureManager = new FixtureManager(fixtures);

describe('Migration Fixture Utils', function () {
    beforeEach(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Match Func', function () {
        const matchFunc = FixtureManager.matchFunc;
        let getStub;

        beforeEach(function () {
            getStub = sinon.stub();
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

    describe('Add All Fixtures', function () {
        it('should call add for main post fixture', async function () {
            const addFixturesForModelStub = sinon.stub(fixtureManager, 'addFixturesForModel').returns(Promise.resolve({}));
            const addFixturesForRelationStub = sinon.stub(fixtureManager, 'addFixturesForRelation').returns(Promise.resolve({}));

            await fixtureManager.addAllFixtures();

            addFixturesForModelStub.callCount.should.eql(fixtures.models.length);
            addFixturesForRelationStub.callCount.should.eql(fixtures.relations.length);

            // NOTE: users and roles have to be initialized first for the post fixtures to work
            should.equal(addFixturesForModelStub.firstCall.args[0].name, 'Role');
            should.equal(addFixturesForModelStub.secondCall.args[0].name, 'User');

            should.equal(addFixturesForRelationStub.firstCall.args[0].from.relation, 'roles');
        });
    });

    describe('Add Fixtures For Model', function () {
        it('should call add for main post fixture', function (done) {
            const postOneStub = sinon.stub(models.Post, 'findOne').returns(Promise.resolve());
            const postAddStub = sinon.stub(models.Post, 'add').returns(Promise.resolve({}));

            const postFixtures = fixtures.models.find((modelFixture) => {
                return modelFixture.name === 'Post';
            });

            fixtureManager.addFixturesForModel(postFixtures).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 11);
                result.should.have.property('done', 11);

                postOneStub.callCount.should.eql(11);
                postAddStub.callCount.should.eql(11);

                done();
            }).catch(done);
        });

        it('should call add for main newsletter fixture', function (done) {
            const newsletterOneStub = sinon.stub(models.Newsletter, 'findOne').returns(Promise.resolve());
            const newsletterAddStub = sinon.stub(models.Newsletter, 'add').returns(Promise.resolve({}));

            const newsletterFixtures = fixtures.models.find((modelFixture) => {
                return modelFixture.name === 'Newsletter';
            });

            fixtureManager.addFixturesForModel(newsletterFixtures).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 1);
                result.should.have.property('done', 1);

                newsletterOneStub.callCount.should.eql(1);
                newsletterAddStub.callCount.should.eql(1);

                done();
            }).catch(done);
        });

        it('should not call add for main post fixture if it is already found', function (done) {
            const postOneStub = sinon.stub(models.Post, 'findOne').returns(Promise.resolve({}));
            const postAddStub = sinon.stub(models.Post, 'add').returns(Promise.resolve({}));

            const postFixtures = fixtures.models.find((modelFixture) => {
                return modelFixture.name === 'Post';
            });

            fixtureManager.addFixturesForModel(postFixtures).then(function (result) {
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', 11);
                result.should.have.property('done', 0);

                postOneStub.callCount.should.eql(11);
                postAddStub.callCount.should.eql(0);

                done();
            }).catch(done);
        });
    });

    describe('Add Fixtures For Relation', function () {
        it('should call attach for permissions-roles', function (done) {
            const fromItem = {
                related: sinon.stub().returnsThis(),
                find: sinon.stub().returns()
            };

            const toItem = [{get: sinon.stub()}];

            const dataMethodStub = {
                filter: sinon.stub().returns(toItem),
                find: sinon.stub().returns(fromItem)
            };

            const baseUtilAttachStub = sinon.stub(baseUtils, 'attach').returns(Promise.resolve([{}]));
            const permsAllStub = sinon.stub(models.Permission, 'findAll').returns(Promise.resolve(dataMethodStub));
            const rolesAllStub = sinon.stub(models.Role, 'findAll').returns(Promise.resolve(dataMethodStub));

            fixtureManager.addFixturesForRelation(fixtures.relations[0]).then(function (result) {
                const FIXTURE_COUNT = 134;
                should.exist(result);
                result.should.be.an.Object();
                result.should.have.property('expected', FIXTURE_COUNT);
                result.should.have.property('done', FIXTURE_COUNT);

                // Permissions & Roles
                permsAllStub.calledOnce.should.be.true();
                rolesAllStub.calledOnce.should.be.true();
                dataMethodStub.filter.callCount.should.eql(FIXTURE_COUNT);
                dataMethodStub.find.callCount.should.eql(10);
                baseUtilAttachStub.callCount.should.eql(FIXTURE_COUNT);

                fromItem.related.callCount.should.eql(FIXTURE_COUNT);
                fromItem.find.callCount.should.eql(FIXTURE_COUNT);

                done();
            }).catch(done);
        });

        it('should call attach for posts-tags', function (done) {
            const fromItem = {
                related: sinon.stub().returnsThis(),
                find: sinon.stub().returns()
            };

            const toItem = [{get: sinon.stub()}];

            const dataMethodStub = {
                filter: sinon.stub().returns(toItem),
                find: sinon.stub().returns(fromItem)
            };

            const baseUtilAttachStub = sinon.stub(baseUtils, 'attach').returns(Promise.resolve([{}]));
            const postsAllStub = sinon.stub(models.Post, 'findAll').returns(Promise.resolve(dataMethodStub));
            const tagsAllStub = sinon.stub(models.Tag, 'findAll').returns(Promise.resolve(dataMethodStub));

            fixtureManager.addFixturesForRelation(fixtures.relations[1]).then(function (result) {
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
                fromItem.find.callCount.should.eql(7);
                baseUtilAttachStub.callCount.should.eql(7);

                done();
            }).catch(done);
        });

        it('will not call attach for posts-tags if already present', function (done) {
            const fromItem = {
                related: sinon.stub().returnsThis(),
                find: sinon.stub().returns({}),
                tags: sinon.stub().returnsThis(),
                attach: sinon.stub().returns(Promise.resolve({}))
            };

            const toItem = [{get: sinon.stub()}];

            const dataMethodStub = {
                filter: sinon.stub().returns(toItem),
                find: sinon.stub().returns(fromItem)
            };

            const postsAllStub = sinon.stub(models.Post, 'findAll').returns(Promise.resolve(dataMethodStub));
            const tagsAllStub = sinon.stub(models.Tag, 'findAll').returns(Promise.resolve(dataMethodStub));

            fixtureManager.addFixturesForRelation(fixtures.relations[1]).then(function (result) {
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
                fromItem.find.callCount.should.eql(7);

                fromItem.tags.called.should.be.false();
                fromItem.attach.called.should.be.false();

                done();
            }).catch(done);
        });
    });

    describe('findModelFixtureEntry', function () {
        it('should fetch a single fixture entry', function () {
            const foundFixture = fixtureManager.findModelFixtureEntry('Integration', {slug: 'zapier'});
            foundFixture.should.be.an.Object();
            foundFixture.should.eql({
                slug: 'zapier',
                name: 'Zapier',
                description: 'Built-in Zapier integration',
                type: 'builtin',
                api_keys: [{type: 'admin'}]
            });
        });
    });

    describe('findModelFixtures', function () {
        it('should fetch a fixture with multiple entries', function () {
            const foundFixture = fixtureManager.findModelFixtures('Permission', {object_type: 'db'});
            foundFixture.should.be.an.Object();
            foundFixture.entries.should.be.an.Array().with.lengthOf(4);
            foundFixture.entries[0].should.eql({
                name: 'Export database',
                action_type: 'exportContent',
                object_type: 'db'
            });
            foundFixture.entries[3].should.eql({
                name: 'Backup database',
                action_type: 'backupContent',
                object_type: 'db'
            });
        });
    });

    describe('findPermissionRelationsForObject', function () {
        it('should fetch a fixture with multiple entries', function () {
            const foundFixture = fixtureManager.findPermissionRelationsForObject('db');
            foundFixture.should.be.an.Object();
            foundFixture.entries.should.be.an.Object();
            foundFixture.entries.should.have.property('Administrator', {db: 'all'});
        });
    });
});
