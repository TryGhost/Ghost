/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    _ = require("underscore"),

    // Stuff we are testing
    Models = require('../../server/models'),
    knex = require('../../server/models/base').Knex;

describe('Settings Model', function () {

    var SettingsModel = Models.Settings;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
        testUtils.initData().then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    describe('API', function () {

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

                firstSetting = results.models[1];

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

                model1 = results.models[1];
                model2 = results.models[2];

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
                createdSetting.attributes.type.should.equal("core");

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

    describe('populating defaults from settings.json', function (done) {

        beforeEach(function (done) {
            knex('settings').truncate().then(function () {
                done();
            });
        });

        it('populates any unset settings from the JSON defaults', function (done) {
            SettingsModel.findAll().then(function (allSettings) {
                console.log(allSettings.models)
                allSettings.length.should.equal(0);
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.findAll();
            }).then(function (allSettings) {
                allSettings.length.should.be.above(0);
                return SettingsModel.read('description');
            }).then(function (descriptionSetting) {
                // Testing against the actual value in default-settings.json feels icky,
                // but it's easier to fix the test if that ever changes than to mock out that behaviour
                descriptionSetting.get('value').should.equal('Just a blogging platform.');
                done();
            }).then(null, done);
        });

        it('doesn\'t overwrite any existing settings', function (done) {
            SettingsModel.edit({key: 'description', value: 'Adam\'s Blog'}).then(function () {
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.read('description');
            }).then(function (descriptionSetting) {
                descriptionSetting.get('value').should.equal('Adam\'s Blog');
                done();
            }).then(null, done);
        });
    });

});
