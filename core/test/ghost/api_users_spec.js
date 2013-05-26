/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var _ = require('underscore'),
        should = require('should'),
        helpers = require('./helpers'),
        UserProvider = require('../../shared/models/dataProvider.bookshelf.users');

    describe('Bookshelf UsersProvider', function () {

        var users;

        beforeEach(function (done) {
            helpers.resetData().then(function () {
                users = new UserProvider();
                done();
            });
        });

        it('can browse', function (done) {
            users.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                done();
            }, function (error) {
                throw error;
            });
        });

        it('can read', function (done) {
            var firstUser;

            users.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUser = results.models[0];

                users.read({email_address: firstUser.attributes.email_address}).then(function (found) {

                    should.exist(found);

                    found.attributes.username.should.equal(firstUser.attributes.username);

                    done();
                }, function (error) {
                    throw error;
                });

            });
        });

        it('can edit', function (done) {
            var firstUser;

            users.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUser = results.models[0];

                users.edit({id: firstUser.id, url: "some.newurl.com"}).then(function (edited) {

                    should.exist(edited);

                    edited.attributes.url.should.equal('some.newurl.com');

                    done();
                }, function (error) {
                    throw error;
                });
            }, function (error) {
                throw error;
            });
        });

        it('can add', function (done) {
            var userData = {
                password: 'testpass1',
                email_address: "test@test1.com"
            };

            users.add(userData).then(function (createdUser) {

                should.exist(createdUser);

                createdUser.attributes.password.should.not.equal(userData.password, "password was hashed");
                createdUser.attributes.email_address.should.eql(userData.email_address, "email address corred");

                done();
            }, function (error) {
                throw error;
            });
        });

        it('can delete', function (done) {
            var firstUserId,
                ids,
                hasDeletedId;

            users.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstUserId = results.models[0].id;

                users.destroy(firstUserId).then(function () {

                    users.browse().then(function (newResults) {

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
                    }, function (error) {
                        throw error;
                    });
                }, function (error) {
                    throw error;
                });
            }, function (error) {
                throw error;
            });
        });
    });

}());