var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    models = require('../../../server/models'),
    errors = require('../../../server/errors'),
    events = require('../../../server/events'),
    UserAPI = require('../../../server/api/users'),
    db = require('../../../server/data/db'),
    context = testUtils.context,
    userIdFor = testUtils.users.ids,
    roleIdFor = testUtils.roles.ids,

    sandbox = sinon.sandbox.create();

describe('Users API', function () {
    var eventsTriggered;

    // Keep the DB clean
    before(testUtils.teardown);

    beforeEach(function () {
        eventsTriggered = {};

        sandbox.stub(events, 'emit', function (eventName, eventObj) {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    beforeEach(testUtils.setup(
        'users:roles', 'users', 'user-token', 'perms:user', 'perms:role', 'perms:setting', 'perms:init', 'posts'
    ));

    afterEach(function () {
        sandbox.restore();
        return testUtils.teardown();
    });

    function checkForErrorType(type, done) {
        return function checkForErrorType(error) {
            if (error.errorType) {
                error.errorType.should.eql(type);
                done();
            } else {
                done(error);
            }
        };
    }

    it('dateTime fields are returned as Date objects', function (done) {
        var userData = testUtils.DataGenerator.forModel.users[0];

        models.User.check({email: userData.email, password: userData.password}).then(function (user) {
            return UserAPI.read(_.merge({id: user.id}, context.internal));
        }).then(function (response) {
            response.users[0].created_at.should.be.an.instanceof(Date);
            response.users[0].updated_at.should.be.an.instanceof(Date);
            response.users[0].last_seen.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    describe('Browse', function () {
        function checkBrowseResponse(response, count, additional, missing, only, options) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'users');
            should.exist(response.users);
            response.users.should.have.length(count);
            testUtils.API.checkResponse(response.users[0], 'user', additional, missing, only, options);
            testUtils.API.checkResponse(response.users[1], 'user', additional, missing, only, options);
            testUtils.API.checkResponse(response.users[2], 'user', additional, missing, only, options);
            testUtils.API.checkResponse(response.users[3], 'user', additional, missing, only, options);
        }

        it('Owner can browse', function (done) {
            UserAPI.browse(context.owner).then(function (response) {
                checkBrowseResponse(response, 7);
                done();
            }).catch(done);
        });

        it('Admin can browse', function (done) {
            UserAPI.browse(context.admin).then(function (response) {
                checkBrowseResponse(response, 7);
                done();
            }).catch(done);
        });

        it('Editor can browse', function (done) {
            UserAPI.browse(context.editor).then(function (response) {
                checkBrowseResponse(response, 7);
                done();
            }).catch(done);
        });

        it('Author can browse active', function (done) {
            UserAPI.browse(context.author).then(function (response) {
                checkBrowseResponse(response, 7);
                done();
            }).catch(done);
        });

        it('No-auth CAN browse, but only gets filtered active users', function (done) {
            UserAPI.browse().then(function (response) {
                checkBrowseResponse(response, 7, null, null, null, {public: true});
                done();
            }).catch(done);
        });

        it('Can browse all', function (done) {
            UserAPI.browse(_.extend({}, testUtils.context.admin, {status: 'all'})).then(function (response) {
                checkBrowseResponse(response, 7);
                done();
            }).catch(done);
        });

        it('Can browse with roles', function (done) {
            UserAPI.browse(_.extend({}, testUtils.context.admin, {
                status: 'all',
                include: 'roles'
            })).then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'users');
                should.exist(response.users);
                response.users.should.have.length(7);
                testUtils.API.checkResponse(response.users[0], 'user', 'roles');
                testUtils.API.checkResponse(response.users[1], 'user', 'roles');
                testUtils.API.checkResponse(response.users[2], 'user', 'roles');
                testUtils.API.checkResponse(response.users[3], 'user', 'roles');
                done();
            }).catch(done);
        });

        it('can browse and order by name using asc', function (done) {
            var expectedUsers;

            UserAPI.browse(testUtils.context.admin)
                .then(function (results) {
                    should.exist(results);

                    expectedUsers = _(results.users).map('slug').sortBy().value();

                    return UserAPI.browse(_.extend({}, testUtils.context.admin, {order: 'slug asc'}));
                })
                .then(function (results) {
                    var users;

                    should.exist(results);

                    users = _.map(results.users, 'slug');
                    users.should.eql(expectedUsers);
                })
                .then(done)
                .catch(done);
        });

        it('can browse and order by name using desc', function (done) {
            var expectedUsers;

            UserAPI.browse(testUtils.context.admin)
                .then(function (results) {
                    should.exist(results);

                    expectedUsers = _(results.users).map('slug').sortBy().reverse().value();

                    return UserAPI.browse(_.extend({}, testUtils.context.admin, {order: 'slug desc'}));
                })
                .then(function (results) {
                    var users;

                    should.exist(results);

                    users = _.map(results.users, 'slug');
                    users.should.eql(expectedUsers);
                })
                .then(done)
                .catch(done);
        });

        it('can browse with include count.posts', function (done) {
            UserAPI.browse(_.extend({}, testUtils.context.admin, {include: 'count.posts'})).then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'users');
                should.exist(response.users);
                response.users.should.have.length(7);
                response.users.should.have.length(7);

                testUtils.API.checkResponse(response.users[0], 'user', 'count');
                testUtils.API.checkResponse(response.users[1], 'user', 'count');
                testUtils.API.checkResponse(response.users[2], 'user', 'count');
                testUtils.API.checkResponse(response.users[3], 'user', 'count');
                testUtils.API.checkResponse(response.users[4], 'user', 'count');
                testUtils.API.checkResponse(response.users[5], 'user', 'count');
                testUtils.API.checkResponse(response.users[6], 'user', 'count');

                response.users[0].count.posts.should.eql(0);
                response.users[1].count.posts.should.eql(0);
                response.users[2].count.posts.should.eql(0);
                response.users[3].count.posts.should.eql(8);
                response.users[4].count.posts.should.eql(0);
                response.users[5].count.posts.should.eql(0);
                response.users[6].count.posts.should.eql(0);

                response.meta.pagination.should.have.property('page', 1);
                response.meta.pagination.should.have.property('limit', 15);
                response.meta.pagination.should.have.property('pages', 1);
                response.meta.pagination.should.have.property('total', 7);
                response.meta.pagination.should.have.property('next', null);
                response.meta.pagination.should.have.property('prev', null);

                done();
            }).catch(done);
        });
    });

    describe('Read', function () {
        function checkReadResponse(response, noEmail, additional, missing, only, options) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(testUtils.DataGenerator.Content.users[0].id);

            if (noEmail) {
                testUtils.API.checkResponse(response.users[0], 'user', additional, missing, only, options);
            } else {
                testUtils.API.checkResponse(response.users[0], 'user', additional, missing, only, options);
                response.users[0].created_at.should.be.an.instanceof(Date);
            }
        }

        it('Owner can read', function (done) {
            UserAPI.read(_.extend({}, context.owner, {id: userIdFor.owner})).then(function (response) {
                checkReadResponse(response);
                done();
            }).catch(done);
        });

        it('Admin can read', function (done) {
            var stuff = _.extend({}, context.admin, {id: userIdFor.owner});
            UserAPI.read(stuff).then(function (response) {
                checkReadResponse(response);

                done();
            }).catch(done);
        });

        it('Editor can read', function (done) {
            UserAPI.read(_.extend({}, context.editor, {id: userIdFor.owner})).then(function (response) {
                checkReadResponse(response);
                done();
            }).catch(done);
        });

        it('Author can read', function (done) {
            UserAPI.read(_.extend({}, context.author, {id: userIdFor.owner})).then(function (response) {
                checkReadResponse(response);
                done();
            }).catch(done);
        });

        it('No-auth can read', function (done) {
            UserAPI.read({id: userIdFor.owner}).then(function (response) {
                checkReadResponse(response, true, null, null, null, {public: true});
                done();
            }).catch(done);
        });

        // TODO: this should be a 422?
        it('cannot fetch a user with an invalid slug', function (done) {
            UserAPI.read({slug: 'invalid!'}).then(function () {
                done(new Error('Should not return a result with invalid slug'));
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('User not found.');

                done();
            });
        });
    });

    describe('Edit', function () {
        var newName = 'Jo McBlogger';

        function checkEditResponse(response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users.should.have.length(1);
            testUtils.API.checkResponse(response.users[0], 'user');
            response.users[0].name.should.equal(newName);
            response.users[0].updated_at.should.be.an.instanceof(Date);
        }

        it('throws an error if there is an id mismatch', function (done) {
            var options = _.extend({}, context.author, {id: userIdFor.author});
            UserAPI.edit({users: [{id: userIdFor.owner, name: 'Override'}]}, options)
                .then(function () {
                    done(new Error('ID mismatches should not be permitted'));
                }).catch(checkForErrorType('BadRequestError', done));
        });

        it('Owner can edit all roles', function (done) {
            UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function (response) {
                    checkEditResponse(response);

                    return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.owner, {id: userIdFor.admin}));
                }).then(function (response) {
                checkEditResponse(response);
                return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.owner, {id: userIdFor.editor}));
            }).then(function (response) {
                checkEditResponse(response);

                return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.owner, {id: userIdFor.author}));
            }).then(function (response) {
                checkEditResponse(response);

                done();
            }).catch(done);
        });

        it('Admin can edit Admin, Editor and Author roles', function (done) {
            UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.admin}))
                .then(function (response) {
                    checkEditResponse(response);
                    return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.editor}));
                }).then(function (response) {
                checkEditResponse(response);

                return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.author}));
            }).then(function (response) {
                checkEditResponse(response);

                done();
            }).catch(done);
        });

        it('Admin CANNOT edit Owner role', function (done) {
            UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Admin should not be able to edit owner account'));
                }).catch(function (error) {
                error.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('Admin can edit Admin, Editor and Author roles with roles in payload', function (done) {
            UserAPI.edit({
                users: [{
                    name: newName,
                    roles: [roleIdFor.admin]
                }]
            }, _.extend({}, context.admin, {id: userIdFor.admin})).then(function (response) {
                checkEditResponse(response);
                return UserAPI.edit({
                    users: [{
                        name: newName,
                        roles: [roleIdFor.editor]
                    }]
                }, _.extend({}, context.admin, {id: userIdFor.editor}));
            }).then(function (response) {
                checkEditResponse(response);

                return UserAPI.edit({
                    users: [{
                        name: newName,
                        roles: [roleIdFor.author]
                    }]
                }, _.extend({}, context.admin, {id: userIdFor.author}));
            }).then(function (response) {
                checkEditResponse(response);

                done();
            }).catch(done);
        });

        it('Editor CANNOT edit Owner, Admin or Editor roles', function (done) {
            // Cannot edit Owner
            UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.owner})
            ).then(function () {
                done(new Error('Editor should not be able to edit owner account'));
            }).catch(function (error) {
                error.errorType.should.eql('NoPermissionError');
            }).finally(function () {
                // Cannot edit Admin
                UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.admin})
                ).then(function () {
                    done(new Error('Editor should not be able to edit admin account'));
                }).catch(function (error) {
                    error.errorType.should.eql('NoPermissionError');
                }).finally(function () {
                    // Cannot edit Editor
                    UserAPI.edit(
                        {users: [{name: newName}]}, _.extend({}, context.editor, {id: testUtils.DataGenerator.Content.extraUsers[1].id})
                    ).then(function () {
                        done(new Error('Editor should not be able to edit other editor account'));
                    }).catch(function (error) {
                        error.errorType.should.eql('NoPermissionError');
                        done();
                    });
                });
            });
        });

        it('Editor can edit self or Author role', function (done) {
            // Can edit self
            UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.editor})
            ).then(function (response) {
                checkEditResponse(response);
                // Can edit Author
                return UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.author})
                );
            }).then(function (response) {
                checkEditResponse(response);
                done();
            }).catch(done);
        });

        it('Author CANNOT edit all roles', function (done) {
            // Cannot edit owner
            UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.owner})
            ).then(function () {
                done(new Error('Editor should not be able to edit owner account'));
            }).catch(function (error) {
                error.errorType.should.eql('NoPermissionError');
            }).finally(function () {
                // Cannot edit admin
                UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.admin})
                ).then(function () {
                    done(new Error('Editor should not be able to edit admin account'));
                }).catch(function (error) {
                    error.errorType.should.eql('NoPermissionError');
                }).finally(function () {
                    UserAPI.edit(
                        {users: [{name: newName}]}, _.extend({}, context.author, {id: testUtils.DataGenerator.Content.extraUsers[2].id})
                    ).then(function () {
                        done(new Error('Author should not be able to edit author account which is not their own'));
                    }).catch(function (error) {
                        error.errorType.should.eql('NoPermissionError');
                        done();
                    });
                });
            });
        });

        it('Author can edit self', function (done) {
            // Next test that author CAN edit self
            UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
                done();
            }).catch(done);
        });

        it('Author can edit self with role set', function (done) {
            // Next test that author CAN edit self
            UserAPI.edit(
                {
                    users: [{
                        name: newName,
                        roles: [roleIdFor.author]
                    }]
                }, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
                done();
            }).catch(done);
        });

        it('Author can edit self with role set as string', function (done) {
            // Next test that author CAN edit self
            UserAPI.edit(
                {
                    users: [{
                        name: newName,
                        roles: [roleIdFor.author.toString()]
                    }]
                }, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
                done();
            }).catch(done);
        });

        it('Does not allow password to be set', function (done) {
            UserAPI.edit(
                {
                    users: [{
                        name: 'newname',
                        password: 'thisissupersafe'
                    }]
                }, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function () {
                return models.User.findOne({id: userIdFor.author}).then(function (response) {
                    response.get('name').should.eql('newname');
                    response.get('password').should.not.eql('thisissupersafe');
                    done();
                });
            }).catch(done);
        });

        describe('Change status', function () {
            describe('as owner', function () {
                it('[success] can change status to inactive for admin', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.owner, {id: userIdFor.admin})
                    ).then(function () {
                        Object.keys(eventsTriggered).length.should.eql(2);
                        should.exist(eventsTriggered['user.edited']);
                        should.exist(eventsTriggered['user.deactivated']);

                        return models.User.findOne({id: userIdFor.admin, status: 'all'}).then(function (response) {
                            response.get('status').should.eql('inactive');
                        });
                    });
                });

                it('[success] can change status to inactive for editor', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.owner, {id: userIdFor.editor})
                    ).then(function () {
                        return models.User.findOne({id: userIdFor.editor, status: 'all'}).then(function (response) {
                            response.get('status').should.eql('inactive');
                        });
                    });
                });

                it('[failure] can\' change my own status to inactive', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.owner, {id: userIdFor.owner})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\' change my own status to locked', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'locked'
                                }
                            ]
                        }, _.extend({}, context.owner, {id: userIdFor.owner})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });
            });

            describe('as admin', function () {
                it('[failure] can\'t change status to inactive for owner', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.admin, {id: userIdFor.owner})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\'t change status to inactive for admin', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.admin, {id: userIdFor.admin2})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\' change my own status to inactive', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.admin, {id: userIdFor.admin})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[success] can change status to inactive for editor', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.admin, {id: userIdFor.editor})
                    ).then(function () {
                        return models.User.findOne({id: userIdFor.editor, status: 'all'}).then(function (response) {
                            response.get('status').should.eql('inactive');
                        });
                    });
                });
            });

            describe('as editor', function () {
                it('[failure] can\'t change status to inactive for owner', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.editor, {id: userIdFor.owner})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\' change my own status to inactive', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.editor, {id: userIdFor.editor})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\'t change status to inactive for admin', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.editor, {id: userIdFor.admin})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\'t change status to inactive for editor', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.editor, {id: userIdFor.editor2})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[success] can change status to inactive for author', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.editor, {id: userIdFor.author})
                    ).then(function () {
                        return models.User.findOne({id: userIdFor.author, status: 'all'}).then(function (response) {
                            response.get('status').should.eql('inactive');
                        });
                    });
                });
            });

            describe('as author', function () {
                it('[failure] can\'t change status to inactive for owner', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.author, {id: userIdFor.owner})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\' change my own status to inactive', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.author, {id: userIdFor.author})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\'t change status to inactive for admin', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.author, {id: userIdFor.admin})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can\'t change status to inactive for editor', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.author, {id: userIdFor.editor})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });

                it('[failure] can change status to inactive for author', function () {
                    return UserAPI.edit(
                        {
                            users: [
                                {
                                    status: 'inactive'
                                }
                            ]
                        }, _.extend({}, context.author, {id: userIdFor.author2})
                    ).then(function () {
                        throw new Error('this is not allowed');
                    }).catch(function (err) {
                        (err instanceof errors.NoPermissionError).should.eql(true);
                    });
                });
            });
        });
    });

    describe('Destroy', function () {
        describe('General Tests', function () {
            it('ensure posts get deleted', function (done) {
                var postIdsToDelete = [], postIsToKeep = [], options = {};

                Promise.mapSeries(testUtils.DataGenerator.forKnex.posts, function (post, i) {
                    post = _.cloneDeep(post);
                    delete post.id;

                    if (i % 2) {
                        post.author_id = userIdFor.editor;
                        post.status = 'published';
                        post.tags = testUtils.DataGenerator.forKnex.tags.slice(0, 1);
                        return models.Post.add(post, _.merge({}, options, context.editor));
                    } else {
                        post.author_id = userIdFor.author;
                        post.status = 'published';
                        post.tags = testUtils.DataGenerator.forKnex.tags.slice(2, 4);
                        return models.Post.add(post, _.merge({}, options, context.author));
                    }
                }).then(function () {
                    return models.Post.findAll(_.merge({}, {
                        context: context.editor.context,
                        filter: 'author_id:' + userIdFor.editor,
                        include: ['tags']
                    }, options));
                }).then(function (posts) {
                    posts.models.length.should.eql(3);
                    posts.models[0].relations.tags.length.should.eql(1);

                    _.each(posts.models, function (post) {
                        postIdsToDelete.push(post.get('id'));
                    });

                    return models.Post.findAll(_.merge({
                        context: context.author.context,
                        filter: 'author_id:' + userIdFor.author,
                        include: ['tags']
                    }, options));
                }).then(function (posts) {
                    posts.models.length.should.eql(3);
                    posts.models[0].relations.tags.length.should.eql(2);

                    _.each(posts.models, function (post) {
                        postIsToKeep.push(post.get('id'));
                    });

                    return Promise.mapSeries(postIdsToDelete, function (id) {
                        return db.knex('posts_tags').where('post_id', id);
                    });
                }).then(function (result) {
                    _.flatten(result).length.should.eql(3);

                    return db.knex('tags');
                }).then(function (allTags) {
                    allTags.length.should.eql(5);

                    return UserAPI.destroy(_.extend({}, context.owner, _.merge({}, options, {id: userIdFor.editor})));
                }).then(function () {
                    return models.User.findOne(_.merge({}, options, {id: userIdFor.editor}));
                }).then(function (user) {
                    should.not.exist(user);
                    return models.User.findOne(_.merge({}, options, {id: userIdFor.author}));
                }).then(function (user) {
                    should.exist(user);
                    return models.Post.findAll(_.merge({}, options, {filter: 'author_id:' + userIdFor.editor}));
                }).then(function (posts) {
                    posts.models.length.should.eql(0);

                    return models.Post.findAll(_.merge({}, options, {filter: 'author_id:' + userIdFor.author}));
                }).then(function (posts) {
                    posts.models.length.should.eql(3);

                    return Promise.mapSeries(postIdsToDelete, function (id) {
                        return db.knex('posts_tags').where('post_id', id);
                    });
                }).then(function (result) {
                    _.flatten(result).length.should.eql(0);

                    return Promise.mapSeries(postIsToKeep, function (id) {
                        return db.knex('posts_tags').where('post_id', id);
                    });
                }).then(function (result) {
                    _.flatten(result).length.should.eql(6);
                    return db.knex('tags');
                }).then(function (allTags) {
                    allTags.length.should.eql(5);
                    done();
                }).catch(done);
            });
        });

        describe('Owner', function () {
            it('CANNOT destroy self', function (done) {
                UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Owner should not be able to delete itself'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('Can destroy admin, editor, author', function (done) {
                // Admin
                UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.admin}))
                    .then(function (response) {
                        should.not.exist(response);
                        // Editor
                        return UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.editor}));
                    }).then(function (response) {
                    should.not.exist(response);

                    // Author
                    return UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.author}));
                }).then(function (response) {
                    should.not.exist(response);

                    done();
                }).catch(done);
            });
        });

        describe('Admin', function () {
            it('CANNOT destroy owner', function (done) {
                UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Admin should not be able to delete owner'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('Can destroy admin, editor, author', function (done) {
                // Admin
                UserAPI.destroy(_.extend({}, context.admin, {id: testUtils.DataGenerator.Content.extraUsers[0].id}))
                    .then(function (response) {
                        should.not.exist(response);

                        // Editor
                        return UserAPI.destroy(_.extend({}, context.admin, {id: testUtils.DataGenerator.Content.extraUsers[1].id}));
                    }).then(function (response) {
                    should.not.exist(response);

                    // Author
                    return UserAPI.destroy(_.extend({}, context.admin, {id: testUtils.DataGenerator.Content.extraUsers[2].id}));
                }).then(function (response) {
                    should.not.exist(response);

                    done();
                }).catch(done);
            });
        });

        describe('Editor', function () {
            it('CANNOT destroy owner', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete owner'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT destroy admin', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.admin}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete admin'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT destroy other editor', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: testUtils.DataGenerator.Content.extraUsers[1].id}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete other editor'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('Can destroy self', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.editor}))
                    .then(function (response) {
                        should.not.exist(response);
                        done();
                    }).catch(done);
            });

            it('Can destroy author', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.author}))
                    .then(function (response) {
                        should.not.exist(response);
                        done();
                    }).catch(done);
            });
        });

        describe('Author', function () {
            it('CANNOT destroy owner', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Author should not be able to delete owner'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT destroy admin', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.admin}))
                    .then(function () {
                        done(new Error('Author should not be able to delete admin'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT destroy editor', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.editor}))
                    .then(function () {
                        done(new Error('Author should not be able to delete editor'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT destroy other author', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: testUtils.DataGenerator.Content.extraUsers[2].id}))
                    .then(function () {
                        done(new Error('Author should not be able to delete other author'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT destroy self', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.author}))
                    .then(function () {
                        done(new Error('Author should not be able to delete self'));
                    }).catch(checkForErrorType('NoPermissionError', done));
            });
        });
    });

    describe('Edit and assign role', function () {
        var newName = 'Jo McBlogger';

        function checkEditResponse(response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users.should.have.length(1);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            response.users[0].name.should.equal(newName);
            response.users[0].updated_at.should.be.an.instanceof(Date);
        }

        it('throws an error if there is an id mismatch', function (done) {
            var options = _.extend({}, context.author, {id: userIdFor.author});
            UserAPI.edit({users: [{id: userIdFor.owner, name: 'Override', roles: [roleIdFor.author]}]}, options)
                .then(function () {
                    done(new Error('ID mismatches should not be permitted'));
                }).catch(checkForErrorType('BadRequestError', done));
        });

        describe('Owner', function () {
            it('Can assign Admin role', function (done) {
                var options = _.extend({}, context.owner, {id: userIdFor.author}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.author);
                    response.users[0].roles[0].name.should.equal('Author');

                    return UserAPI.edit({
                        users: [
                            {name: newName, roles: [roleIdFor.admin]}
                        ]
                    }, options).then(function (response) {
                        checkEditResponse(response);
                        response.users[0].id.should.equal(userIdFor.author);
                        response.users[0].roles[0].name.should.equal('Administrator');

                        done();
                    }).catch(done);
                });
            });

            it('Can assign Editor role', function (done) {
                var options = _.extend({}, context.owner, {id: userIdFor.admin}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.admin);
                    response.users[0].roles[0].name.should.equal('Administrator');

                    return UserAPI.edit({
                        users: [
                            {name: newName, roles: [roleIdFor.editor]}
                        ]
                    }, options).then(function (response) {
                        checkEditResponse(response);
                        response.users[0].id.should.equal(userIdFor.admin);
                        response.users[0].roles[0].name.should.equal('Editor');

                        done();
                    }).catch(done);
                });
            });

            it('Can assign Author role', function (done) {
                var options = _.extend({}, context.owner, {id: userIdFor.admin}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.admin);
                    response.users[0].roles[0].name.should.equal('Administrator');

                    return UserAPI.edit({
                        users: [
                            {name: newName, roles: [roleIdFor.author]}
                        ]
                    }, options).then(function (response) {
                        checkEditResponse(response);
                        response.users[0].id.should.equal(userIdFor.admin);
                        response.users[0].roles[0].name.should.equal('Author');

                        done();
                    }).catch(done);
                });
            });
        });

        describe('Admin', function () {
            it('Can assign Admin role', function (done) {
                var options = _.extend({}, context.admin, {id: userIdFor.author}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.author);
                    response.users[0].roles[0].name.should.equal('Author');

                    return UserAPI.edit({
                        users: [
                            {name: newName, roles: [roleIdFor.admin]}
                        ]
                    }, options).then(function (response) {
                        checkEditResponse(response);
                        response.users[0].id.should.equal(userIdFor.author);
                        response.users[0].roles[0].name.should.equal('Administrator');

                        done();
                    }).catch(done);
                });
            });

            it('Can assign Editor role', function (done) {
                var options = _.extend({}, context.admin, {id: userIdFor.author}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.author);
                    response.users[0].roles[0].name.should.equal('Author');

                    return UserAPI.edit({
                        users: [
                            {name: newName, roles: [roleIdFor.editor]}
                        ]
                    }, options).then(function (response) {
                        checkEditResponse(response);
                        response.users[0].id.should.equal(userIdFor.author);
                        response.users[0].roles[0].name.should.equal('Editor');

                        done();
                    }).catch(done);
                });
            });

            it('Can assign Author role', function (done) {
                var options = _.extend({}, context.admin, {id: userIdFor.editor}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.editor);
                    response.users[0].roles[0].name.should.equal('Editor');

                    return UserAPI.edit({
                        users: [
                            {name: newName, roles: [roleIdFor.author]}
                        ]
                    }, options).then(function (response) {
                        checkEditResponse(response);
                        response.users[0].id.should.equal(userIdFor.editor);
                        response.users[0].roles[0].name.should.equal('Author');

                        done();
                    }).catch(done);
                });
            });

            it('CANNOT downgrade owner', function (done) {
                var options = _.extend({}, context.admin, {id: userIdFor.owner}, {include: 'roles'});
                UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.owner);
                    response.users[0].roles[0].name.should.equal('Owner');

                    return UserAPI.edit({
                        users: [{name: newName, roles: [roleIdFor.author]}]
                    }, options).then(function () {
                        done(new Error('Author should not be able to downgrade owner'));
                    }).catch(checkForErrorType('NoPermissionError', done));
                });
            });
        });

        describe('Editor', function () {
            it('Can assign author role to author', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: testUtils.DataGenerator.Content.extraUsers[2].id}, {include: 'roles'})
                ).then(function (response) {
                    checkEditResponse(response);
                    response.users[0].id.should.equal(testUtils.DataGenerator.Content.extraUsers[2].id);
                    response.users[0].roles[0].name.should.equal('Author');

                    done();
                }).catch(done);
            });

            it('CANNOT assign author role to self', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.editor}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to upgrade their role'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT assign author role to other Editor', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: testUtils.DataGenerator.Content.extraUsers[1].id}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to change the roles of other editors'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });

            it('CANNOT assign author role to admin', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.admin}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to change the roles of admins'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });
            it('CANNOT assign admin role to author', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.admin]}]},
                    _.extend({}, context.editor, {id: userIdFor.author}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to upgrade the role of authors'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });
        });

        describe('Author', function () {
            it('CANNOT assign higher role to self', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.editor]}]},
                    _.extend({}, context.author, {id: userIdFor.author}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Author should not be able to upgrade their role'));
                }).catch(checkForErrorType('NoPermissionError', done));
            });
        });
    });

    describe('Transfer ownership', function () {
        it('Owner can transfer ownership', function (done) {
            // transfer ownership to admin user id:2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.owner
            ).then(function (response) {
                should.exist(response);
                response.users.should.have.length(2);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                testUtils.API.checkResponse(response.users[1], 'user', ['roles']);
                response.users[0].roles[0].id.should.equal(testUtils.DataGenerator.Content.roles[0].id);
                response.users[1].roles[0].id.should.equal(testUtils.DataGenerator.Content.roles[3].id);
                done();
            }).catch(done);
        });

        it('Owner CANNOT downgrade own role', function (done) {
            // Cannot change own role to admin
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.owner}]},
                context.owner
            ).then(function () {
                done(new Error('Owner should not be able to downgrade their role'));
            }).catch(checkForErrorType('ValidationError', done));
        });

        it('Admin CANNOT transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.editor}]},
                context.admin
            ).then(function () {
                done(new Error('Admin is not denied transferring ownership.'));
            }).catch(checkForErrorType('NoPermissionError', done));
        });

        it('Editor CANNOT transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.editor
            ).then(function () {
                done(new Error('Admin is not denied transferring ownership.'));
            }).catch(checkForErrorType('NoPermissionError', done));
        });

        it('Author CANNOT transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.author
            ).then(function () {
                done(new Error('Admin is not denied transferring ownership.'));
            }).catch(checkForErrorType('NoPermissionError', done));
        });

        it('Blog is still setup', function (done) {
            // transfer ownership to admin user
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.owner
            ).then(function (response) {
                should.exist(response);
                return models.User.isSetup();
            }).then(function (isSetup) {
                isSetup.should.eql(true);
                done();
            }).catch(done);
        });

        it('Blog is still setup, new owner is locked', function (done) {
            // transfer ownership to admin user
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.owner
            ).then(function (response) {
                should.exist(response);
                return models.User.edit({status: 'locked'}, {id: userIdFor.admin});
            }).then(function (modifiedUser) {
                modifiedUser.get('status').should.eql('locked');
                return models.User.isSetup();
            }).then(function (isSetup) {
                isSetup.should.eql(true);
                done();
            }).catch(done);
        });
    });

    describe('Change Password', function () {
        it('Owner can change own password', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'Sl1m3rson99',
                    newPassword: 'newSl1m3rson',
                    ne2Password: 'newSl1m3rson'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function (response) {
                    response.password[0].message.should.eql('Password changed successfully.');
                    done();
                }).catch(done);
        });

        it('Owner can\'t change password with wrong oldPassword', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'wrong',
                    newPassword: 'Sl1m3rson9',
                    ne2Password: 'Sl1m3rson9'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(checkForErrorType('ValidationError', done));
        });

        it('Owner can\'t change password without old password', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: '',
                    newPassword: 'Sl1m3rson19',
                    ne2Password: 'Sl1m3rson19'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(checkForErrorType('ValidationError', done));
        });

        it('Owner can\'t change password without matching passwords', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'Sl1m3rson99',
                    newPassword: 'Sl1m3rson19',
                    ne2Password: 'Sl1m3rson29'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(checkForErrorType('ValidationError', done));
        });

        it('Owner can\'t change editor password without matching passwords', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'Sl1m3rson19',
                    ne2Password: 'Sl1m3rson29'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(checkForErrorType('ValidationError', done));
        });

        it('Owner can\'t change editor password with too short passwords', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'only8car',
                    ne2Password: 'only8car'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(checkForErrorType('ValidationError', done));
        });

        it('Owner can change password for editor', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'newSl1m3rson',
                    ne2Password: 'newSl1m3rson'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function (response) {
                    response.password[0].message.should.eql('Password changed successfully.');
                    done();
                }).catch(done);
        });

        it('Editor can\'t change password for admin', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.admin,
                    newPassword: 'newSl1m3rson',
                    ne2Password: 'newSl1m3rson'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.editor, {id: userIdFor.editor}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(checkForErrorType('NoPermissionError', done));
        });
    });
});
