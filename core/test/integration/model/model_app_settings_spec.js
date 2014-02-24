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
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertAppWithSettings();
            })
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can browse', function (done) {
        AppSettingModel.browse().then(function (results) {

            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).then(null, done);
    });

    it('can read', function (done) {
        AppSettingModel.read({id: 1}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            done();
        }).then(null, done);
    });

    it('can edit', function (done) {
        AppSettingModel.read({id: 1}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            return foundAppSetting.set({value: "350"}).save();
        }).then(function () {
            return AppSettingModel.read({id: 1});
        }).then(function (updatedAppSetting) {
            should.exist(updatedAppSetting);

            updatedAppSetting.get("value").should.equal("350");

            done();
        }).then(null, done);
    });
});
