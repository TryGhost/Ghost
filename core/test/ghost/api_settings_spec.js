/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var _ = require("underscore"),
        should = require('should'),
        helpers = require('./helpers'),
        SettingProvider = require('../../shared/models/dataProvider.bookshelf.settings');

    describe('Bookshelf SettingsProvider', function () {

        var settings;

        beforeEach(function (done) {
            helpers.resetData().then(function () {
                settings = new SettingProvider();
                done();
            });
        });

        it('can browse', function (done) {
            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                done();
            }, done);
        });

        it('can read', function (done) {
            var firstSetting;

            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                return settings.read(firstSetting.attributes.key);

            }).then(function (found) {

                should.exist(found);

                found.attributes.value.should.equal(firstSetting.attributes.value);

                done();

            }, done);
        });

        it('can edit single', function (done) {
            var firstPost,
                toEdit = {};

            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstPost = results.models[0];

                // The edit method has been modified to take an object of
                // key/value pairs
                toEdit[firstPost.attributes.key] = "new value";

                return settings.edit(toEdit);

            }).then(function (edited) {

                should.exist(edited);

                edited.length.should.equal(1);

                edited = edited[0];

                edited.attributes.key.should.equal(firstPost.attributes.key);
                edited.attributes.value.should.equal('new value');

                done();

            }, done);
        });

        it('can edit multiple', function (done) {
            var firstPost,
                secondPost,
                editedPost,
                toEdit = {};

            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstPost = results.models[0];
                secondPost = results.models[1];

                // The edit method has been modified to take an object of
                // key/value pairs
                toEdit[firstPost.attributes.key] = "new value1";
                toEdit[secondPost.attributes.key] = "new value2";

                return settings.edit(toEdit);

            }).then(function (edited) {

                should.exist(edited);

                edited.length.should.equal(2);

                editedPost = edited[0];

                editedPost.attributes.key.should.equal(firstPost.attributes.key);
                editedPost.attributes.value.should.equal('new value1');

                editedPost = edited[1];

                editedPost.attributes.key.should.equal(secondPost.attributes.key);
                editedPost.attributes.value.should.equal('new value2');

                done();

            }, done);
        });

        it('can add', function (done) {
            var newSetting = {
                key: 'TestSetting1',
                value: 'Test Content 1'
            };

            settings.add(newSetting).then(function (createdSetting) {

                should.exist(createdSetting);

                createdSetting.attributes.key.should.equal(newSetting.key, "key is correct");
                createdSetting.attributes.value.should.equal(newSetting.value, "value is correct");

                done();
            }, done);
        });

        it('can delete', function (done) {
            var firstSettingId;

            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSettingId = results.models[0].id;

                return settings.destroy(firstSettingId);

            }).then(function () {

                return settings.browse();

            }).then(function (newResults) {

                var ids, hasDeletedId;

                ids = _.pluck(newResults.models, "id");

                hasDeletedId = _.any(ids, function (id) {
                    return id === firstSettingId;
                });

                hasDeletedId.should.equal(false);

                done();

            }, done);
        });
    });
}());