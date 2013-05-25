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
            settings.browse(function (err, results) {
                if (err) { throw err; }

                should.exist(results);

                results.length.should.be.above(0);

                done();
            });
        });

        it('can read', function (done) {
            var firstSetting;

            settings.browse(function (err, results) {
                if (err) { throw err; }

                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                settings.read(firstSetting.attributes.key, function (err, found) {
                    if (err) { throw err; }

                    should.exist(found);

                    found.attributes.value.should.equal(firstSetting.attributes.value);

                    done();
                });

            });
        });

        it('can edit single', function (done) {
            var firstPost,
                toEdit = {};

            settings.browse(function (err, results) {
                if (err) { throw err; }

                should.exist(results);

                results.length.should.be.above(0);

                firstPost = results.models[0];

                // The edit method has been modified to take an object of 
                // key/value pairs
                toEdit[firstPost.attributes.key] = "new value";

                settings.edit(toEdit, function (err, edited) {
                    if (err) { throw err; }

                    should.exist(edited);

                    edited.length.should.equal(1);

                    edited = edited[0];

                    edited.attributes.key.should.equal(firstPost.attributes.key);
                    edited.attributes.value.should.equal('new value');

                    done();
                });

            });
        });

        it('can edit multiple', function (done) {
            var firstPost,
                secondPost,
                editedPost,
                toEdit = {};

            settings.browse(function (err, results) {
                if (err) { throw err; }

                should.exist(results);

                results.length.should.be.above(0);

                firstPost = results.models[0];
                secondPost = results.models[1];

                // The edit method has been modified to take an object of 
                // key/value pairs
                toEdit[firstPost.attributes.key] = "new value1";
                toEdit[secondPost.attributes.key] = "new value2";

                settings.edit(toEdit, function (err, edited) {
                    if (err) { throw err; }

                    should.exist(edited);

                    edited.length.should.equal(2);

                    editedPost = edited[0];

                    editedPost.attributes.key.should.equal(firstPost.attributes.key);
                    editedPost.attributes.value.should.equal('new value1');

                    editedPost = edited[1];

                    editedPost.attributes.key.should.equal(secondPost.attributes.key);
                    editedPost.attributes.value.should.equal('new value2');

                    done();
                });

            });
        });

        it('can add', function (done) {
            var newSetting = {
                key: 'TestSetting1',
                value: 'Test Content 1'
            };

            settings.add(newSetting, function (err, createdSetting) {
                if (err) { throw err; }

                should.exist(createdSetting);

                createdSetting.attributes.key.should.equal(newSetting.key, "key is correct");
                createdSetting.attributes.value.should.equal(newSetting.value, "value is correct");

                done();
            });
        });

        it('can delete', function (done) {
            var firstSettingId,
                ids,
                hasDeletedId;

            settings.browse(function (err, results) {
                if (err) { throw err; }

                should.exist(results);

                results.length.should.be.above(0);

                firstSettingId = results.models[0].id;

                settings.destroy(firstSettingId, function (err) {
                    if (err) { throw err; }

                    settings.browse(function (err, newResults) {
                        if (err) { throw err; }

                        ids = _.pluck(newResults.models, "id");

                        hasDeletedId = _.any(ids, function (id) {
                            return id === firstSettingId;
                        });

                        hasDeletedId.should.equal(false);

                        done();
                    });
                });
            });
        });
    });
}());