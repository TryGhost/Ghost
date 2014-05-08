/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require("lodash"),

    // Stuff we are testing
    Models = require('../../../server/models'),
    knex = require('../../../server/models/base').knex;

describe('Settings Model', function () {

    var SettingsModel = Models.Settings;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('API', function () {

        it('can findAll', function (done) {
            SettingsModel.findAll().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                done();
            }).catch(done);
        });

        it('can findOne', function (done) {
            var firstSetting;

            SettingsModel.findAll().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                return SettingsModel.findOne(firstSetting.attributes.key);

            }).then(function (found) {

                should.exist(found);

                found.get('value').should.equal(firstSetting.attributes.value);

                done();

            }).catch(done);
        });

        it('can edit single', function (done) {

            SettingsModel.findAll().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                return SettingsModel.edit({key: "description", value: "new value"});

            }).then(function (edited) {

                should.exist(edited);

                edited.length.should.equal(1);

                edited = edited[0];

                edited.attributes.key.should.equal('description');
                edited.attributes.value.should.equal('new value');

                done();

            }).catch(done);
        });

        it('can edit multiple', function (done) {
            var model1,
                model2,
                editedModel;

            SettingsModel.findAll().then(function (results) {

                should.exist(results);

                results.length.should.be.above(0);

                model1 = {key: "description", value: "another new value"};
                model2 = {key: "title", value: "new title"};

                return SettingsModel.edit([model1, model2]);

            }).then(function (edited) {

                should.exist(edited);

                edited.length.should.equal(2);

                editedModel = edited[0];

                editedModel.attributes.key.should.equal(model1.key);
                editedModel.attributes.value.should.equal(model1.value);

                editedModel = edited[1];

                editedModel.attributes.key.should.equal(model2.key);
                editedModel.attributes.value.should.equal(model2.value);

                done();

            }).catch(done);
        });

        it('can add', function (done) {
            var newSetting = {
                key: 'TestSetting1',
                value: 'Test Content 1'
            };

            SettingsModel.add(newSetting, {user: 1}).then(function (createdSetting) {

                should.exist(createdSetting);
                createdSetting.has('uuid').should.equal(true);
                createdSetting.attributes.key.should.equal(newSetting.key, "key is correct");
                createdSetting.attributes.value.should.equal(newSetting.value, "value is correct");
                createdSetting.attributes.type.should.equal("core");

                done();
            }).catch(done);
        });

        it('can destroy', function (done) {
            // dont't use id 1, since it will delete databaseversion
            var settingToDestroy = {id: 2};

            SettingsModel.findOne(settingToDestroy).then(function (results) {
                should.exist(results);
                results.attributes.id.should.equal(settingToDestroy.id);

                return SettingsModel.destroy(settingToDestroy);
            }).then(function (response) {
                response.toJSON().should.be.empty;

                return SettingsModel.findOne(settingToDestroy);
            }).then(function (newResults) {
                should.equal(newResults, null);

                done();
            }).catch(done);
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
                allSettings.length.should.equal(0);
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.findAll();
            }).then(function (allSettings) {
                allSettings.length.should.be.above(0);

                return SettingsModel.findOne('description');
            }).then(function (descriptionSetting) {
                // Testing against the actual value in default-settings.json feels icky,
                // but it's easier to fix the test if that ever changes than to mock out that behaviour
                descriptionSetting.get('value').should.equal('Just a blogging platform.');
                done();
            }).catch(done);
        });

        it('doesn\'t overwrite any existing settings', function (done) {
            SettingsModel.add({key: 'description', value: 'Adam\'s Blog'}, {user: 1}).then(function () {
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.findOne('description');
            }).then(function (descriptionSetting) {
                descriptionSetting.get('value').should.equal('Adam\'s Blog');
                done();
            }).catch(done);
        });
    });

});
