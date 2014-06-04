/*globals describe, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var testUtils   = require('../utils'),
    should      = require('should'),
    sinon       = require('sinon'),
    when        = require('when'),
    _           = require('lodash'),

    // Stuff we are testing
    versioning  = require('../../server/data/versioning'),
    exporter    = require('../../server/data/export');

describe('Exporter', function () {

    should.exist(exporter);

    var sandbox;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        sandbox = sinon.sandbox.create();
        testUtils.initData().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        sandbox.restore();
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('exports data', function (done) {
        // Stub migrations to return 000 as the current database version
        var versioningStub = sandbox.stub(versioning, 'getDatabaseVersion', function () {
            return when.resolve('003');
        });

        exporter().then(function (exportData) {
            var tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles',
                'permissions_users', 'settings', 'tags', 'posts_tags'];

            should.exist(exportData);

            should.exist(exportData.meta);
            should.exist(exportData.data);

            exportData.meta.version.should.equal('003');
            _.findWhere(exportData.data.settings, {key: 'databaseVersion'}).value.should.equal('003');

            _.each(tables, function (name) {
                should.exist(exportData.data[name]);
            });
            // should not export sqlite data
            should.not.exist(exportData.data.sqlite_sequence);

            versioningStub.restore();
            done();
        }).catch(done);
    });
});
