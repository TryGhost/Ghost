const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const _ = require('lodash');
const models = require('../../../../../core/server/models');
const permissions = require('../../../../../core/server/services/permissions');
const providers = require('../../../../../core/server/services/permissions/providers');

describe('Permissions', function () {
    let fakePermissions = [];
    let findPostSpy;
    let findTagSpy;

    beforeEach(function () {
        sinon.stub(models.Permission, 'findAll').callsFake(function () {
            return Promise.resolve(models.Permissions.forge(fakePermissions));
        });

        findPostSpy = sinon.stub(models.Post, 'findOne').callsFake(function () {
            // @TODO: the test env has no concept of including relations
            let post = models.Post.forge(testUtils.DataGenerator.Content.posts[0]);

            let authors = [testUtils.DataGenerator.Content.users[0]];

            post.related('authors').set(authors);
            return Promise.resolve(post);
        });

        findTagSpy = sinon.stub(models.Tag, 'findOne').callsFake(function () {
            return Promise.resolve({});
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    /**
     * Default test actionMap looks like this:
     * {
     *   browse: [ 'post' ],
     *   edit: [ 'post', 'tag', 'user', 'page' ],
     *   add: [ 'post', 'user', 'page' ],
     *   destroy: [ 'post', 'user' ]
     * }
     *
     * @param {object} options
     * @return {Array|*}
     */
    function loadFakePermissions(options) {
        options = options || {};

        const fixturePermissions = _.cloneDeep(testUtils.DataGenerator.Content.permissions);
        const extraPerm = {
            name: 'test',
            action_type: 'edit',
            object_type: 'post'
        };

        if (options.extra) {
            fixturePermissions.push(extraPerm);
        }

        return _.map(fixturePermissions, function (testPerm) {
            return testUtils.DataGenerator.forKnex.createPermission(testPerm);
        });
    }

    describe('CanThis', function () {
        beforeEach(function () {
            fakePermissions = loadFakePermissions();

            return permissions.init();
        });

        it('canThisResult gets build properly', function () {
            const canThisResult = permissions.canThis();

            assert(_.isPlainObject(canThisResult.browse));
            assert.equal(typeof canThisResult.browse.post, 'function');

            assert(_.isPlainObject(canThisResult.edit));
            assert.equal(typeof canThisResult.edit.post, 'function');
            assert.equal(typeof canThisResult.edit.tag, 'function');
            assert.equal(typeof canThisResult.edit.user, 'function');
            assert.equal(typeof canThisResult.edit.page, 'function');

            assert(_.isPlainObject(canThisResult.add));
            assert.equal(typeof canThisResult.add.post, 'function');
            assert.equal(typeof canThisResult.add.user, 'function');
            assert.equal(typeof canThisResult.add.page, 'function');

            assert(_.isPlainObject(canThisResult.destroy));
            assert.equal(typeof canThisResult.destroy.post, 'function');
            assert.equal(typeof canThisResult.destroy.user, 'function');
        });

        describe('Non user permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            describe('with permissible calls (post model)', function () {
                it('No context: does not allow edit post (no model)', async function () {
                    await assert.rejects(permissions
                        .canThis() // no context
                        .edit
                        .post(), // post id
                    function (err) {
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );

                    sinon.assert.notCalled(findPostSpy);
                });

                it('No context: does not allow edit post (model syntax)', async function () {
                    await assert.rejects(permissions
                        .canThis() // no context
                        .edit
                        .post({id: 1}), // post id in model syntax
                    function (err) {
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );

                    sinon.assert.calledOnce(findPostSpy);
                    assert.deepEqual(findPostSpy.firstCall.args[0], {id: 1, status: 'all'});
                });

                it('No context: does not allow edit post (model ID syntax)', async function () {
                    await assert.rejects(permissions
                        .canThis({}) // no context
                        .edit
                        .post(1), // post id using number syntax
                    function (err) {
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );

                    sinon.assert.calledOnce(findPostSpy);
                    assert.deepEqual(findPostSpy.firstCall.args[0], {id: 1, status: 'all'});
                });

                it('Internal context: instantly grants permissions', async function () {
                    await permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .post({id: 1}); // post id

                    // We don't get this far, permissions are instantly granted for internal
                    sinon.assert.notCalled(findPostSpy);
                });

                it('External context: does not grant permissions', async function () {
                    await assert.rejects(permissions
                        .canThis({external: true}) // internal context
                        .edit
                        .post({id: 1}), // post id
                    function (err) {
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );

                    sinon.assert.calledOnce(findPostSpy);
                    assert.deepEqual(findPostSpy.firstCall.args[0], {id: 1, status: 'all'});
                });
            });

            describe('without permissible (tag model)', function () {
                it('No context: does not allow edit tag (model syntax)', async function () {
                    await assert.rejects(permissions
                        .canThis() // no context
                        .edit
                        .tag({id: 1}), // tag id in model syntax
                    function (err) {
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );

                    // We don't look up tags
                    sinon.assert.notCalled(findTagSpy);
                });

                it('Internal context: instantly grants permissions', async function () {
                    await permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .tag({id: 1}); // tag id

                    // We don't look up tags
                    sinon.assert.notCalled(findTagSpy);
                });

                it('External context: does not grant permissions', async function () {
                    await assert.rejects(permissions
                        .canThis({external: true}) // external context
                        .edit
                        .tag({id: 1}), // tag id
                    function (err) {
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );

                    sinon.assert.notCalled(findTagSpy);
                });
            });
        });

        describe('User-based permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
            it('No permissions: cannot edit tag (no permissible function on model)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: [],
                        roles: undefined
                    });
                });

                await assert.rejects(permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}), // tag id in model syntax
                function (err) {
                    sinon.assert.calledOnce(userProviderStub);
                    assert.equal(err.errorType, 'NoPermissionError');
                    return true;
                }
                );
            });

            it('With permissions: can edit specific tag (no permissible function on model)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                const res = await permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}); // tag id in model syntax

                sinon.assert.calledOnce(userProviderStub);
                assert.equal(res, undefined);
            });

            it('With permissions: can edit non-specific tag (no permissible function on model)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                const res = await permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag(); // tag id in model syntax

                sinon.assert.calledOnce(userProviderStub);
                assert.equal(res, undefined);
            });

            it('With owner role: can edit tag (no permissible function on model)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: [],
                        // This should be JSON, so no need to run it through the model layer. 3 === owner
                        roles: [testUtils.DataGenerator.Content.roles[3]]
                    });
                });

                const res = await permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}); // tag id in model syntax

                sinon.assert.calledOnce(userProviderStub);
                assert.equal(res, undefined);
            });
        });

        describe('API Key-based permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
            it('With permissions: can edit non-specific tag (no permissible function on model)', async function () {
                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        // This should be JSON, so no need to run it through the model layer. 5 === admin api key
                        roles: [testUtils.DataGenerator.Content.roles[5]]
                    });
                });
                const res = await permissions.canThis({api_key: {
                    id: 123
                }}) // api key context
                    .edit
                    .tag({id: 1}); // tag id in model syntax

                sinon.assert.calledOnce(apiKeyProviderStub);
                assert.equal(res, undefined);
            });
        });

        describe('Combined User + API Key permissions (staff API key scenarios)', function () {
            // Tests for when both user and API key are present in context
            // This is the scenario introduced by staff API keys where a user can have an associated API key

            it('Current behavior: User with permission + API key with permission (should pass with current logic)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: [testUtils.DataGenerator.Content.roles[5]] // admin api key role
                    });
                });

                const res = await permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1});

                sinon.assert.calledOnce(userProviderStub);
                sinon.assert.calledOnce(apiKeyProviderStub);
                assert.equal(res, undefined);
            });

            it('Fixed behavior: User with permission + API key without permission (now uses USER permission and passes)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    return Promise.resolve({
                        permissions: [], // API key has no permissions
                        roles: []
                    });
                });

                const res = await permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1});

                sinon.assert.calledOnce(userProviderStub);
                sinon.assert.calledOnce(apiKeyProviderStub);
                assert.equal(res, undefined);
                // Fixed: Now uses USER permission instead of API key logic
            });

            it('Fixed behavior: User without permission + API key with permission (now uses USER permission and fails)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    return Promise.resolve({
                        permissions: [], // User has no permissions
                        roles: undefined
                    });
                });

                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: [testUtils.DataGenerator.Content.roles[5]]
                    });
                });

                await assert.rejects(permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1}),
                function (err) {
                    sinon.assert.calledOnce(userProviderStub);
                    sinon.assert.calledOnce(apiKeyProviderStub);
                    assert.equal(err.errorType, 'NoPermissionError');
                    // Fixed: Now uses USER permission instead of API key logic
                    return true;
                }
                );
            });

            it('Current behavior: User without permission + API key without permission (should fail)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    return Promise.resolve({
                        permissions: [],
                        roles: undefined
                    });
                });

                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    return Promise.resolve({
                        permissions: [],
                        roles: []
                    });
                });

                await assert.rejects(permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1}),
                function (err) {
                    sinon.assert.calledOnce(userProviderStub);
                    sinon.assert.calledOnce(apiKeyProviderStub);
                    assert.equal(err.errorType, 'NoPermissionError');
                    return true;
                }
                );
            });

            it('Current behavior: Owner user + API key without permission (owner should override)', async function () {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    return Promise.resolve({
                        permissions: [],
                        roles: [testUtils.DataGenerator.Content.roles[3]] // owner role
                    });
                });

                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    return Promise.resolve({
                        permissions: [],
                        roles: []
                    });
                });

                const res = await permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1});

                sinon.assert.calledOnce(userProviderStub);
                sinon.assert.calledOnce(apiKeyProviderStub);
                assert.equal(res, undefined);
            });

            // Tests for NEW expected behavior after fix
            describe('Expected behavior after fix: User permissions should take precedence', function () {
                it('Expected: User with permission + API key without permission (should use USER permission and pass)', async function () {
                    const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                        return Promise.resolve({
                            permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                            roles: undefined
                        });
                    });

                    const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                        return Promise.resolve({
                            permissions: [], // API key has no permissions
                            roles: []
                        });
                    });

                    const res = await permissions
                        .canThis({
                            user: {id: 1},
                            api_key: {id: 123, type: 'admin'}
                        })
                        .edit
                        .tag({id: 1});

                    sinon.assert.calledOnce(userProviderStub);
                    sinon.assert.calledOnce(apiKeyProviderStub);
                    assert.equal(res, undefined);
                });

                it('Expected: User without permission + API key with permission (should use USER permission and fail)', async function () {
                    const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                        return Promise.resolve({
                            permissions: [], // User has no permissions
                            roles: undefined
                        });
                    });

                    const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                        return Promise.resolve({
                            permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                            roles: [testUtils.DataGenerator.Content.roles[5]]
                        });
                    });

                    await assert.rejects(permissions
                        .canThis({
                            user: {id: 1},
                            api_key: {id: 123, type: 'admin'}
                        })
                        .edit
                        .tag({id: 1}),
                    function (err) {
                        sinon.assert.calledOnce(userProviderStub);
                        sinon.assert.calledOnce(apiKeyProviderStub);
                        assert.equal(err.errorType, 'NoPermissionError');
                        return true;
                    }
                    );
                });

                it('Expected: Owner user + API key without permission (should use USER permission and pass)', async function () {
                    const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                        return Promise.resolve({
                            permissions: [],
                            roles: [testUtils.DataGenerator.Content.roles[3]] // owner role
                        });
                    });

                    const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                        return Promise.resolve({
                            permissions: [],
                            roles: []
                        });
                    });

                    const res = await permissions
                        .canThis({
                            user: {id: 1},
                            api_key: {id: 123, type: 'admin'}
                        })
                        .edit
                        .tag({id: 1});

                    sinon.assert.calledOnce(userProviderStub);
                    sinon.assert.calledOnce(apiKeyProviderStub);
                    assert.equal(res, undefined);
                });
            });
        });
    });

    describe('permissible (overridden)', function () {
        it('can use permissible function on model to forbid something (post model)', async function () {
            const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                // Fake the response from providers.user, which contains permissions and roles
                return Promise.resolve({
                    permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                    roles: undefined
                });
            });

            const permissibleStub = sinon.stub(models.Post, 'permissible').callsFake(function () {
                return Promise.reject({message: 'Hello World!'});
            });

            await assert.rejects(permissions
                .canThis({user: {}}) // user context
                .edit
                .post({id: 1}), // tag id in model syntax
            function (err) {
                sinon.assert.calledOnce(permissibleStub);
                sinon.assert.calledWith(permissibleStub,
                    1, 'edit', sinon.match.object, sinon.match.object, sinon.match.object, true, true
                );

                sinon.assert.calledOnce(userProviderStub);
                assert.equal(err.message, 'Hello World!');
                return true;
            }
            );
        });

        it('can use permissible function on model to allow something (post model)', async function () {
            const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                // Fake the response from providers.user, which contains permissions and roles
                return Promise.resolve({
                    permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                    roles: undefined
                });
            });

            const permissibleStub = sinon.stub(models.Post, 'permissible').callsFake(function () {
                return Promise.resolve();
            });

            const res = await permissions
                .canThis({user: {}}) // user context
                .edit
                .post({id: 1}); // tag id in model syntax

            sinon.assert.calledOnce(permissibleStub);
            sinon.assert.calledWith(permissibleStub,
                1, 'edit', sinon.match.object, sinon.match.object, sinon.match.object, true, true
            );

            sinon.assert.calledOnce(userProviderStub);
            assert.equal(res, undefined);
        });
    });
});
