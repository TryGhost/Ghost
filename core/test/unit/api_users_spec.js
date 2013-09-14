/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    when = require('when'),
    _ = require('underscore'),
    errors = require('../../server/errorHandling'),

    // Stuff we are testing
    Models = require('../../server/models');


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
            this.timeout(5000);
            testUtils.initData().then(function () {
                done();
            }, done);
        });

        it('can add first', function (done) {
            var userData = {
                    name: 'test',
                    password: 'testpass1',
                    email: "test@test1.com"
                };

            UserModel.add(userData).then(function (createdUser) {
                should.exist(createdUser);
                createdUser.has('uuid').should.equal(true);
                createdUser.attributes.password.should.not.equal(userData.password, "password was hashed");
                createdUser.attributes.email.should.eql(userData.email, "email address correct");

                done();
            }).then(null, done);
        });
    });

    describe('Basic Operations', function () {

        beforeEach(function (done) {
            this.timeout(5000);
            testUtils.initData()
                .then(function () {
                    return when(testUtils.insertDefaultUser());
                })
                .then(function () {
                    done();
                }, done);
        });

        it('can\'t add second', function (done) {
            var userData = {
                name: 'test',
                password: 'testpass3',
                email: "test3@test1.com"
            };

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
    });

});