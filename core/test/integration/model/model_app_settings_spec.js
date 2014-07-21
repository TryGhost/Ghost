/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var testUtils       = require('../../utils'),
    should          = require('should'),

    // Stuff we are testing
    AppSettingModel = require('../../../server/models').AppSetting,
    context         = {context: {user: 1}};

describe('App Setting Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertAppWithSettings();
            })
            .then(function () {
                done();
            }).catch(done);
    });

    should.exist(AppSettingModel);

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
