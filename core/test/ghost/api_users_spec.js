/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var should = require('should'),
        helpers = require('./helpers'),
        UserProvider = require('../../shared/models/dataProvider.bookshelf.users');

    describe('dataProvider.bookshelf', function () {
        describe('UsersProvider', function () {

            var users;

            beforeEach(function (done) {
                helpers.resetData().then(function () {
                    users = new UserProvider();
                    done();
                });
            });

            it('can create', function(done) {
                var userData = {
                    password: 'testpass1',
                    email_address: "test@test1.com"
                };

                users.add(userData, function(err, createdUser) {
                    if (err) {
                        throw err;
                    }

                    should.exist(createdUser);

                    createdUser.attributes.password.should.not.equal(userData.password, "password was hashed");
                    createdUser.attributes.email_address.should.eql(userData.email_address, "email address corred");

                    done();
                });
            });
        });
    });

}());