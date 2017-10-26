var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    _ = require('lodash'),

    // Stuff we are testing
    errors = require('../../../server/errors'),
    gravatar = require('../../../server/utils/gravatar'),
    UserModel = require('../../../server/models/user').User,
    RoleModel = require('../../../server/models/role').Role,
    events = require('../../../server/events'),
    context = testUtils.context.admin,
    sandbox = sinon.sandbox.create();

describe('User Model', function run() {
    var eventsTriggered = {};

    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });

    before(function () {
        should.exist(UserModel);
    });

    describe('Registration', function runRegistration() {
        beforeEach(testUtils.setup('roles'));

        it('can add first', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.password.should.not.equal(userData.password, 'password was hashed');
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');

                done();
            }).catch(done);
        });

        it('shortens slug if possible', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('slug').should.equal(true);
                createdUser.attributes.slug.should.equal('jimothy');
                done();
            }).catch(done);
        });

        it('does not short slug if not possible', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('slug').should.equal(true);
                createdUser.attributes.slug.should.equal('jimothy');
            }).then(function () {
                userData.email = 'newmail@mail.com';
                UserModel.add(userData, context).then(function (createdUser) {
                    should.exist(createdUser);
                    createdUser.has('slug').should.equal(true);
                    createdUser.attributes.slug.should.equal('jimothy-bogendath');
                }).then(function () {
                    userData.email = 'newmail2@mail.com';
                    UserModel.add(userData, context).then(function (createdUser) {
                        should.exist(createdUser);
                        createdUser.has('slug').should.equal(true);
                        createdUser.attributes.slug.should.equal('jimothy-bogendath-2');
                        done();
                    });
                });
            }).catch(done);
        });

        it('does NOT lowercase email', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');
                done();
            }).catch(done);
        });

        it('can find gravatar', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4];

            sandbox.stub(gravatar, 'lookup', function (userData) {
                userData.image = 'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404';
                return Promise.resolve(userData);
            });

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.profile_image.should.eql(
                    'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404', 'Gravatar found'
                );
                done();
            }).catch(done);
        });

        it('can handle no gravatar', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            sandbox.stub(gravatar, 'lookup', function (userData) {
                return Promise.resolve(userData);
            });

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                should.not.exist(createdUser.image);
                done();
            }).catch(done);
        });

        it('can set password of only numbers', function () {
            var userData = testUtils.DataGenerator.forModel.users[0];

            // avoid side-effects!
            userData = _.cloneDeep(userData);
            userData.password = 109674836589;

            // mocha supports promises
            return UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                // cannot validate password
            });
        });

        it('can find by email and is case insensitive', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2],
                email = testUtils.DataGenerator.forModel.users[2].email;

            UserModel.add(userData, context).then(function () {
                // Test same case
                return UserModel.getByEmail(email).then(function (user) {
                    should.exist(user);
                    user.attributes.email.should.eql(email);
                });
            }).then(function () {
                // Test entered in lowercase
                return UserModel.getByEmail(email.toLowerCase()).then(function (user) {
                    should.exist(user);
                    user.attributes.email.should.eql(email);
                });
            }).then(function () {
                // Test entered in uppercase
                return UserModel.getByEmail(email.toUpperCase()).then(function (user) {
                    should.exist(user);
                    user.attributes.email.should.eql(email);
                });
            }).then(function () {
                // Test incorrect email address - swapped capital O for number 0
                return UserModel.getByEmail('jb0gendAth@example.com').then(null, function (error) {
                    should.exist(error);
                    error.message.should.eql('NotFound');
                });
            }).then(function () {
                done();
            }).catch(done);
        });
    });

    describe('Basic Operations', function () {
        beforeEach(testUtils.setup('users:roles'));

        beforeEach(function () {
            eventsTriggered = {};
            sandbox.stub(events, 'emit', function (eventName, eventObj) {
                if (!eventsTriggered[eventName]) {
                    eventsTriggered[eventName] = [];
                }

                eventsTriggered[eventName].push(eventObj);
            });
        });

        it('sets last login time on successful login', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({email: userData.email, password: userData.password}).then(function (activeUser) {
                should.exist(activeUser.get('last_seen'));
                done();
            }).catch(done);
        });

        it('converts fetched dateTime fields to Date objects', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({email: userData.email, password: userData.password}).then(function (user) {
                return UserModel.findOne({id: user.id});
            }).then(function (user) {
                var lastLogin,
                    createdAt,
                    updatedAt;

                should.exist(user);

                lastLogin = user.get('last_seen');
                createdAt = user.get('created_at');
                updatedAt = user.get('updated_at');

                lastLogin.should.be.an.instanceof(Date);
                createdAt.should.be.an.instanceof(Date);
                updatedAt.should.be.an.instanceof(Date);

                done();
            }).catch(done);
        });

        it('can findAll', function (done) {
            UserModel.findAll().then(function (results) {
                should.exist(results);
                results.length.should.equal(4);

                done();
            }).catch(done);
        });

        it('can findPage (default)', function (done) {
            UserModel.findPage().then(function (results) {
                should.exist(results);

                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal(15);
                results.meta.pagination.pages.should.equal(1);
                results.users.length.should.equal(4);

                done();
            }).catch(done);
        });

        /**
         * Removed in favour of filters, but this relation hasn't been re-added yet
         */
        it.skip('can findPage by role', function (done) {
            return testUtils.fixtures.createExtraUsers().then(function () {
                return UserModel.findPage({role: 'Administrator'});
            }).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal(15);
                results.meta.pagination.pages.should.equal(1);
                results.meta.pagination.total.should.equal(2);
                results.users.length.should.equal(2);

                return UserModel.findPage({role: 'Owner'});
            }).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal(15);
                results.meta.pagination.pages.should.equal(1);
                results.meta.pagination.total.should.equal(1);
                results.users.length.should.equal(1);

                return UserModel.findPage({role: 'Editor', limit: 1});
            }).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal(1);
                results.meta.pagination.pages.should.equal(2);
                results.meta.pagination.total.should.equal(2);
                results.users.length.should.equal(1);

                done();
            }).catch(done);
        });

        it('can findPage with limit all', function () {
            return testUtils.fixtures.createExtraUsers().then(function () {
                return UserModel.findPage({limit: 'all'});
            }).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal('all');
                results.meta.pagination.pages.should.equal(1);
                results.users.length.should.equal(7);
            });
        });

        it('can NOT findPage for a page that overflows the datatype', function (done) {
            UserModel.findPage({page: 5700000000055345439587894375457849375284932759842375894372589243758947325894375894275894275894725897432859724309})
                .then(function (paginationResult) {
                    should.exist(paginationResult.meta);

                    paginationResult.meta.pagination.page.should.be.a.Number();

                    done();
                }).catch(done);
        });

        it('can findOne', function (done) {
            var firstUser;

            UserModel.findAll().then(function (results) {
                should.exist(results);
                results.length.should.be.above(0);
                firstUser = results.models[0];

                return UserModel.findOne({email: firstUser.attributes.email});
            }).then(function (found) {
                should.exist(found);
                found.attributes.name.should.equal(firstUser.attributes.name);

                done();
            }).catch(done);
        });

        it('can findOne by role name', function () {
            return testUtils.fixtures.createExtraUsers().then(function () {
                return Promise.join(UserModel.findOne({role: 'Owner'}), UserModel.findOne({role: 'Editor'}));
            }).then(function (results) {
                var owner = results[0],
                    editor = results[1];

                should.exist(owner);
                should.exist(editor);

                owner = owner.toJSON();
                editor = editor.toJSON();

                should.exist(owner.roles);
                should.exist(editor.roles);

                owner.roles[0].name.should.equal('Owner');
                editor.roles[0].name.should.equal('Editor');
            });
        });

        it('can invite user', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4];

            UserModel.add(_.extend({}, userData, {status: 'invited'}), context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.password.should.not.equal(userData.password, 'password was hashed');
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');

                Object.keys(eventsTriggered).length.should.eql(1);
                should.exist(eventsTriggered['user.added']);

                done();
            }).catch(done);
        });

        it('can add active user', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4];

            RoleModel.findOne().then(function (role) {
                userData.roles = [role.toJSON()];

                return UserModel.add(userData, _.extend({}, context, {include: ['roles']}));
            }).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.get('password').should.not.equal(userData.password, 'password was hashed');
                createdUser.get('email').should.eql(userData.email, 'email address correct');
                createdUser.related('roles').toJSON()[0].name.should.eql('Administrator', 'role set correctly');

                Object.keys(eventsTriggered).length.should.eql(2);
                should.exist(eventsTriggered['user.added']);
                should.exist(eventsTriggered['user.activated']);

                done();
            }).catch(done);
        });

        it('can NOT add active user with invalid email address', function (done) {
            var userData = _.clone(testUtils.DataGenerator.forModel.users[4]);

            userData.email = 'invalidemailaddress';

            RoleModel.findOne().then(function (role) {
                userData.roles = [role.toJSON()];

                return UserModel.add(userData, _.extend({}, context, {include: ['roles']}));
            }).then(function () {
                done(new Error('User was created with an invalid email address'));
            }).catch(function () {
                done();
            });
        });

        it('can edit active user', function (done) {
            var firstUser = testUtils.DataGenerator.Content.users[0].id;

            UserModel.findOne({id: firstUser}).then(function (results) {
                var user;
                should.exist(results);
                user = results.toJSON();
                user.id.should.equal(firstUser);
                should.equal(user.website, null);

                return UserModel.edit({website: 'http://some.newurl.com'}, {id: firstUser});
            }).then(function (edited) {
                should.exist(edited);
                edited.attributes.website.should.equal('http://some.newurl.com');

                Object.keys(eventsTriggered).length.should.eql(2);
                should.exist(eventsTriggered['user.activated.edited']);
                should.exist(eventsTriggered['user.edited']);

                done();
            }).catch(done);
        });

        it('can NOT set an invalid email address', function (done) {
            var firstUser = testUtils.DataGenerator.Content.users[0].id;

            UserModel.findOne({id: firstUser}).then(function (user) {
                return user.edit({email: 'notanemailaddress'});
            }).then(function () {
                done(new Error('Invalid email address was accepted'));
            }).catch(function () {
                done();
            });
        });

        it('can NOT set an already existing email address', function (done) {
            var firstUser = testUtils.DataGenerator.Content.users[0],
                secondUser = testUtils.DataGenerator.Content.users[1];

            UserModel.edit({email: secondUser.email}, {id: firstUser.id})
                .then(function () {
                    done(new Error('Already existing email address was accepted'));
                })
                .catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
        });

        it('can edit invited user', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4],
                userId;

            UserModel.add(_.extend({}, userData, {status: 'invited'}), context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.password.should.not.equal(userData.password, 'password was hashed');
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');
                createdUser.attributes.status.should.equal('invited');

                userId = createdUser.attributes.id;

                Object.keys(eventsTriggered).length.should.eql(1);
                should.exist(eventsTriggered['user.added']);

                return UserModel.edit({website: 'http://some.newurl.com'}, {id: userId});
            }).then(function (createdUser) {
                createdUser.attributes.status.should.equal('invited');

                Object.keys(eventsTriggered).length.should.eql(2);
                should.exist(eventsTriggered['user.edited']);

                done();
            }).catch(done);
        });

        it('can activate invited user', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4],
                userId;

            UserModel.add(_.extend({}, userData, {status: 'invited'}), context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.password.should.not.equal(userData.password, 'password was hashed');
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');
                createdUser.attributes.status.should.equal('invited');

                userId = createdUser.attributes.id;

                Object.keys(eventsTriggered).length.should.eql(1);
                should.exist(eventsTriggered['user.added']);

                return UserModel.edit({status: 'active'}, {id: userId});
            }).then(function (createdUser) {
                createdUser.attributes.status.should.equal('active');

                Object.keys(eventsTriggered).length.should.eql(3);
                should.exist(eventsTriggered['user.activated']);
                should.exist(eventsTriggered['user.edited']);

                done();
            }).catch(done);
        });

        it('can destroy active user', function (done) {
            var firstUser = {id: testUtils.DataGenerator.Content.users[0].id};

            // Test that we have the user we expect
            UserModel.findOne(firstUser).then(function (results) {
                var user;
                should.exist(results);
                user = results.toJSON();
                user.id.should.equal(firstUser.id);

                // Destroy the user
                return UserModel.destroy(firstUser);
            }).then(function (response) {
                response.toJSON().should.be.empty();

                Object.keys(eventsTriggered).length.should.eql(2);
                should.exist(eventsTriggered['user.deactivated']);
                should.exist(eventsTriggered['user.deleted']);

                // Double check we can't find the user again
                return UserModel.findOne(firstUser);
            }).then(function (newResults) {
                should.equal(newResults, null);

                done();
            }).catch(done);
        });

        it('can destroy invited user', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4],
                userId;

            UserModel.add(_.extend({}, userData, {status: 'invited'}), context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.password.should.not.equal(userData.password, 'password was hashed');
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');
                createdUser.attributes.status.should.equal('invited');

                userId = {id: createdUser.attributes.id};

                Object.keys(eventsTriggered).length.should.eql(1);
                should.exist(eventsTriggered['user.added']);

                // Destroy the user
                return UserModel.destroy(userId);
            }).then(function (response) {
                response.toJSON().should.be.empty();

                Object.keys(eventsTriggered).length.should.eql(2);
                should.exist(eventsTriggered['user.deleted']);

                // Double check we can't find the user again
                return UserModel.findOne(userId);
            }).then(function (newResults) {
                should.equal(newResults, null);

                done();
            }).catch(done);
        });
    });

    describe('Password change', function () {
        beforeEach(testUtils.setup('users:roles'));

        describe('error', function () {
            it('wrong old password', function (done) {
                UserModel.changePassword({
                    newPassword: '1234567890',
                    ne2Password: '1234567890',
                    oldPassword: '123456789',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('too short password', function (done) {
                UserModel.changePassword({
                    newPassword: '12345678',
                    ne2Password: '12345678',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('very bad password', function (done) {
                UserModel.changePassword({
                    newPassword: '1234567890',
                    ne2Password: '1234567890',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('password matches users email adress', function (done) {
                UserModel.changePassword({
                    newPassword: 'jbloggs@example.com',
                    ne2Password: 'jbloggs@example.com',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('password contains words "ghost" or "password"', function (done) {
                UserModel.changePassword({
                    newPassword: 'onepassword',
                    ne2Password: 'onepassword',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('password matches blog URL', function (done) {
                UserModel.changePassword({
                    newPassword: '127.0.0.1:2369',
                    ne2Password: '127.0.0.1:2369',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('password contains repeating chars', function (done) {
                UserModel.changePassword({
                    newPassword: 'cdcdcdcdcd',
                    ne2Password: 'cdcdcdcdcd',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });

            it('password contains repeating numbers', function (done) {
                UserModel.changePassword({
                    newPassword: '1231111111',
                    ne2Password: '1231111111',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function () {
                    done(new Error('expected error!'));
                }).catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });
        });

        describe('success', function () {
            it('can change password', function (done) {
                UserModel.changePassword({
                    newPassword: 'thisissupersafe',
                    ne2Password: 'thisissupersafe',
                    oldPassword: 'Sl1m3rson99',
                    user_id: testUtils.DataGenerator.Content.users[0].id
                }, testUtils.context.owner).then(function (user) {
                    user.get('password').should.not.eql('thisissupersafe');
                    done();
                }).catch(done);
            });
        });
    });

    describe('User setup', function () {
        beforeEach(testUtils.setup('owner'));

        it('setup user', function (done) {
            var userData = {
                name: 'Max Mustermann',
                email: 'test@ghost.org',
                password: 'thisissupersafe'
            };

            UserModel.setup(userData, {id: 1})
                .then(function (user) {
                    user.get('name').should.eql(userData.name);
                    user.get('email').should.eql(userData.email);
                    user.get('slug').should.eql('max');

                    // naive check that password was hashed
                    user.get('password').should.not.eql(userData.password);
                    done();
                })
                .catch(done);
        });
    });

    describe('User Login', function () {
        beforeEach(testUtils.setup('owner'));

        it('gets the correct validations when entering an invalid password', function () {
            var object = {email: 'jbloggs@example.com', password: 'wrong'};

            function userWasLoggedIn() {
                throw new Error('User should not have been logged in.');
            }

            return UserModel.check(object).then(userWasLoggedIn)
                .catch(function checkError(error) {
                    should.exist(error);
                    error.errorType.should.equal('ValidationError');
                });
        });
    });
});
