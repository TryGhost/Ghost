/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils       = require('../../utils'),
    should          = require('should'),
    sinon           = require('sinon'),
    Promise         = require('bluebird'),
    _               = require('lodash'),

// Stuff we are testing
    ModelUser       = require('../../../server/models'),
    UserAPI         = require('../../../server/api/users'),
    mail            = require('../../../server/api/mail'),

    context         = testUtils.context,
    userIdFor       = testUtils.users.ids,
    roleIdFor       = testUtils.roles.ids,
    sandbox         = sinon.sandbox.create();

describe('Users API', function () {
    // Keep the DB clean
    before(testUtils.teardown);

    beforeEach(testUtils.setup('users:roles', 'users', 'user:token', 'perms:user', 'perms:role', 'perms:setting', 'perms:init'));
    afterEach(testUtils.teardown);

    it('dateTime fields are returned as Date objects', function (done) {
        var userData = testUtils.DataGenerator.forModel.users[0];

        ModelUser.User.check({email: userData.email, password: userData.password}).then(function (user) {
            return UserAPI.read({id: user.id});
        }).then(function (response) {
            response.users[0].created_at.should.be.an.instanceof(Date);
            response.users[0].updated_at.should.be.an.instanceof(Date);
            response.users[0].last_login.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    describe('Browse', function () {
        function checkBrowseResponse(response, count) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'users');
            should.exist(response.users);
            response.users.should.have.length(count);
            testUtils.API.checkResponse(response.users[0], 'user');
            testUtils.API.checkResponse(response.users[1], 'user');
            testUtils.API.checkResponse(response.users[2], 'user');
            testUtils.API.checkResponse(response.users[3], 'user');
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

        it('No-auth CANNOT browse', function (done) {
            UserAPI.browse().then(function () {
                done(new Error('Browse users is not denied without authentication.'));
            }, function () {
                done();
            }).catch(done);
        });

        it('Can browse invited/invited-pending (admin)', function (done) {
            testUtils.fixtures.createInvitedUsers().then(function () {
                UserAPI.browse(_.extend({}, testUtils.context.admin, {status: 'invited'})).then(function (response) {
                    should.exist(response);
                    testUtils.API.checkResponse(response, 'users');
                    should.exist(response.users);
                    response.users.should.have.length(3);
                    testUtils.API.checkResponse(response.users[0], 'user');
                    response.users[0].status.should.equal('invited-pending');

                    done();
                }).catch(done);
            });
        });

        it('Author can browse', function (done) {
            UserAPI.browse(context.author).then(function (response) {
                checkBrowseResponse(response, 7);
                done();
            }).catch(done);
        });

        it('No-auth CANNOT browse', function (done) {
            UserAPI.browse().then(function () {
                done(new Error('Browse users is not denied without authentication.'));
            }, function () {
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
            UserAPI.browse(_.extend({}, testUtils.context.admin, {status: 'all', include: 'roles'})).then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'users');
                should.exist(response.users);
                response.users.should.have.length(7);
                response.users.should.have.length(7);
                testUtils.API.checkResponse(response.users[0], 'user', 'roles');
                testUtils.API.checkResponse(response.users[1], 'user', 'roles');
                testUtils.API.checkResponse(response.users[2], 'user', 'roles');
                testUtils.API.checkResponse(response.users[3], 'user', 'roles');
                done();
            }).catch(done);
        });
    });

    describe('Read', function () {
        function checkReadResponse(response) {
            should.exist(response);
            should.not.exist(response.meta);
            should.exist(response.users);
            response.users[0].id.should.eql(1);
            testUtils.API.checkResponse(response.users[0], 'user');
            response.users[0].created_at.should.be.a.Date;
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
                checkReadResponse(response);
                done();
            }).catch(done);
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
            response.users[0].updated_at.should.be.a.Date;
        }

        it('throws an error if there is an id mismatch', function (done) {
            var options = _.extend({}, context.author, {id: userIdFor.author});
            UserAPI.edit({users: [{id: userIdFor.owner, name: 'Override'}]}, options)
                .then(function () {
                    done(new Error('ID mismatches should not be permitted'));
                }).catch(function (error) {
                    error.type.should.eql('BadRequestError');
                    done();
                });
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

        it('Admin can edit all users in all roles', function (done) {
            UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.owner}))
                .then(function (response) {
                    checkEditResponse(response);

                    return UserAPI.edit({users: [{name: newName}]}, _.extend({}, context.admin, {id: userIdFor.admin}));
                }).then(function (response) {
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

        it('Admin can edit all users in all roles with roles in payload', function (done) {
            UserAPI.edit({users: [{name: newName, roles: [roleIdFor.owner]}]}, _.extend({}, context.admin, {id: userIdFor.owner}))
                .then(function (response) {
                    checkEditResponse(response);

                    return UserAPI.edit({users: [{name: newName, roles: [roleIdFor.admin]}]}, _.extend({}, context.admin, {id: userIdFor.admin}));
                }).then(function (response) {
                    checkEditResponse(response);
                    return UserAPI.edit({users: [{name: newName, roles: [roleIdFor.editor]}]}, _.extend({}, context.admin, {id: userIdFor.editor}));
                }).then(function (response) {
                    checkEditResponse(response);

                    return UserAPI.edit({users: [{name: newName, roles: [roleIdFor.author]}]}, _.extend({}, context.admin, {id: userIdFor.author}));
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
                error.type.should.eql('NoPermissionError');
            }).finally(function () {
                // Cannot edit Admin
                UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.admin})
                ).then(function () {
                    done(new Error('Editor should not be able to edit admin account'));
                }).catch(function (error) {
                    error.type.should.eql('NoPermissionError');
                }).finally(function () {
                    // Cannot edit Editor
                    UserAPI.edit(
                        {users: [{name: newName}]}, _.extend({}, context.editor, {id: userIdFor.editor2})
                    ).then(function () {
                        done(new Error('Editor should not be able to edit other editor account'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
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
                error.type.should.eql('NoPermissionError');
            }).finally(function () {
                // Cannot edit admin
                UserAPI.edit(
                    {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.admin})
                ).then(function () {
                    done(new Error('Editor should not be able to edit admin account'));
                }).catch(function (error) {
                    error.type.should.eql('NoPermissionError');
                }).finally(function () {
                    UserAPI.edit(
                        {users: [{name: newName}]}, _.extend({}, context.author, {id: userIdFor.author2})
                    ).then(function () {
                        done(new Error('Author should not be able to edit author account which is not their own'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
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
                {users: [{name: newName, roles: [roleIdFor.author]}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
                done();
            }).catch(done);
        });

        it('Author can edit self with role set as string', function (done) {
            // Next test that author CAN edit self
            UserAPI.edit(
                {users: [{name: newName, roles: [roleIdFor.author.toString()]}]}, _.extend({}, context.author, {id: userIdFor.author})
            ).then(function (response) {
                checkEditResponse(response);
                done();
            }).catch(done);
        });
    });

    describe('Add', function () {
        var newUser;

        beforeEach(function () {
            newUser = _.clone(testUtils.DataGenerator.forKnex.createUser(testUtils.DataGenerator.Content.users[4]));

            sandbox.stub(ModelUser.User, 'gravatarLookup', function (userData) {
                return Promise.resolve(userData);
            });

            sandbox.stub(mail, 'send', function () {
                return Promise.resolve();
            });
        });
        afterEach(function () {
            sandbox.restore();
        });

        function checkAddResponse(response) {
            should.exist(response);
            should.exist(response.users);
            should.not.exist(response.meta);
            response.users.should.have.length(1);
            testUtils.API.checkResponse(response.users[0], 'user', ['roles']);
            response.users[0].created_at.should.be.a.Date;
        }

        describe('Owner', function () {
            it('CANNOT add an Owner', function (done) {
                newUser.roles = [roleIdFor.owner];
                // Owner cannot add owner
                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function () {
                        done(new Error('Owner should not be able to add an owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('Can add an Admin', function (done) {
                // Can add admin
                newUser.roles = [roleIdFor.admin];
                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Administrator');
                        done();
                    }).catch(done);
            });

            it('Can add an Editor', function (done) {
                // Can add editor
                newUser.roles = [roleIdFor.editor];
                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Editor');
                        done();
                    }).catch(done);
            });
            it('Can add an Author', function (done) {
                // Can add author
                newUser.roles = [roleIdFor.author];
                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Author');
                        done();
                    }).catch(done);
            });

            it('Can add with no role set', function (done) {
                // Can add author
                delete newUser.roles;
                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Author');
                        done();
                    }).catch(done);
            });

            it('Can add with role set as string', function (done) {
                // Can add author
                newUser.roles = [roleIdFor.author.toString()];
                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Author');
                        done();
                    }).catch(done);
            });
        });

        describe('Admin', function () {
            it('CANNOT add an Owner', function (done) {
                newUser.roles = [roleIdFor.owner];
                // Admin cannot add owner
                UserAPI.add({users: [newUser]}, _.extend({}, context.admin, {include: 'roles'}))
                    .then(function () {
                        done(new Error('Admin should not be able to add an owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });
            it('Can add an Admin', function (done) {
                // Can add admin
                newUser.roles = [roleIdFor.admin];
                UserAPI.add({users: [newUser]}, _.extend({}, context.admin, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Administrator');
                        done();
                    }).catch(done);
            });

            it('Can add an Editor', function (done) {
                // Can add editor
                newUser.roles = [roleIdFor.editor];
                UserAPI.add({users: [newUser]}, _.extend({}, context.admin, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Editor');
                        done();
                    }).catch(done);
            });

            it('Can add an Author', function (done) {
                // Can add author
                newUser.roles = [roleIdFor.author];
                UserAPI.add({users: [newUser]}, _.extend({}, context.admin, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Author');
                        done();
                    }).catch(done);
            });

            it('Can add two users with the same local-part in their email addresses', function (done) {
                newUser.roles = [roleIdFor.author];

                UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Author');
                    }).then(function () {
                        newUser.email = newUser.email.split('@')[0] + '@someotherdomain.com';
                        return UserAPI.add({users: [newUser]}, _.extend({}, context.owner, {include: 'roles'}))
                            .then(function (response) {
                                checkAddResponse(response);
                                response.users[0].id.should.eql(9);
                                response.users[0].roles[0].name.should.equal('Author');

                                done();
                            });
                    }).catch(done);
            });
        });

        describe('Editor', function () {
            it('CANNOT add an Owner', function (done) {
                newUser.roles = [roleIdFor.owner];
                // Editor cannot add owner
                UserAPI.add({users: [newUser]}, _.extend({}, context.editor, {include: 'roles'}))
                    .then(function () {
                        done(new Error('Editor should not be able to add an owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('Can add an Author', function (done) {
                newUser.roles = [roleIdFor.author];
                UserAPI.add({users: [newUser]}, _.extend({}, context.editor, {include: 'roles'}))
                    .then(function (response) {
                        checkAddResponse(response);
                        response.users[0].id.should.eql(8);
                        response.users[0].roles[0].name.should.equal('Author');
                        done();
                    }).catch(done);
            });
        });

        describe('Author', function () {
            it('CANNOT add an Owner', function (done) {
                newUser.roles = [roleIdFor.owner];
                // Admin cannot add owner
                UserAPI.add({users: [newUser]}, _.extend({}, context.author, {include: 'roles'}))
                    .then(function () {
                        done(new Error('Author should not be able to add an owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT add an Author', function (done) {
                newUser.roles = [roleIdFor.author];
                UserAPI.add({users: [newUser]}, _.extend({}, context.author, {include: 'roles'}))
                    .then(function () {
                        done(new Error('Author should not be able to add an author'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });
        });
    });

    describe('Destroy', function () {
        function checkDestroyResponse(response) {
            should.exist(response);
            should.exist(response.users);
            should.not.exist(response.meta);
            response.users.should.have.length(1);
            testUtils.API.checkResponse(response.users[0], 'user');
            response.users[0].created_at.should.be.a.Date;
        }

        describe('Owner', function () {
            it('CANNOT destroy self', function (done) {
                UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Owner should not be able to delete itself'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('Can destroy admin, editor, author', function (done) {
                // Admin
                UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.admin}))
                    .then(function (response) {
                        checkDestroyResponse(response);
                        // Editor
                        return UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.editor}));
                    }).then(function (response) {
                        checkDestroyResponse(response);

                        // Author
                        return UserAPI.destroy(_.extend({}, context.owner, {id: userIdFor.author}));
                    }).then(function (response) {
                        checkDestroyResponse(response);

                        done();
                    }).catch(done);
            });
        });

        describe('Admin', function () {
            it('CANNOT destroy owner', function (done) {
                UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Admin should not be able to delete owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('Can destroy admin, editor, author', function (done) {
                // Admin
                UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.admin2}))
                    .then(function (response) {
                        checkDestroyResponse(response);

                        // Editor
                        return UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.editor2}));
                    }).then(function (response) {
                        checkDestroyResponse(response);

                        // Author
                        return UserAPI.destroy(_.extend({}, context.admin, {id: userIdFor.author2}));
                    }).then(function (response) {
                        checkDestroyResponse(response);

                        done();
                    }).catch(done);
            });
        });

        describe('Editor', function () {
            it('CANNOT destroy owner', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT destroy admin', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.admin}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete admin'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT destroy other editor', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.editor2}))
                    .then(function () {
                        done(new Error('Editor should not be able to delete other editor'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('Can destroy self', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.editor}))
                    .then(function (response) {
                        checkDestroyResponse(response);
                        done();
                    }).catch(done);
            });

            it('Can destroy author', function (done) {
                UserAPI.destroy(_.extend({}, context.editor, {id: userIdFor.author}))
                    .then(function (response) {
                        checkDestroyResponse(response);
                        done();
                    }).catch(done);
            });
        });

        describe('Author', function () {
            it('CANNOT destroy owner', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.owner}))
                    .then(function () {
                        done(new Error('Author should not be able to delete owner'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT destroy admin', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.admin}))
                    .then(function () {
                        done(new Error('Author should not be able to delete admin'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT destroy editor', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.editor}))
                    .then(function () {
                        done(new Error('Author should not be able to delete editor'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT destroy other author', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.author2}))
                    .then(function () {
                        done(new Error('Author should not be able to delete other author'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('CANNOT destroy self', function (done) {
                UserAPI.destroy(_.extend({}, context.author, {id: userIdFor.author}))
                    .then(function () {
                        done(new Error('Author should not be able to delete self'));
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    });
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
            response.users[0].updated_at.should.be.a.Date;
        }

        it('throws an error if there is an id mismatch', function (done) {
            var options = _.extend({}, context.author, {id: userIdFor.author});
            UserAPI.edit({users: [{id: userIdFor.owner, name: 'Override', roles: [roleIdFor.author]}]}, options)
                .then(function () {
                    done(new Error('ID mismatches should not be permitted'));
                }).catch(function (error) {
                    error.type.should.eql('BadRequestError');
                    done();
                });
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
                    }).catch(function (error) {
                        error.type.should.eql('NoPermissionError');
                        done();
                    }).catch(done);
                });
            });
        });

        describe('Editor', function () {
            it('Can assign author role to author', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.author2}, {include: 'roles'})
                ).then(function (response) {
                    checkEditResponse(response);
                    response.users[0].id.should.equal(userIdFor.author2);
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
                }, function (error) {
                    error.type.should.eql('NoPermissionError');
                    done();
                }).catch(done);
            });

            it('CANNOT assign author role to other Editor', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.editor2}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to change the roles of other editors'));
                }, function (error) {
                    error.type.should.eql('NoPermissionError');
                    done();
                }).catch(done);
            });

            it('CANNOT assign author role to admin', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.author]}]},
                    _.extend({}, context.editor, {id: userIdFor.admin}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to change the roles of admins'));
                }, function (error) {
                    error.type.should.eql('NoPermissionError');
                    done();
                }).catch(done);
            });
            it('CANNOT assign admin role to author', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.admin]}]},
                    _.extend({}, context.editor, {id: userIdFor.author}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Editor should not be able to upgrade the role of authors'));
                }).catch(function (error) {
                    error.type.should.eql('NoPermissionError');
                    done();
                }).catch(done);
            });
        });

        describe('Author', function () {
            it('CANNOT assign higher role to self', function (done) {
                UserAPI.edit(
                    {users: [{name: newName, roles: [roleIdFor.editor]}]},
                    _.extend({}, context.author, {id: userIdFor.author}, {include: 'roles'})
                ).then(function () {
                    done(new Error('Author should not be able to upgrade their role'));
                }, function (error) {
                    error.type.should.eql('NoPermissionError');
                    done();
                }).catch(done);
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
                response.users[0].roles[0].id.should.equal(1);
                response.users[1].roles[0].id.should.equal(4);
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
            }).catch(function (error) {
                error.type.should.eql('ValidationError');
                done();
            });
        });

        it('Admin CANNOT transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.editor}]},
                context.admin
            ).then(function () {
                done(new Error('Admin is not denied transferring ownership.'));
            }).catch(function (error) {
                error.type.should.eql('NoPermissionError');
                done();
            });
        });

        it('Editor CANNOT transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.editor
            ).then(function () {
                done(new Error('Admin is not denied transferring ownership.'));
            }).catch(function (error) {
                error.type.should.eql('NoPermissionError');
                done();
            });
        });

        it('Author CANNOT transfer ownership', function (done) {
            // transfer ownership to user id: 2
            UserAPI.transferOwnership(
                {owner: [{id: userIdFor.admin}]},
                context.author
            ).then(function () {
                done(new Error('Admin is not denied transferring ownership.'));
            }).catch(function (error) {
                error.type.should.eql('NoPermissionError');
                done();
            });
        });
    });

    describe('Change Password', function () {
        it('Owner can change own password', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'Sl1m3rson',
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
                    newPassword: 'Sl1m3rson',
                    ne2Password: 'Sl1m3rson'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(function (error) {
                    error.type.should.eql('ValidationError');
                    done();
                });
        });

        it('Owner can\'t change password without matching passwords', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.owner,
                    oldPassword: 'Sl1m3rson',
                    newPassword: 'Sl1m3rson1',
                    ne2Password: 'Sl1m3rson2'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(function (error) {
                    error.type.should.eql('ValidationError');
                    done();
                });
        });

        it('Owner can\'t change editor password without matching passwords', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'Sl1m3rson1',
                    ne2Password: 'Sl1m3rson2'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(function (error) {
                    error.type.should.eql('ValidationError');
                    done();
                });
        });

        it('Owner can\'t change editor password without short passwords', function (done) {
            var payload = {
                password: [{
                    user_id: userIdFor.editor,
                    newPassword: 'Sl',
                    ne2Password: 'Sl'
                }]
            };
            UserAPI.changePassword(payload, _.extend({}, context.owner, {id: userIdFor.owner}))
                .then(function () {
                    done(new Error('Password change is not denied.'));
                }).catch(function (error) {
                    error.type.should.eql('ValidationError');
                    done();
                });
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
                }).catch(function (error) {
                    error.type.should.eql('NoPermissionError');
                    done();
                });
        });
    });
});
