const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const _ = require('lodash');

// Stuff we are testing
const events = require('../../../core/server/lib/common/events');

const imageLib = require('../../../core/server/lib/image');
const UserModel = require('../../../core/server/models/user').User;
const RoleModel = require('../../../core/server/models/role').Role;
const context = testUtils.context.admin;

describe('User Model', function run() {
    let eventsTriggered = {};

    before(testUtils.teardownDb);
    afterEach(testUtils.teardownDb);
    afterEach(function () {
        sinon.restore();
    });

    before(function () {
        should.exist(UserModel);
    });

    describe('Registration', function runRegistration() {
        beforeEach(testUtils.setup('roles'));

        it('can add first', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.password.should.not.equal(userData.password, 'password was hashed');
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');

                done();
            }).catch(done);
        });

        it('shortens slug if possible', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[2];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('slug').should.equal(true);
                createdUser.attributes.slug.should.equal('jimothy');
                done();
            }).catch(done);
        });

        it('does not short slug if not possible', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[2];

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
            const userData = testUtils.DataGenerator.forModel.users[2];

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.attributes.email.should.eql(userData.email, 'email address correct');
                done();
            }).catch(done);
        });

        it('can find gravatar', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[4];

            sinon.stub(imageLib.gravatar, 'lookup').callsFake(function (data) {
                data.image = 'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404';
                return Promise.resolve(data);
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
            const userData = testUtils.DataGenerator.forModel.users[0];

            sinon.stub(imageLib.gravatar, 'lookup').callsFake(function (data) {
                return Promise.resolve(data);
            });

            UserModel.add(userData, context).then(function (createdUser) {
                should.exist(createdUser);
                should.not.exist(createdUser.image);
                done();
            }).catch(done);
        });

        it('can find by email and is case insensitive', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[2];
            const email = testUtils.DataGenerator.forModel.users[2].email;

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
            sinon.stub(events, 'emit').callsFake(function (eventName, eventObj) {
                if (!eventsTriggered[eventName]) {
                    eventsTriggered[eventName] = [];
                }

                eventsTriggered[eventName].push(eventObj);
            });
        });

        it('sets last login time on successful login', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({email: userData.email, password: userData.password}).then(function (activeUser) {
                should.exist(activeUser.get('last_seen'));
                done();
            }).catch(done);
        });

        it('converts fetched dateTime fields to Date objects', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[0];

            UserModel.check({email: userData.email, password: userData.password}).then(function (user) {
                return UserModel.findOne({id: user.id});
            }).then(function (user) {
                let lastLogin;
                let createdAt;
                let updatedAt;

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

        it('can findPage with limit all', function () {
            return testUtils.fixtures.createExtraUsers().then(function () {
                return UserModel.findPage({limit: 'all'});
            }).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal('all');
                results.meta.pagination.pages.should.equal(1);
                results.data.length.should.equal(9);
            });
        });

        it('can findOne by role name', function () {
            return testUtils.fixtures.createExtraUsers().then(function () {
                return Promise.all([
                    UserModel.findOne({role: 'Owner'}),
                    UserModel.findOne({role: 'Editor'})
                ]);
            }).then(function (results) {
                let owner = results[0];
                let editor = results[1];

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

        it('can add active user', function (done) {
            const userData = testUtils.DataGenerator.forModel.users[4];

            RoleModel.findOne().then(function (role) {
                userData.roles = [role.toJSON()];

                return UserModel.add(userData, _.extend({}, context, {withRelated: ['roles']}));
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
            const userData = _.clone(testUtils.DataGenerator.forModel.users[4]);

            userData.email = 'invalidemailaddress';

            RoleModel.findOne().then(function (role) {
                userData.roles = [role.toJSON()];

                return UserModel.add(userData, _.extend({}, context, {withRelated: ['roles']}));
            }).then(function () {
                done(new Error('User was created with an invalid email address'));
            }).catch(function () {
                done();
            });
        });

        it('can edit active user', function (done) {
            const firstUser = testUtils.DataGenerator.Content.users[0].id;

            UserModel.findOne({id: firstUser}).then(function (results) {
                let user;
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
            const firstUser = testUtils.DataGenerator.Content.users[0].id;

            UserModel.findOne({id: firstUser}).then(function (user) {
                return user.edit({email: 'notanemailaddress'});
            }).then(function () {
                done(new Error('Invalid email address was accepted'));
            }).catch(function () {
                done();
            });
        });

        it('can NOT set an already existing email address', function (done) {
            const firstUser = testUtils.DataGenerator.Content.users[0];
            const secondUser = testUtils.DataGenerator.Content.users[1];

            UserModel.edit({email: secondUser.email}, {id: firstUser.id})
                .then(function () {
                    done(new Error('Already existing email address was accepted'));
                })
                .catch(function (err) {
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
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
    });

    describe('User setup', function () {
        beforeEach(testUtils.setup('owner'));

        it('setup user', function (done) {
            const userData = {
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
});
