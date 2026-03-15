const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const sinon = require('sinon');
const _ = require('lodash');

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

            assert.equal(processed.models[0].entries[0].id, 'user123');
            assert.equal(processed.models[0].entries[0].email, 'test@example.com');
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

            assert.equal(processed.models[0].entries[0].authors[0].id, 'user123');
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

            assert('user123' in processed.relations[0].entries);
            assert.deepEqual(processed.relations[0].entries.user123, ['Owner', 'Admin']);
            assert(!('__USER_ID__' in processed.relations[0].entries));
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

            assert.equal(callCount, 1);
            assert.equal(first, second);
            assert.equal(second, third);
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

            assert.deepEqual(processed, testFixtures);
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

            assert.equal(processed.models[0].entries[0].id, 'user123');

            assertExists(receivedModels);

            assert.equal(receivedModels, models);
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
            assert.equal(processed.models[0].entries[0].id, '__MISSING_HANDLER__');
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

            assert.equal(processed.models[0].entries[0].content, 'This is a test post created by John Doe on 2025-06-26');
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
            assert.equal(matchFunc()({get: getStub}), true);
            sinon.assert.calledOnce(getStub);
            sinon.assert.calledWith(getStub, undefined);
        });

        it('should match key with match string', function () {
            assert.equal(matchFunc('foo', 'bar')({get: getStub}), true);
            sinon.assert.calledOnce(getStub);
            sinon.assert.calledWith(getStub, 'foo');

            assert.equal(matchFunc('foo', 'buz')({get: getStub}), false);
            sinon.assert.calledTwice(getStub);
            sinon.assert.calledWith(getStub.secondCall, 'foo');
        });

        it('should match value when key is 0', function () {
            assert.equal(matchFunc('foo', 0, 'bar')({get: getStub}), true);
            sinon.assert.calledOnce(getStub);
            sinon.assert.calledWith(getStub, 'foo');

            assert.equal(matchFunc('foo', 0, 'buz')({get: getStub}), false);
            sinon.assert.calledTwice(getStub);
            sinon.assert.calledWith(getStub.secondCall, 'foo');
        });

        it('should match key & value when match is array', function () {
            assert.equal(matchFunc(['foo', 'fun'], 'bar', 'baz')({get: getStub}), true);
            sinon.assert.calledTwice(getStub);
            sinon.assert.calledWith(getStub.getCall(0), 'fun');
            sinon.assert.calledWith(getStub.getCall(1), 'foo');

            assert.equal(matchFunc(['foo', 'fun'], 'baz', 'bar')({get: getStub}), false);
            sinon.assert.callCount(getStub, 4);
            sinon.assert.calledWith(getStub.getCall(2), 'fun');
            sinon.assert.calledWith(getStub.getCall(3), 'foo');
        });

        it('should match key only when match is array, but value is all', function () {
            assert.equal(matchFunc(['foo', 'fun'], 'bar', 'all')({get: getStub}), true);
            sinon.assert.calledOnce(getStub);
            sinon.assert.calledWith(getStub, 'foo');

            assert.equal(matchFunc(['foo', 'fun'], 'all', 'bar')({get: getStub}), false);
            sinon.assert.calledThrice(getStub);
            sinon.assert.calledWith(getStub.getCall(1), 'fun');
            sinon.assert.calledWith(getStub.getCall(2), 'foo');
        });

        it('should match key & value when match and value are arrays', function () {
            assert.equal(matchFunc(['foo', 'fun'], 'bar', ['baz', 'buz'])({get: getStub}), true);
            sinon.assert.calledTwice(getStub);
            sinon.assert.calledWith(getStub.getCall(0), 'fun');
            sinon.assert.calledWith(getStub.getCall(1), 'foo');

            assert.equal(matchFunc(['foo', 'fun'], 'bar', ['biz', 'buz'])({get: getStub}), false);
            sinon.assert.callCount(getStub, 4);
            sinon.assert.calledWith(getStub.getCall(2), 'fun');
            sinon.assert.calledWith(getStub.getCall(3), 'foo');
        });
    });

    describe('Add All Fixtures', function () {
        it('should call add for main post fixture', async function () {
            const addFixturesForModelStub = sinon.stub(fixtureManager, 'addFixturesForModel').returns(Promise.resolve({}));
            const addFixturesForRelationStub = sinon.stub(fixtureManager, 'addFixturesForRelation').returns(Promise.resolve({}));

            await fixtureManager.addAllFixtures();

            sinon.assert.callCount(addFixturesForModelStub, fixtures.models.length);
            sinon.assert.callCount(addFixturesForRelationStub, fixtures.relations.length);

            // NOTE: users and roles have to be initialized first for the post fixtures to work
            assert.equal(addFixturesForModelStub.firstCall.args[0].name, 'Role');
            assert.equal(addFixturesForModelStub.secondCall.args[0].name, 'User');

            assert.equal(addFixturesForRelationStub.firstCall.args[0].from.relation, 'roles');
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
                assertExists(result);
                assert(_.isPlainObject(result));
                assert.equal(result.expected, 11);
                assert.equal(result.done, 11);

                sinon.assert.callCount(postOneStub, 11);
                sinon.assert.callCount(postAddStub, 11);

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
                assertExists(result);
                assert(_.isPlainObject(result));
                assert.equal(result.expected, 1);
                assert.equal(result.done, 1);

                sinon.assert.calledOnce(newsletterOneStub);
                sinon.assert.calledOnce(newsletterAddStub);

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
                assertExists(result);
                assert(_.isPlainObject(result));
                assert.equal(result.expected, 11);
                assert.equal(result.done, 0);

                sinon.assert.callCount(postOneStub, 11);
                sinon.assert.notCalled(postAddStub);

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
                const FIXTURE_COUNT = 137;
                assertExists(result);
                assert(_.isPlainObject(result));
                assert.equal(result.expected, FIXTURE_COUNT);
                assert.equal(result.done, FIXTURE_COUNT);

                // Permissions & Roles
                sinon.assert.calledOnce(permsAllStub);
                sinon.assert.calledOnce(rolesAllStub);
                sinon.assert.callCount(dataMethodStub.filter, FIXTURE_COUNT);
                sinon.assert.callCount(dataMethodStub.find, 10);
                sinon.assert.callCount(baseUtilAttachStub, FIXTURE_COUNT);

                sinon.assert.callCount(fromItem.related, FIXTURE_COUNT);
                sinon.assert.callCount(fromItem.find, FIXTURE_COUNT);

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
                assertExists(result);
                assert(_.isPlainObject(result));
                assert.equal(result.expected, 7);
                assert.equal(result.done, 7);

                // Posts & Tags
                sinon.assert.calledOnce(postsAllStub);
                sinon.assert.calledOnce(tagsAllStub);
                sinon.assert.callCount(dataMethodStub.filter, 7);
                sinon.assert.callCount(dataMethodStub.find, 7);
                sinon.assert.callCount(fromItem.related, 7);
                sinon.assert.callCount(fromItem.find, 7);
                sinon.assert.callCount(baseUtilAttachStub, 7);

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
                assertExists(result);
                assert(_.isPlainObject(result));
                assert.equal(result.expected, 7);
                assert.equal(result.done, 0);

                // Posts & Tags
                sinon.assert.calledOnce(postsAllStub);
                sinon.assert.calledOnce(tagsAllStub);
                sinon.assert.callCount(dataMethodStub.filter, 7);
                sinon.assert.callCount(dataMethodStub.find, 7);

                sinon.assert.callCount(fromItem.related, 7);
                sinon.assert.callCount(fromItem.find, 7);

                sinon.assert.notCalled(fromItem.tags);
                sinon.assert.notCalled(fromItem.attach);

                done();
            }).catch(done);
        });
    });

    describe('findModelFixtureEntry', function () {
        it('should fetch a single fixture entry', function () {
            const foundFixture = fixtureManager.findModelFixtureEntry('Integration', {slug: 'zapier'});
            assert(_.isPlainObject(foundFixture));
            assert.deepEqual(foundFixture, {
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
            assert(_.isPlainObject(foundFixture));
            assert(Array.isArray(foundFixture.entries));
            assert.equal(foundFixture.entries.length, 4);
            assert.deepEqual(foundFixture.entries[0], {
                name: 'Export database',
                action_type: 'exportContent',
                object_type: 'db'
            });
            assert.deepEqual(foundFixture.entries[3], {
                name: 'Backup database',
                action_type: 'backupContent',
                object_type: 'db'
            });
        });
    });

    describe('findPermissionRelationsForObject', function () {
        it('should fetch a fixture with multiple entries', function () {
            const foundFixture = fixtureManager.findPermissionRelationsForObject('db');
            assert(_.isPlainObject(foundFixture));
            assert(_.isPlainObject(foundFixture.entries));
            assert.deepEqual(foundFixture.entries.Administrator, {db: 'all'});
        });
    });
});
