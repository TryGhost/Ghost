/*globals describe, beforeEach, it*/

(function () {
    "use strict";

    var _ = require("underscore"),
        should = require('should'),
        helpers = require('./helpers'),
        Models = require('../../shared/models');

    describe('Settings Model', function () {

        var SettingsModel = Models.Settings;

        beforeEach(function (done) {
            helpers.resetData().then(function () {
                done();
            }, done);
        });

        it('can browse', function (done) {
            SettingsModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                done();
            }).then(null, done);
        });

        it('can read', function (done) {
            var firstSetting;

            SettingsModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                return SettingsModel.read(firstSetting.attributes.key);

            }).then(function (found) {

                should.exist(found);

                found.attributes.value.should.equal(firstSetting.attributes.value);

                done();

            }).then(null, done);
        });

        it('can edit single', function (done) {
            var firstSetting;

            SettingsModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                // The edit method has been modified to take an object of
                // key/value pairs
                firstSetting.set('value', 'new value');

                return SettingsModel.edit(firstSetting);

            }).then(function (edited) {

                should.exist(edited);

                edited.length.should.equal(1);

                edited = edited[0];

                edited.attributes.key.should.equal(firstSetting.attributes.key);
                edited.attributes.value.should.equal('new value');

                done();

            }).then(null, done);
        });

        it('can edit multiple', function (done) {
            var model1,
                model2,
                editedModel;

            SettingsModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                model1 = results.models[0];
                model2 = results.models[1];

                // The edit method has been modified to take an object of
                // key/value pairs
                model1.set('value', 'new value1');
                model2.set('value', 'new value2');

                return SettingsModel.edit([model1, model2]);

            }).then(function (edited) {

                should.exist(edited);

                edited.length.should.equal(2);

                editedModel = edited[0];

                editedModel.attributes.key.should.equal(model1.attributes.key);
                editedModel.attributes.value.should.equal('new value1');

                editedModel = edited[1];

                editedModel.attributes.key.should.equal(model2.attributes.key);
                editedModel.attributes.value.should.equal('new value2');

                done();

            }).then(null, done);
        });

        it('can add', function (done) {
            var newSetting = {
                key: 'TestSetting1',
                value: 'Test Content 1'
            };

            SettingsModel.add(newSetting).then(function (createdSetting) {

                should.exist(createdSetting);
                createdSetting.has('uuid').should.equal(true);
                createdSetting.attributes.key.should.equal(newSetting.key, "key is correct");
                createdSetting.attributes.value.should.equal(newSetting.value, "value is correct");

                done();
            }).then(null, done);
        });

        it('can delete', function (done) {
            var firstSettingId;

            SettingsModel.browse().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSettingId = results.models[0].id;

                return SettingsModel.destroy(firstSettingId);

            }).then(function () {

                return SettingsModel.browse();

            }).then(function (newResults) {

                var ids, hasDeletedId;

                ids = _.pluck(newResults.models, "id");

                hasDeletedId = _.any(ids, function (id) {
                    return id === firstSettingId;
                });

                hasDeletedId.should.equal(false);

                done();

            }).then(null, done);
        });
    });
}());