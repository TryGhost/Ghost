/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var testUtils       = require('../../utils'),
    should          = require('should'),

    // Stuff we are testing
    AppFieldsModel  = require('../../../server/models/app-field').AppField,
    context         = testUtils.context.admin;

describe('App Fields Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('app_field'));

    before(function () {
        should.exist(AppFieldsModel);
    });

    it('can findAll', function (done) {
        AppFieldsModel.findAll().then(function (results) {
            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).catch(done);
    });

    it('can findOne', function (done) {
        AppFieldsModel.findOne({id: 1}).then(function (foundAppField) {
            should.exist(foundAppField);

            foundAppField.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        AppFieldsModel.findOne({id: 1}).then(function (foundAppField) {
            should.exist(foundAppField);

            return foundAppField.set({value: '350'}).save(null, context);
        }).then(function () {
            return AppFieldsModel.findOne({id: 1});
        }).then(function (updatedAppField) {
            should.exist(updatedAppField);

            updatedAppField.get('value').should.equal('350');

            done();
        }).catch(done);
    });
});
