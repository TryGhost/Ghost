/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require("lodash"),

    // Stuff we are testing
    Models = require('../../../server/models'),
    knex = require('../../../server/models/base').knex;

describe('App Fields Model', function () {

    var AppFieldsModel = Models.AppField;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertApps();
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
        AppFieldsModel.findAll().then(function (results) {

            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).catch(done);
    });

    it('can findOne', function (done) {
        AppFieldsModel.findOne({id: 1}).then(function (foundAppField) {
            should.exist(foundAppField);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        AppFieldsModel.findOne({id: 1}).then(function (foundAppField) {
            should.exist(foundAppField);

            return foundAppField.set({value: "350"}).save();
        }).then(function () {
            return AppFieldsModel.findOne({id: 1});
        }).then(function (updatedAppField) {
            should.exist(updatedAppField);

            updatedAppField.get("value").should.equal("350");

            done();
        }).catch(done);
    });
});
