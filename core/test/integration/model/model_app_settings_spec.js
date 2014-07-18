/*globals describe, before, beforeEach, afterEach, after, it*/
var testUtils = require('../../utils'),
    should = require('should'),

    // Stuff we are testing
    Models = require('../../../server/models'),
    context = {context: {user: 1}};

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

            foundAppSetting.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        AppSettingModel.findOne({id: 1}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            return foundAppSetting.set({value: '350'}).save(null, context);
        }).then(function () {
            return AppSettingModel.findOne({id: 1});
        }).then(function (updatedAppSetting) {
            should.exist(updatedAppSetting);

            updatedAppSetting.get('value').should.equal('350');

            done();
        }).catch(done);
    });
});
