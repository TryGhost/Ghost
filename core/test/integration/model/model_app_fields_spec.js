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
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertApps();
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
        AppFieldsModel.browse().then(function (results) {

            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).then(null, done);
    });

    it('can read', function (done) {
        AppFieldsModel.read({id: 1}).then(function (foundAppField) {
            should.exist(foundAppField);

            done();
        }).then(null, done);
    });

    it('can edit', function (done) {
        AppFieldsModel.read({id: 1}).then(function (foundAppField) {
            should.exist(foundAppField);

            return foundAppField.set({value: "350"}).save();
        }).then(function () {
            return AppFieldsModel.read({id: 1});
        }).then(function (updatedAppField) {
            should.exist(updatedAppField);

            updatedAppField.get("value").should.equal("350");

            done();
        }).then(null, done);
    });
});
