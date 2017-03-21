var should = require('should'),
    testUtils = require('../../utils'),

    // Stuff we are testing
    AppSettingModel = require('../../../server/models/app-setting').AppSetting,
    context = testUtils.context.admin;

describe('App Setting Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('app_setting'));

    before(function () {
        should.exist(AppSettingModel);
    });

    it('can findAll', function (done) {
        AppSettingModel.findAll().then(function (results) {
            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).catch(done);
    });

    it('can findOne', function (done) {
        AppSettingModel.findOne({id: testUtils.DataGenerator.Content.app_settings[0].id}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            foundAppSetting.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        AppSettingModel.findOne({id: testUtils.DataGenerator.Content.app_settings[0].id}).then(function (foundAppSetting) {
            should.exist(foundAppSetting);

            return foundAppSetting.set({value: '350'}).save(null, context);
        }).then(function () {
            return AppSettingModel.findOne({id: testUtils.DataGenerator.Content.app_settings[0].id});
        }).then(function (updatedAppSetting) {
            should.exist(updatedAppSetting);

            updatedAppSetting.get('value').should.equal('350');

            done();
        }).catch(done);
    });
});
