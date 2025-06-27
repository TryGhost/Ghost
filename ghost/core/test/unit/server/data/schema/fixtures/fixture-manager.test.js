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

    describe('Placeholder Processing', function () {
        it('should replace placeholders with values from the provided map', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'User',
                        entries: [
                            {
                                id: '__USER_ID__',
                                email: 'test@example.com'
                            }
                        ]
                    }
                ]
            };

            const placeholderMap = {
                __USER_ID__: () => 'user123'
            };

            const manager = new FixtureManager(testFixtures, placeholderMap);
            const processed = manager.fixtures;

            processed.models[0].entries[0].id.should.equal('user123');
            processed.models[0].entries[0].email.should.equal('test@example.com');
        });

        it('should handle nested structures', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'Post',
                        entries: [{
                            id: 'post123',
                            title: 'Test Post',
                            authors: [
                                {
                                    id: '__USER_ID__'
                                }
                            ]
                        }]
                    }
                ]
            };

            const placeholderMap = {
                __USER_ID__: () => 'user123'
            };

            const manager = new FixtureManager(testFixtures, placeholderMap);
            const processed = manager.fixtures;

            processed.models[0].entries[0].authors[0].id.should.equal('user123');
        });

        it('should handle arrays of values', function () {
            const testFixtures = {
                relations: [
                    {
                        from: {
                            model: 'User',
                            match: 'id'
                        },
                        to: {
                            model: 'Role'
                        },
                        entries: {
                            __USER_ID__: ['Owner', 'Admin']
                        }
                    }
                ]
            };

            const placeholderMap = {
                __USER_ID__: () => 'user123'
            };

            const manager = new FixtureManager(testFixtures, placeholderMap);
            const processed = manager.fixtures;

            processed.relations[0].entries.should.have.property('user123');
            processed.relations[0].entries.user123.should.deepEqual(['Owner', 'Admin']);
            processed.relations[0].entries.should.not.have.property('__USER_ID__');
        });

        it('should only process fixtures once', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'User',
                        entries: [{
                            id: '__USER_ID__'
                        }]
                    }
                ]
            };

            let callCount = 0;

            const placeholderMap = {
                __USER_ID__: () => {
                    callCount += 1;

                    return 'processed';
                }
            };

            const manager = new FixtureManager(testFixtures, placeholderMap);

            // Access fixtures multiple times
            const first = manager.fixtures;
            const second = manager.fixtures;
            const third = manager.fixtures;

            callCount.should.equal(1);
            first.should.equal(second);
            second.should.equal(third);
        });

        it('should handle no placeholders gracefully', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'User',
                        entries: [{
                            id: 'user123',
                            email: 'test@example.com'
                        }]
                    }
                ]
            };

            const manager = new FixtureManager(testFixtures, {});
            const processed = manager.fixtures;

            processed.should.deepEqual(testFixtures);
        });

        it('should pass models to placeholder functions', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'User',
                        entries: [{
                            id: '__USER_ID__'
                        }]
                    }
                ]
            };

            let receivedModels = null;

            const placeholderMap = {
                __USER_ID__: (providedModels) => {
                    receivedModels = providedModels;

                    return 'user123';
                }
            };

            const manager = new FixtureManager(testFixtures, placeholderMap);
            const processed = manager.fixtures;

            processed.models[0].entries[0].id.should.equal('user123');

            should.exist(receivedModels);

            receivedModels.should.equal(models);
        });

        it('should handle missing placeholder handlers', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'User',
                        entries: [
                            {
                                id: '__MISSING_HANDLER__',
                                email: 'test@example.com'
                            }
                        ]
                    }
                ]
            };

            const manager = new FixtureManager(testFixtures, {});
            const processed = manager.fixtures;

            // Should leave placeholder unchanged if no handler
            processed.models[0].entries[0].id.should.equal('__MISSING_HANDLER__');
        });

        it('should handle multiple different placeholders in one value', function () {
            const testFixtures = {
                models: [
                    {
                        name: 'Post',
                        entries: [
                            {
                                content: 'This is a test post created by __AUTHOR__NAME__ on __DATE__'
                            }
                        ]
                    }
                ]
            };

            const placeholderMap = {
                __AUTHOR__NAME__: () => 'John Doe',
                __DATE__: () => '2025-06-26'
            };

            const manager = new FixtureManager(testFixtures, placeholderMap);
            const processed = manager.fixtures;

            processed.models[0].entries[0].content.should.equal('This is a test post created by John Doe on 2025-06-26');
        });
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
                const FIXTURE_COUNT = 135;
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
