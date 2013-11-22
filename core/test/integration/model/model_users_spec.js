/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    should = require('should'),
    when = require('when'),
    _ = require('underscore'),
    errors = require('../../../server/errorHandling'),
    sinon = require('sinon'),
    uuid = require('node-uuid'),

    // Stuff we are testing
    Models = require('../../../server/models');


describe('User Model', function run() {
    var UserModel = Models.User;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    describe('Registration', function runRegistration() {
        beforeEach(function (done) {
            testUtils.initData().then(function () {
                done();
            }, done);
        });

        it('can add first', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[0],
                gravatarStub =  sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    return when.resolve(userData);
                });

            UserModel.add(userData).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.password.should.not.equal(userData.password, "password was hashed");
                createdUser.attributes.email.should.eql(userData.email, "email address correct");
                gravatarStub.restore();
                done();
            }).then(null, done);
        });

        it('can lowercase email', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[2],
                gravatarStub =  sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    return when.resolve(userData);
                });

            UserModel.add(userData).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.email.should.eql(userData.email.toLocaleLowerCase(), "email address correct");
                gravatarStub.restore();
                done();
            }).then(null, done);
        });

        it('can find gravatar', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[4],
                gravatarStub = sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    userData.image = 'http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404'
                    return when.resolve(userData);
                });

            UserModel.add(userData).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.image.should.eql('http://www.gravatar.com/avatar/2fab21a4c4ed88e76add10650c73bae1?d=404', 'Gravatar found');
                gravatarStub.restore();
                done();
            }).then(null, done);
        });

        it('can handle no gravatar', function(done) {
            var userData = testUtils.DataGenerator.forModel.users[0],
                gravatarStub = sinon.stub(UserModel, 'gravatarLookup', function (userData) {
                    return when.resolve(userData);
                });

            UserModel.add(userData).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                should.not.exist(createdUser.image);
                gravatarStub.restore();
                done();
            }).then(null, done);
        });
    });

    describe('Basic Operations', function () {

        beforeEach(function (done) {
            testUtils.initData()
                .then(function () {
                    return when(testUtils.insertDefaultUser());
                })
                .then(function () {
                    done();
                }, done);
        });

        it('can\'t add second', function (done) {
            var userData = testUtils.DataGenerator.forModel.users[1];

            return UserModel.add(userData).then(done, function (failure) {
                failure.message.should.eql('A user is already registered. Only one user for now!');
                done();
            }).then(null, done);
        });

        it('can browse', function (done) {

            UserModel.browse().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                done();

            }).then(null, done);
        });

        it('can read', function (done) {
            var firstUser;

            UserModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUser = results.models[0];

                return UserModel.read({email: firstUser.attributes.email});

            }).then(function (found) {

                should.exist(found);

                found.attributes.name.should.equal(firstUser.attributes.name);

                done();

            }).then(null, done);

        });

        it('can edit', function (done) {
            var firstUser;

            UserModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUser = results.models[0];

                return UserModel.edit({id: firstUser.id, website: "some.newurl.com"});

            }).then(function (edited) {

                should.exist(edited);

                edited.attributes.website.should.equal('some.newurl.com');

                done();

            }).then(null, done);
        });

        it("can get effective permissions", function (done) {
            UserModel.effectivePermissions(1).then(function (effectivePermissions) {
                should.exist(effectivePermissions);

                effectivePermissions.length.should.be.above(0);

                done();
            }).then(null, done);
        });

        it('can delete', function (done) {
            var firstUserId;

            UserModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUserId = results.models[0].id;

                return UserModel.destroy(firstUserId);

            }).then(function () {

                return UserModel.browse();

            }).then(function (newResults) {
                var ids, hasDeletedId;

                if (newResults.length < 1) {
                    // Bug out if we only had one user and deleted it.
                    return done();
                }

                ids = _.pluck(newResults.models, "id");
                hasDeletedId = _.any(ids, function (id) {
                    return id === firstUserId;
                });

                hasDeletedId.should.equal(false);
                done();

            }).then(null, done);
        });

        it('can generate reset token', function (done) {
            // Expires in one minute
            var expires = Date.now() + 60000,
                dbHash = uuid.v4();

            UserModel.browse().then(function (results) {

                return UserModel.generateResetToken(results.models[0].attributes.email, expires, dbHash);

            }).then(function (token) {
                should.exist(token);

                token.length.should.be.above(0);

                done();
            }).then(null, done);
        });

        it('can validate a reset token', function (done) {
            // Expires in one minute
            var expires = Date.now() + 60000,
                dbHash = uuid.v4();

            UserModel.browse().then(function (results) {

                return UserModel.generateResetToken(results.models[0].attributes.email, expires, dbHash);

            }).then(function (token) {
                
                return UserModel.validateToken(token, dbHash);

            }).then(function () {

                done();

            }).then(null, done);
        });

        it('can reset a password with a valid token', function (done) {
            // Expires in one minute
            var origPassword,
                expires = Date.now() + 60000,
                dbHash = uuid.v4();

            UserModel.browse().then(function (results) {

                var firstUser = results.models[0],
                    origPassword = firstUser.attributes.password;

                should.exist(origPassword);

                return UserModel.generateResetToken(firstUser.attributes.email, expires, dbHash);

            }).then(function (token) {
                
                return UserModel.resetPassword(token, 'newpassword', 'newpassword', dbHash);

            }).then(function (resetUser) {
                var resetPassword = resetUser.get('password');

                should.exist(resetPassword);

                resetPassword.should.not.equal(origPassword);

                done();
            }).then(null, done);
        });

        it('doesn\'t allow expired timestamp tokens', function (done) {
            var email,
                // Expired one minute ago
                expires = Date.now() - 60000,
                dbHash = uuid.v4();

            UserModel.browse().then(function (results) {

                // Store email for later
                email = results.models[0].attributes.email;

                return UserModel.generateResetToken(email, expires, dbHash);

            }).then(function (token) {
                return UserModel.validateToken(token, dbHash);
            }).then(function () {
                throw new Error("Allowed expired token");
            }, function (err) {

                should.exist(err);

                err.message.should.equal("Expired token");

                done();
            });
        });

        it('doesn\'t allow tampered timestamp tokens', function (done) {
            // Expired one minute ago
            var expires = Date.now() - 60000,
                dbHash = uuid.v4();

            UserModel.browse().then(function (results) {

                return UserModel.generateResetToken(results.models[0].attributes.email, expires, dbHash);

            }).then(function (token) {
                
                var tokenText = new Buffer(token, 'base64').toString('ascii'),
                    parts = tokenText.split('|'),
                    fakeExpires,
                    fakeToken;

                fakeExpires = Date.now() + 60000;

                fakeToken = [String(fakeExpires), parts[1], parts[2]].join('|');
                fakeToken = new Buffer(fakeToken).toString('base64');

                return UserModel.validateToken(fakeToken, dbHash);
                
            }).then(function () {
                throw new Error("allowed invalid token");
            }, function (err) {

                should.exist(err);

                err.message.should.equal("Invalid token");

                done();
            });
        });
    });

});
