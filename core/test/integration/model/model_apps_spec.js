/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('../../utils'),
    sequence  = require('when/sequence'),
    should    = require('should'),
    _         = require("lodash"),

    // Stuff we are testing
    Models = require('../../../server/models'),
    knex = require('../../../server/models/base').knex;

describe('App Model', function () {

    var AppModel = Models.App;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultApp();
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
        AppModel.findAll().then(function (results) {

            should.exist(results);

            results.length.should.be.above(0);

            done();
        }).catch(done);
    });

    it('can findOne', function (done) {
        AppModel.findOne({id: 1}).then(function (foundApp) {
            should.exist(foundApp);

            foundApp.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        AppModel.findOne({id: 1}).then(function (foundApp) {
            should.exist(foundApp);

            return foundApp.set({name: 'New App'}).save();
        }).then(function () {
            return AppModel.findOne({id: 1});
        }).then(function (updatedApp) {
            should.exist(updatedApp);

            updatedApp.get('name').should.equal('New App');

            done();
        }).catch(done);
    });

    it('can add', function (done) {
        var newApp = testUtils.DataGenerator.forKnex.createApp(testUtils.DataGenerator.Content.apps[1]);

        AppModel.add(newApp).then(function (createdApp) {
            should.exist(createdApp);

            createdApp.attributes.name.should.equal(newApp.name);

            done();
        }).catch(done);
    });

    it('can destroy', function (done) {
        var firstApp = {id: 1};

        AppModel.findOne(firstApp).then(function (foundApp) {
            should.exist(foundApp);
            foundApp.attributes.id.should.equal(firstApp.id);

            return AppModel.destroy(firstApp);
        }).then(function (response) {
            response.toJSON().should.be.empty;

            return AppModel.findOne(firstApp);
        }).then(function (newResults) {
            should.equal(newResults, null);

            done();
        }).catch(done);
    });

    it('can generate a slug', function (done) {
        // Create 12 apps
        sequence(_.times(12, function (i) {
            return function () {
                return AppModel.add({
                    name: 'Kudos ' + i,
                    version: '0.0.1',
                    status: 'installed'
                }, {user: 1});
            };
        })).then(function (createdApps) {
            // Should have created 12 apps
            createdApps.length.should.equal(12);

            // Should have matching slugs
            _(createdApps).each(function (app, i) {
                app.get('slug').should.equal('kudos-' + i);
            });

            done();
        }).catch(done);
    });
});
