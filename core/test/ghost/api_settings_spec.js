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
            }, function (error) {
                throw error;
            });
        });

        it('can read', function (done) {
            var firstSetting;

            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                settings.read(firstSetting.attributes.key).then(function (found) {

                    should.exist(found);

                    found.attributes.value.should.equal(firstSetting.attributes.value);

                    done();
                }, function (error) {
                    throw error;
                });

            }, function (error) {
                throw error;
            });
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

                settings.edit(toEdit).then(function (edited) {

                    should.exist(edited);

                    edited.length.should.equal(1);

                    edited = edited[0];

                    edited.attributes.key.should.equal(firstPost.attributes.key);
                    edited.attributes.value.should.equal('new value');

                    done();
                }, function (error) {
                    throw error;
                });

            }, function (error) {
                throw error;
            });
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

                settings.edit(toEdit).then(function (edited) {

                    should.exist(edited);

                    edited.length.should.equal(2);

                    editedPost = edited[0];

                    editedPost.attributes.key.should.equal(firstPost.attributes.key);
                    editedPost.attributes.value.should.equal('new value1');

                    editedPost = edited[1];

                    editedPost.attributes.key.should.equal(secondPost.attributes.key);
                    editedPost.attributes.value.should.equal('new value2');

                    done();
                }, function (error) {
                    throw error;
                });
            }, function (error) {
                throw error;
            });
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
            }, function (error) {
                throw error;
            });
        });

        it('can delete', function (done) {
            var firstSettingId,
                ids,
                hasDeletedId;

            settings.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSettingId = results.models[0].id;

                settings.destroy(firstSettingId).then(function () {

                    settings.browse().then(function (newResults) {

                        ids = _.pluck(newResults.models, "id");

                        hasDeletedId = _.any(ids, function (id) {
                            return id === firstSettingId;
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