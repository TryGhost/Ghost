const should = require('should');
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

    before(function () {
        models.init();
    });

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

            canThisResult.browse.should.be.an.Object();
            canThisResult.browse.post.should.be.a.Function();

            canThisResult.edit.should.be.an.Object();
            canThisResult.edit.post.should.be.a.Function();
            canThisResult.edit.tag.should.be.a.Function();
            canThisResult.edit.user.should.be.a.Function();
            canThisResult.edit.page.should.be.a.Function();

            canThisResult.add.should.be.an.Object();
            canThisResult.add.post.should.be.a.Function();
            canThisResult.add.user.should.be.a.Function();
            canThisResult.add.page.should.be.a.Function();

            canThisResult.destroy.should.be.an.Object();
            canThisResult.destroy.post.should.be.a.Function();
            canThisResult.destroy.user.should.be.a.Function();
        });

        describe('Non user permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            describe('with permissible calls (post model)', function () {
                it('No context: does not allow edit post (no model)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .post() // post id
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(0);
                            done();
                        });
                });

                it('No context: does not allow edit post (model syntax)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .post({id: 1}) // post id in model syntax
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });

                it('No context: does not allow edit post (model ID syntax)', function (done) {
                    permissions
                        .canThis({}) // no context
                        .edit
                        .post(1) // post id using number syntax
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });

                it('Internal context: instantly grants permissions', function (done) {
                    permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .post({id: 1}) // post id
                        .then(function () {
                            // We don't get this far, permissions are instantly granted for internal
                            findPostSpy.callCount.should.eql(0);
                            done();
                        })
                        .catch(function () {
                            done(new Error('Should allow editing post with { internal: true }'));
                        });
                });

                it('External context: does not grant permissions', function (done) {
                    permissions
                        .canThis({external: true}) // internal context
                        .edit
                        .post({id: 1}) // post id
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });
            });

            describe('without permissible (tag model)', function () {
                it('No context: does not allow edit tag (model syntax)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .tag({id: 1}) // tag id in model syntax
                        .then(function () {
                            done(new Error('was able to edit tag without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            // We don't look up tags
                            findTagSpy.callCount.should.eql(0);
                            done();
                        });
                });

                it('Internal context: instantly grants permissions', function (done) {
                    permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .tag({id: 1}) // tag id
                        .then(function () {
                            // We don't look up tags
                            findTagSpy.callCount.should.eql(0);
                            done();
                        })
                        .catch(function () {
                            done(new Error('Should allow editing post with { internal: true }'));
                        });
                });

                it('External context: does not grant permissions', function (done) {
                    permissions
                        .canThis({external: true}) // external context
                        .edit
                        .tag({id: 1}) // tag id
                        .then(function () {
                            done(new Error('was able to edit tag without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findTagSpy.callCount.should.eql(0);
                            done();
                        });
                });
            });
        });

        describe('User-based permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
            it('No permissions: cannot edit tag (no permissible function on model)', function (done) {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: [],
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function () {
                        done(new Error('was able to edit tag without permission'));
                    })
                    .catch(function (err) {
                        userProviderStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('With permissions: can edit specific tag (no permissible function on model)', function (done) {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        userProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('With permissions: can edit non-specific tag (no permissible function on model)', function (done) {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag() // tag id in model syntax
                    .then(function (res) {
                        userProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('With owner role: can edit tag (no permissible function on model)', function (done) {
                const userProviderStub = sinon.stub(providers, 'user').callsFake(function () {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: [],
                        // This should be JSON, so no need to run it through the model layer. 3 === owner
                        roles: [testUtils.DataGenerator.Content.roles[3]]
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        userProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('API Key-based permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
            it('With permissions: can edit non-specific tag (no permissible function on model)', function (done) {
                const apiKeyProviderStub = sinon.stub(providers, 'apiKey').callsFake(() => {
                    // Fake the response from providers.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        // This should be JSON, so no need to run it through the model layer. 5 === admin api key
                        roles: [testUtils.DataGenerator.Content.roles[5]]
                    });
                });
                permissions.canThis({api_key: {
                    id: 123
                }}) // api key context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        apiKeyProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Combined User + API Key permissions (staff API key scenarios)', function () {
            // Tests for when both user and API key are present in context
            // This is the scenario introduced by staff API keys where a user can have an associated API key

            it('Current behavior: User with permission + API key with permission (should pass with current logic)', function (done) {
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

                permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1})
                    .then(function (res) {
                        userProviderStub.callCount.should.eql(1);
                        apiKeyProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('Fixed behavior: User with permission + API key without permission (now uses USER permission and passes)', function (done) {
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

                permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1})
                    .then(function (res) {
                        userProviderStub.callCount.should.eql(1);
                        apiKeyProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        // Fixed: Now uses USER permission instead of API key logic
                        done();
                    })
                    .catch(function (err) {
                        done(new Error(`Should have passed using USER permissions, but failed with: ${err.message}`));
                    });
            });

            it('Fixed behavior: User without permission + API key with permission (now uses USER permission and fails)', function (done) {
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

                permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1})
                    .then(function () {
                        done(new Error('Should have failed using USER permissions (ignoring API key permissions)'));
                    })
                    .catch(function (err) {
                        userProviderStub.callCount.should.eql(1);
                        apiKeyProviderStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        // Fixed: Now uses USER permission instead of API key logic
                        done();
                    });
            });

            it('Current behavior: User without permission + API key without permission (should fail)', function (done) {
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

                permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1})
                    .then(function () {
                        done(new Error('Should have failed due to no permissions'));
                    })
                    .catch(function (err) {
                        userProviderStub.callCount.should.eql(1);
                        apiKeyProviderStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('Current behavior: Owner user + API key without permission (owner should override)', function (done) {
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

                permissions
                    .canThis({
                        user: {id: 1},
                        api_key: {id: 123, type: 'admin'}
                    })
                    .edit
                    .tag({id: 1})
                    .then(function (res) {
                        userProviderStub.callCount.should.eql(1);
                        apiKeyProviderStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            // Tests for NEW expected behavior after fix
            describe('Expected behavior after fix: User permissions should take precedence', function () {
                it('Expected: User with permission + API key without permission (should use USER permission and pass)', function (done) {
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

                    permissions
                        .canThis({
                            user: {id: 1},
                            api_key: {id: 123, type: 'admin'}
                        })
                        .edit
                        .tag({id: 1})
                        .then(function (res) {
                            userProviderStub.callCount.should.eql(1);
                            apiKeyProviderStub.callCount.should.eql(1);
                            should.not.exist(res);
                            done();
                        })
                        .catch(function (err) {
                            done(new Error(`Should have passed using USER permissions, but failed with: ${err.message}`));
                        });
                });

                it('Expected: User without permission + API key with permission (should use USER permission and fail)', function (done) {
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

                    permissions
                        .canThis({
                            user: {id: 1},
                            api_key: {id: 123, type: 'admin'}
                        })
                        .edit
                        .tag({id: 1})
                        .then(function () {
                            done(new Error('Should have failed using USER permissions (ignoring API key permissions)'));
                        })
                        .catch(function (err) {
                            userProviderStub.callCount.should.eql(1);
                            apiKeyProviderStub.callCount.should.eql(1);
                            err.errorType.should.eql('NoPermissionError');
                            done();
                        });
                });

                it('Expected: Owner user + API key without permission (should use USER permission and pass)', function (done) {
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

                    permissions
                        .canThis({
                            user: {id: 1},
                            api_key: {id: 123, type: 'admin'}
                        })
                        .edit
                        .tag({id: 1})
                        .then(function (res) {
                            userProviderStub.callCount.should.eql(1);
                            apiKeyProviderStub.callCount.should.eql(1);
                            should.not.exist(res);
                            done();
                        })
                        .catch(function (err) {
                            done(new Error(`Owner user should have permission regardless of API key, but failed with: ${err.message}`));
                        });
                });
            });
        });
    });

    describe('permissible (overridden)', function () {
        it('can use permissible function on model to forbid something (post model)', function (done) {
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

            permissions
                .canThis({user: {}}) // user context
                .edit
                .post({id: 1}) // tag id in model syntax
                .then(function () {
                    done(new Error('was able to edit post without permission'));
                })
                .catch(function (err) {
                    permissibleStub.callCount.should.eql(1);
                    permissibleStub.firstCall.args.should.have.lengthOf(8);

                    permissibleStub.firstCall.args[0].should.eql(1);
                    permissibleStub.firstCall.args[1].should.eql('edit');
                    permissibleStub.firstCall.args[2].should.be.an.Object();
                    permissibleStub.firstCall.args[3].should.be.an.Object();
                    permissibleStub.firstCall.args[4].should.be.an.Object();
                    permissibleStub.firstCall.args[5].should.be.true();
                    permissibleStub.firstCall.args[6].should.be.true();

                    userProviderStub.callCount.should.eql(1);
                    err.message.should.eql('Hello World!');
                    done();
                });
        });

        it('can use permissible function on model to allow something (post model)', function (done) {
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

            permissions
                .canThis({user: {}}) // user context
                .edit
                .post({id: 1}) // tag id in model syntax
                .then(function (res) {
                    permissibleStub.callCount.should.eql(1);
                    permissibleStub.firstCall.args.should.have.lengthOf(8);
                    permissibleStub.firstCall.args[0].should.eql(1);
                    permissibleStub.firstCall.args[1].should.eql('edit');
                    permissibleStub.firstCall.args[2].should.be.an.Object();
                    permissibleStub.firstCall.args[3].should.be.an.Object();
                    permissibleStub.firstCall.args[4].should.be.an.Object();
                    permissibleStub.firstCall.args[5].should.be.true();
                    permissibleStub.firstCall.args[6].should.be.true();
                    permissibleStub.firstCall.args[7].should.be.false();

                    userProviderStub.callCount.should.eql(1);
                    should.not.exist(res);
                    done();
                })
                .catch(done);
        });
    });
});
