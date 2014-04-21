/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require("lodash"),

    // Stuff we are testing
    Models = require('../../../server/models'),
    knex = require('../../../server/models/base').knex;

describe('App Model', function () {

    var AppModel = Models.App;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultApp();
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
        AppModel.browse().then(function (results) {

            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).then(null, done);
    });

    it('can read', function (done) {
        AppModel.read({id: 1}).then(function (foundApp) {
            should.exist(foundApp);

            done();
        }).then(null, done);
    });

    it('can edit', function (done) {
        AppModel.read({id: 1}).then(function (foundApp) {
            should.exist(foundApp);

            return foundApp.set({name: "New App"}).save();
        }).then(function () {
            return AppModel.read({id: 1});
        }).then(function (updatedApp) {
            should.exist(updatedApp);

            updatedApp.get("name").should.equal("New App");

            done();
        }).then(null, done);
    });

    it("can add", function (done) {
        var newApp = testUtils.DataGenerator.forKnex.createApp(testUtils.DataGenerator.Content.apps[1]);

        AppModel.add(newApp).then(function (createdApp) {
            should.exist(createdApp);

            createdApp.attributes.name.should.equal(newApp.name);

            done();
        }).then(null, done);
    });

    it("can delete", function (done) {
        AppModel.read({id: 1}).then(function (foundApp) {
            should.exist(foundApp);

            return AppModel['delete'](1);
        }).then(function () {
            return AppModel.browse();
        }).then(function (foundApp) {
            var hasRemovedId = foundApp.any(function (foundApp) {
                return foundApp.id === 1;
            });

            hasRemovedId.should.equal(false);

            done();
        }).then(null, done);
    });
});
