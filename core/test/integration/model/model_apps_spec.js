/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var testUtils    = require('../../utils'),
    should       = require('should'),
    sequence     = require('../../../server/utils/sequence'),
    _            = require('lodash'),

    // Stuff we are testing
    AppModel     = require('../../../server/models/app').App,
    context      = testUtils.context.admin;

describe('App Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('app'));

    before(function () {
        should.exist(AppModel);
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

            return foundApp.set({name: 'New App'}).save(null, context);
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

        AppModel.add(newApp, context).then(function (createdApp) {
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
                }, context);
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
