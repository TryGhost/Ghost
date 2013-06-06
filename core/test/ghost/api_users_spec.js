/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var _ = require('underscore'),
        should = require('should'),
        helpers = require('./helpers'),
        errors = require('../../shared/errorHandling'),
        Models = require('../../shared/models');

    describe('User Model', function () {

        var UserModel = Models.User;

        beforeEach(function (done) {
            helpers.resetData().then(function () {
                done();
            }, done);
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

                return UserModel.read({email_address: firstUser.attributes.email_address});

            }).then(function (found) {

                should.exist(found);

                found.attributes.full_name.should.equal(firstUser.attributes.full_name);

                done();

            }).then(null, done);

        });

        it('can edit', function (done) {
            var firstUser;

            UserModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUser = results.models[0];

                return UserModel.edit({id: firstUser.id, url: "some.newurl.com"});

            }).then(function (edited) {

                should.exist(edited);

                edited.attributes.url.should.equal('some.newurl.com');

                done();

            }).then(null, done);
        });

        it('can add', function (done) {
            var userData = {
                password: 'testpass1',
                email_address: "test@test1.com"
            };

            UserModel.add(userData).then(function (createdUser) {

                should.exist(createdUser);

                createdUser.attributes.password.should.not.equal(userData.password, "password was hashed");
                createdUser.attributes.email_address.should.eql(userData.email_address, "email address corred");

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

        it("can get effective permissions", function (done) {
            UserModel.effectivePermissions(1).then(function (effectivePermissions) {
                should.exist(effectivePermissions);

                effectivePermissions.length.should.be.above(0);

                done();
            }, errors.logError);
        });
    });

}());