var testUtils       = require('../../utils'),
    should          = require('should'),
    Promise         = require('bluebird'),
    _               = require('lodash'),
    models          = require('../../../server/models'),
    UserAPI         = require('../../../server/api/users'),
    db              = require('../../../server/data/db'),
    context         = testUtils.context,
    userIdFor       = testUtils.users.ids,
    roleIdFor       = testUtils.roles.ids;

describe('Users API', function () {
    // Keep the DB clean
    before(testUtils.teardown);

    beforeEach(testUtils.setup(
        'users:roles', 'users', 'user:token', 'perms:user', 'perms:role', 'perms:setting', 'perms:init', 'posts'
    ));

    afterEach(testUtils.teardown);

    function checkForErrorType(type) {
        return function checkForErrorType(error) {
            if (error.errorType) {
                error.errorType.should.eql(type);
            } else {
                throw error;
            }
        };
    }

    it('dateTime fields are returned as Date objects', function () {
        var userData = testUtils.DataGenerator.forModel.users[0];

        return models.User.check({email: userData.email, password: userData.password}).then(function (user) {
            return UserAPI.read({id: user.id});
        }).then(function (response) {
            response.users[0].created_at.should.be.an.instanceof(Date);
            response.users[0].updated_at.should.be.an.instanceof(Date);
            response.users[0].last_login.should.be.an.instanceof(Date);
        });
    });

    describe('Browse', function () {
        function checkBrowseResponse(response, count, additional, missing) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'users');
            should.exist(response.users);
            response.users.should.have.length(count);
            testUtils.API.checkResponse(response.users[0], 'user', additional, missing);
            testUtils.API.checkResponse(response.users[1], 'user', additional, missing);
            testUtils.API.checkResponse(response.users[2], 'user', additional, missing);
            testUtils.API.checkResponse(response.users[3], 'user', additional, missing);
        }

        it('Owner can browse', function () {
            return UserAPI.browse(context.owner).then(function (response) {
                checkBrowseResponse(response, 7);
            });
        });

        it('Admin can browse', function () {
            return UserAPI.browse(context.admin).then(function (response) {
                checkBrowseResponse(response, 7);
            });
        });

        it('Editor can browse', function () {
            return UserAPI.browse(context.editor).then(function (response) {
                checkBrowseResponse(response, 7);
            });
        });

        it('Author can browse active', function () {
            return UserAPI.browse(context.author).then(function (response) {
                checkBrowseResponse(response, 7);
            });
        });

        it('No-auth CAN browse, but only gets filtered active users', function () {
            return UserAPI.browse().then(function (response) {
                checkBrowseResponse(response, 7, null, ['email']);
            });
        });

        it('No-auth CANNOT browse non-active users', function () {
            return UserAPI.browse({status: 'invited'}).then(function () {
                throw new Error('Browse non-active users is not denied without authentication.');
            });
        });

        it('Can browse invited/invited-pending (admin)', function () {
            return testUtils.fixtures.createInvitedUsers().then(function () {
                UserAPI.browse(_.extend({}, testUtils.context.admin, {status: 'invited'})).then(function (response) {
                    should.exist(response);
                    testUtils.API.checkResponse(response, 'users');
                    should.exist(response.users);
                    response.users.should.have.length(3);
                    testUtils.API.checkResponse(response.users[0], 'user');
                    response.users[0].status.should.equal('invited-pending');
                });
            });
        });

        it('Can browse all', function () {
            return UserAPI.browse(_.extend({}, testUtils.context.admin, {status: 'all'})).then(function (response) {
                checkBrowseResponse(response, 7);
            });
        });

        it('Can browse with roles', function () {
            return UserAPI.browse(_.extend({}, testUtils.context.admin, {status: 'all', include: 'roles'})).then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'users');
                should.exist(response.users);
                response.users.should.have.length(7);
                testUtils.API.checkResponse(response.users[0], 'user', 'roles');
                testUtils.API.checkResponse(response.users[1], 'user', 'roles');
                testUtils.API.checkResponse(response.users[2], 'user', 'roles');
                testUtils.API.checkResponse(response.users[3], 'user', 'roles');
            });
        });

        it('can browse and order by name using asc', function () {
            var expectedUsers;

            return UserAPI.browse(testUtils.context.admin)
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
            });
        });

        it('can browse and order by name using desc', function () {
            var expectedUsers;

            return UserAPI.browse(testUtils.context.admin)
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
            });
        });

        it('can browse with include count.posts', function () {
            return UserAPI.browse(_.extend({}, testUtils.context.admin, {include: 'count.posts'})).then(function (response) {
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
            });
        });
    });

    describe('Read', function () {
        function checkReadResponse(response, noEmail) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(1);

            if (noEmail) {
                // Email should be missing
                testUtils.API.checkResponse(response.users[0], 'user', [], ['email']);
                should.not.exist(response.users[0].email);
            } else {
                testUtils.API.checkResponse(response.users[0], 'user');
            }
            response.users[0].created_at.should.be.an.instanceof(Date);
        }

        it('Owner can read', function () {
            return UserAPI.read(_.extend({}, context.owner, {id: userIdFor.owner})).then(function (response) {
                checkReadResponse(response);
            });
        });

        it('Admin can read', function () {
            var stuff = _.extend({}, context.admin, {id: userIdFor.owner});
            return UserAPI.read(stuff).then(function (response) {
                checkReadResponse(response);
            });
        });

        it('Editor can read', function () {
            return UserAPI.read(_.extend({}, context.editor, {id: userIdFor.owner})).then(function (response) {
                checkReadResponse(response);
            });
        });

        it('Author can read', function () {
            return UserAPI.read(_.extend({}, context.author, {id: userIdFor.owner})).then(function (response) {
                checkReadResponse(response);
            });
        });

        it('No-auth can read', function () {
            return UserAPI.read({id: userIdFor.owner}).then(function (response) {
                checkReadResponse(response, true);
            });
        });

        // TODO: this should be a 422?
        it('cannot fetch a user with an invalid slug', function () {
            return UserAPI.read({slug: 'invalid!'}).then(function () {
                throw new Error('Should not return a result with invalid slug');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('User not found.');
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

        it('throws an error if there is an id mismatch', function () {
            var options = _.extend({}, context.author, {id: userIdFor.author});
            return UserAPI.edit({users: [{id: userIdFor.owner, name: 'Override'}]}, options)
            .then(function () {
                throw new Error('ID mismatches should not be permitted');
            }).catch(checkForErrorType('BadRequestError'));
        });

        it('Owner can edit all roles', function () {
            return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.owner, {id: userIdFor.owner}))
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
            });
        });

        it('Admin can edit Admin, Editor and Author roles', function () {
            return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.admin}))
            .then(function (response) {
                checkEditResponse(response);
                return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.editor}));
            }).then(function (response) {
                checkEditResponse(response);
                return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.author}));
            }).then(function (response) {
                checkEditResponse(response);
            });
        });

        it('Admin CANNOT edit Owner role', function () {
            return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.owner}))
            .then(function () {
                throw new Error('Admin should not be able to edit owner account');
            }).catch(function (error) {
                error.errorType.should.eql('NoPermissionError');
            });
        });

        it('Admin can edit Admin, Editor and Author roles with roles in payload', function () {
            return UserAPI.edit({users: [{name: newName, roles: [roleIdFor.admin]}]}, _.extend({}, context.admin, {id: userIdFor.admin})).then(function (response) {
                checkEditResponse(response);
                return UserAPI.edit({users: [{name: newName, roles: [roleIdFor.editor]}]}, _.extend({}, context.admin, {id: userIdFor.editor}));
            }).then(function (response) {
                checkEditResponse(response);
                return UserAPI.edit({users: [{name: newName, roles: [roleIdFor.author]}]}, _.extend({}, context.admin, {id: userIdFor.author}));
            }).then(function (response) {
                checkEditResponse(response);
            });
        });

        it('Editor CANNOT edit Owner, Admin or Editor roles', function () {
            // Cannot edit Owner
            return UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.owner})
            ).then(function () {
                throw new Error('Editor should not be able to edit owner account');
            }).catch(function (error) {
                error.errorType.should.eql('NoPermissionError');
            }).finally(function () {
                // Cannot edit Admin
                UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.admin})
                ).then(function () {
                    throw new Error('Editor should not be able to edit admin account');
                }).catch(function (error) {
                    error.errorType.should.eql('NoPermissionError');
                }).finally(function () {
                    // Cannot edit Editor
                    UserAPI.edit(
                        {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.editor2})
                    ).then(function () {
                        throw new Error('Editor should not be able to edit other editor account');
                    }).catch(function (error) {
                        error.errorType.should.eql('NoPermissionError');
                    });
                });
            });
        });

        it('Editor can edit self or Author role', function () {
            // Can edit self
            return UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.editor})
            ).then(function (response) {
                checkEditResponse(response);
                // Can edit Author
                return UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.author})
                );
            }).then(function (response) {
                checkEditResponse(response);
            });
        });

        it('Author CANNOT edit all roles', function () {
            // Cannot edit owner
            return UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.owner})
            ).then(function () {
                throw new Error('Editor should not be able to edit owner account');
            }).catch(function (error) {
                error.errorType.should.eql('NoPermissionError');
            }).finally(function () {
                // Cannot edit admin
                UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.admin})
                ).then(function () {
                    throw new Error('Editor should not be able to edit admin account');
                }).catch(function (error) {
                    error.errorType.should.eql('NoPermissionError');
                }).finally(function () {
                    UserAPI.edit(
                        {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.author2})
                    ).then(function () {
                        throw new Error('Author should not be able to edit author account which is not their own');
                    }).catch(function (error) {
                        error.errorType.should.eql('NoPermissionError');
                    });
                });
            });
        });

        it('Author can edit self', function () {
            // Next test that author CAN edit self
            return UserAPI.edit(
                {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
            });
        });

        it('Author can edit self with role set', function () {
            // Next test that author CAN edit self
            return UserAPI.edit(
                {users: [{name: newName, roles: [roleIdFor.author]}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
            });
        });

        it('Author can edit self with role set as string', function () {
            // Next test that author CAN edit self
            return UserAPI.edit(
                {users: [{name: newName, roles: [roleIdFor.author.toString()]}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
            });
        });

        it('Does not allow password to be set', function () {
            return UserAPI.edit(
                {users: [{name: 'newname', password: 'newpassword'}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function () {
                return models.User.findOne({id: userIdFor.author}).then(function (response) {
                    response.get('name').should.eql('newname');
                    response.get('password').should.not.eql('newpassword');
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
            it('CANNOT destroy self', function () {
                return UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    throw new Error('Owner should not be able to delete itself');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('Can destroy admin, editor, author', function () {
                // Admin
                return UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.admin}))
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
                });
            });
        });

        describe('Admin', function () {
            it('CANNOT destroy owner', function () {
                return UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.owner}))
                .then(function () {
                    throw new Error('Admin should not be able to delete owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('Can destroy admin, editor, author', function () {
                // Admin
                return UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.admin2}))
                .then(function (response) {
                    should.not.exist(response);

                    // Editor
                    return UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.editor2}));
                }).then(function (response) {
                    should.not.exist(response);

                    // Author
                    return UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.author2}));
                }).then(function (response) {
                    should.not.exist(response);
                });
            });
        });

        describe('Editor', function () {
            it('CANNOT destroy owner', function () {
                return UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.owner}))
                .then(function () {
                    throw new Error('Editor should not be able to delete owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT destroy admin', function () {
                return UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.admin}))
                .then(function () {
                    throw new Error('Editor should not be able to delete admin');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT destroy other editor', function () {
                return UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.editor2}))
                .then(function () {
                    throw new Error('Editor should not be able to delete other editor');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('Can destroy self', function () {
                return UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.editor}))
                .then(function (response) {
                    should.not.exist(response);
                });
            });

            it('Can destroy author', function () {
                return UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.author}))
                .then(function (response) {
                    should.not.exist(response);
                });
            });
        });

        describe('Author', function () {
            it('CANNOT destroy owner', function () {
                return UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.owner}))
                .then(function () {
                    throw new Error('Author should not be able to delete owner');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT destroy admin', function () {
                return UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.admin}))
                .then(function () {
                    throw new Error('Author should not be able to delete admin');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT destroy editor', function () {
                return UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.editor}))
                .then(function () {
                    throw new Error('Author should not be able to delete editor');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT destroy other author', function () {
                return UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.author2}))
                .then(function () {
                    throw new Error('Author should not be able to delete other author');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT destroy self', function () {
                return UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.author}))
                .then(function () {
                    throw new Error('Author should not be able to delete self');
                }).catch(checkForErrorType('NoPermissionError'));
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

        it('throws an error if there is an id mismatch', function () {
            var options = _.extend({}, context.author, {id: userIdFor.author});
            return UserAPI.edit({users: [{id: userIdFor.owner, name: 'Override', roles: [roleIdFor.author]}]}, options)
            .then(function () {
                throw new Error('ID mismatches should not be permitted');
            }).catch(checkForErrorType('BadRequestError'));
        });

        describe('Owner', function () {
            it('Can assign Admin role', function () {
                var options = _.extend({}, context.owner, {id: userIdFor.author}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
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
                    });
                });
            });

            it('Can assign Editor role', function () {
                var options = _.extend({}, context.owner, {id: userIdFor.admin}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
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
                    });
                });
            });

            it('Can assign Author role', function () {
                var options = _.extend({}, context.owner, {id: userIdFor.admin}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
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
                    });
                });
            });
        });

        describe('Admin', function () {
            it('Can assign Admin role', function () {
                var options = _.extend({}, context.admin, {id: userIdFor.author}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
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
                    });
                });
            });

            it('Can assign Editor role', function () {
                var options = _.extend({}, context.admin, {id: userIdFor.author}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
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
                    });
                });
            });

            it('Can assign Author role', function () {
                var options = _.extend({}, context.admin, {id: userIdFor.editor}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
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
                    });
                });
            });

            it('CANNOT downgrade owner', function () {
                var options = _.extend({}, context.admin, {id: userIdFor.owner}, {include: 'roles'});
                return UserAPI.read(options).then(function (response) {
                    response.users[0].id.should.equal(userIdFor.owner);
                    response.users[0].roles[0].name.should.equal('Owner');

                    return UserAPI.edit({
                        users: [{name: newName, roles: [roleIdFor.author]}]
                    }, options).then(function () {
                        throw new Error('Author should not be able to downgrade owner');
                    }).catch(checkForErrorType('NoPermissionError'));
                });
            });
        });

        describe('Editor', function () {
            it('Can assign author role to author', function () {
                return UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.author2}, {include: 'roles'})
                ).then(function (response) {
                    checkEditResponse(response);
                    response.users[0].id.should.equal(userIdFor.author2);
                    response.users[0].roles[0].name.should.equal('Author');
                });
            });

            it('CANNOT assign author role to self', function () {
                return UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.editor}, {include: 'roles'})
                ).then(function () {
                    throw new Error('Editor should not be able to upgrade their role');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT assign author role to other Editor', function () {
                return UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.editor2}, {include: 'roles'})
                ).then(function () {
                    throw new Error('Editor should not be able to change the roles of other editors');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT assign author role to admin', function () {
                return UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.admin}, {include: 'roles'})
                ).then(function () {
                    throw new Error('Editor should not be able to change the roles of admins');
                }).catch(checkForErrorType('NoPermissionError'));
            });

            it('CANNOT assign admin role to author', function () {
                return UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.admin]}]},
                    _.extend({}, context.editor, {id: userIdFor.author}, {include: 'roles'})
                ).then(function () {
                    throw new Error('Editor should not be able to upgrade the role of authors');
                }).catch(checkForErrorType('NoPermissionError'));
            });
        });

        describe('Author', function () {
            it('CANNOT assign higher role to self', function () {
                return UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.editor]}]},
                    _.extend({}, context.author, {id: userIdFor.author}, {include: 'roles'})
                ).then(function () {
                    throw new Error('Author should not be able to upgrade their role');
                }).catch(checkForErrorType('NoPermissionError'));
            });
        });
    });

    describe('Transfer ownership', function () {
        it('Owner can transfer ownership', function () {
            // transfer ownership to admin user id:2
            return UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.owner
            ).then(function (response) {
                should.exist(response);
                response.users.should.have.length(2);
                testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
                testUtils.API.checkResponse(response.users[1], 'user', ['roles']);
                response.users[0].roles[0].id.should.equal(1);
                response.users[1].roles[0].id.should.equal(4);
            });
        });

        it('Owner CANNOT downgrade own role', function () {
            // Cannot change own role to admin
            return UserAPI.transferOwnership(
                {owner: [{id: userIdFor.owner}]},
                context.owner
            ).then(function () {
                throw new Error('Owner should not be able to downgrade their role');
            }).catch(checkForErrorType('ValidationError'));
        });

        it('Admin CANNOT transfer ownership', function () {
            // transfer ownership to user id: 2
            return UserAPI.transferOwnership(
                {owner: [{id: userIdFor.editor}]},
                context.admin
            ).then(function () {
                throw new Error('Admin is not denied transferring ownership.');
            }).catch(checkForErrorType('NoPermissionError'));
        });

        it('Editor CANNOT transfer ownership', function () {
            // transfer ownership to user id: 2
            return UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.editor
            ).then(function () {
                throw new Error('Admin is not denied transferring ownership.');
            }).catch(checkForErrorType('NoPermissionError'));
        });

        it('Author CANNOT transfer ownership', function () {
            // transfer ownership to user id: 2
            return UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.author
            ).then(function () {
                throw new Error('Admin is not denied transferring ownership.');
            }).catch(checkForErrorType('NoPermissionError'));
        });
    });

    describe('Change Password', function () {
        it('Owner can change own password', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'Sl1m3rson',
                    newPassword: 'newSl1m3rson',
                    ne2Password: 'newSl1m3rson'
                }]
            };

            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function (response) {
                response.password[0].message.should.eql('Password changed successfully.');
            });
        });

        it('Owner can\'t change password with wrong oldPassword', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'wrong',
                    newPassword: 'Sl1m3rson',
                    ne2Password: 'Sl1m3rson'
                }]
            };
            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function () {
                throw new Error('Password change is not denied.');
            }).catch(checkForErrorType('ValidationError'));
        });

        it('Owner can\'t change password without old password', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: '',
                    newPassword: 'Sl1m3rson1',
                    ne2Password: 'Sl1m3rson1'
                }]
            };

            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function () {
                throw new Error('Password change is not denied.');
            }).catch(checkForErrorType('ValidationError'));
        });

        it('Owner can\'t change password without matching passwords', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'Sl1m3rson',
                    newPassword: 'Sl1m3rson1',
                    ne2Password: 'Sl1m3rson2'
                }]
            };

            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function () {
                throw new Error('Password change is not denied.');
            }).catch(checkForErrorType('ValidationError'));
        });

        it('Owner can\'t change editor password without matching passwords', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'Sl1m3rson1',
                    ne2Password: 'Sl1m3rson2'
                }]
            };
            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function () {
                throw new Error('Password change is not denied.');
            }).catch(checkForErrorType('ValidationError'));
        });

        it('Owner can\'t change editor password without short passwords', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'Sl',
                    ne2Password: 'Sl'
                }]
            };

            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function () {
                throw new Error('Password change is not denied.');
            }).catch(checkForErrorType('ValidationError'));
        });

        it('Owner can change password for editor', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'newSl1m3rson',
                    ne2Password: 'newSl1m3rson'
                }]
            };

            return UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
            .then(function (response) {
                response.password[0].message.should.eql('Password changed successfully.');
            });
        });

        it('Editor can\'t change password for admin', function () {
            var payload = {
                password: [{
                    user_id: userIdFor.admin,
                    newPassword: 'newSl1m3rson',
                    ne2Password: 'newSl1m3rson'
                }]
            };

            return UserAPI.changePassword(payload, _.extend({}, context.editor, {id: userIdFor.editor}))
            .then(function () {
                throw new Error('Password change is not denied.');
            }).catch(checkForErrorType('NoPermissionError'));
        });
    });
});
