/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require("lodash"),

    // Stuff we are testing
    Models = require('../../../server/models'),
    knex = require('../../../server/models/base').knex;

describe('App Setting Model', function () {

    var AppSettingModel = Models.AppSetting;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertAppWithSettings();
            })
            .then(function () {
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

    it('can findAll', function (done) {
        AppSettingModel.findAll().then(function (results) {

            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).catch(done);
    });

    it('can findOne', function (done) {
        AppSettingModel.findOne({id: 1}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        AppSettingModel.findOne({id: 1}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            return foundAppSetting.set({value: "350"}).save();
        }).then(function () {
            return AppSettingModel.findOne({id: 1});
        }).then(function (updatedAppSetting) {
            should.exist(updatedAppSetting);

            updatedAppSetting.get("value").should.equal("350");

            done();
        }).catch(done);
    });
});
